import { useRouter } from 'next/router';
import authService from '../services/authService';

/**
 * Custom fetch function that adds authentication headers and handles common error cases
 * Exactly matches Angular's HTTP interceptor logic from InterceptService
 */
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
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


  // Add auth token if available - EXACTLY matching Angular interceptor logic
  if (currentUser && currentUser.token) {
    if(url === "https://in1-ccaas-api.ozonetel.com/CAServices/AgentManualDial.php") {
      // Don't add any headers for this specific URL - match Angular's empty HttpHeaders
      headers = {};
    }  else {
      // Standard handling for other endpoints
      headers = {
        ...headers,
        'Authorization': `Bearer ${currentUser.token}`,
        'Referrer-Policy': 'strict-origin'
      };
    }
  }

  // Add Content-Type header using the same logic as Angular
  // Note: Angular uses request.headers.has() and request.url.search()
  const hasContentType = Object.keys(headers).some(h => h.toLowerCase() === 'content-type');
  const isFileUpload = url.includes('uploadFrontImage') || url.includes('uploadFieldImage');
  
  if (!hasContentType && !isFileUpload) {
    headers = {
      ...headers,
      'Content-Type': 'application/json'
    };
  }

  // Execute request with headers
  try {
    // Log the constructed headers for debugging
    console.log('Request headers:', Object.keys(headers).map(key => `${key}: [${key === 'Authorization' ? 'HIDDEN' : headers[key]}]`));

    // Create fetch options with our carefully constructed headers
    const fetchOptions: RequestInit = {
      ...options,
      headers, // Include the headers with Authorization token
      method: options.method || 'GET',
      // Don't send cookies to avoid additional CORS complications
      credentials: 'omit'
    };
    
    // Execute the request with the authorization header
    const response = await fetch(url, fetchOptions);
    console.log(`Fetch request to ${url}: ${response.status} ${response.statusText}`);
    
    // Handle 401 errors exactly like Angular interceptor
    if (response.status === 401) {
      console.error('Unauthorized request:', url);
      // Logout the user
      authService.logout();
      
      // authService.logout() has been called, which will notify AuthProvider.
      // AuthProvider will handle the redirect to the login page.
      return Promise.reject(new Error('Unauthorized - User logged out'));
    }
    
    // Return the response if successful - your interceptor returns next.handle(request)
    return response;
  } catch (error) {
    // Handle errors - equivalent to the tap(null, error => {...}) in your interceptor
    console.error('Fetch error:', error, 'for URL:', url);
    
    // Rethrow the error - equivalent to letting the error pass through in Angular
    throw error;
  }
};

export default fetchWithAuth;
