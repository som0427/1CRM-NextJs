/**
 * Application Navigator
 * 
 * This utility helps manage navigation between Angular and Next.js applications
 * during the incremental migration process.
 */

import { STORAGE_KEYS } from '../storage/sharedStorage';

// Define constants for application URLs
const NEXTJS_BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
const ANGULAR_BASE_URL = process.env.NEXT_PUBLIC_ANGULAR_URL || 'http://localhost:4200';

// Feature flags to control which modules are served by which application
export const MIGRATED_FEATURES = {
  AUTH: 'nextjs',     // Authentication already migrated to Next.js
  DASHBOARD: 'angular', // Still using Angular for dashboard
  CUSTOMERS: 'angular',
  CONTACTS: 'angular',
  OPPORTUNITIES: 'angular',
  ACTIVITIES: 'angular',
  REPORTS: 'angular',
  SETTINGS: 'angular',
};

// Type definitions for route mapping
type AppType = 'angular' | 'nextjs';

interface RouteMapping {
  nextjs: string;
  angular: string;
}

// Map of routes between Angular and Next.js applications
const ROUTE_MAPPINGS: Record<string, RouteMapping> = {
  // Auth routes
  'auth': {
    nextjs: '/auth/login',
    angular: '/login'
  },
  
  // Main application routes
  'dashboard': {
    nextjs: '/dashboard',
    angular: '/dashboard'
  },
  'customers': {
    nextjs: '/customers',
    angular: '/customers'
  },
  'contacts': {
    nextjs: '/contacts',
    angular: '/contacts'
  },
  'opportunities': {
    nextjs: '/opportunities',
    angular: '/opportunities'
  },
  
  // Settings routes
  'settings': {
    nextjs: '/settings',
    angular: '/user-settings'
  },
};

/**
 * Determine the correct URL to navigate to based on the route and which app should handle it
 * @param route The route key (from ROUTE_MAPPINGS)
 * @param preferredApp Optional override for which app should handle this route
 * @returns The full URL to navigate to
 */
export const getAppUrl = (route: string, preferredApp?: AppType): string => {
  if (!ROUTE_MAPPINGS[route]) {
    console.warn(`Route mapping not found for "${route}"`);
    return `${NEXTJS_BASE_URL}/dashboard`;
  }

  // Determine which app should serve this route
  const moduleKey = route.toUpperCase();
  const appType = preferredApp || 
    (moduleKey in MIGRATED_FEATURES ? MIGRATED_FEATURES[moduleKey as keyof typeof MIGRATED_FEATURES] : 'angular');

  const baseUrl = appType === 'nextjs' ? NEXTJS_BASE_URL : ANGULAR_BASE_URL;
  const path = ROUTE_MAPPINGS[route][appType];
  
  // Add basePath for Next.js URLs
  return `${baseUrl}${path}`;
};

/**
 * Navigate to a specific route, potentially in a different application
 * @param route The route key (from ROUTE_MAPPINGS) 
 * @param preferredApp Optional override for which app should handle this route
 */
export const navigateTo = (route: string, preferredApp?: AppType): void => {
  if (typeof window === 'undefined') return;

  // Record the last route for resuming sessions
  window.localStorage.setItem(STORAGE_KEYS.LAST_ROUTE, route);
  
  // Get the target URL and navigate
  const url = getAppUrl(route, preferredApp);
  window.location.href = url;
};

/**
 * Check if the current route should be handled by the current application
 * or if it should redirect to the other application
 * @param route Current route key
 * @returns true if the route should be handled by the current application
 */
export const shouldHandleRoute = (route: string): boolean => {
  const moduleKey = route.toUpperCase();
  const isNextJs = typeof window !== 'undefined' && window.location.origin === NEXTJS_BASE_URL;
  
  // Check if this module has been migrated
  if (moduleKey in MIGRATED_FEATURES) {
    const preferredApp = MIGRATED_FEATURES[moduleKey as keyof typeof MIGRATED_FEATURES];
    return (preferredApp === 'nextjs' && isNextJs) || (preferredApp === 'angular' && !isNextJs);
  }
  
  // By default, stay in the current application
  return true;
};

export default {
  navigateTo,
  getAppUrl,
  shouldHandleRoute,
  MIGRATED_FEATURES,
};
