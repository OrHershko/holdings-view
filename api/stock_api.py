import logging
from functools import lru_cache
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Body
from pydantic import BaseModel, Field
import yfinance as yf
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import math
import json
import os
from datetime import datetime, timedelta

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

class HoldingCreate(BaseModel):
    symbol: str = Field(..., description="Stock symbol")
    shares: float = Field(..., gt=0, description="Number of shares held")
    averageCost: float = Field(..., ge=0, description="Average cost per share")

class WatchlistItemResponse(BaseModel):
    symbol: str
    name: Optional[str] = None
    price: Optional[float] = None
    change: Optional[float] = None
    changePercent: Optional[float] = None

VALID_INTERVALS: Dict[str, int] = {
    "1m": 7,
    "2m": 60, "5m": 60, "15m": 60, "30m": 60,
    "60m": 730, "90m": 60, "1h": 730,
    "1d": None, "5d": None, "1wk": None, "1mo": None, "3mo": None
}

# In-memory storage for portfolio (replace with database in production)
PORTFOLIO_FILE = "portfolio.json"
WATCHLIST_FILE = "watchlist.json"

def load_portfolio() -> List[Dict[str, Any]]:
    if os.path.exists(PORTFOLIO_FILE):
        with open(PORTFOLIO_FILE, "r") as f:
            return json.load(f)
    return []

def save_portfolio(portfolio: List[Dict[str, Any]]) -> None:
    with open(PORTFOLIO_FILE, "w") as f:
        json.dump(portfolio, f)

def load_watchlist():
    if not os.path.exists(WATCHLIST_FILE):
        return []
    try:
        with open(WATCHLIST_FILE, "r") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []

def save_watchlist(watchlist):
    with open(WATCHLIST_FILE, "w") as f:
        json.dump(watchlist, f, indent=4)

