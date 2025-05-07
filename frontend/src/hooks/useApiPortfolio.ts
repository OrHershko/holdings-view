import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPortfolio } from '@/services/stockService';
import { fetchWithAuth } from '@/services/apiService';
import { HoldingCreate, PortfolioData } from '@/api/stockApi';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';


/**
 * Hook for managing user portfolio data through the API
 */
export const useApiPortfolio = () => {
  const queryClient = useQueryClient();
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['api-portfolio'] });
    });
    
    return () => unsubscribe();
  }, [queryClient]);
  
  const portfolioQuery = useQuery({
    queryKey: ['api-portfolio', userId],
    queryFn: fetchPortfolio,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId,
  });
  
  const addStockMutation = useMutation({
    mutationFn: async (holding: HoldingCreate) => {
      const response = await fetchWithAuth(`/api/portfolio`, {
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
  
  const removeStockMutation = useMutation({
    mutationFn: async (symbol: string) => {
      const response = await fetchWithAuth(`/api/portfolio/${symbol}`, {
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
  
  const updateStockMutation = useMutation({
    mutationFn: async (params: { symbol: string; shares: number; averageCost: number }) => {
      const { symbol, shares, averageCost } = params;
      const response = await fetchWithAuth(`/api/portfolio/update`, {
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
  
  const reorderPortfolioMutation = useMutation({
    mutationFn: async (order: string[]) => {
      const response = await fetchWithAuth(`/api/portfolio/reorder`, {
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
    onMutate: async (newOrder) => {
      await queryClient.cancelQueries({ queryKey: ['portfolio'] });
      
      const previousData = queryClient.getQueryData<PortfolioData>(['portfolio']);
      
      if (previousData) {
        const updatedHoldings = [...previousData.holdings];
        
        newOrder.forEach((symbol, index) => {
          const holdingIndex = updatedHoldings.findIndex(h => h.symbol === symbol);
          if (holdingIndex !== -1) {
            updatedHoldings[holdingIndex] = {
              ...updatedHoldings[holdingIndex],
              position: index
            };
          }
        });
        
        queryClient.setQueryData(['portfolio'], {
          ...previousData,
          holdings: updatedHoldings
        });
      }
      
      return { previousData };
    },
    onError: (_err, _newOrder, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['portfolio'], context.previousData);
      }
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
