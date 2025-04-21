import logging
from functools import lru_cache
from typing import List, Optional, Dict
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import yfinance as yf
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import math

app = FastAPI()

origins = [
    "http://localhost:8080", 
]

# Add the CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # List of allowed origins
    allow_credentials=True, # Allow cookies if needed
    allow_methods=["*"],    # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],    # Allow all headers
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StockResponse(BaseModel):
    symbol: str
    price: float
    name: Optional[str] = None
    change: Optional[float] = None
    changePercent: Optional[float] = None
    marketCap: Optional[float] = None
    volume: Optional[int] = None

class HistoryResponse(BaseModel):
    symbol: str
    history: list

class SearchResponse(BaseModel):
    results: List[dict]

class NewsArticle(BaseModel):
    title: Optional[str] = None # Allow None
    link: Optional[str] = None  # Allow None
    source: Optional[str] = None # Allow None
    published: Optional[str] = None # Allow None

VALID_INTERVALS: Dict[str, int] = {
    "1m": 7,
    "2m": 60, "5m": 60, "15m": 60, "30m": 60,
    "60m": 730, "90m": 60, "1h": 730,
    "1d": None, "5d": None, "1wk": None, "1mo": None, "3mo": None
}


def period_to_days(period_str: str) -> Optional[int]:
    period_str = period_str.lower()
    if 'd' in period_str:
        return int(period_str.replace('d', ''))
    elif 'mo' in period_str:
        return int(period_str.replace('mo', '')) * 30
    elif 'y' in period_str:
        return int(period_str.replace('y', '')) * 365
    elif 'max' in period_str:
        return None
    return None

@app.get("/api/stock/{symbol}", response_model=StockResponse)
def get_stock(symbol: str):
    if not symbol.isalnum():
        logger.warning(f"Invalid symbol: {symbol}")
        raise HTTPException(status_code=400, detail="Invalid symbol format.")
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info

        price = info.get("regularMarketPrice", 0)
        name = info.get("longName") or info.get("shortName") or "N/A"
        change = info.get("regularMarketChange", 0)
        change_percent = info.get("regularMarketChangePercent", 0)
        market_cap = info.get("marketCap", 0)
        volume = info.get("regularMarketVolume", 0)

        if price == 0:
            raise HTTPException(status_code=404, detail="Stock not found.")

        return {
            "symbol": symbol,
            "name": name,
            "price": price,
            "change": change,
            "changePercent": change_percent,
            "marketCap": market_cap,
            "volume": volume,
        }

    except Exception as e:
        logger.error(f"Error fetching stock {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")
    
@app.get("/api/history/{symbol}", response_model=HistoryResponse)
def get_history(
    symbol: str,
    period: str = Query("1y", description="Duration to fetch data for (e.g., 1d, 5d, 1mo, 1y, max)"),
    interval: str = Query("1d", description="Data interval (e.g., 1m, 15m, 1h, 1d, 1wk)")
):
    if not symbol.isalnum():
        logger.warning(f"Invalid symbol: {symbol}")
        raise HTTPException(status_code=400, detail="Invalid symbol format.")

    if interval not in VALID_INTERVALS:
        raise HTTPException(status_code=400, detail=f"Invalid interval. Allowed intervals: {list(VALID_INTERVALS.keys())}")

    # Calculate a longer period for fetching to accommodate SMA calculation
    fetch_period = extend_period_for_indicators(period, 200)  # 200 days for SMA 200
    logger.info(f"Original period: {period}, extended fetch period: {fetch_period}")
    
    max_days_for_interval = VALID_INTERVALS[interval]
    period_days = period_to_days(fetch_period)  # Use the extended period for validation

    if interval == "1m" and period_days is not None and period_days > 7:
        logger.warning(f"Period '{fetch_period}' exceeds 7 days limit for '1m' interval without start/end dates. Adjusting period to '7d'.")
        fetch_period = "7d"

    elif max_days_for_interval is not None and period_days is not None and period_days > max_days_for_interval:
        logger.warning(f"Requested period '{fetch_period}' might be too long for interval '{interval}'. Proceeding, but yfinance might return limited data or error.")

    try:
        logger.info(f"Fetching history for {symbol} with extended period={fetch_period} and interval={interval}")
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=fetch_period, interval=interval)

        if hist.empty:
            logger.warning(f"No history found for {symbol} with period={fetch_period}, interval={interval}")
            return {"symbol": symbol, "history": []}

        if isinstance(hist.index, pd.DatetimeIndex) and hist.index.tz is not None:
            hist.index = hist.index.tz_convert(None)

        # Convert to records
        history = hist.reset_index().to_dict(orient="records")
        
        # Format dates
        for record in history:
            if 'Date' in record and isinstance(record['Date'], pd.Timestamp):
                record['Date'] = record['Date'].isoformat()
            elif 'Datetime' in record and isinstance(record['Datetime'], pd.Timestamp):
                record['Date'] = record['Datetime'].isoformat()
                del record['Datetime']

        return {"symbol": symbol, "history": history}
    except Exception as e:
        logger.error(f"Error fetching history for {symbol} (period={fetch_period}, interval={interval}): {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error fetching history: {e}")

