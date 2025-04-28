import logging
from functools import lru_cache
import yfinance as yf
from typing import Dict, Any
# Lightweight alternatives to pandas/numpy
from typing import Dict, Any
from fastapi import HTTPException

logger = logging.getLogger(__name__)

# Helper function to get stock information
@lru_cache()
def get_stock_info(symbol):
    stock = yf.Ticker(symbol)
    info = stock.info
    hist = stock.history(period="2d")

    current_price = None
    previous_close = None
    pre_market_price = None
    post_market_price = None
    
    if hist.empty:
        try:
             info = stock.info # Re-fetch info as backup
             if not info or info.get('regularMarketPrice') is None:
                  raise ValueError("Info lacks price data")
        except Exception:
             raise HTTPException(status_code=404, detail=f"Could not retrieve data for symbol: {symbol}")
        
        current_price = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")
        previous_close = info.get("previousClose") or current_price # Best guess if hist is empty
    else:
        current_price = hist['Close'].iloc[-1]
        previous_close = hist['Close'].iloc[0] if len(hist) > 1 else current_price

    if current_price is None:
        if info:
            current_price = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")
            if current_price is None:
                 raise HTTPException(status_code=404, detail=f"Could not determine current price for symbol: {symbol}")
            previous_close = info.get("previousClose") or current_price
        else:
            raise HTTPException(status_code=404, detail=f"Could not retrieve data for symbol: {symbol}")
    
    if previous_close is None:
        previous_close = current_price

    change = current_price - previous_close
    change_percent = (change / previous_close) * 100 if previous_close else 0
    
    asset_type = determine_asset_type(symbol, info)
    market_state = info.get("marketState")

    if market_state == "PRE":
        pre_market_price = info.get("preMarketPrice")
    elif market_state == "POST":
        data = stock.history(period="1d", interval="1m", prepost=True, auto_adjust=False)
        post_market_price = data.tail(1)["Close"].iloc[0]
    else:
        pre_market_price = 0
        post_market_price = 0

    return {
        "symbol": symbol,
        "name": info.get("shortName") or info.get("longName") or symbol,
        "price": current_price,
        "change": change,
        "changePercent": change_percent,
        "marketCap": info.get("marketCap"),
        "volume": info.get("regularMarketVolume") or info.get("volume"),
        "type": asset_type,
        "preMarketPrice": pre_market_price, 
        "postMarketPrice": post_market_price, 
        "marketState": market_state
    }

def determine_asset_type(symbol: str, info: Dict[str, Any]) -> str:
    quote_type = info.get("quoteType", "").lower()
    if quote_type == "etf": return "etf"
    if quote_type == "cryptocurrency": return "crypto"
    # Add checks for other types if needed
    return "stock"

# Helper function to calculate SMA values
def calculate_sma_values(close_values):
    """
    Calculate SMA values for different periods
    """
    sma_periods = [20, 50, 100, 150, 200]
    sma_data = {}
    
    for period in sma_periods:
        key = f"sma{period}"
        sma_data[key] = []
        
        # Need enough data points for the SMA period
        if len(close_values) >= period:
            # Pure Python implementation of moving average
            sma_values = []
            for i in range(len(close_values) - period + 1):
                window_sum = sum(close_values[i:i+period])
                sma_values.append(window_sum / period)
            
            # Pad with None values at the beginning to match original array length
            padding = [None] * (period - 1)
            sma_data[key] = padding + sma_values
        else:
            # Not enough data for this period, fill with None
            sma_data[key] = [None] * len(close_values)
    
    return sma_data
