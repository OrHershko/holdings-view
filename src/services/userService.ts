import { auth } from '../config/firebase';
import { API_BASE_URL, fetchWithAuth } from './apiService';

/**
 * User Service
 * Handles user authentication operations
 * Note: Data storage (portfolios, watchlists) has been migrated to PostgreSQL
 * This service now only handles Firebase authentication
 */

/**
 * Creates or updates a user profile in the backend after authentication
 */
export const createOrUpdateUserProfile = async (userData: {
  displayName?: string;
  email?: string;
  photoURL?: string;
}) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is currently signed in');

  try {
    // Call the API to create or update the user profile
    const response = await fetchWithAuth(`${API_BASE_URL}/user/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: user.uid,
        displayName: userData.displayName || user.displayName,
        email: userData.email || user.email,
        photoURL: userData.photoURL || user.photoURL
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Failed to update user profile' }));
      throw new Error(errorData.detail || 'Failed to update user profile');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Gets the current user's profile from the backend
 */
export const getUserProfile = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is currently signed in');
  
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/user/profile`);
    
    if (!response.ok) {
      // If user profile doesn't exist, create a new one
      if (response.status === 404) {
        return createOrUpdateUserProfile({
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || ''
        });
      }
      
      const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch user profile' }));
      throw new Error(errorData.detail || 'Failed to fetch user profile');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

/**
 * Gets the current authenticated user
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Gets the current user's ID (UID)
 */
export const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) return null;
  return user.uid;
};

/**
 * Checks if a user is currently authenticated
 */
export const isAuthenticated = () => {
  return !!auth.currentUser;
};

/**
 * Gets the current user's authentication token
 */
export const getUserToken = async () => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user is currently signed in');
  
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('Error getting user token:', error);
    throw error;
  }
};
