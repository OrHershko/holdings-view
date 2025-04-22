import logging
from functools import lru_cache
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Body, Depends
from pydantic import BaseModel
import yfinance as yf
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os

# --- Database Setup (SQLAlchemy) ---
from sqlalchemy import create_engine, Column, String, Float
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Load environment variables from .env and .env.local
load_dotenv()  # Load .env first
load_dotenv(".env.local")  # Then load .env.local, which will override .env values

# Try different environment variable names (Vercel/Neon naming conventions)
DATABASE_URL = (
    os.getenv("STORAGE_URL") or  # Vercel integration name
    os.getenv("POSTGRES_URL") or  # Previous name
    os.getenv("DATABASE_URL")     # Generic name
)

if not DATABASE_URL:
    raise ValueError(
        "Database URL not found. Ensure either STORAGE_URL, POSTGRES_URL, or DATABASE_URL "
        "is set in your .env.local file or Vercel environment variables."
    )

# Configure SQLAlchemy engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_size=5,               # Start with 5 connections
    max_overflow=10,           # Allow up to 10 additional connections
    pool_timeout=30,           # Wait up to 30 seconds for a connection
    pool_recycle=1800,        # Recycle connections every 30 minutes
    pool_pre_ping=True,       # Enable connection health checks
    connect_args={
        "sslmode": "require"  # Required for Neon
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- Database Models ---
class HoldingDB(Base):
    __tablename__ = "holdings"
    # Using symbol as primary key, assuming unique per portfolio (adjust if needed)
    symbol = Column(String, primary_key=True, index=True)
    shares = Column(Float, nullable=False)
    averageCost = Column(Float, nullable=False)
    # Add 'name' if you want to store it persistently, reduces yfinance lookups
    # name = Column(String)

class WatchlistDB(Base):
    __tablename__ = "watchlist"
    symbol = Column(String, primary_key=True, index=True)

# Create tables if they don't exist (run once, ideally outside request handlers)
# You might need a separate script or use Alembic for migrations in a real app
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables checked/created.")
except Exception as e:
    print(f"Error creating database tables: {e}")


# --- Dependency for DB Session ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Original JSON File Handling (Commented Out/To Be Removed) ---
# PORTFOLIO_FILE = "portfolio.json"
# WATCHLIST_FILE = "watchlist.json"
# def load_portfolio_json(): ...
# def save_portfolio_json(portfolio): ...
# def load_watchlist_json(): ...
# def save_watchlist_json(watchlist): ...

# --- Pydantic Models (Existing - Keep as is) ---
class HoldingCreate(BaseModel):
    symbol: str
    shares: float
    averageCost: float

class HoldingResponse(HoldingCreate):
    name: Optional[str] = None
    currentPrice: Optional[float] = None
    change: Optional[float] = None
    changePercent: Optional[float] = None
    value: Optional[float] = None
    gain: Optional[float] = None
    gainPercent: Optional[float] = None
    type: Optional[str] = None

class PortfolioSummary(BaseModel):
    totalValue: float
    totalGain: float
    totalGainPercent: float
    dayChange: float
    dayChangePercent: float

class StockData(BaseModel):
    symbol: str
    name: Optional[str] = None
    price: float
    change: float
    changePercent: float
    marketCap: Optional[float] = None
    volume: Optional[float] = None # Should likely be int
    type: Optional[str] = None

class StockHistoryData(BaseModel):
    dates: List[str]
    prices: List[float]
    volume: List[float]
    high: List[float]
    low: List[float]
    open: List[float]
    close: List[float]
    # ... other indicators ...

class NewsArticle(BaseModel):
    title: str
    link: str
    source: str
    published: str

class ReorderRequest(BaseModel):
    fromId: str
    toId: str

class WatchlistItemResponse(BaseModel):
    symbol: str
    name: Optional[str] = None
    price: Optional[float] = None
    change: Optional[float] = None
    changePercent: Optional[float] = None

class StockResponse(BaseModel):
    symbol: str
    price: float
    name: Optional[str] = None
    change: Optional[float] = None
    changePercent: Optional[float] = None
    marketCap: Optional[float] = None
    volume: Optional[int] = None
    type: Optional[str] = None

class HistoryResponse(BaseModel):
    symbol: str
    history: List[Dict[str, Any]]

class SearchResponse(BaseModel):
    results: List[dict]

# --- CORS Setup --- 
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://holdings-view.vercel.app")

app = FastAPI()

# Allow both production and development URLs
allowed_origins = [
    "https://holdings-view.vercel.app",  # Production URL
    "http://localhost:8080",             # Local development
    FRONTEND_URL                         # From environment variable
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Helper Functions 
@lru_cache()
def get_stock_info(symbol):
    stock = yf.Ticker(symbol)
    info = stock.info
    hist = stock.history(period="2d")
    
    if hist.empty:
        # Try fetching 'info' again if hist fails
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

    change = current_price - previous_close
    change_percent = (change / previous_close) * 100 if previous_close else 0
    
    asset_type = determine_asset_type(symbol, info)

    return {
        "symbol": symbol,
    "name": info.get("shortName") or info.get("longName") or symbol,
    "price": current_price,
        "change": change,
        "changePercent": change_percent,
    "marketCap": info.get("marketCap"),
    "volume": info.get("regularMarketVolume") or info.get("volume"),
    "type": asset_type
    }

def determine_asset_type(symbol: str, info: Dict[str, Any]) -> str:
    quote_type = info.get("quoteType", "").lower()
    if quote_type == "etf": return "etf"
    if quote_type == "cryptocurrency": return "crypto"
    # Add checks for other types if needed
    return "stock"

# --- Refactored API Routes --- 

@app.get("/api/portfolio")
def get_portfolio(db: Session = Depends(get_db)):
    try:
        db_holdings = db.query(HoldingDB).all()
    except SQLAlchemyError as e:
         print(f"Database error fetching holdings: {e}")
         raise HTTPException(status_code=500, detail="Database error fetching portfolio.")

    updated_portfolio = []
    total_day_change_value = 0
    total_start_value = 0

    for holding in db_holdings:
        try:
            stock_data = get_stock_info(holding.symbol) # Fetch live data
            current_price = stock_data["price"]
            change = stock_data["change"]
            shares = holding.shares
            avg_cost = holding.averageCost

            value = shares * current_price
            gain = (current_price - avg_cost) * shares
            gain_percent = ((current_price / avg_cost) - 1) * 100 if avg_cost > 0 else 0
            day_change_value = change * shares
            start_value = value - day_change_value

            updated_holding = {
                "symbol": holding.symbol, # From DB
                "shares": shares,         # From DB
                "averageCost": avg_cost,  # From DB
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
            print(f"Error updating holding {holding.symbol} from yfinance: {str(e)}")
            updated_portfolio.append({
                "symbol": holding.symbol,
                "shares": holding.shares,
                "averageCost": holding.averageCost,
                "name": f"{holding.symbol} (Data Error)",
                "currentPrice": None, "change": None, "changePercent": None,
                "value": None, "gain": None, "gainPercent": None, "type": None
            })

    # Calculate portfolio summary
    total_value = sum(h.get("value", 0) for h in updated_portfolio if h.get("value") is not None)
    total_cost_basis = sum(h.shares * h.averageCost for h in db_holdings)
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


@app.post("/api/portfolio/add")
def add_to_portfolio(holding_data: HoldingCreate, db: Session = Depends(get_db)):
    # Check if holding exists
    db_holding = db.query(HoldingDB).filter(HoldingDB.symbol == holding_data.symbol).first()
    if db_holding:
        raise HTTPException(status_code=400, detail="Holding already exists. Use PUT to update.")
    
    # Create new holding object
    new_holding = HoldingDB(**holding_data.dict())
    
    try:
        db.add(new_holding)
        db.commit()
        db.refresh(new_holding)
        return new_holding # Return the created object
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Database error adding holding: {e}")
        raise HTTPException(status_code=500, detail="Database error adding holding.")

@app.put("/api/portfolio/update")
def update_holding(symbol: str = Body(...), shares: float = Body(...), averageCost: float = Body(...), db: Session = Depends(get_db)):
    db_holding = db.query(HoldingDB).filter(HoldingDB.symbol == symbol).first()
    if not db_holding:
        raise HTTPException(status_code=404, detail="Holding not found")
        
    db_holding.shares = shares
    db_holding.averageCost = averageCost
    try:
        db.commit()
        db.refresh(db_holding)
        return db_holding
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Database error updating holding: {e}")
        raise HTTPException(status_code=500, detail="Database error updating holding.")

@app.delete("/api/portfolio/delete/{symbol}")
def delete_holding(symbol: str, db: Session = Depends(get_db)):
    db_holding = db.query(HoldingDB).filter(HoldingDB.symbol == symbol).first()
    if not db_holding:
        raise HTTPException(status_code=404, detail="Holding not found")
        
    try:
        db.delete(db_holding)
        db.commit()
        return {"message": "Holding deleted successfully"}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Database error deleting holding: {e}")
        raise HTTPException(status_code=500, detail="Database error deleting holding.")

@app.post("/api/portfolio/reorder")
def reorder_holdings(request: ReorderRequest, db: Session = Depends(get_db)):
    try:
        # Get all holdings
        holdings = db.query(HoldingDB).all()
        holdings_dict = {h.symbol: h for h in holdings}
        
        # Verify both holdings exist
        if request.fromId not in holdings_dict or request.toId not in holdings_dict:
            raise HTTPException(status_code=404, detail="One or both holdings not found")
            
        # Swap the holdings
        from_holding = holdings_dict[request.fromId]
        to_holding = holdings_dict[request.toId]
        
        # Store temporary values
        temp_shares = from_holding.shares
        temp_cost = from_holding.averageCost
        
        # Swap values
        from_holding.shares = to_holding.shares
        from_holding.averageCost = to_holding.averageCost
        to_holding.shares = temp_shares
        to_holding.averageCost = temp_cost
        
        # Update the database
        db.commit()
        return {"message": "Holdings reordered successfully"}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Database error reordering holdings: {e}")
        raise HTTPException(status_code=500, detail="Database error reordering holdings")

@app.post("/api/portfolio/upload")
def upload_portfolio(holdings: List[HoldingCreate], db: Session = Depends(get_db)):
    if not holdings:
        raise HTTPException(status_code=400, detail="No valid holdings data received.")
    
    symbols_in_upload = {h.symbol for h in holdings}
    if len(symbols_in_upload) != len(holdings):
        raise HTTPException(status_code=400, detail="Duplicate symbols found in upload data.")
        
    try:
        # Delete existing portfolio
        num_deleted = db.query(HoldingDB).delete()
        print(f"Deleted {num_deleted} existing holdings before upload.")
        
        # Add new holdings
        new_db_holdings = [HoldingDB(**h.dict()) for h in holdings]
        db.add_all(new_db_holdings)
        
        db.commit()
        return {"message": f"{len(holdings)} holdings uploaded successfully and portfolio overwritten."}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Database error uploading portfolio: {e}")
        raise HTTPException(status_code=500, detail="Database error uploading portfolio.")
    except Exception as e:
        db.rollback()
        print(f"General error during portfolio upload: {e}")
        raise HTTPException(status_code=500, detail="Error processing portfolio upload.")

@app.get("/api/watchlist", response_model=List[WatchlistItemResponse])
def get_watchlist_details(db: Session = Depends(get_db)):
    try:
        watchlist_symbols_db = db.query(WatchlistDB.symbol).all()
        watchlist_symbols = [s[0] for s in watchlist_symbols_db] # Extract symbols
    except SQLAlchemyError as e:
        print(f"Database error fetching watchlist: {e}")
        raise HTTPException(status_code=500, detail="Database error fetching watchlist.")
        
    watchlist_details = []
    for symbol in watchlist_symbols:
        try:
            stock_data = get_stock_info(symbol)
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
            watchlist_details.append(WatchlistItemResponse(symbol=symbol))
            
    return watchlist_details

@app.post("/api/watchlist/add/{symbol}")
def add_to_watchlist(symbol: str, db: Session = Depends(get_db)):
    if not symbol.isalnum():
        raise HTTPException(status_code=400, detail="Invalid symbol format")
    symbol_upper = symbol.upper()
    
    db_symbol = db.query(WatchlistDB).filter(WatchlistDB.symbol == symbol_upper).first()
    if db_symbol:
        return {"message": f"{symbol_upper} is already in watchlist"}
        
    
    new_watchlist_item = WatchlistDB(symbol=symbol_upper)
    try:
        db.add(new_watchlist_item)
        db.commit()
        return {"message": f"{symbol_upper} added to watchlist"}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Database error adding to watchlist: {e}")
        raise HTTPException(status_code=500, detail="Database error adding to watchlist.")

@app.delete("/api/watchlist/remove/{symbol}")
def remove_from_watchlist(symbol: str, db: Session = Depends(get_db)):
    symbol_upper = symbol.upper()
    db_symbol = db.query(WatchlistDB).filter(WatchlistDB.symbol == symbol_upper).first()
    if not db_symbol:
        return {"message": f"{symbol_upper} not found in watchlist"}
        
    try:
        db.delete(db_symbol)
        db.commit()
        return {"message": f"{symbol_upper} removed from watchlist"}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Database error removing from watchlist: {e}")
        raise HTTPException(status_code=500, detail="Database error removing from watchlist.")


@app.get("/api/stock/{symbol}", response_model=StockData)
def get_stock_data(symbol: str):
    try:
        return get_stock_info(symbol)
    except Exception as e:
        print(f"Error fetching stock {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch data for {symbol}")
    
@app.get("/api/history/{symbol}", response_model=HistoryResponse)
def get_history(
    symbol: str,
    period: str = Query("1y", description="Duration of historical data"),
    interval: str = Query("1d", description="Data interval")
):
    try:
        stock = yf.Ticker(symbol)
        hist = stock.history(period=period, interval=interval)

        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No historical data found for {symbol}")
            
        # Convert the DataFrame to a list of records
        history = []
        previous_close = None
        
        for idx, row in hist.iterrows():
            current_close = float(row['Close'])
            change = current_close - previous_close if previous_close is not None else 0
            change_percent = (change / previous_close * 100) if previous_close is not None else 0
            
            record = {
                'Date': idx.isoformat(),
                'Open': float(row['Open']),
                'High': float(row['High']),
                'Low': float(row['Low']),
                'Close': current_close,
                'Volume': int(row['Volume']),
                'Change': change,
                'ChangePercent': change_percent
            }
            history.append(record)
            previous_close = current_close

        return {"symbol": symbol, "history": history}
    except Exception as e:
        logger.error(f"Error fetching history for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch history for {symbol}")

@app.get("/api/search")
def search_stocks_endpoint(query: str = Query(..., min_length=1)):
    try:
        stock_info = get_stock_info(query.upper()) 
        return [{"symbol": stock_info["symbol"], "name": stock_info["name"]}]
    except Exception:
        return []

@app.get("/api/news/{symbol}", response_model=List[NewsArticle])
def get_stock_news(symbol: str):
    try:
        stock = yf.Ticker(symbol)
        news = stock.news

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
            publish_time_str = content.get("pubDate") 

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




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)