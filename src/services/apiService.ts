import { auth } from '../config/firebase';

/**
 * Helper function to make authenticated API requests
 * Automatically adds the Firebase auth token if a user is logged in
 */
export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  try {
    // Get the current user
    const user = auth.currentUser;
    
    // If there's a user logged in, get their token and add it to the headers
    if (user) {
      const token = await user.getIdToken();
      
      // Create headers with Authorization token
      const headers = {
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`,
      };
      
      // Return fetch with the auth headers
      return fetch(url, {
        ...options,
        headers,
      });
    }
    
    // If no user is logged in, make regular request
    return fetch(url, options);
  } catch (error) {
    console.error('Error in fetchWithAuth:', error);
    throw error;
  }
};

// API base URL from environment variable
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
