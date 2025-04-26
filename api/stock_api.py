import logging
from functools import lru_cache
from typing import Dict, List, Optional, Union, Any
from pydantic import BaseModel
from fastapi import FastAPI, Query, HTTPException, Depends, Request, Body
from fastapi.middleware.cors import CORSMiddleware
import os
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

# --- Database Setup (SQLAlchemy) ---
from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import text
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
        #connect_args={"sslmode": "require"},  # Required for Neon/Vercel Postgres
        pool_pre_ping=True  # Add connection health check
    )
    
    # Test the connection
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        print("Database connection successful!")
except Exception as e:
    print(f"Error connecting to database: {str(e)}")
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Initialize Firebase Admin SDK
firebase_creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if not firebase_creds_path:
    raise ValueError("GOOGLE_APPLICATION_CREDENTIALS must be set for Firebase Admin SDK")
firebase_admin.initialize_app(credentials.Certificate(firebase_creds_path))

# --- Database Models ---
class HoldingDB(Base):
    __tablename__ = "holdings"
    user_id = Column(String, primary_key=True, index=True)
    symbol = Column(String, primary_key=True, index=True)
    shares = Column(Float, nullable=False)
    averageCost = Column(Float, nullable=False)
    position = Column(Integer, nullable=False, default=0)


class WatchlistDB(Base):
    __tablename__ = "watchlist"
    user_id = Column(String, primary_key=True, index=True)
    symbol = Column(String, primary_key=True, index=True)


class UserDB(Base):
    __tablename__ = "users"
    uid         = Column(String, primary_key=True, index=True)
    email       = Column(String, nullable=False, unique=True)
    displayName = Column(String)
    createdAt   = Column(DateTime, default=datetime.utcnow)
    updatedAt   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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

# Dependency to get current user from Firebase token
def get_current_user(request: Request, db: Session = Depends(get_db)) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    id_token = auth_header.split(" ")[1]
    try:
        decoded_token = firebase_auth.verify_id_token(id_token)
        uid = decoded_token.get("uid")
        # Ensure user exists in DB
        user = db.query(UserDB).get(uid)
        if not user:
            user = UserDB(
                uid=uid,
                email=decoded_token.get("email", ""),
                displayName=decoded_token.get("name", "")
            )
            db.add(user)
            db.commit()
        return uid
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# --- Helper Functions 
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
            # Use numpy's convolve for efficient moving average calculation
            weights = np.ones(period) / period
            sma_values = np.convolve(close_values, weights, mode='valid')
            
            # Pad with None values at the beginning to match original array length
            padding = [None] * (period - 1)
            sma_data[key] = padding + sma_values.tolist()
        else:
            # Not enough data for this period, fill with None
            sma_data[key] = [None] * len(close_values)
    
    return sma_data

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
    preMarketPrice: Optional[float] = None
    postMarketPrice: Optional[float] = None
    marketState: Optional[str] = None

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
    volume: Optional[float] = None
    type: Optional[str] = None
    preMarketPrice: Optional[float] = None
    postMarketPrice: Optional[float] = None
    marketState: Optional[str] = None

class StockHistoryData(BaseModel):
    dates: List[str]
    prices: List[float]
    volume: List[float]
    high: List[float]
    low: List[float]
    open: List[float]
    close: List[float]
    preMarketPrice: Optional[float] = None
    postMarketPrice: Optional[float] = None

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
    preMarketPrice: Optional[float] = None
    marketState: Optional[str] = None

class StockResponse(BaseModel):
    symbol: str
    price: float
    name: Optional[str] = None
    change: Optional[float] = None
    changePercent: Optional[float] = None
    marketCap: Optional[float] = None
    volume: Optional[int] = None
    type: Optional[str] = None
    marketState: Optional[str] = None

class HistoryResponse(BaseModel):
    symbol: str
    history: List[Dict]
    period: str
    interval: str
    adjusted: Optional[bool] = None
    requestedPeriod: Optional[str] = None
    actualPeriod: Optional[str] = None
    message: Optional[str] = None
    sma: Optional[Dict[str, List[Union[float, None]]]] = None
    type: Optional[str] = None
    marketState: Optional[str] = None

