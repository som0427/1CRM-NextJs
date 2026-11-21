/**
 * Shared Storage Utility
 * 
 * This module provides localStorage and sessionStorage access with type safety
 * and error handling.
 */

// Storage key constants
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER_DATA: 'userData',
  LANGUAGE: 'app_language',
  THEME: 'app_theme',
  REMEMBER_ME: 'remember_me',
  // Keep these for backward compatibility
  CURRENT_USER: 'currentUser',
  LAST_ROUTE: 'last_route',
  LOGOUT_TIMESTAMP: 'logout_timestamp',
  ACTIVE_APP: 'active_app',
  NEXTJS_AUTH_SESSION: 'nextjs_auth_session',
};

// Type definitions
export interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  [key: string]: any; // For other user properties
}

interface StorageService {
  getItem<T>(key: string): T | null;
  setItem<T>(key: string, value: T): void;
  removeItem(key: string): void;
  clear(): void;
}

// Safe localStorage wrapper with type support
class LocalStorageService implements StorageService {
  getItem<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) as T : null;
    } catch (error) {
      console.error(`Error retrieving ${key} from localStorage:`, error);
      return null;
    }
  }

  setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
    }
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    
    try {
      window.localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
}

// Safe sessionStorage wrapper with type support
class SessionStorageService implements StorageService {
  getItem<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) as T : null;
    } catch (error) {
      console.error(`Error retrieving ${key} from sessionStorage:`, error);
      return null;
    }
  }

  setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} to sessionStorage:`, error);
    }
  }

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      window.sessionStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from sessionStorage:`, error);
    }
  }

  clear(): void {
    if (typeof window === 'undefined') return;
    
    try {
      window.sessionStorage.clear();
    } catch (error) {
      console.error('Error clearing sessionStorage:', error);
    }
  }
}

// Auth-specific helper functions
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || null;
};

export const setAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
};

export const removeAuthToken = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  window.sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
};

/**
 * Get user data from storage
 * @returns {UserData | null} User data or null if not found
 */
export const getUserData = (): UserData | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    // First try sessionStorage with different keys
    let userData = window.sessionStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (userData) return JSON.parse(userData) as UserData;
    
    userData = window.sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (userData) return JSON.parse(userData) as UserData;
    
    // Then try localStorage with different keys
    userData = window.localStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (userData) return JSON.parse(userData) as UserData;
    
    userData = window.localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (userData) return JSON.parse(userData) as UserData;
    
    // Check direct string access as fallback
    const sessionStr = window.sessionStorage.getItem('userData') || window.sessionStorage.getItem('currentUser');
    if (sessionStr) {
      try {
        return JSON.parse(sessionStr);
      } catch (e) {
        console.error('Error parsing session storage user data:', e);
      }
    }
    
    const localStr = window.localStorage.getItem('userData') || window.localStorage.getItem('currentUser');
    if (localStr) {
      try {
        return JSON.parse(localStr);
      } catch (e) {
        console.error('Error parsing local storage user data:', e);
      }
    }
    
    return null;
  } catch (e) {
    console.error('Error retrieving user data from storage:', e);
    return null;
  }
};

export const setUserData = (userData: UserData): void => {
  if (typeof window === 'undefined') return;
  
  try {
    window.localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  } catch (error) {
    console.error('Error saving user data:', error);
  }
};

export const clearAuthData = (): void => {
  if (typeof window === 'undefined') return;
  
  // First set logout timestamp for cross-app synchronization
  const logoutTimestamp = new Date().getTime();
  window.sessionStorage.setItem(STORAGE_KEYS.LOGOUT_TIMESTAMP, logoutTimestamp.toString());
  
  // Record which app initiated the logout
  window.sessionStorage.setItem(STORAGE_KEYS.ACTIVE_APP, 'nextjs');
  
  // Store the fact that we're logged out in sessionStorage to avoid triggering Angular's hot reload
  window.sessionStorage.setItem(STORAGE_KEYS.NEXTJS_AUTH_SESSION, 'logged_out');
  
  // Clear auth data in localStorage more selectively to avoid triggering Angular's hot reload
  window.localStorage.removeItem('authToken');
  window.localStorage.removeItem('user_data');
  
  // Clear all session storage items except for the logout timestamp and active app
  for (const key in window.sessionStorage) {
    if (window.sessionStorage.hasOwnProperty(key)) {
      if (key !== STORAGE_KEYS.LOGOUT_TIMESTAMP && 
          key !== STORAGE_KEYS.ACTIVE_APP && 
          key !== STORAGE_KEYS.NEXTJS_AUTH_SESSION) {
        window.sessionStorage.removeItem(key);
      }
    }
  }
};

// Cross-app logout signaling has been removed; this stub remains so that
// existing callers compile against an unchanged signature.
export const checkCrossAppLogout = (): boolean => false;


