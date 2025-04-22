import logging
from functools import lru_cache
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Body, Depends
from pydantic import BaseModel
import yfinance as yf
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
import math
from datetime import datetime

# --- Database Setup (SQLAlchemy) ---
from sqlalchemy import create_engine, Column, String, Float, Integer
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

# Ensure URL uses postgresql+psycopg2:// instead of postgres:// or postgresql://
if DATABASE_URL.startswith(('postgres://', 'postgresql://')):
    DATABASE_URL = 'postgresql+psycopg2://' + DATABASE_URL.split('://', 1)[1]

print(f"Initializing database connection...")  # Debug log

try:
    # Configure SQLAlchemy engine with explicit dialect
    engine = create_engine(
        DATABASE_URL,
        connect_args={"sslmode": "require"},  # Required for Neon/Vercel Postgres
        pool_pre_ping=True  # Add connection health check
    )
    
    # Test the connection
    with engine.connect() as conn:
        conn.execute("SELECT 1")
        print("Database connection successful!")
except Exception as e:
    print(f"Error connecting to database: {str(e)}")
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- Database Models ---
class HoldingDB(Base):
    __tablename__ = "holdings"
    symbol = Column(String, primary_key=True, index=True)
    shares = Column(Float, nullable=False)
    averageCost = Column(Float, nullable=False)
    position = Column(Integer, nullable=False, default=0)


class WatchlistDB(Base):
    __tablename__ = "watchlist"
    symbol = Column(String, primary_key=True, index=True)

# Create tables if they don't exist
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")
except Exception as e:
    print(f"Error creating database tables: {str(e)}")
    raise

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
    orderedSymbols: List[str]


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
        db_holdings = db.query(HoldingDB).order_by(HoldingDB.position).all()
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
    
    last_position = db.query(HoldingDB).count()

    new_holding = HoldingDB(**holding_data.model_dump(), position=last_position)
    
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

        holdings = db.query(HoldingDB).order_by(HoldingDB.position).all()
        for i, h in enumerate(holdings):
            h.position = i
        db.commit()

        return {"message": "Holding deleted successfully"}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Database error deleting holding: {e}")
        raise HTTPException(status_code=500, detail="Database error deleting holding.")

@app.post("/api/portfolio/reorder")
def reorder_portfolio(request: ReorderRequest, db: Session = Depends(get_db)):
    holdings = db.query(HoldingDB).all()
    holding_map = {h.symbol: h for h in holdings}

    for i, symbol in enumerate(request.orderedSymbols):
        if symbol in holding_map:
            holding_map[symbol].position = i

    db.commit()
    return {"message": "Portfolio reordered"}


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
        new_db_holdings = [HoldingDB(**h.dict(), position=i) for i, h in enumerate(holdings)]
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
        # Log request information
        logger.info(f"History request for {symbol} with period={period}, interval={interval}")
        
        # Fetch data from yfinance
        stock = yf.Ticker(symbol)
        hist = stock.history(period=period, interval=interval)

        # Log response shape
        logger.info(f"History response for {symbol}: {len(hist)} rows, columns: {list(hist.columns)}")

        if hist.empty:
            logger.warning(f"Empty history data for {symbol}")
            raise HTTPException(status_code=404, detail=f"No historical data found for {symbol}")
            
        # Convert the DataFrame to a list of records - with explicit type checking
        history = []
        previous_close = None
        
        for idx, row in hist.iterrows():
            try:
                # Handle potentially missing or non-numeric data
                current_close = float(row['Close']) if pd.notna(row['Close']) else None
                if current_close is None:
                    logger.warning(f"Missing Close price for {symbol} at {idx}")
                    continue
                    
                # Calculate changes safely
                if previous_close is not None:
                    change = current_close - previous_close
                    change_percent = (change / previous_close * 100) if previous_close != 0 else 0
                else:
                    change = 0
                    change_percent = 0
                
                # Format the date consistently for both local and Vercel environments
                try:
                    # First try the standard ISO format conversion
                    date_str = idx.isoformat()
                    
                    # Ensure the date string is valid by parsing it back
                    # This helps catch any serialization issues
                    datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                except (AttributeError, ValueError, TypeError) as date_error:
                    # Fallback for any date parsing issues
                    logger.warning(f"Date formatting error for {symbol}: {date_error}, using string representation")
                    try:
                        # Convert to string and then try to parse as datetime
                        date_str = str(idx)
                        parsed_date = pd.to_datetime(date_str)
                        date_str = parsed_date.isoformat()
                    except Exception:
                        # Last resort: use the current time
                        logger.error(f"Could not format date for {symbol}, using current time")
                        date_str = datetime.now().isoformat()
                
                # Convert all values explicitly to ensure proper JSON serialization
                record = {
                    'date': date_str,  # Using our robustly formatted date string
                    'open': float(row['Open']) if pd.notna(row['Open']) else None,
                    'high': float(row['High']) if pd.notna(row['High']) else None,
                    'low': float(row['Low']) if pd.notna(row['Low']) else None,
                    'close': current_close,
                    'volume': int(row['Volume']) if pd.notna(row['Volume']) else 0,
                    'change': float(change) if pd.notna(change) else 0,
                    'changePercent': float(change_percent) if pd.notna(change_percent) else 0
                }
                history.append(record)
                previous_close = current_close
            except Exception as row_error:
                logger.error(f"Error processing row for {symbol}: {row_error}, row data: {row}")
                continue  # Skip problematic rows rather than failing the whole request

        if not history:
            logger.warning(f"No valid history data points for {symbol}")
            raise HTTPException(status_code=404, detail=f"No valid data points found for {symbol}")
            
        # Log a sample of the formatted data
        if history:
            logger.info(f"Sample history data point for {symbol}: {history[0]}")
            
        # Ensure all numeric values are valid for JSON serialization
        for item in history:
            for key, value in item.items():
                if isinstance(value, (int, float)) and (math.isnan(value) or math.isinf(value)):
                    item[key] = None

        return {"symbol": symbol, "history": history}
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.exception(f"Error fetching history for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch history for {symbol}: {str(e)}")

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
        
        # Wrap the news access in a try block since it's where the JSONDecodeError happens
        try:
            news = stock.news
        except Exception as news_error:
            logger.warning(f"Failed to fetch news data for {symbol}: {news_error}")
            return []  # Return empty list on error

        if not news:
             logger.warning(f"No news found for {symbol} from yfinance.")
             return []

        articles = []
        for item in news:
            try:
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
                    "title": title if title else "No title available",
                    "link": link if link else "#",
                    "source": source if source else "Unknown source",
                    "published": published_iso if published_iso else "",
                })
            except Exception as item_error:
                logger.warning(f"Error processing news item for {symbol}: {item_error}")
                # Continue processing other items
        
        return articles
    except Exception as e:
        logger.exception(f"Error fetching news for {symbol}: {e}")
        # Return empty list instead of raising an exception
        return []




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)