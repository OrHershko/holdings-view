import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPortfolio, 
  addStock, 
  updateStock, 
  removeStock, 
  reorderPortfolio, 
  HoldingCreate 
} from '@/services/portfolioService';
import { 
  getWatchlist, 
  addToWatchlist, 
  removeFromWatchlist, 
  reorderWatchlist 
} from '@/services/watchlistService';
import { 
  fetchStock, 
  fetchStockHistory, 
  searchStocks, 
  WatchlistItem 
} from '@/services/stockService';
import type { StockHistoryData, StockData } from '@/api/stockApi';
import { getAuth } from 'firebase/auth';

// Still using API_BASE_URL for direct API calls
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://holdings-view.vercel.app/api';

/**
 * Hooks for stock data from a single PostgreSQL source
 */

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
    staleTime: 300000, // 5 minutes
    ...options
  });
}

export function usePortfolio(options?: { enabled?: boolean }) {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  return useQuery({
    queryKey: ['portfolio', userId],
    queryFn: getPortfolio,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    gcTime: 0,
    enabled: options?.enabled !== undefined ? options.enabled && !!userId : !!userId
  });
}

export function useWatchlist(options?: { enabled?: boolean }) {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  return useQuery<WatchlistItem[]>({
    queryKey: ['watchlist', userId],
    queryFn: getWatchlist,
    staleTime: 60000, // 1 minute
    enabled: options?.enabled !== undefined ? options.enabled && !!userId : !!userId,
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

// --- Portfolio Mutations ---

export function useAddStock() {
  const queryClient = useQueryClient();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  return useMutation({
    mutationFn: (stock: HoldingCreate) => addStock(stock),
    onSuccess: () => {
      // Invalidate and refetch portfolio data
      queryClient.invalidateQueries({ queryKey: ['portfolio', userId] });
      queryClient.refetchQueries({ queryKey: ['portfolio', userId] });
    },
    onError: (err) => {
      console.error('Error adding stock:', err);
    },
  });
}

export function useRemoveStock() {
  const queryClient = useQueryClient();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  return useMutation({
    mutationFn: (symbol: string) => removeStock(symbol),
    onSuccess: () => {
      // Invalidate and refetch portfolio data
      queryClient.invalidateQueries({ queryKey: ['portfolio', userId] });
      queryClient.refetchQueries({ queryKey: ['portfolio', userId] });
    },
    onError: (err) => {
      console.error('Error removing stock:', err);
    },
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  return useMutation({
    mutationFn: (stock: { symbol: string; shares: number; averageCost: number }) => updateStock(stock),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', userId] });
      queryClient.refetchQueries({ queryKey: ['portfolio', userId] });
    },
    onError: (err) => {
      console.error('Error updating stock:', err);
    },
  });
}

export function useReorderPortfolio() {
  const queryClient = useQueryClient();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  return useMutation({
    mutationFn: (orderedSymbols: string[]) => reorderPortfolio(orderedSymbols),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', userId] });
      queryClient.refetchQueries({ queryKey: ['portfolio', userId] });
    },
    onError: (err) => {
      console.error('Error reordering portfolio:', err);
    },
  });
}

// --- Watchlist Mutations ---

export const useAddToWatchlist = () => {
  const queryClient = useQueryClient();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  return useMutation({
    mutationFn: (symbol: string) => addToWatchlist(symbol),
    onSuccess: () => {
      // Invalidate and refetch watchlist data
      queryClient.invalidateQueries({ queryKey: ['watchlist', userId] });
      queryClient.refetchQueries({ queryKey: ['watchlist', userId] });
    },
    onError: (err) => {
      console.error('Error adding to watchlist:', err);
    },
  });
};

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  return useMutation({
    mutationFn: (symbol: string) => removeFromWatchlist(symbol),
    onSuccess: () => {
      // Invalidate and refetch watchlist data
      queryClient.invalidateQueries({ queryKey: ['watchlist', userId] });
      queryClient.refetchQueries({ queryKey: ['watchlist', userId] });
    },
    onError: (err) => {
      console.error('Error removing from watchlist:', err);
    },
  });
}

export function useReorderWatchlist() {
  const queryClient = useQueryClient();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  return useMutation({
    mutationFn: (orderedSymbols: string[]) => reorderWatchlist(orderedSymbols),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist', userId] });
      queryClient.refetchQueries({ queryKey: ['watchlist', userId] });
    },
    onError: (err) => {
      console.error('Error reordering watchlist:', err);
    },
  });
}

export function useStockInfo(symbol: string) {
  return useQuery({
    queryKey: ['stockInfo', symbol],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/stock/${symbol}`);
      return response.json();
    },
    refetchOnWindowFocus: false,
  });
}

export function useMultipleStockInfo(symbols: string[]) {
  return useQuery<StockData[], Error>({
    queryKey: ['multipleStockInfo', symbols],
    queryFn: () => Promise.all(symbols.map(fetchStock)),
    enabled: symbols.length > 0,
    staleTime: 5000, 
    refetchInterval: 15000, 
    refetchOnWindowFocus: true,
  });
}

export type { WatchlistItem };