class SearchResponse(BaseModel):
    results: List[dict]

# --- CORS Setup --- 
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://holdings-view.vercel.app")

app = FastAPI()

# Allow both production and development URLs
allowed_origins = [
    "https://holdings-view.vercel.app",  # Production URL
    "http://localhost:8080",             # Local development
    FRONTEND_URL,                        # From environment variable
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Refactored API Routes --- 

@app.get("/api/portfolio")
def get_portfolio(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        db_holdings = db.query(HoldingDB).filter(HoldingDB.user_id == user_id).order_by(HoldingDB.position).all()
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

            # Log the raw stock data for debugging
            print(f"Raw stock data for {holding.symbol}:")
            print(f"  pre_market_price = {stock_data.get('preMarketPrice')}")
            print(f"  post_market_price = {stock_data.get('postMarketPrice')}")
            print(f"  market_state = {stock_data.get('marketState')}")

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
                "type": stock_data["type"],
                "preMarketPrice": stock_data["preMarketPrice"],
                "postMarketPrice": stock_data["postMarketPrice"],
                "marketState": stock_data["marketState"]
            }
            
            # Log the holding we're adding to the portfolio
            print(f"Updated holding for {holding.symbol}:")
            print(f"  preMarketPrice = {updated_holding['preMarketPrice']}")
            print(f"  postMarketPrice = {updated_holding['postMarketPrice']}")
            print(f"  marketState = {updated_holding['marketState']}")
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
                "value": None, "gain": None, "gainPercent": None, "type": None,
                "preMarketPrice": None,
                "postMarketPrice": None,
                "marketState": None
            })

    # Calculate portfolio summary
    total_value = sum(h.get("value", 0) for h in updated_portfolio if h.get("value") is not None)
    total_cost_basis = sum(h.shares * h.averageCost for h in db_holdings)
    total_gain = total_value - total_cost_basis
    total_gain_percent = (total_gain / total_cost_basis) * 100 if total_cost_basis > 0 else 0
    day_change_percent = (total_day_change_value / total_start_value) * 100 if total_start_value > 0 else 0

    # Log the final response for debugging
    if updated_portfolio:
        print(f"First holding in final response:")
        print(f"  Symbol: {updated_portfolio[0]['symbol']}")
        print(f"  preMarketPrice: {updated_portfolio[0]['preMarketPrice']}")
        print(f"  postMarketPrice: {updated_portfolio[0]['postMarketPrice']}")
        print(f"  marketState: {updated_portfolio[0]['marketState']}")
    
    response_data = {
        "holdings": updated_portfolio,
        "summary": {
            "totalValue": total_value,
            "totalGain": total_gain,
            "totalGainPercent": total_gain_percent,
            "dayChange": total_day_change_value,
            "dayChangePercent": day_change_percent,
        }
    }
    
    return response_data


