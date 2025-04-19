import { useQuery } from '@tanstack/react-query';
import { fetchStock, fetchStockHistory, fetchPortfolio, fetchWatchlist, searchStocks } from '@/services/stockService';

export interface StockHistoryData {
  dates: string[];
  prices: number[];
  volume?: number[];
  high?: number[];
  low?: number[];
  open?: number[];
  close?: number[];
  sma20?: number[];
  sma50?: number[];
  rsi?: number[];
  macd?: number[];
  signal?: number[];
  histogram?: number[];
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
