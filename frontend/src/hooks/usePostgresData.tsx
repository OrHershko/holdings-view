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

/**
 * Hooks for stock data from a single PostgreSQL source
 */

export function useStock(symbol: string) {
  return useQuery({
    queryKey: ['stock', symbol],
    queryFn: () => fetchStock(symbol),
    enabled: !!symbol,
    staleTime: 30000, 
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
    staleTime: 60000, 
    enabled: options?.enabled !== undefined ? options.enabled && !!userId : !!userId,
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

// --- Portfolio Mutations ---

export function useAddStock() {
  const queryClient = useQueryClient();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  return useMutation({
    mutationFn: (stock: HoldingCreate) => addStock(stock),
    onSuccess: () => {
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
      const response = await fetch(`/api/stock/${symbol}`);
      return response.json();
    },
    refetchOnWindowFocus: false,
  });
}

export function useMultipleStockInfo(symbols: string[]) {
  const queryClient = useQueryClient();
  console.log(`useMultipleStockInfo called with ${symbols.length} symbols:`, symbols);
  
  return useQuery<StockData[], Error>({
    queryKey: ['multipleStockInfo', symbols],
    queryFn: async () => {
      console.log(`Fetching data for ${symbols.length} symbols at ${new Date().toLocaleTimeString()}`);
      try {
        const results = await Promise.all(symbols.map(fetchStock));
        console.log(`Successfully fetched data for ${results.length} symbols`);
        return results;
      } catch (error) {
        console.error("Error fetching multiple stock info:", error);
        throw error;
      }
    },
    enabled: symbols.length > 0,
    staleTime: 30000, 
    refetchInterval: 35000, 
    refetchOnWindowFocus: true
  });
}

export type { WatchlistItem };
