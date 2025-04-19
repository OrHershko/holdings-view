
// Mock API for frontend development
// In a real application, this would connect to our Python backend

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

// Mock data for frontend development
const mockStocks: Record<string, StockData> = {
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 187.72,
    change: 1.54,
    changePercent: 0.83,
    marketCap: 2940000000000,
    volume: 48203930
  },
  MSFT: {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: 417.72,
    change: 3.15,
    changePercent: 0.76,
    marketCap: 3100000000000,
    volume: 15489230
  },
  GOOGL: {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 160.17,
    change: -0.54,
    changePercent: -0.34,
    marketCap: 2010000000000,
    volume: 18932541
  },
  AMZN: {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    price: 184.07,
    change: 2.31,
    changePercent: 1.27,
    marketCap: 1910000000000,
    volume: 35284104
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    price: 176.75,
    change: -2.86,
    changePercent: -1.59,
    marketCap: 563000000000,
    volume: 72983021
  }
};

const mockPortfolio: PortfolioHolding[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    shares: 10,
    averageCost: 170.50,
    currentPrice: 187.72,
    change: 1.54,
    changePercent: 0.83,
    value: 1877.20,
    gain: 172.20,
    gainPercent: 10.10
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    shares: 5,
    averageCost: 380.25,
    currentPrice: 417.72,
    change: 3.15,
    changePercent: 0.76,
    value: 2088.60,
    gain: 187.35,
    gainPercent: 9.85
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    shares: 8,
    averageCost: 145.80,
    currentPrice: 160.17,
    change: -0.54,
    changePercent: -0.34,
    value: 1281.36,
    gain: 114.96,
    gainPercent: 9.86
  }
];

const mockPortfolioSummary: PortfolioSummary = {
  totalValue: 5247.16,
  totalGain: 474.51,
  totalGainPercent: 9.94,
  dayChange: 23.02,
  dayChangePercent: 0.44
};

const mockWatchlist = ['AMZN', 'TSLA', 'NVDA', 'META'];

export const fetchStock = async (symbol: string): Promise<StockData> => {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
  
  if (mockStocks[symbol]) {
    return mockStocks[symbol];
  }
  
  throw new Error(`Stock not found: ${symbol}`);
};

export const searchStocks = async (query: string): Promise<StockData[]> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
  
  if (!query) return [];
  
  const results = Object.values(mockStocks).filter(stock => 
    stock.symbol.toLowerCase().includes(query.toLowerCase()) || 
    stock.name.toLowerCase().includes(query.toLowerCase())
  );
  
  return results;
};

export const fetchPortfolio = async (): Promise<{
  holdings: PortfolioHolding[];
  summary: PortfolioSummary;
}> => {
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
  
  return {
    holdings: mockPortfolio,
    summary: mockPortfolioSummary
  };
};

export const fetchWatchlist = async (): Promise<StockData[]> => {
  await new Promise(resolve => setTimeout(resolve, 600)); // Simulate API delay
  
  return mockWatchlist.map(symbol => mockStocks[symbol]).filter(Boolean);
};

// For the chart data, we'll generate some mock historical data
export const fetchStockHistory = async (symbol: string, period: string = '1y'): Promise<{
  dates: string[];
  prices: number[];
}> => {
  await new Promise(resolve => setTimeout(resolve, 700)); // Simulate API delay
  
  const basePrice = mockStocks[symbol]?.price || 100;
  const volatility = 0.15; // Mock volatility
  
  // Generate appropriate number of data points based on period
  let days = 30;
  if (period === '1y') days = 365;
  else if (period === '6m') days = 180;
  else if (period === '1m') days = 30;
  else if (period === '1w') days = 7;
  else if (period === '1d') days = 1;
  
  const dates: string[] = [];
  const prices: number[] = [];
  
  // Generate dates and prices
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
    
    // Generate a random walk for the price
    if (i === days) {
      prices.push(basePrice * (1 - Math.random() * 0.1));
    } else {
      const prevPrice = prices[prices.length - 1];
      const change = prevPrice * volatility * (Math.random() - 0.5);
      prices.push(prevPrice + change);
    }
  }
  
  return { dates, prices };
};
