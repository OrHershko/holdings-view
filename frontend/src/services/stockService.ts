import { StockData, StockHistoryData, PortfolioHolding, PortfolioSummary, NewsArticle } from '@/api/stockApi';
import { SMA, RSI } from 'technicalindicators';
import { fetchWithAuth } from './apiService';


const handleApiError = (error: any, context: string): never => {
  let errorMessage;
  
  try {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      errorMessage = `API error (${status}): ${JSON.stringify(data) || 'No error details'}`;
    } else if (error.request) {
      errorMessage = 'API server didn\'t respond';
    } else {
      errorMessage = error.message || 'Unknown API error';
    }
  } catch (e) {
    errorMessage = `${error}`;
  }
  
  console.error(`${context} - ${errorMessage}`, error);
  throw new Error(errorMessage);
};

export const fetchStock = async (symbol: string): Promise<StockData> => {
  try {
    const response = await fetchWithAuth(`/api/stock/${symbol}`);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Failed to read error response');
      throw new Error(`Failed to fetch stock data: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    return {
      symbol: data.symbol || 'N/A',
      name: data.name || 'N/A',
      price: data.price || 0,
      change: data.change || 0,
      changePercent: data.changePercent || 0,
      marketCap: data.marketCap || 0,
      volume: data.volume || 0,
      type: data.type || 'stock',
      preMarketPrice: data.preMarketPrice || 0,
      postMarketPrice: data.postMarketPrice || 0,
      marketState: data.marketState
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
  const fetchPeriod = getExtendedPeriod(period, 200); 
  
  try {
    console.log(`Fetching history for ${symbol} with period=${fetchPeriod}, interval=${interval} from /api`);
    
    const response = await fetchWithAuth(`/api/history/${symbol}?period=${fetchPeriod}&interval=${interval}&calculate_sma=true`);
    
    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Failed to read error response');
      console.error("API Error Response:", errorBody);
      throw new Error(`Failed to fetch stock history: ${response.status} ${response.statusText}`);
    }
    
    let rawData;
    try {
      rawData = await response.json();
      console.log(`Received history response for ${symbol}:`, 
                  Object.keys(rawData ?? {}), 
                  `History items: ${rawData?.history?.length ?? 0}`);
      
      if (rawData?.sma) {
        console.log(`Received SMA data from server: ${Object.keys(rawData.sma).join(', ')}`);
      }
                  
      if (rawData?.history?.[0]) {
        console.log(`First history item structure:`, Object.keys(rawData.history[0]));
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error(`Failed to parse history data: ${parseError.message}`);
    }
    
    if (!rawData || !Array.isArray(rawData.history) || rawData.history.length === 0) {
      console.warn(`No valid history data received for ${symbol}`);
      return { 
        dates: [], prices: [], volume: [], open: [], close: [], high: [], low: [],
        sma20: [], sma50: [], sma100: [], sma150: [], sma200: [], rsi: []
      };
    }

    // --- Process the fetched data ---
    const allCloseValues = rawData.history.map((h: any) => {
      if (!h || typeof h !== 'object') return null;
      
      let close = null;
      if (typeof h.close === 'number') {
        close = h.close;
      } else if (h.close !== null && h.close !== undefined) {
        close = parseFloat(String(h.close));
      } else if (typeof h.Close === 'number') {
        close = h.Close;
      } else if (h.Close !== null && h.Close !== undefined) {
        close = parseFloat(String(h.Close));
      }
                   
      return isNaN(close) ? null : close;
    }).filter((v: any) => v !== null); 
    
    const totalFetchedPoints = rawData.history.length;
    
    console.log(`Processed ${totalFetchedPoints} history points for ${symbol}, valid close values: ${allCloseValues.length}`);

    const calculateSMA = (period: number, values: number[]): (number | null)[] => {
      try {
        const sma = SMA.calculate({ period, values });
        return Array(period - 1).fill(null).concat(sma);
      } catch (error) {
        console.error(`Error calculating SMA${period}:`, error);
        return Array(values.length).fill(null);
      }
    };
    
    const smaResultsFull: Record<string, (number | null)[]> = {};
    
    if (rawData?.sma) {
      const serverSMAData = rawData.sma;
      
      const smaPeriods = [20, 50, 100, 150, 200]; 
      smaPeriods.forEach(period => {
        const smaKey = `sma${period}`;
        if (serverSMAData[smaKey] && Array.isArray(serverSMAData[smaKey])) {
          const serverSMAValues = serverSMAData[smaKey];
          
          smaResultsFull[smaKey] = [];
          
          for (let i = 0; i < totalFetchedPoints; i++) {
            if (i < serverSMAValues.length) {
              smaResultsFull[smaKey][i] = serverSMAValues[i];
            } else {
              smaResultsFull[smaKey][i] = null;
            }
          }
          
          console.log(`Using server-calculated ${smaKey}: ${smaResultsFull[smaKey].filter(v => v !== null).length} valid points`);
        } else {
          console.warn(`Server did not provide ${smaKey} data, calculating locally`);
          if (allCloseValues.length >= period) {
            smaResultsFull[smaKey] = calculateSMA(period, allCloseValues);
          } else {
            smaResultsFull[smaKey] = Array(totalFetchedPoints).fill(null);
          }
        }
      });
    } else {
      console.warn("Server did not provide SMA data, calculating locally");
      
      const smaPeriods = [20, 50, 100, 150, 200];
      smaPeriods.forEach(period => {
        if (allCloseValues.length >= period) {
          smaResultsFull[`sma${period}`] = calculateSMA(period, allCloseValues);
        } else {
          smaResultsFull[`sma${period}`] = Array(totalFetchedPoints).fill(null);
        }
      });
    }
    
    let rsiFull: (number | null)[] = Array(totalFetchedPoints).fill(null);
    try {
      if (allCloseValues.length >= 14) {
        const rsiResult = RSI.calculate({ period: 14, values: allCloseValues });
        rsiFull = Array(14 - 1).fill(null).concat(rsiResult);
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

    
    const getField = (obj: any, field: string): any => {
      if (!obj || typeof obj !== 'object') return null;
      return obj[field.toLowerCase()] !== undefined ? obj[field.toLowerCase()] :
             obj[field.charAt(0).toUpperCase() + field.slice(1)] !== undefined ? 
             obj[field.charAt(0).toUpperCase() + field.slice(1)] : null;
    };

    // --- Transform final sliced data ---
    const result = {
      dates: finalHistory.map((h: any) => getField(h, 'date')),
      prices: finalHistory.map((h: any) => safeNumber(getField(h, 'close'))),
      volume: finalHistory.map((h: any) => safeNumber(getField(h, 'volume'))),
      open: finalHistory.map((h: any) => safeNumber(getField(h, 'open'))),
      close: finalHistory.map((h: any) => safeNumber(getField(h, 'close'))),
      high: finalHistory.map((h: any) => safeNumber(getField(h, 'high'))),
      low: finalHistory.map((h: any) => safeNumber(getField(h, 'low'))),
      
      sma20: smaResultsFull.sma20?.slice(startIndex) || [],
      sma50: smaResultsFull.sma50?.slice(startIndex) || [],
      sma100: smaResultsFull.sma100?.slice(startIndex) || [],
      sma150: smaResultsFull.sma150?.slice(startIndex) || [],
      sma200: smaResultsFull.sma200?.slice(startIndex) || [],
      rsi: rsiFull.slice(startIndex),
    };
    
    console.log(`Returning ${result.dates.length} data points for ${symbol}`);
    return result;
  } catch (error) {
    console.error(`Error fetching stock history for ${symbol}:`, error);

    return { 
      dates: [], prices: [], volume: [], open: [], close: [], high: [], low: [],
      sma20: [], sma50: [], sma100: [], sma150: [], sma200: [], rsi: []
    };
  }
};

// --- Helper Functions ---

function getExtendedPeriod(displayPeriod: string, maxIndicatorPeriod: number): string {
    
    if (displayPeriod.toLowerCase() === 'max') {
        return '10y'; 
    }

    const match = displayPeriod.match(/(\d+)([dmy]o?)/); 
    if (!match) return `${maxIndicatorPeriod}d`; 

    const [_, valueStr, unitRaw] = match;
    const value = parseInt(valueStr);
    const unit = unitRaw.charAt(0); 

    let displayDays = 0;
    if (unit === 'd') displayDays = value;
    else if (unit === 'm') displayDays = value * 30; 
    else if (unit === 'y') displayDays = value * 365; 
    else return `${maxIndicatorPeriod}d`; 

    const totalDaysNeeded = displayDays + maxIndicatorPeriod;

    if (totalDaysNeeded > 730) return `${Math.ceil(totalDaysNeeded / 365)}y`;
    if (totalDaysNeeded > 60) return `${Math.ceil(totalDaysNeeded / 30)}mo`;
    return `${totalDaysNeeded}d`;
}

function estimateDataPointsForPeriod(period: string, interval: string, totalFetchedPoints: number): number {
    if (period.toLowerCase() === 'max') {
        return totalFetchedPoints;
    }

    const periodMatch = period.match(/(\d+)([dmy]o?)/);
    if (!periodMatch) return totalFetchedPoints; 

    const [_, valueStr, unitRaw] = periodMatch;
    const value = parseInt(valueStr);
    const unit = unitRaw.charAt(0);

    let estimatedPoints: number;

    const pointsPerDay = {
        '1m': 390, '2m': 195, '5m': 78, '15m': 26, '30m': 13,
        '60m': 7, '1h': 7, '90m': 5,
        '1d': 1, '5d': 1/5, '1wk': 1/5, '1mo': 1/22,
    };

    const multiplier = pointsPerDay[interval] || 1; 

    if (unit === 'd') {
        estimatedPoints = value * multiplier;
    } else if (unit === 'm') {
        estimatedPoints = value * 22 * multiplier; 
    } else if (unit === 'y') {
        estimatedPoints = value * 252 * multiplier; 
    } else {
        return totalFetchedPoints; 
    }

    return Math.min(Math.ceil(estimatedPoints), totalFetchedPoints);
}

export const fetchPortfolio = async (): Promise<{
  holdings: PortfolioHolding[];
  summary: PortfolioSummary;
}> => {
  try {
    const response = await fetchWithAuth(`/api/portfolio`);
    if (!response.ok) throw new Error(`Failed to fetch portfolio: ${response.status}`);
    
    const data = await response.json();
    
    const holdings: PortfolioHolding[] = data.holdings?.map((item: any) => {
      const holding: PortfolioHolding = {
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
        preMarketPrice: item.preMarketPrice || 0,
        postMarketPrice: item.postMarketPrice || 0,
        marketState: item.marketState || 'REGULAR'
      };
      return holding;
    }) || [];
    

    
    const summary: PortfolioSummary = data.summary || {
      totalValue: 0,
      totalGain: 0,
      totalGainPercent: 0,
      dayChange: 0,
      dayChangePercent: 0,
    };
    
    return { holdings, summary };
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    throw error;
  }
};

export interface WatchlistItem {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  changePercent?: number;
  preMarketPrice?: number;
  postMarketPrice?: number;
  marketState?: string;
}

// --- Watchlist Service Functions ---

export const fetchWatchlist = async (): Promise<WatchlistItem[]> => {
  const response = await fetchWithAuth(`/api/watchlist`);
  if (!response.ok) throw new Error('Failed to fetch watchlist');
  return response.json();
};

export const addToWatchlist = async (symbol: string): Promise<{ message: string }> => {
  const response = await fetchWithAuth(`/api/watchlist/add/${symbol.toUpperCase()}`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to add to watchlist' }));
    throw new Error(errorData.detail || 'Failed to add to watchlist');
  }
  return response.json();
};

export const removeFromWatchlist = async (symbol: string): Promise<{ message: string }> => {
  const response = await fetchWithAuth(`/api/watchlist/remove/${symbol.toUpperCase()}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to remove from watchlist' }));
    throw new Error(errorData.detail || 'Failed to remove from watchlist');
  }
  return response.json();
};

export const searchStocks = async (query: string): Promise<StockData[]> => {
  const response = await fetchWithAuth(`/api/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Failed to search stocks');
  const data = await response.json();
  return data.results?.map((item: any) => ({
    symbol: item.symbol,
    name: item.name,
    price: item.price || 0,
    change: item.change || 0,
    changePercent: item.changePercent || 0,
    marketCap: 0,
    volume: 0,
  })) || [];
};

export const fetchNews = async (symbol: string): Promise<NewsArticle[]> => {
  try {
    const response = await fetchWithAuth(`/api/news/${symbol}`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch news for ${symbol}: ${response.status} ${response.statusText}`);
      return [];
    }
    
    try {
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.warn(`Invalid news data for ${symbol}: expected array but got ${typeof data}`);
        return [];
      }
      
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

/**
 * Fetches detailed stock information directly from yfinance
 * @param symbol Stock symbol to fetch detailed data for
 * @returns Complete yfinance info object with all available data
 */
export const fetchDetailedStockInfo = async (symbol: string): Promise<any> => {
  try {
    const response = await fetchWithAuth(`/api/stock/${symbol}/detailed`);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Failed to read error response');
      throw new Error(`Failed to fetch detailed stock data: ${response.status} ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    return handleApiError(error, `fetchDetailedStockInfo(${symbol})`);
  }
};