import { StockData, StockHistoryData, PortfolioHolding, PortfolioSummary } from '@/api/stockApi';

const API_BASE_URL = 'http://localhost:8000/api'; // Define the base URL for the backend

export const fetchStock = async (symbol: string): Promise<StockData> => {
  const response = await fetch(`${API_BASE_URL}/stock/${symbol}`);
  if (!response.ok) throw new Error('Failed to fetch stock data');
  const data = await response.json();
  // Basic validation/transformation if needed
  return {
    symbol: data.info?.symbol || symbol.toUpperCase(),
    name: data.info?.longName || data.info?.shortName || 'N/A',
    price: data.info?.currentPrice || data.info?.regularMarketPrice || 0,
    change: data.info?.regularMarketChange || 0,
    changePercent: data.info?.regularMarketChangePercent || 0,
    marketCap: data.info?.marketCap || 0,
    volume: data.info?.regularMarketVolume || 0,
  };
};

export const fetchStockHistory = async (
  symbol: string,
  period: string = '1y',
  interval: string = '1d' // Default interval
): Promise<StockHistoryData> => {
  // Construct URL with both period and interval
  const response = await fetch(`${API_BASE_URL}/history/${symbol}?period=${period}&interval=${interval}`);
  if (!response.ok) {
    const errorBody = await response.text();
    console.error("API Error Response:", errorBody);
    throw new Error(`Failed to fetch stock history: ${response.statusText}`);
  }
  const data = await response.json();

  // Transform data to match StockHistoryData interface
  // Ensure 'Date' field is correctly mapped (backend now standardizes on 'Date')
  return {
    dates: data.history.map((h: any) => h.Date), // Use the standardized 'Date' field
    prices: data.history.map((h: any) => h.Close), // Assuming 'Close' is the primary price
    volume: data.history.map((h: any) => h.Volume ?? 0), // Use ?? 0 for potential nulls
    open: data.history.map((h: any) => h.Open ?? null),
    close: data.history.map((h: any) => h.Close ?? null),
    high: data.history.map((h: any) => h.High ?? null),
    low: data.history.map((h: any) => h.Low ?? null),
    // Indicators might not be returned by default from yfinance history,
    // they usually require separate calculation or a different library/API endpoint.
    // Keep these optional or remove if not provided by backend.
    sma20: data.indicators?.sma20,
    sma50: data.indicators?.sma50,
    rsi: data.indicators?.rsi,
    macd: data.indicators?.macd?.macd,
    signal: data.indicators?.macd?.signal,
    histogram: data.indicators?.macd?.histogram,
  };
};

export const fetchPortfolio = async (): Promise<{
  holdings: PortfolioHolding[];
  summary: PortfolioSummary;
}> => {
  const response = await fetch(`${API_BASE_URL}/portfolio`);
  if (!response.ok) throw new Error('Failed to fetch portfolio');
  const data = await response.json();
  // Assuming the backend returns data in the expected structure
  // Add more robust mapping and error handling as needed
  const holdings: PortfolioHolding[] = data.portfolio?.map((item: any) => ({
    symbol: item.symbol,
    name: item.name || 'N/A', // Fetch name if not provided
    shares: item.shares || 0,
    averageCost: item.averageCost || 0, // Fetch avg cost if not provided
    currentPrice: item.price || 0,
    change: item.change || 0,
    changePercent: item.changePercent || 0,
    value: (item.shares || 0) * (item.price || 0),
    gain: ((item.price || 0) - (item.averageCost || 0)) * (item.shares || 0),
    gainPercent: item.averageCost ? (((item.price || 0) / item.averageCost) - 1) * 100 : 0,
  })) || [];

  const summary: PortfolioSummary = data.summary || {
    totalValue: 0,
    totalGain: 0,
    totalGainPercent: 0,
    dayChange: 0,
    dayChangePercent: 0,
  };

  return { holdings, summary };
};

export const fetchWatchlist = async (): Promise<StockData[]> => {
  const response = await fetch(`${API_BASE_URL}/watchlist`);
  if (!response.ok) throw new Error('Failed to fetch watchlist');
  const data = await response.json();
  // Assuming backend returns a list of stock-like objects
  return data.watchlist?.map((item: any) => ({
    symbol: item.symbol,
    name: item.name || 'N/A',
    price: item.price || 0,
    change: item.change || 0,
    changePercent: item.changePercent || 0,
    marketCap: item.marketCap || 0,
    volume: item.volume || 0,
  })) || [];
};

export const searchStocks = async (query: string): Promise<StockData[]> => {
  const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Failed to search stocks');
  const data = await response.json();
  // Assuming backend returns a list of stock-like objects
  return data.results?.map((item: any) => ({
    symbol: item.symbol,
    name: item.name || 'N/A',
    price: item.price || 0, // Search results might not have live price
    change: item.change || 0,
    changePercent: item.changePercent || 0,
    marketCap: 0, // Search results might not have this detail
    volume: 0,
  })) || [];
};
