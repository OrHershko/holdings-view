import tempfile
import yfinance as yf

tmp_dir = tempfile.gettempdir()
print(f"Setting yfinance cache to: {tmp_dir}")
yf.set_tz_cache_location(tmp_dir)
