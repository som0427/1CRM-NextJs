/**
 * API Client for Retaility
 * 
 * This module provides a consistent way to access backend APIs
 * from both Angular and Next.js during the migration process.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Default headers for all API requests
const defaultHeaders = {
  'Content-Type': 'application/json',
};

// Helper function to get auth token
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
};

// Function to include auth token in requests
export const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    ...defaultHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Generic API request function
export const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    ...defaultHeaders,
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // Check for authentication failure (401 Unauthorized)
      if (response.status === 401) {
        // Token has expired or is invalid
        console.error('Authentication token expired or invalid');
        
        // Clear all localStorage and sessionStorage items
        if (typeof window !== 'undefined') {
          // Clear all localStorage items
          localStorage.clear();
          
          // Clear all sessionStorage items
          sessionStorage.clear();
          
          console.log('All storage cleared due to authentication failure');
          
          // Redirect to login page
          window.location.href = '/auth/login';
        }
        throw new Error('Authentication failed. Please log in again.');
      }
      
      // Handle other errors
      let errorMessage = 'An error occurred';
      let errorData: any = null;
      try {
        errorData = await response.json();
        console.log('API Error Response:', errorData);
        // Prioritize responseData as it often contains the actual error message
        // Only use 'message' if it's not a generic 'ERROR' string
        const hasGenericMessage = errorData.message === 'ERROR' || errorData.message === 'error';
        errorMessage = errorData.responseData || (!hasGenericMessage && errorData.message) || errorData.error || errorMessage;
      } catch (e) {
        // Unable to parse error JSON, try text
        try {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        } catch (textErr) {
          // Unable to get error text
        }
      }
      // Throw a structured error object that can be caught and inspected
      const error: any = new Error(errorMessage);
      error.status = response.status;
      error.statusText = response.statusText;
      error.data = errorData;
      throw error;
    }

    // Check if the response is empty
    const text = await response.text();
    return text ? JSON.parse(text) : {} as T;
  } catch (error) {
    // Silent handling for aborted requests (component unmount or cancelled)
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    if ((error as DOMException)?.name === 'AbortError' ||
        errorMessage.includes('Abort Request:')) {
      console.log(errorMessage);
      throw error;
    }
    console.error('API request failed:', error);
    throw error;
  }
};

// HTTP method wrappers
export const get = <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });
};

export const post = <T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> => {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
};

export const put = <T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> => {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
};

export const del = <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });
};

// Default export
const apiClient = {
  get,
  post,
  put,
  delete: del,
  getAuthToken,
  getAuthHeaders,
};

export default apiClient;
