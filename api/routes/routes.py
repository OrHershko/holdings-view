import logging
import re
import pandas as pd
import yfinance as yf
from typing import List, Dict
from fastapi import APIRouter, Query, HTTPException, Depends, Body, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from api.database.database import get_db
from api.models.models import HoldingDB, WatchlistDB, UserDB
from api.schemas.schemas import (HoldingCreate, HoldingResponse, PortfolioSummary, 
                              StockData, StockHistoryData, NewsArticle, ReorderRequest, 
                              WatchlistItemResponse, StockResponse, HistoryResponse)
from api.utils.utils import get_stock_info, calculate_sma_values
from api.auth.auth import get_current_user

router = APIRouter()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Diagnostic endpoint for debugging auth issues
@router.get("/auth-debug")
async def auth_debug(request: Request):
    """Diagnostic endpoint to check authentication token without the full auth flow"""
    try:
        from firebase_admin import auth as firebase_auth
        auth_header = request.headers.get("Authorization")
        
        if not auth_header:
            return {"error": "No Authorization header found"}
            
        if not auth_header.startswith("Bearer "):
            return {"error": "Authorization header does not start with 'Bearer '"}
            
        id_token = auth_header.split(" ")[1]
        
        try:
            decoded_token = firebase_auth.verify_id_token(id_token)
            return {
                "success": True,
                "decoded_token": {
                    "uid": decoded_token.get("uid"),
                    "email": decoded_token.get("email"),
                    "name": decoded_token.get("name"),
                    "exp": decoded_token.get("exp"),
                    "iat": decoded_token.get("iat"),
                }
            }
        except Exception as e:
            return {"error": f"Token verification failed: {str(e)}"}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}

