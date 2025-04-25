import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { StockData, PortfolioHolding } from '@/api/stockApi';

// Collection names
const USERS_COLLECTION = 'users';
const PORTFOLIOS_COLLECTION = 'portfolios';
const WATCHLISTS_COLLECTION = 'watchlists';

/**
 * Creates or updates a user profile in Firestore after authentication
 */
export const createOrUpdateUserProfile = async (userData: {
  displayName?: string;
  email?: string;
  photoURL?: string;
}) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is currently signed in');

  // Reference to the user document
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  
  // Check if user document already exists
  const userDoc = await getDoc(userRef);
  
  if (userDoc.exists()) {
    // Update existing user
    await updateDoc(userRef, {
      ...userData,
      updatedAt: new Date()
    });
  } else {
    // Create new user
    await setDoc(userRef, {
      uid: user.uid,
      displayName: userData.displayName || user.displayName,
      email: userData.email || user.email,
      photoURL: userData.photoURL || user.photoURL,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Initialize empty portfolio for new user
    await setDoc(doc(db, PORTFOLIOS_COLLECTION, user.uid), {
      uid: user.uid,
      holdings: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Initialize empty watchlist for new user
    await setDoc(doc(db, WATCHLISTS_COLLECTION, user.uid), {
      uid: user.uid,
      symbols: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  return getUserProfile();
};

/**
 * Gets the current user's profile from Firestore
 */
export const getUserProfile = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is currently signed in');
  
  const userRef = doc(db, USERS_COLLECTION, user.uid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    // Create a minimal profile if one doesn't exist
    return createOrUpdateUserProfile({
      displayName: user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL || ''
    });
  }
  
  return userDoc.data();
};

/**
 * Gets the current user's portfolio from Firestore
 */
export const getUserPortfolio = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is currently signed in');
  
  const portfolioRef = doc(db, PORTFOLIOS_COLLECTION, user.uid);
  const portfolioDoc = await getDoc(portfolioRef);
  
  if (!portfolioDoc.exists()) {
    // Initialize empty portfolio if one doesn't exist
    const newPortfolio = {
      uid: user.uid,
      holdings: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await setDoc(portfolioRef, newPortfolio);
    return newPortfolio;
  }
  
  return portfolioDoc.data();
};

/**
 * Updates a user's portfolio holdings
 */
export const updateUserPortfolio = async (holdings: PortfolioHolding[]) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is currently signed in');
  
  const portfolioRef = doc(db, PORTFOLIOS_COLLECTION, user.uid);
  
  await updateDoc(portfolioRef, {
    holdings,
    updatedAt: new Date()
  });
  
  return getUserPortfolio();
};

/**
 * Adds a stock to the user's portfolio
 */
export const addStockToPortfolio = async (stock: PortfolioHolding) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is currently signed in');
  
  const portfolioRef = doc(db, PORTFOLIOS_COLLECTION, user.uid);
  const portfolioDoc = await getDoc(portfolioRef);
  
  if (!portfolioDoc.exists()) {
    throw new Error('Portfolio not found');
  }
  
  const portfolio = portfolioDoc.data();
  const holdings = portfolio.holdings || [];
  
  // Check if stock already exists in portfolio
  const existingIndex = holdings.findIndex((h: PortfolioHolding) => h.symbol === stock.symbol);
  
  if (existingIndex >= 0) {
    // Update existing stock
    holdings[existingIndex] = {
      ...holdings[existingIndex],
      ...stock,
      updatedAt: new Date()
    };
  } else {
    // Add new stock with position at the end
    holdings.push({
      ...stock,
      position: holdings.length,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  await updateDoc(portfolioRef, {
    holdings,
    updatedAt: new Date()
  });
  
  return getUserPortfolio();
};

/**
 * Removes a stock from the user's portfolio
 */
export const removeStockFromPortfolio = async (symbol: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is currently signed in');
  
  const portfolioRef = doc(db, PORTFOLIOS_COLLECTION, user.uid);
  const portfolioDoc = await getDoc(portfolioRef);
  
  if (!portfolioDoc.exists()) {
    throw new Error('Portfolio not found');
  }
  
  const portfolio = portfolioDoc.data();
  let holdings = portfolio.holdings || [];
  
  // Remove the stock
  holdings = holdings.filter((h: PortfolioHolding) => h.symbol !== symbol);
  
  // Reorder positions after removal
  holdings = holdings.map((holding: PortfolioHolding, index: number) => ({
    ...holding,
    position: index
  }));
  
  await updateDoc(portfolioRef, {
    holdings,
    updatedAt: new Date()
  });
  
  return getUserPortfolio();
};

/**
 * Reorders the stocks in the user's portfolio
 */
export const reorderPortfolio = async (orderedSymbols: string[]) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is currently signed in');
  
  const portfolioRef = doc(db, PORTFOLIOS_COLLECTION, user.uid);
  const portfolioDoc = await getDoc(portfolioRef);
  
  if (!portfolioDoc.exists()) {
    throw new Error('Portfolio not found');
  }
  
  const portfolio = portfolioDoc.data();
  let holdings = portfolio.holdings || [];
  
  // Create a map for easy lookup
  const holdingsMap = holdings.reduce((map: any, holding: PortfolioHolding) => {
    map[holding.symbol] = holding;
    return map;
  }, {});
  
  // Create new ordered array
  const orderedHoldings = orderedSymbols.map((symbol, index) => {
    const holding = holdingsMap[symbol];
    if (!holding) return null;
    
    return {
      ...holding,
      position: index
    };
  }).filter(Boolean); // Remove null values
  
  await updateDoc(portfolioRef, {
    holdings: orderedHoldings,
    updatedAt: new Date()
  });
  
  return getUserPortfolio();
};

/**
 * Gets the current user's watchlist from Firestore
 */
export const getUserWatchlist = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is currently signed in');
  
  const watchlistRef = doc(db, WATCHLISTS_COLLECTION, user.uid);
  const watchlistDoc = await getDoc(watchlistRef);
  
  if (!watchlistDoc.exists()) {
    // Initialize empty watchlist if one doesn't exist
    const newWatchlist = {
      uid: user.uid,
      symbols: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await setDoc(watchlistRef, newWatchlist);
    return newWatchlist;
  }
  
  return watchlistDoc.data();
};

/**
 * Adds a stock to the user's watchlist
 */
export const addToWatchlist = async (symbol: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is currently signed in');
  
  const watchlistRef = doc(db, WATCHLISTS_COLLECTION, user.uid);
  const watchlistDoc = await getDoc(watchlistRef);
  
  if (!watchlistDoc.exists()) {
    throw new Error('Watchlist not found');
  }
  
  const watchlist = watchlistDoc.data();
  const symbols = watchlist.symbols || [];
  
  // Check if symbol already exists in watchlist
  if (!symbols.includes(symbol)) {
    symbols.push(symbol);
  }
  
  await updateDoc(watchlistRef, {
    symbols,
    updatedAt: new Date()
  });
  
  return getUserWatchlist();
};

/**
 * Removes a stock from the user's watchlist
 */
export const removeFromWatchlist = async (symbol: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is currently signed in');
  
  const watchlistRef = doc(db, WATCHLISTS_COLLECTION, user.uid);
  const watchlistDoc = await getDoc(watchlistRef);
  
  if (!watchlistDoc.exists()) {
    throw new Error('Watchlist not found');
  }
  
  const watchlist = watchlistDoc.data();
  const symbols = watchlist.symbols || [];
  
  // Remove the symbol
  const newSymbols = symbols.filter((s: string) => s !== symbol);
  
  await updateDoc(watchlistRef, {
    symbols: newSymbols,
    updatedAt: new Date()
  });
  
  return getUserWatchlist();
};
