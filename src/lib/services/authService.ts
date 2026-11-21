/**
 * Authentication Service
 * 
 * This service handles authentication functions including login, logout, 
 * token management, and user data persistence.
 */

import { BehaviorSubject, Observable } from 'rxjs';
import fetchWithAuth from '../utils/fetchWithAuth';
import { User } from '../models/User';
import { MenuItem } from '../models/MenuItem';
import { transformMenuItems } from '../utils/menuTransform';
import apiClient from './apiClient';

// Constants for storage keys
const AUTH_TOKEN_KEY = 'authToken';
const USER_DATA_KEY = 'userData';
const MENU_DATA_KEY = 'userMenu';
const PROJECT_DATA_KEY = 'projectData';
const SELECTED_PROJECT_KEY = 'selectedProject';

/**
 * Authentication Service class
 */
class AuthService {
  /**
   * Fetch sync data using a token
   * Calls the /login/api/localStorage endpoint, decodes responseData, and returns the SyncData object
   */
  public async fetchSyncData(token: string): Promise<any> {
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    const url = `${API_URL.replace(/\/+$/, '')}/login/api/localStorage`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch sync data: ${response.status}`);
    }
    const data = await response.json();
    if (!data.responseData) {
      throw new Error('No responseData found in sync API response');
    }
    // responseData is encoded, decodeURIComponent then parse
    let decoded;
    try {
      decoded = JSON.parse(decodeURIComponent(data.responseData));
    } catch (e) {
      throw new Error('Failed to decode sync data');
    }
    return decoded;
  }

  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;

  private userMenuSubject: BehaviorSubject<MenuItem[] | null>;
  public userMenu: Observable<MenuItem[] | null>;

  private isInitialized = false;

  constructor() {
    // Initialize with stored user data, if available
    let storedUser: User | null = null;
    let storedMenu: MenuItem[] | null = null;

    if (typeof window !== 'undefined') {
      try {
        // Check storage for user data
        const userDataStr = 
          localStorage.getItem(USER_DATA_KEY) || 
          sessionStorage.getItem(USER_DATA_KEY);
        
        if (userDataStr) {
          console.log('Found stored user data');
          storedUser = JSON.parse(userDataStr);
          
          // Ensure data is in both storage locations for redundancy
          localStorage.setItem(USER_DATA_KEY, userDataStr);
          sessionStorage.setItem(USER_DATA_KEY, userDataStr);
        }

        // Check for menu data
        const menuDataStr = localStorage.getItem(MENU_DATA_KEY) || sessionStorage.getItem(MENU_DATA_KEY);
        storedMenu = menuDataStr ? JSON.parse(menuDataStr) : null;
      } catch (e) {
        console.error('Error loading stored auth data:', e);
      }
    }

    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser);
    this.currentUser = this.currentUserSubject.asObservable();

    this.userMenuSubject = new BehaviorSubject<MenuItem[] | null>(storedMenu);
    this.userMenu = this.userMenuSubject.asObservable();

    this.isInitialized = true;
  }

  /**
   * Get the current user value
   */
  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Set the current user
   */
  public setUser(user: User): void {
    if (typeof window !== 'undefined') {
      const userJson = JSON.stringify(user);
      
      // Store in both localStorage and sessionStorage for redundancy
      localStorage.setItem(USER_DATA_KEY, userJson);
      sessionStorage.setItem(USER_DATA_KEY, userJson);
      
      console.log('User data stored');
    }
    this.currentUserSubject.next(user);
  }

  /**
   * Get the user from storage - checks all possible storage locations
   */
  public getUser(): User | null {
    // First check the BehaviorSubject
    const currentValue = this.currentUserValue;
    if (currentValue) {
      return currentValue;
    }
    
    // If not found in the BehaviorSubject, check storage directly
    if (typeof window !== 'undefined') {
      try {
        // Check storage
        const userStr = localStorage.getItem(USER_DATA_KEY) || sessionStorage.getItem(USER_DATA_KEY);
          
        if (userStr) {
          // Parse and validate the user data
          const userData = JSON.parse(userStr);
          
          // Set the user data in the BehaviorSubject and return
          this.setUser(userData);
          return userData;
        }
      } catch (e) {
        console.error('Error retrieving user data from storage:', e);
      }
    }
    
    return null;
  }

  /**
   * Clear only auth tokens but preserve other user data
   * Used for handling login conflicts and retries
   */
  public clearAuthTokens(): void {
    if (typeof window !== 'undefined') {
      // Only clear auth tokens, not user data
      localStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      console.log('Cleared authentication tokens for retry');
    }
  }
  
  /**
   * Clear all authentication-related data from storage
   * Used for comprehensive cleanup during logout or when resolving login conflicts
   */
  public clearAuthData(): void {
    if (typeof window !== 'undefined') {
      // Clear all auth-related data
      localStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      
      // We don't clear user data here as that would log the user out completely,
      // but we remove any session identifiers that might be causing conflicts
      try {
        // Clear cookies (simple version that works without cookie library)
        document.cookie.split(';').forEach(c => {
          const cookieName = c.trim().split('=')[0];
          if (['authToken', 'session', 'JSESSIONID'].includes(cookieName)) {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
          }
        });
      } catch (e) {
        console.error('Error clearing cookies:', e);
      }
      
      console.log('Cleared all authentication data for retry');
    }
  }

  /**
   * Login with username and password
   * @param username The username to login with
   * @param password The password to login with
   * @param retryCount Optional retry counter for handling conflicts
   */
  public async login(username: string, password: string, retryCount: number = 0): Promise<User> {
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    const DEBUG = process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true';
    console.log('[AuthService Login] Value of process.env.NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    
    // Create unique request ID for tracking
    const requestId = `${username}_${Date.now()}`;
    console.log(`[${requestId}] Login attempt for ${username}, retry: ${retryCount}`);
    
    try {
      if (retryCount > 3) {
        throw new Error('Maximum login retry attempts exceeded. Please try again later.');
      }
      
      // Using direct API call
      // Ensure API_URL doesn't have trailing slashes before appending path
      const baseUrl = API_URL ? API_URL.replace(/\/+$/, '') : '';
      const loginUrl = `${baseUrl}/login/api/auth/login`;
      console.log('Making direct API call to:', loginUrl);
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
          // Removed all custom headers to avoid CORS issues
        },
        body: JSON.stringify({ 
          username, 
          password,
          retryCount
        }),
        mode: 'cors'
      });

      // Read response data once and store it
      const data = await response.json();
      console.log('Response data:', data);

      // Handle 409 Conflict with automatic retry
      if (response.status === 409 && retryCount < 3) {
        console.log(`Received 409 Conflict status, attempting retry`);
        // Exponential backoff - wait longer for each retry
        const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 8000);
        console.log(`Waiting ${backoffMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return this.login(username, password, retryCount + 1);
      }
      
      // Special handling for successful responses that may come from the proxy's auto-login feature
      if (response.ok && data.status === 'success' && data.message === 'Automatically logged in') {
        console.log('Received auto-login success from proxy');
      }
      
      // Validate the response using the data we already read
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error(`Authentication failed with status ${response.status}:`, data);
          throw new Error(data.message || 'Invalid username or password');
        } else if (response.status === 404) {
          console.error('API endpoint not found:', data);
          throw new Error('Authentication service unavailable. Please try again later.');
        } else if (response.status === 500) {
          console.error('Server error during login:', data);
          throw new Error('Authentication service error. Please try again later.');
        } else {
          console.error(`Login failed with status ${response.status}:`, data);
          throw new Error(data.message || 'Login failed due to an unexpected error');
        }
      }

      // We already read the response body earlier, use the data variable instead of attempting to read again
      const responseData = data; // Use the data we already read
      console.log('Login response:', JSON.stringify(responseData, null, 2)); // Log the complete response structure
      
      // Return the API response data directly without transformation
      const user = responseData;
      
      // For backward compatibility, ensure token is accessible
      const token = responseData.token;
      
      if (token) {
        // Store token in both localStorage and sessionStorage for cross-app compatibility
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        sessionStorage.setItem(AUTH_TOKEN_KEY, token);
        
        // Update the user object with the original API response data
        this.setUser(user);
      }

      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Get user menu data
   */
  public async getUserMenu(projectId: number): Promise<MenuItem[]> {
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    const MENU_API_PATH = process.env.NEXT_PUBLIC_MENU_API_PATH || '/api/menu';
    
    console.log('Getting menu data for project ID:', projectId);
    
    try {
      // First check if we already have menu data in storage
      if (typeof window !== 'undefined') {
        const storedMenuData = localStorage.getItem(MENU_DATA_KEY) || sessionStorage.getItem(MENU_DATA_KEY);
        
        if (storedMenuData) {
          try {
            // Parse and validate stored menu data
            const menuData = JSON.parse(storedMenuData) as MenuItem[];
            
            if (Array.isArray(menuData) && menuData.length > 0) {
              // Update the BehaviorSubject with the stored menu data
              this.userMenuSubject.next(menuData);
              console.log('Using cached menu data');
              
              // Return stored menu data
              return menuData;
            }
          } catch (e) {
            console.error('Error parsing stored menu data:', e);
          }
        }
      }
      
      // If no valid stored menu data, fetch from API
      const authToken = localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
      
      if (!authToken) {
        throw new Error('No authentication token found');
      }
      
      // Using fetchWithAuth utility to handle CORS and tokens
      const menuUrl = `${API_URL}${MENU_API_PATH}?projectId=${projectId}`;
      console.log('Making API call to get menu using fetchWithAuth:', menuUrl);
      
      const response = await this.getAssignedWebMenus(projectId);
      
      if (response.statusCode>300) {
        throw new Error(`Failed to get menu: ${response.message}`);
      }
      
      const menuData = response;
      console.log('Menu data received from API');
      
      let processedMenuData;
      
      // Process the menu data based on API response format
      // Handle various response formats to extract menu items
      if (menuData.responseData && Array.isArray(menuData.responseData)) {
        // Format from Angular backend: { responseData: [...menu items] }
        processedMenuData = menuData.responseData;
        console.log('Using menu data from responseData array');
      } else {
        // Fallback - no recognizable format
        console.error('Unrecognized menu data format');
        processedMenuData = [];
      }
      
      // Recursively transform menu items to match MainNav expectations
      const transformedMenuData = transformMenuItems(processedMenuData);

      console.log(`Transformed ${transformedMenuData.length} menu items`);

      // --- Build singularName and pluralName maps from submenu ---
      const singularNameMap: Record<string, string> = {};
      const pluralNameMap: Record<string, string> = {};
      const targets = ['Customers', 'Contacts', 'Opportunities'];

      const traverseMenuIterative = (items: any[]) => {
        const stack = [...items];
        while (stack.length) {
          const item = stack.pop();
          if (!item) continue;
          if (item.submenu && Array.isArray(item.submenu)) {
            stack.push(...item.submenu);
          }
          if (item.defaultMenuName && targets.includes(item.defaultMenuName)) {
            if (item.singularName) singularNameMap[item.defaultMenuName] = item.singularName;
            if (item.pruralName) pluralNameMap[item.defaultMenuName] = item.pruralName;
          }
        }
      };
      traverseMenuIterative(processedMenuData);

      if (typeof window !== 'undefined') {
        localStorage.setItem('singularName', JSON.stringify(singularNameMap));
        localStorage.setItem('pluralName', JSON.stringify(pluralNameMap));
      }
      // --- End singular/plural name extraction ---
      
      // Store transformed menu data
      if (typeof window !== 'undefined') {
        localStorage.setItem(MENU_DATA_KEY, JSON.stringify(transformedMenuData));
        sessionStorage.setItem(MENU_DATA_KEY, JSON.stringify(transformedMenuData));
      }
      
      this.userMenuSubject.next(transformedMenuData);
      return transformedMenuData;
    } catch (error) {
      console.error('Error fetching menu data:', error);
      return [];
    }
  }

  public updateSelectedProject(project: any): void {
    const currentUser = this.currentUserSubject.value;
    if (currentUser && project) {
      // Ensure project.id or project.projectId is a number before assigning
      const selectedProjId = Number(project.id || project.projectId);
      if (isNaN(selectedProjId)) {
        console.error('[AuthService] Invalid project ID for selected project:', project);
        return;
      }

      const updatedUser: User = {
        ...currentUser,
        selectedProject: project, // The whole project object
        selectedProjectId: selectedProjId,
      };
      this.currentUserSubject.next(updatedUser);
      localStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedUser));
      sessionStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedUser)); // Keep both storages in sync
      console.log('[AuthService] Updated selected project ID:', selectedProjId);
    } else {
      console.warn('[AuthService] Cannot update selected project: current user or project is null.');
    }
  }

  /**
   * Update default project
   */
  public async updateDefaultProject(projectId: number): Promise<void> {
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Use the API to update the default project
      const response = await fetch(`${API_URL}/api/user/updateDefaultProject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update default project: ${response.status} ${response.statusText}`);
      }
      
      // Update stored default project ID
      localStorage.setItem('defaultProjectId', projectId.toString());
      sessionStorage.setItem('defaultProjectId', projectId.toString());
      
      // Update user data with new project ID
      const user = this.currentUserValue;
      if (user) {
        user.selectedProjectId = projectId;
        this.setUser(user);
      }
    } catch (error) {
      console.error('Error updating default project:', error);
      throw error;
    }
  }

  /**
   * Check if the user is authenticated
   */
  public isAuthenticated(): boolean {
    return !!this.currentUserValue && !!(localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY));
  }

  /**
   * Logout the current user
   */
  public logout(): void {
    // Clear all data from storage
    if (typeof window !== 'undefined') {
      // Clear all localStorage data
      localStorage.clear();
      
      // Clear all sessionStorage data
      sessionStorage.clear();
      
      console.log('All storage data cleared during logout');
    }
    
    // Set current user to null
    this.currentUserSubject.next(null);
    this.userMenuSubject.next(null);
  }
  getAssignedWebMenus(projectId: number): Promise<{responseData: any, statusCode: number, message: string}> {
    return apiClient.get(process.env.NEXT_PUBLIC_API_URL + '/login/api/menu/assignedWebMenus?projectId=' + projectId);
  }
}


const authService = new AuthService();
export default authService;
