import { useQuery } from '@tanstack/react-query';
import { fetchDetailedStockInfo } from '@/services/stockService';

/**
 * Custom hook to fetch detailed stock information from the API
 * @param symbol Stock symbol to fetch detailed data for
 * @param enabled Whether the query should automatically run
 * @returns Detailed stock information from yfinance with proper loading/error states
 */
export const useDetailedStockData = (symbol: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['detailed-stock-info', symbol],
    queryFn: () => fetchDetailedStockInfo(symbol),
    enabled: !!symbol && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};
