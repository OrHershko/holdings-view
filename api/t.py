import yfinance as yf

ticker = yf.Ticker("AAPL")
print(ticker.info["shortName"])
print(ticker.info["longName"])