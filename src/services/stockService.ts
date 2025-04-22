import { StockData, StockHistoryData, PortfolioHolding, PortfolioSummary, NewsArticle } from '@/api/stockApi';
import { SMA, RSI } from 'technicalindicators';

// Read base URL from environment variable
// For local dev, set VITE_API_BASE_URL=http://localhost:8000/api in a .env file
// Vercel will use environment variables set in its dashboard
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://holdings-view.vercel.app/api';

console.log(`Using API Base URL: ${API_BASE_URL}`); // Log for debugging

export const fetchStock = async (symbol: string): Promise<StockData> => {
  const response = await fetch(`${API_BASE_URL}/stock/${symbol}`);
  if (!response.ok) throw new Error('Failed to fetch stock data');
  const data = await response.json();
  // Basic validation/transformation if needed
  return {
    symbol: data.symbol || 'N/A',
    name: data.name || 'N/A',
    price: data.price || 0,
    change: data.change || 0,
    changePercent: data.changePercent || 0,
    marketCap: data.marketCap || 0,
    volume: data.volume || 0,
  };
};

export const fetchStockHistory = async (
  symbol: string,
  period: string = '1y',
  interval: string = '1d'
): Promise<StockHistoryData> => {
  // Calculate a longer period for data fetching to accommodate indicators
  const fetchPeriod = getExtendedPeriod(period, 200); // Add enough for SMA 200

  // Use the extended period for fetching data
  const response = await fetch(`${API_BASE_URL}/history/${symbol}?period=${fetchPeriod}&interval=${interval}`);
  if (!response.ok) {
    const errorBody = await response.text();
    console.error("API Error Response:", errorBody);
    throw new Error(`Failed to fetch stock history: ${response.statusText}`);
  }
  const rawData = await response.json(); // Rename to rawData

  if (!rawData.history || rawData.history.length === 0) {
    // Handle empty history case
    return { dates: [], prices: [], volume: [], open: [], close: [], high: [], low: [] };
  }

  // --- Calculate indicators using the FULL fetched data ---
  const allCloseValues = rawData.history.map((h: any) => h.Close);
  const allDates = rawData.history.map((h: any) => h.Date); // Keep all dates for reference if needed
  const totalFetchedPoints = rawData.history.length;

  const smaPeriods = [20, 50, 100, 150, 200];
  const smaResultsFull: Record<string, (number | null)[]> = {};
  smaPeriods.forEach(p => {
    const sma = SMA.calculate({ period: p, values: allCloseValues });
    // Pad the SMA results to match the length of allCloseValues
    smaResultsFull[`sma${p}`] = Array(p - 1).fill(null).concat(sma);
    // Ensure it doesn't exceed the total length (edge case)
    if (smaResultsFull[`sma${p}`].length > totalFetchedPoints) {
       smaResultsFull[`sma${p}`] = smaResultsFull[`sma${p}`].slice(0, totalFetchedPoints);
    }
     // Ensure it's not shorter than total length (pad end if necessary, though unlikely with SMA)
    while (smaResultsFull[`sma${p}`].length < totalFetchedPoints) {
        smaResultsFull[`sma${p}`].push(null); // Or handle differently if needed
    }
  });

  const rsiResult = RSI.calculate({ period: 14, values: allCloseValues });
  // Pad RSI results
  const rsiFull = Array(14 - 1).fill(null).concat(rsiResult);
   if (rsiFull.length > totalFetchedPoints) {
       rsiFull.slice(0, totalFetchedPoints);
   }
   while (rsiFull.length < totalFetchedPoints) {
        rsiFull.push(null);
   }


  // --- Determine how many points to keep for the ORIGINAL period ---
  const pointsToShow = estimateDataPointsForPeriod(period, interval, totalFetchedPoints);
  const startIndex = Math.max(0, totalFetchedPoints - pointsToShow);

  // --- Slice the history and indicators to the original period ---
  const finalHistory = rawData.history.slice(startIndex);

  // --- Transform final sliced data ---
  return {
    dates: finalHistory.map((h: any) => h.Date),
    prices: finalHistory.map((h: any) => h.Close),
    volume: finalHistory.map((h: any) => h.Volume ?? 0),
    open: finalHistory.map((h: any) => h.Open ?? null),
    close: finalHistory.map((h: any) => h.Close ?? null),
    high: finalHistory.map((h: any) => h.High ?? null),
    low: finalHistory.map((h: any) => h.Low ?? null),
    // Slice the indicator results as well
    sma20: smaResultsFull.sma20.slice(startIndex),
    sma50: smaResultsFull.sma50.slice(startIndex),
    sma100: smaResultsFull.sma100.slice(startIndex),
    sma150: smaResultsFull.sma150.slice(startIndex),
    sma200: smaResultsFull.sma200.slice(startIndex),
    rsi: rsiFull.slice(startIndex),
    // Assuming MACD indicators were also calculated on full data and need slicing
    // macd: macdFull?.macd?.slice(startIndex),
    // signal: macdFull?.signal?.slice(startIndex),
    // histogram: macdFull?.histogram?.slice(startIndex),
  };
};

// --- Helper Functions ---

