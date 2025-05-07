import { fetchWithAuth, API_BASE_URL } from './apiService';
import { PortfolioHolding, PortfolioSummary } from '@/api/stockApi';

/**
 * Unified Portfolio Service
 * Handles all portfolio operations using the PostgreSQL database via API endpoints
 */

// Interfaces 
export interface PortfolioData {
  holdings: PortfolioHolding[];
  summary: PortfolioSummary;
}

export interface HoldingCreate {
  symbol: string;
  shares: number;
  averageCost: number;
  position?: number;
}

/**
 * Gets the user's portfolio from the database
 */
export const getPortfolio = async (): Promise<PortfolioData> => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/portfolio`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch portfolio' }));
      throw new Error(errorData.detail || 'Failed to fetch portfolio');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    throw error;
  }
};

/**
 * Adds a stock to the user's portfolio
 */
export const addStock = async (stock: HoldingCreate): Promise<PortfolioData> => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/portfolio/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stock),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to add stock' }));
      throw new Error(errorData.detail || 'Failed to add stock');
    }
    
    // Refetch the portfolio to get updated data
    return getPortfolio();
  } catch (error) {
    console.error('Error adding stock:', error);
    throw error;
  }
};

/**
 * Updates a stock in the user's portfolio
 */
export const updateStock = async (stock: { symbol: string; shares: number; averageCost: number }): Promise<PortfolioData> => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/portfolio/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stock),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to update stock' }));
      throw new Error(errorData.detail || 'Failed to update stock');
    }
    
    // Refetch the portfolio to get updated data
    return getPortfolio();
  } catch (error) {
    console.error('Error updating stock:', error);
    throw error;
  }
};

/**
 * Removes a stock from the user's portfolio
 */
export const removeStock = async (symbol: string): Promise<PortfolioData> => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/portfolio/delete/${symbol}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to remove stock' }));
      throw new Error(errorData.detail || 'Failed to remove stock');
    }
    
    // Refetch the portfolio to get updated data
    return getPortfolio();
  } catch (error) {
    console.error('Error removing stock:', error);
    throw error;
  }
};

/**
 * Reorders the stocks in the user's portfolio
 */
export const reorderPortfolio = async (orderedSymbols: string[]): Promise<PortfolioData> => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/portfolio/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedSymbols }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to reorder portfolio' }));
      throw new Error(errorData.detail || 'Failed to reorder portfolio');
    }
    
    // Refetch the portfolio to get updated data
    return getPortfolio();
  } catch (error) {
    console.error('Error reordering portfolio:', error);
    throw error;
  }
};

/**
 * Uploads multiple holdings to the user's portfolio (bulk upload)
 */
export const uploadPortfolio = async (holdings: HoldingCreate[]): Promise<PortfolioData> => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/portfolio/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(holdings),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to upload portfolio' }));
      throw new Error(errorData.detail || 'Failed to upload portfolio');
    }
    
    // Refetch the portfolio to get updated data
    return getPortfolio();
  } catch (error) {
    console.error('Error uploading portfolio:', error);
    throw error;
  }
};

export const addCash = async (amount: number): Promise<PortfolioData> => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/portfolio/cash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to add cash' }));
      throw new Error(errorData.detail || 'Failed to add cash');
    }
    
    return getPortfolio();
  } catch (error) {
    console.error('Error adding cash:', error);
    throw error;
  }
};
