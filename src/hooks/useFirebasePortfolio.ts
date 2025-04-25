import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  syncPortfolioWithFirestore, 
  addStockToFirestore, 
  removeStockFromFirestore, 
  updateStockInFirestore,
  reorderPortfolioInFirestore
} from '@/services/firebaseService';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for managing user portfolio with Firebase authentication
 */
export const useFirebasePortfolio = () => {
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  
  // Query for fetching portfolio data
  const portfolioQuery = useQuery({
    queryKey: ['firebase-portfolio', currentUser?.uid],
    queryFn: syncPortfolioWithFirestore,
    enabled: !!currentUser, // Only run if user is authenticated
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Mutation for adding a stock
  const addStockMutation = useMutation({
    mutationFn: addStockToFirestore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-portfolio'] });
    },
  });
  
  // Mutation for removing a stock
  const removeStockMutation = useMutation({
    mutationFn: removeStockFromFirestore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-portfolio'] });
    },
  });
  
  // Mutation for updating a stock
  const updateStockMutation = useMutation({
    mutationFn: updateStockInFirestore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-portfolio'] });
    },
  });
  
  // Mutation for reordering the portfolio
  const reorderPortfolioMutation = useMutation({
    mutationFn: reorderPortfolioInFirestore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firebase-portfolio'] });
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
  };
};

export default useFirebasePortfolio;
