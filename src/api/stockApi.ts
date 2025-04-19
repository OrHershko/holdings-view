
interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
}

interface PortfolioHolding {
  symbol: string;
  name: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  change: number;
  changePercent: number;
  value: number;
  gain: number;
  gainPercent: number;
}

interface PortfolioSummary {
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

interface StockHistoryData {
  dates: string[];
  prices: number[];
  volume?: number[];
  high?: number[];
  low?: number[];
  open?: number[];
  close?: number[];
  sma20?: number[];
  sma50?: number[];
  rsi?: number[];
  macd?: number[];
  signal?: number[];
  histogram?: number[];
}

export const fetchStock = async (symbol: string): Promise<StockData> => {
  const response = await fetch(`/api/fetch_stock_data.py?command=stock&symbol=${symbol}`);
  if (!response.ok) {
    throw new Error('Failed to fetch stock data');
  }
  return await response.json();
};

export const searchStocks = async (query: string): Promise<StockData[]> => {
  const response = await fetch(`/api/fetch_stock_data.py?command=search&query=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error('Failed to search stocks');
  }
  return await response.json();
};

export const fetchPortfolio = async (): Promise<{
  holdings: PortfolioHolding[];
  summary: PortfolioSummary;
}> => {
  const response = await fetch('/api/fetch_stock_data.py?command=portfolio');
  if (!response.ok) {
    throw new Error('Failed to fetch portfolio');
  }
  return await response.json();
};

export const fetchWatchlist = async (): Promise<StockData[]> => {
  const response = await fetch('/api/fetch_stock_data.py?command=watchlist');
  if (!response.ok) {
    throw new Error('Failed to fetch watchlist');
  }
  return await response.json();
};

export const fetchStockHistory = async (symbol: string, period: string = '1y'): Promise<StockHistoryData> => {
  const response = await fetch(`/api/fetch_stock_data.py?command=history&symbol=${symbol}&period=${period}`);
  if (!response.ok) {
    throw new Error('Failed to fetch stock history');
  }
  return await response.json();
};
