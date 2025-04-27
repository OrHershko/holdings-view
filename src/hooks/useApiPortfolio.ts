import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPortfolio } from '@/services/stockService';
import { fetchWithAuth, API_BASE_URL } from '@/services/apiService';
import { PortfolioHolding, PortfolioSummary } from '@/api/stockApi';

// Interface for the PortfolioData structure
interface PortfolioData {
  holdings: PortfolioHolding[];
  summary: PortfolioSummary;
}

// Interface for creating/updating a holding
interface HoldingCreate {
  symbol: string;
  shares: number;
  averageCost: number;
  position?: number;
}

/**
 * Hook for managing user portfolio data through the API
 */
export const useApiPortfolio = () => {
  const queryClient = useQueryClient();
  
  // Query for fetching portfolio data
  const portfolioQuery = useQuery({
    queryKey: ['portfolio'],
    queryFn: fetchPortfolio,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Mutation for adding a stock
  const addStockMutation = useMutation({
    mutationFn: async (holding: HoldingCreate) => {
      const response = await fetchWithAuth(`${API_BASE_URL}/portfolio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(holding),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to add stock' }));
        throw new Error(errorData.detail || 'Failed to add stock');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
  
  // Mutation for removing a stock
  const removeStockMutation = useMutation({
    mutationFn: async (symbol: string) => {
      const response = await fetchWithAuth(`${API_BASE_URL}/portfolio/${symbol}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to remove stock' }));
        throw new Error(errorData.detail || 'Failed to remove stock');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
  
  // Mutation for updating a stock
  const updateStockMutation = useMutation({
    mutationFn: async (params: { symbol: string; shares: number; averageCost: number }) => {
      const { symbol, shares, averageCost } = params;
      const response = await fetchWithAuth(`${API_BASE_URL}/portfolio/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol, shares, averageCost }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to update stock' }));
        throw new Error(errorData.detail || 'Failed to update stock');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
  
  // Mutation for reordering the portfolio
  const reorderPortfolioMutation = useMutation({
    mutationFn: async (order: string[]) => {
      // The backend expects an object with 'orderedSymbols' property
      const response = await fetchWithAuth(`${API_BASE_URL}/portfolio/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderedSymbols: order }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to reorder portfolio' }));
        throw new Error(errorData.detail || 'Failed to reorder portfolio');
      }
      
      return response.json();
    },
    // Use optimistic updates for smoother UX during reordering
    onMutate: async (newOrder) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['portfolio'] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData<PortfolioData>(['portfolio']);
      
      if (previousData) {
        // Create a copy of the data
        const updatedHoldings = [...previousData.holdings];
        
        // Update positions based on the new order
        newOrder.forEach((symbol, index) => {
          const holdingIndex = updatedHoldings.findIndex(h => h.symbol === symbol);
          if (holdingIndex !== -1) {
            updatedHoldings[holdingIndex] = {
              ...updatedHoldings[holdingIndex],
              position: index
            };
          }
        });
        
        // Optimistically update the cache
        queryClient.setQueryData(['portfolio'], {
          ...previousData,
          holdings: updatedHoldings
        });
      }
      
      return { previousData };
    },
    // If the mutation fails, roll back to the previous state
    onError: (_err, _newOrder, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['portfolio'], context.previousData);
      }
    },
    // Refetch after success if needed
    onSettled: () => {
      // No need to invalidate queries if we're using optimistic updates
      // queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
  
  return {
    data: portfolioQuery.data,
    isLoading: portfolioQuery.isLoading,
    isError: portfolioQuery.isError,
    error: portfolioQuery.error,
    addStock: addStockMutation.mutate,
    removeStock: removeStockMutation.mutate,
    updateStock: updateStockMutation.mutate,
    reorderPortfolio: reorderPortfolioMutation.mutate,
    isReordering: reorderPortfolioMutation.isPending,
  };
};

export default useApiPortfolio;
