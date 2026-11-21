import React from 'react';
import '../styles/app.css';
import '../styles/globals.css';
// Import AG Grid license early to ensure it's initialized before any grid components
import '../lib/agGridLicense';
import { AuthProvider } from '../lib/auth';
import LogoutSynchronizer from '../components/auth/LogoutSynchronizer';
import LocalStorageCheck from '../components/auth/LocalStorageCheck';
import { LoadingProvider } from '../contexts/loading/LoadingContext';
import Loader from '../components/ui/Loader';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Provider } from 'react-redux';
import store from '../store';
// Material UI Snackbar notifications
import { SnackbarProvider, closeSnackbar } from 'notistack';
import { createTheme, ThemeProvider } from '@mui/material/styles';
// React Query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Material Tailwind - Temporarily disabled for React 19 compatibility
// import { ThemeProvider as MaterialTailwindThemeProvider } from '@material-tailwind/react';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * NoSSR - A component that only renders its children on the client side
 * This helps prevent hydration issues between server and client rendering
 */
function NoSSR({ children }: { children: React.ReactNode }) {
  // Use this pattern to safely handle client-only rendering
  const [isMounted, setIsMounted] = React.useState(false);
  
  React.useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    return null;
  }
  
  return <>{children}</>;
}

/**
 * Custom App component for global styles and layouts
 * This implementation handles hydration issues by avoiding
 * rendering mismatches between server and client
 */
function MyApp({ Component, pageProps }: AppProps) {
  // Create a theme for Material UI components
  const theme = createTheme();
  const router = useRouter();

  // Determine if current route should skip localStorage check
  const path = router.asPath || router.pathname;
  const isPublicRoute = path === '/auth/login' || 
                        path === '/auth/register' || 
                        path === '/auth/forgot-password' ||
                        path === '/404' ||
                        path === '/500' ||
                        path.startsWith('/rcstart-registration');

  useEffect(() => {
    
    // Store current path for refresh handling
    if (typeof window !== 'undefined' && router.pathname !== '/' && router.pathname !== '/auth/login') {
      // This will help preserve the route during page refreshes
      sessionStorage.setItem('last_path', router.asPath);
      
      // Add beforeunload event listener to detect page refreshes
      const handleBeforeUnload = () => {
        sessionStorage.setItem('is_refresh', 'true');
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [router.pathname, router.asPath]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <LoadingProvider>
          <AuthProvider>
          {/* Global loader that blocks UI until critical resources are loaded */}
          <Loader />
        
        {/* LogoutSynchronizer monitors for logout events across applications */}
        <NoSSR>
          <LogoutSynchronizer />
        </NoSSR>
        
        {/* Material UI Theme and Material Tailwind Providers */}
        <ThemeProvider theme={theme}>
          <SnackbarProvider
            maxSnack={3}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            autoHideDuration={3000}
            style={{ marginTop: '60px' }}
            hideIconVariant={false}
            action={(snackbarId) => (
              <button
                onClick={() => closeSnackbar(snackbarId)}
                className="text-white hover:text-gray-200 ml-2 p-1"
                aria-label="Close"
              >
                ✕
              </button>
            )}
          >
            {/* Wrap with LocalStorageCheck to ensure storage is available */}
            <LocalStorageCheck skipCheck={isPublicRoute}>
              <Component {...pageProps} />
            </LocalStorageCheck>
            {/* Portal container for react-datepicker */}
            <div id="datepicker-portal" />
          </SnackbarProvider>
        </ThemeProvider>
        </AuthProvider>
      </LoadingProvider>
      </Provider>
    </QueryClientProvider>
  );
}

export default MyApp;
