import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStock, fetchStockHistory, fetchPortfolio, fetchWatchlist, searchStocks, addToWatchlist, removeFromWatchlist, WatchlistItem } from '@/services/stockService';
import type { StockHistoryData, StockData } from '@/api/stockApi';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';

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
  interval: string = '1d', 
  options: any = {} 
) {
  return useQuery<StockHistoryData, Error>({
    queryKey: ['stockHistory', symbol, period, interval],
    queryFn: () => fetchStockHistory(symbol, period, interval),
    enabled: !!symbol,
    staleTime: 300000, 
    ...options
  });
}

export function usePortfolio() {
  const queryClient = useQueryClient();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
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
    enabled: !!userId
  });
}

export function useWatchlist() {
  const queryClient = useQueryClient();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    });
    
    return () => unsubscribe();
  }, [queryClient]);
  
  return useQuery<WatchlistItem[]>({
    queryKey: ['watchlist', userId],
    queryFn: fetchWatchlist,
    staleTime: 60000, 
    enabled: !!userId,
  });
}

export function useStockSearch(query: string) {
  return useQuery({
    queryKey: ['stockSearch', query],
    queryFn: () => searchStocks(query),
    enabled: query.length > 1,
    staleTime: 60000, 
  });
}

// --- Watchlist Mutations ---

export function useAddToWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (symbol: string) => addToWatchlist(symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (symbol: string) => removeFromWatchlist(symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
}

export const useStockInfo = (symbol: string) => {
  return useQuery({
    queryKey: ['stockInfo', symbol],
    queryFn: async () => {
      const response = await fetch(`/api/stock/${symbol}`);
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
    staleTime: 60000, 
  });
}
