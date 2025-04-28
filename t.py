import yfinance as yf

ticker = yf.Ticker("aapl")
print(ticker.history(period="1mo", interval="1d"))

