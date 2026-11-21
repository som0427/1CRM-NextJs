import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from './models/User';
import authService from './services/authService';
import { useRouter } from 'next/router';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  getUserMenu: (projectId: number) => Promise<any[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const subscription = authService.currentUser.subscribe(currentUserData => {
      if (currentUserData) {
        setUser(currentUserData);
        setIsAuthenticated(true);
        // Check for redirect page
        const redirectPage = localStorage.getItem('redirectPage');
        if (redirectPage !== null) {
          localStorage.removeItem('redirectPage');
          router.replace(redirectPage);
        } 
        // UPDATED: Do NOT automatically redirect here - the ProjectSelectionModal component
        // will handle menu loading and navigation to settings-assistant
        // This prevents navigation before menu loading is complete
        else if (
          router.isReady &&
          (router.pathname === '/auth/login' || router.pathname === '/')
        ) {
          // We don't navigate here anymore - let the ProjectSelectionModal handle it
          console.log('Logged in successfully - waiting for menu loading and project selection');
          // No router.replace() call here - navigation happens in ProjectSelectionModal
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        // User is now null, handle redirect if necessary
        // Ensure router is ready and we are not in a loading state from initial auth check
        if (router.isReady && !loading) {
          // Define public paths without basePath
          const publicPaths = ['/auth/login', '/auth/forgot-password', '/auth/sync', '/rcstart-registration']; // Add other public paths
          
          // Check for refresh scenario
          const isRefresh = sessionStorage.getItem('is_refresh') === 'true';
          const lastPath = sessionStorage.getItem('last_path');
          
          // Special handling for direct navigation to customer page or other direct URLs
          const isDirectNavigation = sessionStorage.getItem('direct_navigation') === 'true';
          
          // Handle page refresh cases - don't redirect if this is a refresh
          if (isRefresh && lastPath && !publicPaths.includes(lastPath)) {
            // We'll let the page reload naturally and not redirect
            return;
          }
          
          // Only redirect if this is not a direct navigation and not a public path
          if (!publicPaths.includes(router.pathname) && 
              !router.pathname.startsWith('/public/') && 
              !isDirectNavigation) {
              
            console.log('[AuthProvider] User is null and not on public path, redirecting to /auth/login. Current path:', router.pathname);
            // Prevent redirect loops by checking if we're already on the login page
            if (router.pathname !== '/auth/login') {
              router.push('/auth/login'); // Next.js router handles basePath automatically
            }
          }
          
          // Clear direct navigation flag after it's been used
          if (isDirectNavigation) {
            sessionStorage.removeItem('direct_navigation');
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router, loading]); // router and loading are dependencies. user state is set inside.

  useEffect(() => {
    // Check if the user is already logged in
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        // Check if we have auth token and user data
        const token = localStorage.getItem('authToken') || 
                      sessionStorage.getItem('authToken');
                      
        const userDataString = localStorage.getItem('userData') || 
                               sessionStorage.getItem('userData');
          
        if (token && userDataString) {
          try {
            // Parse and validate user data
            const userData = JSON.parse(userDataString);
            
            // Set user in state
            authService.setUser(userData);
            setUser(userData);
            setIsAuthenticated(true);
            console.log('Successfully restored auth state');
          } catch (e) {
            console.error('Error restoring auth state:', e);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const userData = await authService.login(email, password);
      
      if (userData) {
        // The user data is already set via the subscription above
        // We don't preload or fetch the menu here anymore
        // This is now handled exclusively by the ProjectSelectionModal component
        // which ensures menu is fully loaded before navigation
        console.log('Login successful - project selection and menu loading will follow');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };
  
  const getUserMenu = async (projectId: number): Promise<any[]> => {
    try {
      return await authService.getUserMenu(projectId);
    } catch (error) {
      console.error('Error getting user menu:', error);
      return [];
    }
  };
  
  const logout = (): void => {
    console.log('[AuthProvider] logout() called. Calling authService.logout(). Current path:', router.pathname);
    authService.logout(); // This will trigger the useEffect to handle the redirect
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      isAuthenticated,
      getUserMenu
    }}>
      {children}
    </AuthContext.Provider>
  );
}



// Mock API function - replace with actual API call in production
async function mockLoginApi(email: string, password: string) {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  // Simple validation for demo purposes
  if (email === 'demo@example.com' && password === 'password') {
    return {
      success: true,
      token: 'mock-jwt-token',
      user: {
        id: '1',
        name: 'Demo User',
        email: 'demo@example.com',
        role: 'admin'
      }
    };
  }
  
  throw new Error('Invalid credentials');
}
