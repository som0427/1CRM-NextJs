/**
 * API utilities for handling API URLs and endpoints
 */

/**
 * Get the base API URL based on the environment
 * @returns The base API URL
 */
export const getApiUrl = (): string => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Development environments may use different URLs
    if (process.env.NODE_ENV === 'development') {
      return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    }
    
    // For production, use the production API URL
    return process.env.NEXT_PUBLIC_API_URL || 'https://api.1channel.com';
  }
  
  // Server-side rendering - use the environment variable
  return process.env.API_URL || 'http://localhost:8080';
};

/**
 * Format an API endpoint with the base URL
 * @param endpoint The API endpoint path
 * @returns The full API URL
 */
export const formatApiEndpoint = (endpoint: string): string => {
  const baseUrl = getApiUrl();
  
  // Make sure we don't duplicate slashes
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${formattedEndpoint}`;
};
