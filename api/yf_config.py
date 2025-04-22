import tempfile
import yfinance as yf

# Set cache location to a writable directory
tmp_dir = tempfile.gettempdir()
print(f"Setting yfinance cache to: {tmp_dir}")
yf.set_tz_cache_location(tmp_dir)

# Configure any additional YFinance settings here 