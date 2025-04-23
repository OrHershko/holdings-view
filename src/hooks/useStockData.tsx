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
  return useQuery<StockHistoryData>({
    // Include interval in the queryKey for unique caching
    queryKey: ['stockHistory', symbol, period, interval],
    // Pass interval to the fetch function
    queryFn: () => fetchStockHistory(symbol, period, interval),
    enabled: !!symbol,
    staleTime: 300000, // 5 minutes
    // Consider adding placeholderData or initialData if needed
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
