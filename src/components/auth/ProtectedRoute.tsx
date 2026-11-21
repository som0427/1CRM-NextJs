import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { useRouter } from 'next/router';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component
 * Ensures that routes are only accessible to authenticated users
 * Automatically redirects unauthenticated users to the login page
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [manualAuthCheck, setManualAuthCheck] = useState<boolean | null>(null);
  
  // Add a direct check of localStorage/sessionStorage as backup to auth context
  useEffect(() => {
    // Manual check for authentication tokens in case context isn't updated
    const checkAuthTokens = () => {
      if (typeof window === 'undefined') return false;
      
      // First check if localStorage is available
      try {
        const testKey = '__localStorage_test__';
        window.localStorage.setItem(testKey, 'test');
        window.localStorage.removeItem(testKey);
      } catch (e) {
        // localStorage is not available (could be blocked by browser settings)
        console.error('localStorage is not available. Redirecting to login.');
        return false;
      }
      
      // Check for token in various storage locations
      const hasToken = 
        !!window.localStorage.getItem('authToken') || 
        !!window.sessionStorage.getItem('authToken');
        
      // Check for user data in various storage locations
      const hasUserData = 
        !!window.localStorage.getItem('currentUser') || 
        !!window.localStorage.getItem('userData') || 
        !!window.sessionStorage.getItem('currentUser') || 
        !!window.sessionStorage.getItem('userData');
      
      console.log('Manual auth check - Token:', hasToken, 'UserData:', hasUserData);
      return hasToken && hasUserData;
    };
    
    setManualAuthCheck(checkAuthTokens());
  }, []);
  
  // Check authentication status and redirect if needed
  useEffect(() => {
    // Wait until both checks are completed
    if (!loading && manualAuthCheck !== null) {
      const isAuthorized = isAuthenticated || manualAuthCheck;
      
      if (!isAuthorized) {
        console.log('User is not authenticated, redirecting to login');
        // Use direct location change instead of Next.js router to avoid potential issues
        window.location.href = '/auth/login'; 
      }
    }
  }, [isAuthenticated, loading, router, manualAuthCheck]);
  
  // Show loading state while checking authentication
  if (loading || manualAuthCheck === null) {
    return <div>Loading authentication status...</div>;
  }
  
  // Render children if authenticated by either method
  return (isAuthenticated || manualAuthCheck) ? <>{children}</> : null;
};

export default ProtectedRoute;
