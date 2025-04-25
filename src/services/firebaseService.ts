import { fetchWithAuth, API_BASE_URL } from './apiService';
import { auth } from '../config/firebase';
import { 
  getUserPortfolio, 
  updateUserPortfolio, 
  addStockToPortfolio, 
  removeStockFromPortfolio,
  reorderPortfolio,
  getUserWatchlist,
  addToWatchlist,
  removeFromWatchlist
} from './userService';

/**
 * This service acts as a bridge between the existing API services and the new Firebase user data
 * It will allow a smooth transition between the mock API and Firebase-stored user data
 */

// Synchronize backend portfolio with Firestore
export const syncPortfolioWithFirestore = async () => {
  try {
    if (!auth.currentUser) return null;
    
    // Get portfolio from backend API
    const response = await fetchWithAuth(`${API_BASE_URL}/portfolio`);
    if (!response.ok) throw new Error(`Failed to fetch portfolio: ${response.status}`);
    const apiData = await response.json();
    
    // Get portfolio from Firestore
    const firestorePortfolio = await getUserPortfolio();
    
    // If Firestore portfolio is empty, initialize it with API data
    if (!firestorePortfolio.holdings || firestorePortfolio.holdings.length === 0) {
      if (apiData.holdings && apiData.holdings.length > 0) {
        const sortedHoldings = [...apiData.holdings].sort((a, b) => a.position - b.position);
        await updateUserPortfolio(sortedHoldings);
      }
    }
    
    return await getUserPortfolio();
  } catch (error) {
    console.error('Error syncing portfolio with Firestore:', error);
    return null;
  }
};

// Add stock to Firestore portfolio and sync with backend
export const addStockToFirestore = async (stock) => {
  try {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    // Add to Firestore
    await addStockToPortfolio(stock);
    
    // Sync with backend
    await fetchWithAuth(`${API_BASE_URL}/portfolio/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stock),
    });
    
    return await getUserPortfolio();
  } catch (error) {
    console.error('Error adding stock to Firestore:', error);
    throw error;
  }
};

// Remove stock from Firestore portfolio and sync with backend
export const removeStockFromFirestore = async (symbol) => {
  try {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    // Remove from Firestore
    await removeStockFromPortfolio(symbol);
    
    // Sync with backend
    await fetchWithAuth(`${API_BASE_URL}/portfolio/delete/${symbol}`, {
      method: 'DELETE',
    });
    
    return await getUserPortfolio();
  } catch (error) {
    console.error('Error removing stock from Firestore:', error);
    throw error;
  }
};

// Update stock in Firestore portfolio and sync with backend
export const updateStockInFirestore = async (stock) => {
  try {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    // Get current portfolio
    const portfolio = await getUserPortfolio();
    const holdings = portfolio.holdings || [];
    
    // Find the stock to update
    const stockIndex = holdings.findIndex(h => h.symbol === stock.symbol);
    if (stockIndex === -1) {
      // If not found, add it
      return await addStockToFirestore(stock);
    }
    
    // Update the stock
    holdings[stockIndex] = {
      ...holdings[stockIndex],
      ...stock,
      updatedAt: new Date()
    };
    
    // Update Firestore
    await updateUserPortfolio(holdings);
    
    // Sync with backend
    await fetchWithAuth(`${API_BASE_URL}/portfolio/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stock),
    });
    
    return await getUserPortfolio();
  } catch (error) {
    console.error('Error updating stock in Firestore:', error);
    throw error;
  }
};

// Reorder portfolio in Firestore and sync with backend
export const reorderPortfolioInFirestore = async (orderedSymbols) => {
  try {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    // Reorder in Firestore
    await reorderPortfolio(orderedSymbols);
    
    // Sync with backend
    await fetchWithAuth(`${API_BASE_URL}/portfolio/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderedSymbols
      }),
    });
    
    return await getUserPortfolio();
  } catch (error) {
    console.error('Error reordering portfolio in Firestore:', error);
    throw error;
  }
};

// Synchronize backend watchlist with Firestore
export const syncWatchlistWithFirestore = async () => {
  try {
    if (!auth.currentUser) return null;
    
    // Get watchlist from backend API
    const response = await fetchWithAuth(`${API_BASE_URL}/watchlist`);
    if (!response.ok) throw new Error(`Failed to fetch watchlist: ${response.status}`);
    const watchlistData = await response.json();
    
    // Get watchlist from Firestore
    const firestoreWatchlist = await getUserWatchlist();
    
    // If Firestore watchlist is empty, initialize it with API data
    if (!firestoreWatchlist.symbols || firestoreWatchlist.symbols.length === 0) {
      if (watchlistData && watchlistData.length > 0) {
        const symbols = watchlistData.map(item => item.symbol);
        for (const symbol of symbols) {
          await addToWatchlist(symbol);
        }
      }
    }
    
    return await getUserWatchlist();
  } catch (error) {
    console.error('Error syncing watchlist with Firestore:', error);
    return null;
  }
};

// Add symbol to Firestore watchlist and sync with backend
export const addToFirestoreWatchlist = async (symbol) => {
  try {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    // Add to Firestore
    await addToWatchlist(symbol);
    
    // Sync with backend
    await fetchWithAuth(`${API_BASE_URL}/watchlist/add/${symbol.toUpperCase()}`, {
      method: 'POST',
    });
    
    return await getUserWatchlist();
  } catch (error) {
    console.error('Error adding to Firestore watchlist:', error);
    throw error;
  }
};

// Remove symbol from Firestore watchlist and sync with backend
export const removeFromFirestoreWatchlist = async (symbol) => {
  try {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    // Remove from Firestore
    await removeFromWatchlist(symbol);
    
    // Sync with backend
    await fetchWithAuth(`${API_BASE_URL}/watchlist/remove/${symbol.toUpperCase()}`, {
      method: 'DELETE',
    });
    
    return await getUserWatchlist();
  } catch (error) {
    console.error('Error removing from Firestore watchlist:', error);
    throw error;
  }
};
