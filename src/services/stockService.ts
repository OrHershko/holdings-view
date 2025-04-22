import { StockData, StockHistoryData, PortfolioHolding, PortfolioSummary, NewsArticle } from '@/api/stockApi';
import { SMA, RSI } from 'technicalindicators';

// Read base URL from environment variable with robust fallback strategy
// 1. Use VITE_API_BASE_URL from env if available
// 2. Check if we're in development mode (import.meta.env.DEV)
// 3. Use deployment URL as final fallback
const getApiBaseUrl = () => {
  // Check if we have a defined API base URL in environment
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  if (envApiUrl) {
    return envApiUrl;
  }
  
  // In development mode, use localhost
  if (import.meta.env.DEV) {
    return 'http://localhost:8000/api';
  }
  
  // Production fallback
  return 'https://holdings-view.vercel.app/api';
};

const API_BASE_URL = getApiBaseUrl();

console.log(`Using API Base URL: ${API_BASE_URL}`); // Log for debugging

// Helper function to handle API errors consistently
const handleApiError = (error: any, context: string): never => {
  // Try to extract error details if available
  let errorMessage = 'API request failed';
  
  try {
    if (error.response) {
      // The request was made and server responded with error status
      const status = error.response.status;
      const data = error.response.data;
      errorMessage = `API error (${status}): ${JSON.stringify(data) || 'No error details'}`;
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = 'API server didn\'t respond';
    } else {
      // Something else happened
      errorMessage = error.message || 'Unknown API error';
    }
  } catch (e) {
    // Error handling itself failed
    errorMessage = `${error}`;
  }
  
  // Log with context and full error
  console.error(`${context} - ${errorMessage}`, error);
  throw new Error(errorMessage);
};

export const fetchStock = async (symbol: string): Promise<StockData> => {
  try {
    const response = await fetch(`${API_BASE_URL}/stock/${symbol}`);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Failed to read error response');
      throw new Error(`Failed to fetch stock data: ${response.status} ${errorText}`);
    }
    
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
      type: data.type || 'stock'
    };
  } catch (error) {
    return handleApiError(error, `fetchStock(${symbol})`);
  }
};

