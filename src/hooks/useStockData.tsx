
import { useQuery } from '@tanstack/react-query';
import { fetchStock, fetchStockHistory, fetchPortfolio, fetchWatchlist, searchStocks } from '../api/stockApi';

export function useStock(symbol: string) {
  return useQuery({
    queryKey: ['stock', symbol],
    queryFn: () => fetchStock(symbol),
    enabled: !!symbol,
    staleTime: 60000, // 1 minute
  });
}

export function useStockHistory(symbol: string, period: string = '1y') {
  return useQuery({
    queryKey: ['stockHistory', symbol, period],
    queryFn: () => fetchStockHistory(symbol, period),
    enabled: !!symbol,
    staleTime: 300000, // 5 minutes
  });
}

export function usePortfolio() {
  return useQuery({
    queryKey: ['portfolio'],
    queryFn: fetchPortfolio,
    staleTime: 60000, // 1 minute
  });
}

export function useWatchlist() {
  return useQuery({
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