def extend_period_for_indicators(display_period: str, extra_days_needed: int) -> str:
    """Extend the requested period to include enough history for indicator calculations"""
    # Parse the period
    if display_period.lower() == "max":
        return "max"  # Already maximum, no need to extend
        
    period_str = display_period.lower()
    unit = period_str[-1]  # Get the last character (d, m, y)
    
    try:
        if unit == 'd':
            days = int(period_str[:-1])
            return f"{days + extra_days_needed}d"
        elif unit == 'o':  # mo for months
            months = int(period_str[:-2])
            # Convert to days roughly
            days = months * 30 + extra_days_needed
            # Convert back to months if it's large enough
            if days > 90:
                return f"{days // 30 + 1}mo"
            return f"{days}d"
        elif unit == 'y':
            years = int(period_str[:-1])
            # Add the extra days in year format
            extra_years = extra_days_needed / 365
            return f"{years + math.ceil(extra_years)}y"
        else:
            # If we can't parse, just add extra days as a safety measure
            return f"{extra_days_needed}d"
    except:
        # If parsing fails, return a safe default with extra days
        return f"{extra_days_needed}d"

@app.get("/api/search", response_model=SearchResponse)
def search_stocks(q: str = Query(..., min_length=1)):
    mock_stocks = [
        {"symbol": "AAPL", "name": "Apple Inc."},
        {"symbol": "GOOGL", "name": "Alphabet Inc."},
        {"symbol": "MSFT", "name": "Microsoft Corporation"},
    ]
    results = [s for s in mock_stocks if q.lower() in s["symbol"].lower() or q.lower() in s["name"].lower()]
    return {"results": results}

@app.get("/api/portfolio")
def get_portfolio():
    return {
        "portfolio": [
            {"symbol": "AAPL","name": "Apple Inc.", "shares": 10, "price": get_stock("AAPL")["price"]},
            {"symbol": "MSFT","name": "Microsoft Corporation" ,"shares": 5, "price": get_stock("MSFT")["price"]},
        ]
    }

@app.get("/api/watchlist")
def get_watchlist():
    return {
        "watchlist": [
            {"symbol": "GOOGL","name": "Alphabet Inc.", "price": get_stock("GOOGL")["price"]},
            {"symbol": "AAPL","name": "Apple Inc." ,"price": get_stock("AAPL")["price"]},
        ]
    }

@app.get("/api/news/{symbol}", response_model=List[NewsArticle])
def get_news(symbol: str):
    """
    Fetch news articles for a given stock symbol using yfinance.
    """
    if not symbol.isalnum():
        logger.warning(f"Invalid symbol for news: {symbol}")
        raise HTTPException(status_code=400, detail="Invalid symbol format.")
    try:
        ticker = yf.Ticker(symbol)
        news = ticker.news
        logger.info(f"Raw news data for {symbol} from yfinance: {news}") # Keep this log

        if not news:
             logger.warning(f"No news found for {symbol} from yfinance.")
             return []

        articles = []
        for item in news:
            content = item.get("content") # Get the nested content dictionary
            if not content:
                logger.warning(f"News item for {symbol} missing 'content' dictionary: {item}")
                continue # Skip this item if content is missing

            # Extract data from the 'content' dictionary
            title = content.get("title")
            
            # Get the link - check canonicalUrl first, then clickThroughUrl
            link_obj = content.get("canonicalUrl") or content.get("clickThroughUrl")
            link = link_obj.get("url") if link_obj else None

            # Get the source from the provider dictionary
            provider = content.get("provider")
            source = provider.get("displayName") if provider else None
            
            # Get the published date (already a string)
            publish_time_str = content.get("pubDate") # Use 'pubDate'

            published_iso = None
            if publish_time_str:
                try:
                    # Parse the existing date string
                    ts = pd.to_datetime(publish_time_str, errors='coerce')
                    if pd.notna(ts):
                         published_iso = ts.isoformat()
                    else:
                         logger.warning(f"Could not parse pubDate string '{publish_time_str}' for {symbol} news item.")
                except Exception as dt_error: # Catch broader errors during parsing
                    logger.warning(f"Error parsing pubDate string '{publish_time_str}' for {symbol}: {dt_error}")

            articles.append({
                "title": title if title else None,
                "link": link if link else None,
                "source": source if source else None,
                "published": published_iso,
            })
        return articles
    except Exception as e:
        logger.exception(f"Error fetching news for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error fetching news.")