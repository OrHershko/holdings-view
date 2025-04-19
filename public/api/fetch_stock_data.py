
import yfinance as yf
import json
from datetime import datetime, timedelta
import sys

"""
This is a simple Python script that uses the yfinance library to fetch stock data.
In a production environment, this would be integrated into a proper backend API service.

Usage:
python fetch_stock_data.py <command> [arguments]

Commands:
- stock <symbol>: Get current data for a stock
- history <symbol> <period>: Get historical data for a stock
- search <query>: Search for stocks
- portfolio: Get portfolio data (mock data in this example)
- watchlist: Get watchlist data (mock data in this example)

Examples:
python fetch_stock_data.py stock AAPL
python fetch_stock_data.py history MSFT 1y
python fetch_stock_data.py search apple
"""

def get_stock_data(symbol):
    """Fetch current data for a stock symbol"""
    try:
        stock = yf.Ticker(symbol)
        info = stock.info
        
        # Get the latest price data
        hist = stock.history(period="1d")
        if not hist.empty:
            current_price = hist['Close'].iloc[-1]
            prev_close = info.get('previousClose', hist['Open'].iloc[0])
            change = current_price - prev_close
            change_percent = (change / prev_close) * 100
        else:
            current_price = info.get('currentPrice', 0)
            prev_close = info.get('previousClose', 0)
            change = current_price - prev_close
            change_percent = (change / prev_close) * 100 if prev_close else 0
        
        return {
            "symbol": symbol,
            "name": info.get('shortName', info.get('longName', symbol)),
            "price": current_price,
            "change": change,
            "changePercent": change_percent,
            "marketCap": info.get('marketCap', 0),
            "volume": info.get('volume', 0)
        }
    except Exception as e:
        print(f"Error fetching data for {symbol}: {e}", file=sys.stderr)
        return {
            "symbol": symbol,
            "name": symbol,
            "price": 0,
            "change": 0,
            "changePercent": 0,
            "marketCap": 0,
            "volume": 0,
            "error": str(e)
        }

def get_stock_history(symbol, period="1y"):
    """Fetch historical data for a stock symbol"""
    try:
        stock = yf.Ticker(symbol)
        hist = stock.history(period=period)
        
        dates = hist.index.strftime('%Y-%m-%d').tolist()
        prices = hist['Close'].tolist()
        
        return {
            "dates": dates,
            "prices": prices
        }
    except Exception as e:
        print(f"Error fetching historical data for {symbol}: {e}", file=sys.stderr)
        return {
            "dates": [],
            "prices": [],
            "error": str(e)
        }

def search_stocks(query):
    """Search for stocks matching the query (simplified implementation)"""
    # This is a simplified implementation
    # In a real application, you might use a more sophisticated search service
    common_stocks = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "FB", "NVDA", "JPM", "V", "JNJ"]
    results = []
    
    # Simple search through common stocks
    for symbol in common_stocks:
        if query.lower() in symbol.lower():
            results.append(get_stock_data(symbol))
    
    return results

def get_portfolio():
    """Get portfolio data (mock data in this example)"""
    # In a real application, this would come from a database
    portfolio_symbols = ["AAPL", "MSFT", "GOOGL"]
    holdings = []
    
    total_value = 0
    total_cost = 0
    day_change = 0
    
    # Mock share counts and average costs
    shares = {
        "AAPL": 10,
        "MSFT": 5,
        "GOOGL": 8
    }
    
    avg_costs = {
        "AAPL": 170.50,
        "MSFT": 380.25,
        "GOOGL": 145.80
    }
    
    for symbol in portfolio_symbols:
        stock_data = get_stock_data(symbol)
        shares_count = shares.get(symbol, 0)
        avg_cost = avg_costs.get(symbol, 0)
        
        current_value = shares_count * stock_data["price"]
        cost_basis = shares_count * avg_cost
        gain = current_value - cost_basis
        gain_percent = (gain / cost_basis) * 100 if cost_basis else 0
        
        holdings.append({
            "symbol": stock_data["symbol"],
            "name": stock_data["name"],
            "shares": shares_count,
            "averageCost": avg_cost,
            "currentPrice": stock_data["price"],
            "change": stock_data["change"],
            "changePercent": stock_data["changePercent"],
            "value": current_value,
            "gain": gain,
            "gainPercent": gain_percent
        })
        
        total_value += current_value
        total_cost += cost_basis
        day_change += shares_count * stock_data["change"]
    
    total_gain = total_value - total_cost
    total_gain_percent = (total_gain / total_cost) * 100 if total_cost else 0
    day_change_percent = (day_change / total_value) * 100 if total_value else 0
    
    summary = {
        "totalValue": total_value,
        "totalGain": total_gain,
        "totalGainPercent": total_gain_percent,
        "dayChange": day_change,
        "dayChangePercent": day_change_percent
    }
    
    return {
        "holdings": holdings,
        "summary": summary
    }

def get_watchlist():
    """Get watchlist data (mock data in this example)"""
    # In a real application, this would come from a database
    watchlist_symbols = ["AMZN", "TSLA", "NVDA", "META"]
    return [get_stock_data(symbol) for symbol in watchlist_symbols]

def main():
    if len(sys.argv) < 2:
        print("Usage: python fetch_stock_data.py <command> [arguments]")
        return
    
    command = sys.argv[1].lower()
    
    if command == "stock" and len(sys.argv) >= 3:
        symbol = sys.argv[2].upper()
        result = get_stock_data(symbol)
    elif command == "history" and len(sys.argv) >= 4:
        symbol = sys.argv[2].upper()
        period = sys.argv[3]
        result = get_stock_history(symbol, period)
    elif command == "search" and len(sys.argv) >= 3:
        query = sys.argv[2]
        result = search_stocks(query)
    elif command == "portfolio":
        result = get_portfolio()
    elif command == "watchlist":
        result = get_watchlist()
    else:
        result = {"error": "Invalid command or missing arguments"}
    
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
