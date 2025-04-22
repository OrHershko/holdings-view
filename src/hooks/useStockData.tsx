import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStock, fetchStockHistory, fetchPortfolio, fetchWatchlist, searchStocks, addToWatchlist, removeFromWatchlist, WatchlistItem } from '@/services/stockService';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://holdings-view.vercel.app/api';

// Define the response type to match our updated API
interface HistoryResponse {
  symbol: string;
  history: Array<{
    date: string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number;
    change: number;
    changePercent: number;
  }>;
}

export interface StockHistoryData {
  dates: string[];
  prices: (number | null)[];
  volume: (number | null)[];
  high: (number | null)[];
  low: (number | null)[];
  open: (number | null)[];
  close: (number | null)[];
  sma20?: (number | null)[];
  sma50?: (number | null)[];
  sma100?: (number | null)[];
  sma150?: (number | null)[];
  sma200?: (number | null)[];
  rsi?: (number | null)[];
}

export function useStock(symbol: string) {
  return useQuery({
    queryKey: ['stock', symbol],
    queryFn: () => fetchStock(symbol),
    enabled: !!symbol,
    staleTime: 60000, // 1 minute
  });
}

export function useStockHistory(
  symbol: string,
  period: string = '1y',
  interval: string = '1d' // Add interval parameter with default
) {
  return useQuery({
    queryKey: ['stockHistory', symbol, period, interval],
    queryFn: async () => {
      console.log(`Fetching history for ${symbol} with period ${period} and interval ${interval}`);
      try {
        const response = await axios.get<HistoryResponse>(
          `${API_BASE_URL}/history/${symbol}?period=${period}&interval=${interval}`
        );
        
        console.log(`Received history data for ${symbol}:`, response.data);
        
        // Safely extract the history array with validation
        let history: any[] = [];
        try {
          if (response.data && typeof response.data === 'object' && 'history' in response.data) {
            const historyData = response.data.history;
            // Ensure history is an array
            history = Array.isArray(historyData) ? historyData : [];
          }
        } catch (e) {
          console.error("Error extracting history from response:", e);
        }
        
        // Check if we have data
        if (history.length === 0) {
          console.warn(`No history data received for ${symbol}`);
          return {
            dates: [],
            prices: [],
            volume: [],
            high: [],
            low: [],
            open: [],
            close: [],
            sma20: [],
            sma50: [],
            sma100: [],
            sma150: [],
            sma200: [],
            rsi: []
          };
        }
        
        // Transform the data with enhanced safety checks
        const safeMap = <T, R>(arr: T[], mapper: (item: T, index: number) => R): R[] => {
          if (!Array.isArray(arr)) {
            console.warn("Expected array but got:", arr);
            return [];
          }
          
          try {
            return arr.map(mapper);
          } catch (e) {
            console.error("Error mapping array:", e);
            return [];
          }
        };
        
        const dates = safeMap(history, item => {
          try {
            return item && item.date ? String(item.date) : null;
          } catch (e) {
            console.error("Error processing date:", e);
            return null;
          }
        }).filter(Boolean) as string[];
        
        const open = safeMap(history, item => {
          try {
            if (item === null || item === undefined) return null;
            const val = typeof item.open === 'number' ? item.open : (
              item.open ? parseFloat(item.open) : null
            );
            return isNaN(val as number) ? null : val;
          } catch (e) {
            return null;
          }
        });
        
        const high = safeMap(history, item => {
          try {
            if (item === null || item === undefined) return null;
            const val = typeof item.high === 'number' ? item.high : (
              item.high ? parseFloat(item.high) : null
            );
            return isNaN(val as number) ? null : val;
          } catch (e) {
            return null;
          }
        });
        
        const low = safeMap(history, item => {
          try {
            if (item === null || item === undefined) return null;
            const val = typeof item.low === 'number' ? item.low : (
              item.low ? parseFloat(item.low) : null
            );
            return isNaN(val as number) ? null : val;
          } catch (e) {
            return null;
          }
        });
        
        const close = safeMap(history, item => {
          try {
            if (item === null || item === undefined) return null;
            const val = typeof item.close === 'number' ? item.close : (
              item.close ? parseFloat(item.close) : null
            );
            return isNaN(val as number) ? null : val;
          } catch (e) {
            return null;
          }
        });
        
        const volume = safeMap(history, item => {
          try {
            if (item === null || item === undefined) return 0;
            const val = typeof item.volume === 'number' ? item.volume : (
              item.volume ? parseFloat(item.volume) : 0
            );
            return isNaN(val as number) ? 0 : val;
          } catch (e) {
            return 0;
          }
        });
        
        // Create empty placeholder arrays for indicator data that will be calculated in the chart component
        const length = Math.max(dates.length || 0);
        const emptyIndicator = new Array(length).fill(null);
        
        // Ensure all arrays have the same length to prevent slice issues
        return {
          dates: dates.length > 0 ? dates : [],
          prices: close.length > 0 ? close : [], // Alias for close prices
          volume: volume.length > 0 ? volume : [],
          high: high.length > 0 ? high : [],
          low: low.length > 0 ? low : [],
          open: open.length > 0 ? open : [],
          close: close.length > 0 ? close : [],
          // Add empty indicator arrays that will be filled by the chart component
          sma20: emptyIndicator,
          sma50: emptyIndicator,
          sma100: emptyIndicator,
          sma150: emptyIndicator,
          sma200: emptyIndicator,
          rsi: emptyIndicator
        };
      } catch (error) {
        console.error(`Error fetching history for ${symbol}:`, error);
        // Return empty arrays on error instead of throwing
        return {
          dates: [],
          prices: [],
          volume: [],
          high: [],
          low: [],
          open: [],
          close: [],
          sma20: [],
          sma50: [],
          sma100: [],
          sma150: [],
          sma200: [],
          rsi: []
        };
      }
    },
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: fetchPortfolio,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    gcTime: 0
  });
}