// Legacy function stubs for backward compatibility
export const setLastRoute = (route: string): void => {
  // Not implemented
};

export const getLastRoute = (): string | null => {
  return null;
};

export const setActiveApp = (app: 'nextjs' | 'angular'): void => {
  // Not implemented
};

export const getActiveApp = (): string | null => {
  return 'nextjs';
};

/**
 * Simple check if user is logged in
 * @returns {Promise<boolean>} True if user is logged in
 */
export const checkLogin = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  try {
    const authToken = 
      window.localStorage.getItem('authToken') || 
      window.sessionStorage.getItem('authToken');
    
    const userData = 
      window.localStorage.getItem('userData') ||
      window.sessionStorage.getItem('userData');
    
    // If we have both a token and user data, we're logged in
    return !!(authToken && userData);
  } catch (e) {
    console.error('Error checking login status:', e);
    return false;
  }
};

export const getProjectId = (): number | null => {
  if (typeof window === 'undefined') 
    return null;
  const selectedProject =  window.localStorage.getItem('selectedProject') || null;
  return JSON.parse(selectedProject) || null;
};

/**
 * Get the current user's numeric ID from storage
 * Tries multiple sources used across the app(s):
 * - getUserData() (user.userId | user.id)
 * - localStorage/sessionStorage: currentUser.userId | currentUser.id
 * - localStorage/sessionStorage: userData.userId | userData.id
 * Returns null if not found or not a valid number.
 */
export const getUserId = (): number | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (!raw) return null;
    const data: any = JSON.parse(raw);
    const val = data?.userId ?? data?.id;
    const n = typeof val === 'number' ? val : parseInt(String(val), 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
};

/**
 * Get the page heading data from localStorage
 * @returns The page heading data as an object or string
 */
export const getPageHeading = (): Record<string, string> | string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const pageHeadingData = window.localStorage.getItem('pluralName');
    if (!pageHeadingData) return null;
    
    // If it's a JSON string, parse it and return the object
    if (pageHeadingData.startsWith('{')) {
      return JSON.parse(pageHeadingData);
    }
    
    // Otherwise return the raw string
    return pageHeadingData;
  } catch (error) {
    console.error('Error retrieving page heading data:', error);
    return null;
  }
};

/**
 * Get the page heading data from localStorage
 * @returns The page heading data as an object or string
 */
export const getModuleSingularName = (): Record<string, string> | string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const singularNameData = window.localStorage.getItem('singularName');
    if (!singularNameData) return null;
    
    // If it's a JSON string, parse it and return the object
    if (singularNameData.startsWith('{')) {
      return JSON.parse(singularNameData);
    }
    
    // Otherwise return the raw string
    return singularNameData;
  } catch (error) {
    console.error('Error retrieving singular name data:', error);
    return null;
  }
};

/**
 * Get entity-specific page heading
 * @param entityType The type of entity to get the heading for (e.g., 'Opportunities', 'Contacts')
 * @param defaultValue Default value to return if not found
 * @returns The entity-specific heading or the default value
 */
export const getEntityHeading = (entityType: string, defaultValue: string = entityType): string => {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const pageHeadingData = getPageHeading();
    
    if (!pageHeadingData) return defaultValue;
    
    // If it's an object with the requested entity type
    if (typeof pageHeadingData === 'object' && pageHeadingData[entityType]) {
      return pageHeadingData[entityType];
    }
    
    // If it's a string and matches the entity type
    if (typeof pageHeadingData === 'string') {
      return pageHeadingData;
    }
    
    return defaultValue;
  } catch (error) {
    console.error(`Error retrieving ${entityType} heading:`, error);
    return defaultValue;
  }
};

// Create and export the service instances
export const localStorage = new LocalStorageService();
export const sessionStorage = new SessionStorageService();

// Export default object with all functions and services
/**
 * Get singular names from localStorage with defaults
 * @returns {Record<string, string>} Singular names merged with defaults
 */
export const getSingularNames = (): Record<string, string> => {
  const defaults: Record<string, string> = {
    Customers: 'Customer',
    Contacts: 'Contact',
    Opportunities: 'Opportunity',
  };
  
  // Key in localStorage is 'singularName' (without 's')
  const storedNames = localStorage.getItem<Record<string, string>>('singularName');
  if (storedNames) {
    return { ...defaults, ...storedNames };
  }
  return defaults;
};

export default {
  localStorage,
  sessionStorage,
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  getUserData,
  setUserData,
  clearAuthData,
  setLastRoute,
  getLastRoute,
  setActiveApp,
  getActiveApp,
  checkCrossAppLogout,
  checkLogin,
  getProjectId,
  getUserId,
  getPageHeading,
  getSingularNames
};
