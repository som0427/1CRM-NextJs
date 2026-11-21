/**
 * API Client Service
 * 
 * This service provides a wrapper around fetch with interceptor-like functionality,
 * similar to Angular's HttpClient + HttpInterceptor.
 */

import { useRouter } from 'next/router';
import authService from './authService';

// Base API URL from environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Types for API client
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type RequestOptions = Omit<RequestInit, 'method' | 'body'> & {
  body?: any;
  params?: Record<string, string | number | boolean | undefined | null>;
};

/**
 * API Client class that mimics Angular's HttpClient with interceptor functionality
 */
class ApiClient {
  /**
   * Make an HTTP request with automatic token handling
   */
  private async request<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    // Get the current user from localStorage - exactly like in Angular interceptor
    let currentUser = null;
    try {
      const userStr = localStorage.getItem('userData');
      currentUser = userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      console.error('Error parsing user data:', e);
    }
    
    // Start with original headers from options - exactly like HttpRequest headers
    let headers: HeadersInit = { ...options.headers };

    // Handle URL construction
    let url = path.startsWith('http') ? path : `${API_URL}${path}`;
    
    // Handle query parameters
    if (options.params) {
      const queryParams = new URLSearchParams();
      
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      
      const queryString = queryParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
        console.log('URL with params:', url);
      }
    }

    // No special handling for different endpoints, just match the Angular interceptor logic

    // Add auth token if available - EXACTLY matching Angular interceptor logic
    if (currentUser && currentUser.token) {
      if(url === "https://in1-ccaas-api.ozonetel.com/CAServices/AgentManualDial.php") {
        // EXACT MATCH TO ANGULAR: For this specific URL, replace headers with empty headers
        headers = {};
      } else {
        // EXACT MATCH TO ANGULAR: For all other URLs, keep existing headers and add Authorization
        headers = {
          ...headers,
          'Authorization': `Bearer ${currentUser.token}`
        };
      }
    }

    // Add Content-Type header using the same logic as Angular
    const hasContentType = Object.keys(headers).some(h => h.toLowerCase() === 'content-type');
    const isFileUpload = url.includes('uploadFrontImage') || url.includes('uploadFieldImage')||url.includes('uploadAttributeRefDoc');
    
    if (!hasContentType && !isFileUpload) {
      headers = {
        ...headers,
        'Content-Type': 'application/json'
      };
    }

    // Prepare request body
    let body = options.body;
    if (body && typeof body === 'object' && !(body instanceof FormData) && 
        headers['Content-Type'] === 'application/json') {
      body = JSON.stringify(body);
    }

    // Execute request with headers
    try {
      // Log the constructed headers for debugging - exactly like in fetchWithAuth
      // console.log('Request headers:', Object.keys(headers).map(key => `${key}: [${key === 'Authorization' ? 'HIDDEN' : headers[key]}]`));

      // Create fetch options with our carefully constructed headers - exactly matching fetchWithAuth
      const fetchOptions: RequestInit = {
        ...options,
        headers, // Include the headers with Authorization token
        method,
        body,
        // Don't send cookies to avoid additional CORS complications
        credentials: 'omit'
      };
      
      // No special handling for different endpoints - just use standard fetch options
      
      // Execute the request with the authorization header
      const response = await fetch(url, fetchOptions);
      // console.log(`Fetch request to ${url}: ${response.status} ${response.statusText}`);
      
      // Handle 401 errors exactly like Angular interceptor
      if (response.status === 401) {
        console.error('Unauthorized request:', url);
        // Logout the user
        authService.logout();
        
        // Redirect to login page - matches Angular interceptor
        window.location.href = '/auth/login';
        return Promise.reject(new Error('Unauthorized'));
      }
      
      // For success responses, parse JSON
      if (response.ok) {
        // Check if response is empty
        const text = await response.text();
        return text ? JSON.parse(text) : {} as T;
      }
      
      // For error responses, try to parse error
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      throw {
        status: response.status,
        statusText: response.statusText,
        data: errorData
      };
    } catch (error) {
      console.error('API request error:', error, 'for URL:', url);
      
      // Handle 401 errors in the catch block too, matching Angular's tap(null, error) behavior
      if (error.status === 401) {
        // Logout the user
        authService.logout();
        
        // Redirect to login page - matches Angular interceptor
        window.location.href = '/auth/login';
      }
      
      throw error;
    }
  }

  /**
   * HTTP GET request
   */
  public async get<T>(path: string, params?: Record<string, any>, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('GET', path, { ...options, params });
  }

  /**
   * HTTP POST request
   */
  public async post<T>(path: string, body?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('POST', path, { ...options, body });
  }

  /**
   * HTTP PUT request
   */
  public async put<T>(path: string, body?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PUT', path, { ...options, body });
  }

  /**
   * HTTP DELETE request
   */
  public async delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  /**
   * HTTP PATCH request
   */
  public async patch<T>(path: string, body?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PATCH', path, { ...options, body });
  }
}

// Create a singleton instance
const apiClient = new ApiClient();
export default apiClient;