export const fetchStockHistory = async (
  symbol: string,
  period: string = '1y',
  interval: string = '1d'
): Promise<StockHistoryData> => {
  // Calculate a longer period for data fetching to accommodate indicators
  const fetchPeriod = getExtendedPeriod(period, 200); // Add enough for SMA 200

  try {
    console.log(`Fetching history for ${symbol} with period=${fetchPeriod}, interval=${interval} from ${API_BASE_URL}`);
    
    // Use the extended period for fetching data
    const response = await fetch(`${API_BASE_URL}/history/${symbol}?period=${fetchPeriod}&interval=${interval}`);
    
    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Failed to read error response');
      console.error("API Error Response:", errorBody);
      throw new Error(`Failed to fetch stock history: ${response.status} ${response.statusText}`);
    }
    
    let rawData;
    try {
      rawData = await response.json();
      console.log(`Received history response for ${symbol}:`, 
                  Object.keys(rawData || {}), 
                  `History items: ${rawData?.history?.length || 0}`);
                  
      // Debug first history item to see actual structure               
      if (rawData?.history?.[0]) {
        console.log(`First history item structure:`, Object.keys(rawData.history[0]));
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error(`Failed to parse history data: ${parseError.message}`);
    }
    
    // Validate the response data
    if (!rawData || !rawData.history || !Array.isArray(rawData.history) || rawData.history.length === 0) {
      console.warn(`Empty or invalid history data received for ${symbol}`);
      // Return empty arrays for all fields
      return { 
        dates: [], prices: [], volume: [], open: [], close: [], high: [], low: [],
        sma20: [], sma50: [], sma100: [], sma150: [], sma200: [], rsi: []
      };
    }

    // --- Calculate indicators using the FULL fetched data ---
    // Extract close values, handling different case formats that might come from the backend
    const allCloseValues = rawData.history.map((h: any) => {
      // Ensure each value is a valid number and handle both lowercase and uppercase field names
      if (!h || typeof h !== 'object') return null;
      
      // Try both lowercase (preferred) and uppercase (fallback) field names
      const closeValue = h.close !== undefined ? h.close : 
                         h.Close !== undefined ? h.Close : null;
                         
      const close = typeof closeValue === 'number' ? closeValue : 
                    (closeValue !== null ? parseFloat(String(closeValue)) : null);
                    
      return isNaN(close) ? null : close;
    }).filter((v: any) => v !== null); // Remove null values

    // Get dates with field name fallbacks
    const allDates = rawData.history.map((h: any) => 
      h.date || h.Date || null
    ).filter(Boolean); // Keep all dates for reference if needed
    
    const totalFetchedPoints = rawData.history.length;
    
    console.log(`Processed ${totalFetchedPoints} history points for ${symbol}, valid close values: ${allCloseValues.length}`);

    // Safety check - if we don't have valid close values, return empty data
    if (allCloseValues.length === 0) {
      console.warn(`No valid close values found for ${symbol}`);
      return { 
        dates: [], prices: [], volume: [], open: [], close: [], high: [], low: [],
        sma20: [], sma50: [], sma100: [], sma150: [], sma200: [], rsi: []
      };
    }

    // Safely calculate SMA with error handling
    const calculateSMA = (period: number, values: number[]) => {
      try {
        const sma = SMA.calculate({ period, values });
        // Pad with nulls at the beginning to match the length of the input array
        return Array(period - 1).fill(null).concat(sma);
      } catch (error) {
        console.error(`Error calculating SMA${period}:`, error);
        return Array(values.length).fill(null);
      }
    };

    // Calculate SMAs safely
    const smaPeriods = [20, 50, 100, 150, 200];
    const smaResultsFull: Record<string, (number | null)[]> = {};
    
    smaPeriods.forEach(p => {
      if (allCloseValues.length >= p) {
        smaResultsFull[`sma${p}`] = calculateSMA(p, allCloseValues);
      } else {
        // Not enough data for this SMA period
        smaResultsFull[`sma${p}`] = Array(totalFetchedPoints).fill(null);
      }
      
      // Ensure array length matches total points
      while (smaResultsFull[`sma${p}`].length < totalFetchedPoints) {
        smaResultsFull[`sma${p}`].push(null);
      }
      if (smaResultsFull[`sma${p}`].length > totalFetchedPoints) {
        smaResultsFull[`sma${p}`] = smaResultsFull[`sma${p}`].slice(0, totalFetchedPoints);
      }
    });

    // Safely calculate RSI with error handling
    let rsiFull: (number | null)[] = Array(totalFetchedPoints).fill(null);
    try {
      if (allCloseValues.length >= 14) {
        const rsiResult = RSI.calculate({ period: 14, values: allCloseValues });
        // Pad RSI results
        rsiFull = Array(14 - 1).fill(null).concat(rsiResult);
        // Ensure array length matches
        if (rsiFull.length > totalFetchedPoints) {
          rsiFull = rsiFull.slice(0, totalFetchedPoints);
        }
        while (rsiFull.length < totalFetchedPoints) {
          rsiFull.push(null);
        }
      }
    } catch (error) {
      console.error("Error calculating RSI:", error);
    }

    // --- Determine how many points to keep for the ORIGINAL period ---
    const pointsToShow = estimateDataPointsForPeriod(period, interval, totalFetchedPoints);
    const startIndex = Math.max(0, totalFetchedPoints - pointsToShow);

    // --- Slice the history and indicators to the original period ---
    const finalHistory = rawData.history.slice(startIndex);

    // Safely extract numeric values with null fallbacks
    const safeNumber = (value: any): number | null => {
      if (value === undefined || value === null) return null;
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      return isNaN(num) ? null : num;
    };
    
    // Helper to handle both lowercase and uppercase field names from API
    const getField = (obj: any, field: string): any => {
      if (!obj || typeof obj !== 'object') return null;
      // Try lowercase first (preferred), then uppercase
      return obj[field.toLowerCase()] !== undefined ? obj[field.toLowerCase()] :
             obj[field.charAt(0).toUpperCase() + field.slice(1)] !== undefined ? 
             obj[field.charAt(0).toUpperCase() + field.slice(1)] : null;
    };

    // --- Transform final sliced data ---
    const result = {
      // Handle both lowercase and uppercase field names from the API
      dates: finalHistory.map((h: any) => getField(h, 'date')),
      prices: finalHistory.map((h: any) => safeNumber(getField(h, 'close'))),
      volume: finalHistory.map((h: any) => safeNumber(getField(h, 'volume'))),
      open: finalHistory.map((h: any) => safeNumber(getField(h, 'open'))),
      close: finalHistory.map((h: any) => safeNumber(getField(h, 'close'))),
      high: finalHistory.map((h: any) => safeNumber(getField(h, 'high'))),
      low: finalHistory.map((h: any) => safeNumber(getField(h, 'low'))),
      // Slice the indicator results as well
      sma20: smaResultsFull.sma20.slice(startIndex),
      sma50: smaResultsFull.sma50.slice(startIndex),
      sma100: smaResultsFull.sma100.slice(startIndex),
      sma150: smaResultsFull.sma150.slice(startIndex),
      sma200: smaResultsFull.sma200.slice(startIndex),
      rsi: rsiFull.slice(startIndex),
    };
    
    console.log(`Returning ${result.dates.length} data points for ${symbol}`);
    return result;
  } catch (error) {
    console.error(`Error in fetchStockHistory for ${symbol}:`, error);
    // Return empty data on error
    return { 
      dates: [], prices: [], volume: [], open: [], close: [], high: [], low: [],
      sma20: [], sma50: [], sma100: [], sma150: [], sma200: [], rsi: []
    };
  }
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
    type: item.type || 'stock',
    position: item.position || 0,
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
  try {
    const response = await fetch(`${API_BASE_URL}/news/${symbol}`);
    
    // Check if response is ok
    if (!response.ok) {
      console.warn(`Failed to fetch news for ${symbol}: ${response.status} ${response.statusText}`);
      return [];
    }
    
    // Try to parse the JSON, but handle parse errors gracefully
    try {
      const data = await response.json();
      
      // Validate the response data is an array
      if (!Array.isArray(data)) {
        console.warn(`Invalid news data for ${symbol}: expected array but got ${typeof data}`);
        return [];
      }
      
      // Map and validate each news article
      return data.map((item): NewsArticle => ({
        title: item.title || "No title available",
        link: item.link || "#",
        source: item.source || "Unknown source",
        published: item.published || ""
      }));
    } catch (parseError) {
      console.error(`Error parsing news data for ${symbol}:`, parseError);
      return [];
    }
  } catch (error) {
    console.error(`Network error fetching news for ${symbol}:`, error);
    return [];
  }
};