export function useWatchlist() {
  return useQuery<WatchlistItem[]>({
    queryKey: ['watchlist'],
    queryFn: fetchWatchlist,
    staleTime: 60000, // 1 minute
  });
}

export function useStockSearch(query: string) {
  return useQuery({
    queryKey: ['stockSearch', query],
    queryFn: () => searchStocks(query),
    enabled: query.length > 1,
    staleTime: 60000, // 1 minute
  });
}

// --- Watchlist Mutations ---

export function useAddToWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (symbol: string) => addToWatchlist(symbol),
    onSuccess: () => {
      // Invalidate and refetch watchlist query after successful add
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
    // Optional: Add onError for error handling
  });
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (symbol: string) => removeFromWatchlist(symbol),
    onSuccess: () => {
      // Invalidate and refetch watchlist query after successful remove
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
    // Optional: Add onError for error handling
  });
}

export const useStockInfo = (symbol: string) => {
  return useQuery({
    queryKey: ['stockInfo', symbol],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/stock/${symbol}`);
      return response.data;
    },
    refetchOnWindowFocus: false,
  });
};

export const useMultipleStockInfo = (symbols: string[]) => {
  // Create a state to track loading status
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!symbols.length) {
        setData([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const requests = symbols.map(symbol => 
          axios.get(`${API_BASE_URL}/stock/${symbol}`)
            .then(response => response.data)
            .catch(error => {
              console.error(`Error fetching data for ${symbol}:`, error);
              return null; // Return null for failed requests
            })
        );
        
        const results = await Promise.all(requests);
        setData(results.filter(Boolean)); // Filter out nulls (failed requests)
      } catch (error) {
        console.error("Error fetching multiple stock data:", error);
        setError(error instanceof Error ? error : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [symbols.join(',')]); // Dependencies: all symbols joined as string

  return { data, isLoading, error };
};
