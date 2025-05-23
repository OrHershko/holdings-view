import { fetchWithAuth } from './apiService';
import { WatchlistItem } from '@/services/stockService';

/**
 * Unified Watchlist Service
 * Handles all watchlist operations using the PostgreSQL database via API endpoints
 */

/**
 * Gets the user's watchlist from the database
 */
export const getWatchlist = async (): Promise<WatchlistItem[]> => {
  try {
    const response = await fetchWithAuth(`/api/watchlist`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch watchlist' }));
      throw new Error(errorData.detail || 'Failed to fetch watchlist');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    throw error;
  }
};

/**
 * Adds a symbol to the user's watchlist
 */
export const addToWatchlist = async (symbol: string): Promise<WatchlistItem[]> => {
  try {
    const response = await fetchWithAuth(`/api/watchlist/add/${symbol.toUpperCase()}`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to add to watchlist' }));
      throw new Error(errorData.detail || 'Failed to add to watchlist');
    }
    
    // Refetch the watchlist to get updated data
    return getWatchlist();
  } catch (error) {
    console.error('Error adding to watchlist:', error);
    throw error;
  }
};

/**
 * Removes a symbol from the user's watchlist
 */
export const removeFromWatchlist = async (symbol: string): Promise<WatchlistItem[]> => {
  try {
    const response = await fetchWithAuth(`/api/watchlist/remove/${symbol.toUpperCase()}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to remove from watchlist' }));
      throw new Error(errorData.detail || 'Failed to remove from watchlist');
    }
    
    return getWatchlist();
  } catch (error) {
    console.error('Error removing from watchlist:', error);
    throw error;
  }
};

/**
 * Reorders the symbols in the user's watchlist
 */
export const reorderWatchlist = async (orderedSymbols: string[]): Promise<WatchlistItem[]> => {
  try {
    const response = await fetchWithAuth(`/api/watchlist/reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ symbols: orderedSymbols }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to reorder watchlist' }));
      throw new Error(errorData.detail || 'Failed to reorder watchlist');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error reordering watchlist:', error);
    throw error;
  }
};
