import { auth } from '../config/firebase';

/**
 * Helper function to make authenticated API requests
 * Automatically adds the Firebase auth token if a user is logged in
 */
export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  try {
    const user = auth.currentUser;
    
    if (user) {
      const token = await user.getIdToken();
      
      const headers = {
        ...(options.headers || {}),
        'Authorization': `Bearer ${token}`,
      };
      
      return fetch(url, {
        ...options,
        headers,
      });
    }
    
    return fetch(url, options);
  } catch (error) {
    console.error('Error in fetchWithAuth:', error);
    throw error;
  }
};