@app.post("/api/portfolio/add")
def add_to_portfolio(holding_data: HoldingCreate, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if holding exists
    db_holding = db.query(HoldingDB).filter(HoldingDB.user_id == user_id, HoldingDB.symbol == holding_data.symbol).first()
    if db_holding:
        raise HTTPException(status_code=400, detail="Holding already exists. Use PUT to update.")
    
    last_position = db.query(HoldingDB).filter(HoldingDB.user_id == user_id).count()

    new_holding = HoldingDB(**holding_data.model_dump(), position=last_position, user_id=user_id)
    
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
def update_holding(symbol: str = Body(...), shares: float = Body(...), averageCost: float = Body(...), user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    db_holding = db.query(HoldingDB).filter(HoldingDB.user_id == user_id, HoldingDB.symbol == symbol).first()
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
def delete_holding(symbol: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    db_holding = db.query(HoldingDB).filter(HoldingDB.user_id == user_id, HoldingDB.symbol == symbol).first()
    if not db_holding:
        raise HTTPException(status_code=404, detail="Holding not found")
        
    try:
        db.delete(db_holding)
        db.commit()

        holdings = db.query(HoldingDB).filter(HoldingDB.user_id == user_id).order_by(HoldingDB.position).all()
        for i, h in enumerate(holdings):
            h.position = i
        db.commit()

        return {"message": "Holding deleted successfully"}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Database error deleting holding: {e}")
        raise HTTPException(status_code=500, detail="Database error deleting holding.")

@app.post("/api/portfolio/reorder")
def reorder_portfolio(request: ReorderRequest, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    holdings = db.query(HoldingDB).filter(HoldingDB.user_id == user_id).all()
    holding_map = {h.symbol: h for h in holdings}

    for i, symbol in enumerate(request.orderedSymbols):
        if symbol in holding_map:
            holding_map[symbol].position = i

    db.commit()
    return {"message": "Portfolio reordered"}


@app.post("/api/portfolio/upload")
def upload_portfolio(holdings: List[HoldingCreate], user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    if not holdings:
        raise HTTPException(status_code=400, detail="No valid holdings data received.")
    
    symbols_in_upload = {h.symbol for h in holdings}
    if len(symbols_in_upload) != len(holdings):
        raise HTTPException(status_code=400, detail="Duplicate symbols found in upload data.")
        
    try:
        # Delete existing portfolio
        num_deleted = db.query(HoldingDB).filter(HoldingDB.user_id == user_id).delete()
        print(f"Deleted {num_deleted} existing holdings before upload.")
        
        # Add new holdings
        new_db_holdings = [HoldingDB(**h.dict(), position=i, user_id=user_id) for i, h in enumerate(holdings)]
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
def get_watchlist_details(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        watchlist_symbols_db = db.query(WatchlistDB.symbol).filter(WatchlistDB.user_id == user_id).all()
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
                    changePercent=stock_data["changePercent"],
                    preMarketPrice=stock_data.get("preMarketPrice"),
                    marketState=stock_data.get("marketState")
                )
            )
        except Exception as e:
            print(f"Error fetching data for watchlist symbol {symbol}: {str(e)}")
            watchlist_details.append(WatchlistItemResponse(symbol=symbol))
            
    return watchlist_details

@app.post("/api/watchlist/add/{symbol}")
def add_to_watchlist(symbol: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    if not symbol.isalnum():
        raise HTTPException(status_code=400, detail="Invalid symbol format")
    symbol_upper = symbol.upper()
    
    db_symbol = db.query(WatchlistDB).filter(WatchlistDB.user_id == user_id, WatchlistDB.symbol == symbol_upper).first()
    if db_symbol:
        return {"message": f"{symbol_upper} is already in watchlist"}
        
    
    new_watchlist_item = WatchlistDB(user_id=user_id, symbol=symbol_upper)
    try:
        db.add(new_watchlist_item)
        db.commit()
        return {"message": "Symbol added to watchlist"}
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Database error adding to watchlist: {e}")
        raise HTTPException(status_code=500, detail="Database error adding to watchlist.")

@app.delete("/api/watchlist/remove/{symbol}")
def remove_from_watchlist(symbol: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    symbol_upper = symbol.upper()
    db_symbol = db.query(WatchlistDB).filter(WatchlistDB.user_id == user_id, WatchlistDB.symbol == symbol_upper).first()
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
    request: Request,
    symbol: str,
    period: str = Query("1y", description="Duration of historical data"),
    interval: str = Query("1d", description="Data interval")
):
    try:
        # Log request information
        logger.info(f"History request for {symbol} with period={period}, interval={interval}")
        
        # Map intervals to their maximum allowed periods
        max_periods = {
            "1m": "7d",   # 1-minute data: max 7 days
            "2m": "60d",  # 2-minute data: max 60 days
            "5m": "60d",  # 5-minute data: max 60 days
            "15m": "60d", # 15-minute data: max 60 days
            "30m": "60d", # 30-minute data: max 60 days
            "60m": "730d", # 60-minute data: max 730 days (2 years)
            "90m": "60d",  # 90-minute data: max 60 days
            "1h": "730d",  # 1-hour data: max 730 days (2 years)
            "1d": "max",   # daily data: max available
            "5d": "max",   # 5-day data: max available
            "1wk": "max",  # weekly data: max available
            "1mo": "max",  # monthly data: max available
            "3mo": "max"   # quarterly data: max available
        }
        
        # Check if period adjustment is needed
        original_period = period
        period_adjusted = False
        
        # Get the max allowed period for this interval
        if interval in max_periods and max_periods[interval] != "max":
            # These period strings from Yahoo Finance
            period_values = {
                "1d": 1, "5d": 5, "7d": 7, "60d": 60, "90d": 90,
                "1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "2y": 730, 
                "5y": 1825, "10y": 3650, "ytd": None, "max": None
            }
            
            # Try to get numeric values for comparison
            requested_days = None
            if period in period_values:
                requested_days = period_values[period]
            elif period.endswith('d'):
                try:
                    requested_days = int(period[:-1])
                except ValueError:
                    pass
            
            max_allowed_days = None
            max_period = max_periods[interval]
            if max_period in period_values:
                max_allowed_days = period_values[max_period]
            elif max_period.endswith('d'):
                try:
                    max_allowed_days = int(max_period[:-1])
                except ValueError:
                    pass
            
            # If we can compare numerically, adjust if needed
            if requested_days is not None and max_allowed_days is not None:
                if requested_days > max_allowed_days:
                    period = max_period
                    period_adjusted = True
                    logger.info(f"Adjusted period from {original_period} to {period} for {interval} interval")
            # Otherwise use string matching for safety
            elif period not in ["1d", "5d", "7d", "60d"] and interval in ["1m", "2m", "5m", "15m", "30m", "90m"]:
                period = max_period
                period_adjusted = True
                logger.info(f"Adjusted period from {original_period} to {period} for {interval} interval")
            
        # Fetch data from yfinance with potentially adjusted period
        stock = yf.Ticker(symbol)
        hist = stock.history(period=period, interval=interval)

        # Log response shape
        logger.info(f"History response for {symbol}: {len(hist)} rows, columns: {list(hist.columns)}")

        if hist.empty:
            logger.warning(f"Empty history data for {symbol}")
            raise HTTPException(status_code=404, detail=f"No historical data found for {symbol}")
            
        # Convert the DataFrame to a list of records - with explicit type checking
        hist_dict = hist.reset_index().to_dict('records')
        
        # Convert all dates to string format for JSON serialization
        for item in hist_dict:
            if 'Date' in item and pd.notnull(item['Date']):
                item['date'] = item['Date'].strftime('%Y-%m-%d')
                
            # If there's a datetime index with time, format it with time
            if 'Datetime' in item and pd.notnull(item['Datetime']):
                item['date'] = item['Datetime'].strftime('%Y-%m-%d %H:%M:%S')
        
        # Calculate SMAs if requested
        sma_data = None
        calculate_sma = request.query_params.get('calculate_sma')
        if calculate_sma and calculate_sma.lower() == 'true':
            close_values = hist['Close'].values
            if len(close_values) > 0:
                sma_data = calculate_sma_values(close_values)
        
        response_data = {
            "history": hist_dict,
            "symbol": symbol,
            "period": period,
            "interval": interval
        }
        
        # Add period adjustment info to response if applicable
        if period_adjusted:
            response_data["adjusted"] = True
            response_data["requestedPeriod"] = original_period
            response_data["actualPeriod"] = period
            response_data["message"] = f"Adjusted period from {original_period} to {period} due to {interval} interval limitations"
            
        # Add SMA data if calculated
        if sma_data:
            response_data["sma"] = sma_data
        
        return response_data
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        error_msg = str(e)
        logger.exception(f"Error fetching history for {symbol}: {error_msg}")
        
        # Detect specific Yahoo Finance error about data unavailability
        if "data not available for startTime" in error_msg and "The requested range must be within" in error_msg:
            timeframe_match = re.search(r"must be within the last (\d+) days", error_msg)
            if timeframe_match:
                max_days = timeframe_match.group(1)
                detail = f"The requested {interval} interval data is only available for the last {max_days} days. Try a larger interval (like '1d') for longer periods."
            else:
                detail = f"The requested data is not available for the specified period and interval. Try a larger interval (like '1d') for longer periods."
            raise HTTPException(status_code=400, detail=detail)
            
        raise HTTPException(status_code=500, detail=f"Failed to fetch historical data for {symbol}: {error_msg}")

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