import logging
from functools import lru_cache
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import yfinance as yf
from fastapi.middleware.cors import CORSMiddleware

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
def get_history(symbol: str, period: str = Query("1mo", pattern="^(1d|5d|1mo|3mo|6mo|1y|5y|max)$")):
    if not symbol.isalnum():
        logger.warning(f"Invalid symbol: {symbol}")
        raise HTTPException(status_code=400, detail="Invalid symbol format.")
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period)
        if hist.empty:
            raise HTTPException(status_code=404, detail="No history found.")
        history = hist.reset_index().to_dict(orient="records")
        return {"symbol": symbol, "history": history}
    except Exception as e:
        logger.error(f"Error fetching history for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")

@app.get("/api/search", response_model=SearchResponse)
def search_stocks(q: str = Query(..., min_length=1)):
    # Placeholder: Replace with real search logic or API
    mock_stocks = [
        {"symbol": "AAPL", "name": "Apple Inc."},
        {"symbol": "GOOGL", "name": "Alphabet Inc."},
        {"symbol": "MSFT", "name": "Microsoft Corporation"},
    ]
    results = [s for s in mock_stocks if q.lower() in s["symbol"].lower() or q.lower() in s["name"].lower()]
    return {"results": results}

# Mock data endpoints (toggle with environment/config in real app)
@app.get("/api/portfolio")
def get_portfolio():
    # Replace with DB/user logic in production
    return {
        "portfolio": [
            {"symbol": "AAPL", "shares": 10, "price": get_stock("AAPL")["price"]},
            {"symbol": "MSFT", "shares": 5, "price": get_stock("MSFT")["price"]},
        ]
    }

@app.get("/api/watchlist")
def get_watchlist():
    # Replace with DB/user logic in production
    return {
        "watchlist": [
            {"symbol": "GOOGL", "price": get_stock("GOOGL")["price"]},
            {"symbol": "AAPL", "price": get_stock("AAPL")["price"]},
        ]
    }