def get_stock(symbol: str) -> Dict[str, Any]:
    try:
        stock = yf.Ticker(symbol)
        info = stock.info
        # Determine asset type based on symbol or other criteria
        asset_type = determine_asset_type(symbol, info)
        return {
            "symbol": symbol,
            "name": info.get("longName", symbol),
            "price": info.get("regularMarketPrice", 0),
            "change": info.get("regularMarketChange", 0),
            "changePercent": info.get("regularMarketChangePercent", 0),
            "marketCap": info.get("marketCap", 0),
            "volume": info.get("regularMarketVolume", 0),
            "type": asset_type
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Failed to fetch stock data: {str(e)}")

def determine_asset_type(symbol: str, info: Dict[str, Any]) -> str:
    # Check if it's an ETF
    if info.get("quoteType") == "ETF":
        return "etf"
    # Check if it's a cryptocurrency
    if info.get("quoteType") == "CRYPTOCURRENCY":
        return "crypto"
    # Default to stock
    return "stock"

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
def get_stock_data(symbol: str):
    return get_stock(symbol)

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
    portfolio = load_portfolio()
    updated_portfolio = []
    total_day_change_value = 0
    total_start_value = 0 # For day change % calculation

    for holding in portfolio:
        try:
            stock_data = get_stock(holding["symbol"])
            current_price = stock_data["price"]
            change = stock_data["change"]
            shares = holding["shares"]
            avg_cost = holding["averageCost"]
            
            value = shares * current_price
            gain = (current_price - avg_cost) * shares
            gain_percent = ((current_price / avg_cost) - 1) * 100 if avg_cost > 0 else 0
            day_change_value = change * shares
            start_value = value - day_change_value
            
            updated_holding = {
                **holding,
                "name": stock_data["name"],
                "currentPrice": current_price,
                "change": change,
                "changePercent": stock_data["changePercent"],
                "value": value,
                "gain": gain,
                "gainPercent": gain_percent,
                "type": stock_data["type"]
            }
            updated_portfolio.append(updated_holding)
            total_day_change_value += day_change_value
            total_start_value += start_value
            
        except Exception as e:
            print(f"Error updating holding {holding['symbol']}: {str(e)}")
            # Keep existing holding data if fetch fails, maybe mark as stale?
            updated_portfolio.append({**holding, "value": holding["shares"] * holding.get("currentPrice", holding["averageCost"])})
    
    # Calculate portfolio summary
    total_value = sum(h.get("value", 0) for h in updated_portfolio)
    total_cost_basis = sum(h["shares"] * h["averageCost"] for h in updated_portfolio)
    total_gain = total_value - total_cost_basis
    total_gain_percent = (total_gain / total_cost_basis) * 100 if total_cost_basis > 0 else 0
    day_change_percent = (total_day_change_value / total_start_value) * 100 if total_start_value > 0 else 0
    
    return {
        "holdings": updated_portfolio,
        "summary": {
            "totalValue": total_value,
            "totalGain": total_gain,
            "totalGainPercent": total_gain_percent,
            "dayChange": total_day_change_value,
            "dayChangePercent": day_change_percent,
        }
    }

@app.post("/api/portfolio/add", response_model=StockResponse)
def add_holding(holding_data: dict):
    portfolio = load_portfolio()
@app.post("/api/portfolio/add")
def add_to_portfolio(holding: Dict[str, Any]):
    try:
        # Validate stock exists
        stock_data = get_stock(holding["symbol"])
        
        # Load current portfolio
        portfolio = load_portfolio()
        
        # Check if stock already exists in portfolio
        existing_holding = next((h for h in portfolio if h["symbol"] == holding["symbol"]), None)
        
        if existing_holding:
            # Update existing holding
            total_shares = existing_holding["shares"] + holding["shares"]
            total_cost = (existing_holding["shares"] * existing_holding["averageCost"] + 
                         holding["shares"] * holding["averageCost"])
            existing_holding["shares"] = total_shares
            existing_holding["averageCost"] = total_cost / total_shares
        else:
            # Add new holding
            portfolio.append({
                "symbol": holding["symbol"],
                "name": stock_data["name"],
                "shares": holding["shares"],
                "averageCost": holding["averageCost"],
                "currentPrice": stock_data["price"],
                "change": stock_data["change"],
                "changePercent": stock_data["changePercent"],
                "value": holding["shares"] * stock_data["price"],
                "gain": (stock_data["price"] - holding["averageCost"]) * holding["shares"],
                "gainPercent": ((stock_data["price"] / holding["averageCost"]) - 1) * 100,
            })
        
        # Save updated portfolio
        save_portfolio(portfolio)
        
        return {"message": "Stock added to portfolio successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/watchlist", response_model=List[WatchlistItemResponse])
def get_watchlist_details():
    watchlist_symbols = load_watchlist()
    watchlist_details = []
    for symbol in watchlist_symbols:
        try:
            stock_data = get_stock(symbol) # Use existing get_stock helper
            watchlist_details.append(
                WatchlistItemResponse(
                    symbol=stock_data["symbol"],
                    name=stock_data["name"],
                    price=stock_data["price"],
                    change=stock_data["change"],
                    changePercent=stock_data["changePercent"]
                )
            )
        except Exception as e:
            print(f"Error fetching data for watchlist symbol {symbol}: {str(e)}")
            # Optionally include symbol with missing data
            watchlist_details.append(WatchlistItemResponse(symbol=symbol))
            
    return watchlist_details

@app.post("/api/watchlist/add/{symbol}")
def add_to_watchlist(symbol: str):
    # Validate symbol format (optional but recommended)
    if not symbol.isalnum():
        raise HTTPException(status_code=400, detail="Invalid symbol format")
    symbol_upper = symbol.upper()
    
    # Check if stock exists (optional, prevents adding invalid symbols)
    try:
        get_stock(symbol_upper)
    except Exception as e:
        # Allow adding even if fetch fails, or raise error:
        # raise HTTPException(status_code=404, detail=f"Could not verify symbol: {symbol_upper}")
        print(f"Warning: Could not verify symbol {symbol_upper} before adding to watchlist: {e}")

    watchlist = load_watchlist()
    if symbol_upper not in watchlist:
        watchlist.append(symbol_upper)
        save_watchlist(watchlist)
        return {"message": f"{symbol_upper} added to watchlist"}
    else:
        return {"message": f"{symbol_upper} is already in watchlist"}

@app.delete("/api/watchlist/remove/{symbol}")
def remove_from_watchlist(symbol: str):
    symbol_upper = symbol.upper()
    watchlist = load_watchlist()
    if symbol_upper in watchlist:
        watchlist.remove(symbol_upper)
        save_watchlist(watchlist)
        return {"message": f"{symbol_upper} removed from watchlist"}
    else:
        # Return success even if not found, or raise 404
        # raise HTTPException(status_code=404, detail="Symbol not found in watchlist")
        return {"message": f"{symbol_upper} not found in watchlist"}

@app.get("/api/news/{symbol}", response_model=List[NewsArticle])
def get_stock_news(symbol: str):
    try:
        stock = yf.Ticker(symbol)
        news = stock.news
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

@app.put("/api/portfolio/update")
def update_holding(holding: Dict[str, Any]):
    try:
        # Validate stock exists
        stock_data = get_stock(holding["symbol"])
        
        # Load current portfolio
        portfolio = load_portfolio()
        
        # Find the holding to update
        holding_index = next((i for i, h in enumerate(portfolio) if h["symbol"] == holding["symbol"]), None)
        
        if holding_index is None:
            raise HTTPException(status_code=404, detail="Holding not found")
        
        # Update the holding
        portfolio[holding_index] = {
            "symbol": holding["symbol"],
            "name": stock_data["name"],
            "shares": holding["shares"],
            "averageCost": holding["averageCost"],
        }
        
        # Save updated portfolio
        save_portfolio(portfolio)
        
        return {"message": "Holding updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/portfolio/delete/{symbol}")
def delete_holding(symbol: str):
    try:
        # Load current portfolio
        portfolio = load_portfolio()
        
        # Find and remove the holding
        portfolio = [h for h in portfolio if h["symbol"] != symbol]
        
        # Save updated portfolio
        save_portfolio(portfolio)
        
        return {"message": "Holding deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/portfolio/reorder")
def reorder_holdings(reorder: Dict[str, str]):
    try:
        # Load current portfolio
        portfolio = load_portfolio()
        
        # Find the indices of the holdings to swap
        from_index = next((i for i, h in enumerate(portfolio) if h["symbol"] == reorder["fromId"]), None)
        to_index = next((i for i, h in enumerate(portfolio) if h["symbol"] == reorder["toId"]), None)
        
        if from_index is None or to_index is None:
            raise HTTPException(status_code=404, detail="One or both holdings not found")
        
        # Reorder the holdings
        portfolio[from_index], portfolio[to_index] = portfolio[to_index], portfolio[from_index]
        
        # Save updated portfolio
        save_portfolio(portfolio)
        
        return {"message": "Holdings reordered successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/portfolio/upload")
def upload_portfolio(holdings: List[HoldingCreate]):
    """ Overwrites the current portfolio with the data from the uploaded CSV. """
    if not holdings:
        raise HTTPException(status_code=400, detail="No valid holdings data received.")
        
    # Basic validation passed by Pydantic (symbol, shares > 0, averageCost >= 0)
    
    # Optional: Add further validation here if needed (e.g., check symbols via yfinance)
    # validated_holdings = []
    # for holding in holdings:
    #     try:
    #         get_stock_info(holding.symbol) # Verify symbol exists
    #         validated_holdings.append(holding)
    #     except Exception:
    #         print(f"Skipping invalid or unverifiable symbol during upload: {holding.symbol}")
            # Alternatively, raise HTTPException here to fail the whole upload
            # raise HTTPException(status_code=400, detail=f"Invalid or unverifiable symbol: {holding.symbol}")

    # Overwrite the portfolio file
    try:
        # Convert Pydantic models back to dicts for saving
        portfolio_to_save = [h.dict() for h in holdings] # Use validated_holdings if implemented
        save_portfolio(portfolio_to_save)
        return {"message": f"{len(portfolio_to_save)} holdings uploaded successfully and portfolio overwritten."}
    except Exception as e:
        print(f"Error saving uploaded portfolio: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save the uploaded portfolio data.")