function getExtendedPeriod(displayPeriod: string, maxIndicatorPeriod: number): string {
    // If displayPeriod is 'max', we need enough history for the indicator.
    // Let's assume 'max' implies fetching a very long duration like '10y' or more,
    // which should be sufficient for a 200-day indicator.
    // If the backend handles 'max' intelligently, we might just return 'max'.
    // For simplicity here, let's ensure at least enough days for the indicator if 'max'.
    if (displayPeriod.toLowerCase() === 'max') {
        // Decide on a sufficiently long period for 'max' that covers indicators
        return '10y'; // Example: fetch 10 years for 'max'
    }

    const match = displayPeriod.match(/(\d+)([dmy]o?)/); // Added 'o?' for 'mo'
    if (!match) return `${maxIndicatorPeriod}d`; // Default if can't parse

    const [_, valueStr, unitRaw] = match;
    const value = parseInt(valueStr);
    const unit = unitRaw.charAt(0); // d, m, y

    let displayDays = 0;
    if (unit === 'd') displayDays = value;
    else if (unit === 'm') displayDays = value * 30; // Approx days
    else if (unit === 'y') displayDays = value * 365; // Approx days
    else return `${maxIndicatorPeriod}d`; // Fallback

    const totalDaysNeeded = displayDays + maxIndicatorPeriod;

    // Convert back to appropriate period format for yfinance
    if (totalDaysNeeded > 730) return `${Math.ceil(totalDaysNeeded / 365)}y`;
    if (totalDaysNeeded > 60) return `${Math.ceil(totalDaysNeeded / 30)}mo`;
    return `${totalDaysNeeded}d`;
}

function estimateDataPointsForPeriod(period: string, interval: string, totalFetchedPoints: number): number {
    // If period is 'max', show all fetched points
    if (period.toLowerCase() === 'max') {
        return totalFetchedPoints;
    }

    const periodMatch = period.match(/(\d+)([dmy]o?)/);
    if (!periodMatch) return totalFetchedPoints; // Fallback

    const [_, valueStr, unitRaw] = periodMatch;
    const value = parseInt(valueStr);
    const unit = unitRaw.charAt(0);

    // Estimate trading days/periods based on requested period
    let estimatedPoints: number;

    // Rough estimates (consider weekends/holidays for daily/weekly)
    const pointsPerDay = {
        '1m': 390, '2m': 195, '5m': 78, '15m': 26, '30m': 13,
        '60m': 7, '1h': 7, '90m': 5, // Approx
        '1d': 1, '5d': 1/5, '1wk': 1/5, '1mo': 1/22, // Points per trading day
    };

    const multiplier = pointsPerDay[interval] || 1; // Default to 1 (daily)

    if (unit === 'd') {
        estimatedPoints = value * multiplier;
    } else if (unit === 'm') {
        estimatedPoints = value * 22 * multiplier; // Approx 22 trading days/month
    } else if (unit === 'y') {
        estimatedPoints = value * 252 * multiplier; // Approx 252 trading days/year
    } else {
        return totalFetchedPoints; // Fallback
    }

    // Return the estimated number, but not more than the total points fetched
    return Math.min(Math.ceil(estimatedPoints), totalFetchedPoints);
}

export const fetchPortfolio = async (): Promise<{
  holdings: PortfolioHolding[];
  summary: PortfolioSummary;
}> => {
  const response = await fetch(`${API_BASE_URL}/portfolio`);
  if (!response.ok) throw new Error('Failed to fetch portfolio');
  const data = await response.json();
  const holdings: PortfolioHolding[] = data.holdings?.map((item: any) => ({
    symbol: item.symbol,
    name: item.name || 'N/A',
    shares: item.shares || 0,
    averageCost: item.averageCost || 0,
    currentPrice: item.currentPrice || 0,
    change: item.change || 0,
    changePercent: item.changePercent || 0,
    value: item.value || 0,
    gain: item.gain || 0,
    gainPercent: item.gainPercent || 0,
    type: item.type || 'stock'
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

// --- Watchlist Types (Define if needed or use inline) ---
export interface WatchlistItem {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  changePercent?: number;
}

// --- Watchlist Service Functions ---

export const fetchWatchlist = async (): Promise<WatchlistItem[]> => {
  const response = await fetch(`${API_BASE_URL}/watchlist`);
  if (!response.ok) throw new Error('Failed to fetch watchlist');
  return response.json();
};

export const addToWatchlist = async (symbol: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/watchlist/add/${symbol.toUpperCase()}`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to add to watchlist' }));
    throw new Error(errorData.detail || 'Failed to add to watchlist');
  }
  return response.json();
};

export const removeFromWatchlist = async (symbol: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE_URL}/watchlist/remove/${symbol.toUpperCase()}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to remove from watchlist' }));
    throw new Error(errorData.detail || 'Failed to remove from watchlist');
  }
  return response.json();
};

export const searchStocks = async (query: string): Promise<StockData[]> => {
  const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Failed to search stocks');
  const data = await response.json();
  // Assuming backend returns a list of stock-like objects
  return data.results?.map((item: any) => ({
    symbol: item.symbol,
    name: item.name,
    price: item.price || 0, // Search results might not have live price
    change: item.change || 0,
    changePercent: item.changePercent || 0,
    marketCap: 0, // Search results might not have this detail
    volume: 0,
  })) || [];
};

export const fetchNews = async (symbol: string): Promise<NewsArticle[]> => {
  const response = await fetch(`${API_BASE_URL}/news/${symbol}`);
  if (!response.ok) throw new Error('Failed to fetch news');
  return await response.json();
};