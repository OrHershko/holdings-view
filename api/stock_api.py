import logging
from functools import lru_cache
from typing import List, Optional, Dict
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import yfinance as yf
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

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

class HistoryResponse(BaseModel):
    symbol: str
    history: list

class SearchResponse(BaseModel):
    results: List[dict]

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
        price = ticker.info.get("regularMarketPrice")
        name = ticker.info.get("shortName")
        if price is None:
            raise HTTPException(status_code=404, detail="Stock not found.")
        return {"symbol": symbol, "price": price, "name": name}
    except Exception as e:
        logger.error(f"Error fetching stock {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")

@app.get("/api/history/{symbol}", response_model=HistoryResponse)
def get_history(
    symbol: str,
    period: str = Query("1mo", description="Duration to fetch data for (e.g., 1d, 5d, 1mo, 1y, max)"),
    interval: str = Query("1d", description="Data interval (e.g., 1m, 15m, 1h, 1d, 1wk)")
):
    if not symbol.isalnum():
        logger.warning(f"Invalid symbol: {symbol}")
        raise HTTPException(status_code=400, detail="Invalid symbol format.")

    if interval not in VALID_INTERVALS:
        raise HTTPException(status_code=400, detail=f"Invalid interval. Allowed intervals: {list(VALID_INTERVALS.keys())}")

    max_days_for_interval = VALID_INTERVALS[interval]
    period_days = period_to_days(period)

    if interval == "1m" and period_days is not None and period_days > 7:
        logger.warning(f"Period '{period}' exceeds 7 days limit for '1m' interval without start/end dates. Adjusting period to '7d'.")
        period = "7d"

    elif max_days_for_interval is not None and period_days is not None and period_days > max_days_for_interval:
        logger.warning(f"Requested period '{period}' might be too long for interval '{interval}'. Proceeding, but yfinance might return limited data or error.")

    try:
        logger.info(f"Fetching history for {symbol} with period={period} and interval={interval}")
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval)

        if hist.empty:
            logger.warning(f"No history found for {symbol} with period={period}, interval={interval}")
            return {"symbol": symbol, "history": []}

        if isinstance(hist.index, pd.DatetimeIndex) and hist.index.tz is not None:
            hist.index = hist.index.tz_convert(None)

        history = hist.reset_index().to_dict(orient="records")
        for record in history:
            if 'Date' in record and isinstance(record['Date'], pd.Timestamp):
                record['Date'] = record['Date'].isoformat()
            elif 'Datetime' in record and isinstance(record['Datetime'], pd.Timestamp):
                record['Date'] = record['Datetime'].isoformat()
                del record['Datetime']

        return {"symbol": symbol, "history": history}
    except Exception as e:
        logger.error(f"Error fetching history for {symbol} (period={period}, interval={interval}): {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error fetching history: {e}")

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
