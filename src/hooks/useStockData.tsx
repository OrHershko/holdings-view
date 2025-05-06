import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStock, fetchStockHistory, fetchPortfolio, fetchWatchlist, searchStocks, addToWatchlist, removeFromWatchlist, WatchlistItem } from '@/services/stockService';
import type { StockHistoryData, StockData } from '@/api/stockApi';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://holdings-view.vercel.app/api';

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
  interval: string = '1d', // Add interval parameter with default
  options: any = {} // Allow custom query options
) {
  return useQuery<StockHistoryData, Error>({
    // Include interval in the queryKey for unique caching
    queryKey: ['stockHistory', symbol, period, interval],
    // Pass interval to the fetch function
    queryFn: () => fetchStockHistory(symbol, period, interval),
    enabled: !!symbol,
    staleTime: 300000, // 5 minutes
    // Apply any additional options passed
    ...options
  });
}

export function usePortfolio() {
  const queryClient = useQueryClient();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  // Listen for auth state changes to invalidate portfolio queries when user changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Force refetch portfolio when user changes
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    });
    
    return () => unsubscribe();
  }, [queryClient]);
  
  return useQuery({
    queryKey: ['portfolio', userId],
    queryFn: fetchPortfolio,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    gcTime: 0,
    // Only fetch when a user is logged in
    enabled: !!userId
  });
}

export function useWatchlist() {
  const queryClient = useQueryClient();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  // Listen for auth state changes to invalidate queries when user changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Force refetch watchlist when user changes
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    });
    
    return () => unsubscribe();
  }, [queryClient]);
  
  return useQuery<WatchlistItem[]>({
    queryKey: ['watchlist', userId],
    queryFn: fetchWatchlist,
    // Use the original settings from your app for consistency
    staleTime: 60000, // 1 minute
    // Only fetch when a user is logged in
    enabled: !!userId,
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
      const response = await fetch(`${API_BASE_URL}/stock/${symbol}`);
      return response.json();
    },
    refetchOnWindowFocus: false,
  });
};

export function useMultipleStockInfo(symbols: string[]) {
  return useQuery<StockData[], Error>({
    queryKey: ['multipleStockInfo', symbols],
    queryFn: () => Promise.all(symbols.map(fetchStock)),
    enabled: symbols.length > 0,
    staleTime: 60000, // 1 minute
  });
}