@router.get("/api/portfolio")
def get_portfolio(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        db_holdings = db.query(HoldingDB).filter(HoldingDB.user_id == user_id).order_by(HoldingDB.position).all()
    except SQLAlchemyError as e:
         logger.error("Database error fetching holdings: %s", e)
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
            logger.debug("Raw stock data for %s:", holding.symbol)
            logger.debug("  pre_market_price = %s", stock_data.get('preMarketPrice'))
            logger.debug("  post_market_price = %s", stock_data.get('postMarketPrice'))
            logger.debug("  market_state = %s", stock_data.get('marketState'))

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
            logger.debug("Updated holding for %s:", holding.symbol)
            logger.debug("  preMarketPrice = %s", updated_holding['preMarketPrice'])
            logger.debug("  postMarketPrice = %s", updated_holding['postMarketPrice'])
            logger.debug("  marketState = %s", updated_holding['marketState'])
            
            updated_portfolio.append(updated_holding)
            total_day_change_value += day_change_value
            total_start_value += start_value

        except Exception as e:
            logger.error("Error updating holding %s from yfinance: %s", holding.symbol, str(e))
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
        logger.debug("First holding in final response:")
        logger.debug("  Symbol: %s", updated_portfolio[0]['symbol'])
        logger.debug("  preMarketPrice: %s", updated_portfolio[0]['preMarketPrice'])
        logger.debug("  postMarketPrice: %s", updated_portfolio[0]['postMarketPrice'])
        logger.debug("  marketState: %s", updated_portfolio[0]['marketState'])
    
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


@router.post("/api/portfolio/add")
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
        logger.error("Database error adding holding: %s", e)
        raise HTTPException(status_code=500, detail="Database error adding holding.")

@router.put("/api/portfolio/update")
def update_holding(symbol: str = Body(...), shares: float = Body(...), average_cost: float = Body(..., alias="averageCost"), user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    db_holding = db.query(HoldingDB).filter(HoldingDB.user_id == user_id, HoldingDB.symbol == symbol).first()
    if not db_holding:
        raise HTTPException(status_code=404, detail="Holding not found")
        
    db_holding.shares = shares
    db_holding.averageCost = average_cost
    try:
        db.commit()
        db.refresh(db_holding)
        return db_holding
    except SQLAlchemyError as e:
        db.rollback()
        logger.error("Database error updating holding: %s", e)
        raise HTTPException(status_code=500, detail="Database error updating holding.")

@router.delete("/api/portfolio/delete/{symbol}")
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
        logger.error("Database error deleting holding: %s", e)
        raise HTTPException(status_code=500, detail="Database error deleting holding.")

@router.post("/api/portfolio/reorder")
def reorder_portfolio(request: ReorderRequest, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    holdings = db.query(HoldingDB).filter(HoldingDB.user_id == user_id).all()
    holding_map = {h.symbol: h for h in holdings}

    for i, symbol in enumerate(request.orderedSymbols):
        if symbol in holding_map:
            holding_map[symbol].position = i

    db.commit()
    return {"message": "Portfolio reordered"}

@router.post("/api/portfolio/upload")
def upload_portfolio(holdings: List[HoldingCreate], user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    logger.debug("Received upload request for user_id=%s with %d holdings", user_id, len(holdings))

    if not holdings:
        logger.warning("No holdings received for upload.")
        raise HTTPException(status_code=400, detail="No valid holdings data received.")

    symbols_in_upload = {h.symbol for h in holdings}
    if len(symbols_in_upload) != len(holdings):
        logger.warning("Duplicate symbols found in upload data: %s", [h.symbol for h in holdings])
        raise HTTPException(status_code=400, detail="Duplicate symbols found in upload data.")

    try:
        logger.debug("Deleting existing holdings for user_id=%s", user_id)
        num_deleted = db.query(HoldingDB).filter(HoldingDB.user_id == user_id).delete()
        logger.info("Deleted %d existing holdings before upload.", num_deleted)

        # הדפסת כל ההחזקות שמועלות
        for i, h in enumerate(holdings):
            logger.debug("Preparing holding #%d: %s", i, h.model_dump())

        # הוספה
        new_db_holdings = [
            HoldingDB(**h.model_dump(), position=i, user_id=user_id)
            for i, h in enumerate(holdings)
        ]
        db.add_all(new_db_holdings)
        
        logger.debug("Committing new holdings to database...")
        db.commit()
        logger.info("Uploaded %d holdings successfully.", len(holdings))
        
        return {"message": f"{len(holdings)} holdings uploaded successfully and portfolio overwritten."}

    except SQLAlchemyError as e:
        db.rollback()
        logger.error("Database error uploading portfolio: %s", e)
        raise HTTPException(status_code=500, detail="Database error uploading portfolio.")
    except Exception as e:
        db.rollback()
        logger.error("General error during portfolio upload: %s", e)
        raise HTTPException(status_code=500, detail="Error processing portfolio upload.")

@router.get("/api/watchlist", response_model=List[WatchlistItemResponse])
def get_watchlist_details(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        watchlist_symbols_db = db.query(WatchlistDB.symbol).filter(WatchlistDB.user_id == user_id).all()
        watchlist_symbols = [s[0] for s in watchlist_symbols_db] # Extract symbols
    except SQLAlchemyError as e:
        logger.error("Database error fetching watchlist: %s", e)
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
            logger.error("Error fetching data for watchlist symbol %s: %s", symbol, str(e))
            watchlist_details.append(WatchlistItemResponse(symbol=symbol))
            
    return watchlist_details

@router.get("/api/stock/{symbol}", response_model=StockResponse)
def get_stock_data(symbol: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        stock_data = get_stock_info(symbol)
        return StockResponse(
            symbol=stock_data["symbol"],
            name=stock_data["name"],
            price=stock_data["price"],
            change=stock_data["change"],
            changePercent=stock_data["changePercent"],
            preMarketPrice=stock_data.get("preMarketPrice"),
            postMarketPrice=stock_data.get("postMarketPrice"),
            marketState=stock_data.get("marketState"),
            marketCap=stock_data.get("marketCap"),
            volume=stock_data.get("volume"),
            type=stock_data.get("type"),
        )
    except Exception as e:
        print(f"Error fetching data for stock symbol {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching stock data.")

@router.get("/api/stock/{symbol}/history", response_model=HistoryResponse)
def get_stock_history(symbol: str, period: str = Query("1d", enum=["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"]), user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        stock_history = yf.Ticker(symbol).history(period=period)
        return HistoryResponse(
            symbol=symbol,
            history=stock_history
        )
    except Exception as e:
        logger.warning(f"Error fetching history for stock symbol {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching stock history.")

@router.get("/api/news/{symbol}", response_model=List[NewsArticle])
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

@router.get("/api/search")
def search_stocks_endpoint(query: str = Query(..., min_length=1)):
    """Search for stocks matching a query string"""
    try:
        stock_info = get_stock_info(query.upper()) 
        return [{"symbol": stock_info["symbol"], "name": stock_info["name"]}]
    except Exception as e:
        logger.warning("Error searching for stock %s: %s", query, str(e))
        return []

@router.post("/api/watchlist/add/{symbol}")
def add_to_watchlist(symbol: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Add a symbol to user's watchlist"""
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
        logger.error("Database error adding to watchlist: %s", e)
        raise HTTPException(status_code=500, detail="Database error adding to watchlist.")

@router.delete("/api/watchlist/remove/{symbol}")
def remove_from_watchlist(symbol: str, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Remove a symbol from user's watchlist"""
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
        logger.error("Database error removing from watchlist: %s", e)
        raise HTTPException(status_code=500, detail="Database error removing from watchlist.")

@router.get("/api/history/{symbol}", response_model=HistoryResponse)
def get_history(
    request: Request,
    symbol: str,
    period: str = Query("1y", description="Duration of historical data"),
    interval: str = Query("1d", description="Data interval")
):
    """Get historical price data for a stock"""
    try:
        # Log request information
        logger.info("History request for %s with period=%s, interval=%s", symbol, period, interval)
        
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
                    logger.info("Adjusted period from %s to %s for %s interval", original_period, period, interval)
            # Otherwise use string matching for safety
            elif period not in ["1d", "5d", "7d", "60d"] and interval in ["1m", "2m", "5m", "15m", "30m", "90m"]:
                period = max_period
                period_adjusted = True
                logger.info("Adjusted period from %s to %s for %s interval", original_period, period, interval)
        
        # Fetch data from yfinance with potentially adjusted period
        stock = yf.Ticker(symbol)
        hist = stock.history(period=period, interval=interval)

        # Log response shape
        logger.info("History response for %s: %d rows, columns: %s", symbol, len(hist), list(hist.columns))

        if hist.empty:
            logger.warning("Empty history data for %s", symbol)
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
        calculate_sma_param = request.query_params.get('calculate_sma')
        if calculate_sma_param and calculate_sma_param.lower() == 'true':
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
            response_data["message"] = "Adjusted period from {} to {} due to {} interval limitations".format(original_period, period, interval)
            
        # Add SMA data if calculated
        if sma_data:
            response_data["sma"] = sma_data
        
        return response_data
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        error_msg = str(e)
        logger.exception("Error fetching history for %s: %s", symbol, error_msg)
        
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
