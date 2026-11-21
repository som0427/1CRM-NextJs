import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

interface LocalStorageCheckProps {
  children: React.ReactNode;
  redirectUrl?: string;
  skipCheck?: boolean;
}

/**
 * LocalStorageCheck component
 * Ensures localStorage is available before rendering protected content
 * Redirects to login or custom URL if localStorage is blocked/unavailable
 */
const LocalStorageCheck: React.FC<LocalStorageCheckProps> = ({ 
  children, 
  redirectUrl = '/auth/login',
  skipCheck = false 
}) => {
  const router = useRouter();
  const [isStorageAvailable, setIsStorageAvailable] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Skip check if specified (useful for public pages)
    if (skipCheck) {
      setIsStorageAvailable(true);
      return;
    }

    const checkLocalStorage = () => {
      if (typeof window === 'undefined') {
        setIsStorageAvailable(false);
        return;
      }

      try {
        // Test localStorage availability
        const testKey = '__localStorage_availability_test__';
        window.localStorage.setItem(testKey, 'test');
        const testValue = window.localStorage.getItem(testKey);
        window.localStorage.removeItem(testKey);

        if (testValue !== 'test') {
          throw new Error('localStorage read/write test failed');
        }

        // Test sessionStorage availability
        const sessionTestKey = '__sessionStorage_availability_test__';
        window.sessionStorage.setItem(sessionTestKey, 'test');
        const sessionTestValue = window.sessionStorage.getItem(sessionTestKey);
        window.sessionStorage.removeItem(sessionTestKey);

        if (sessionTestValue !== 'test') {
          throw new Error('sessionStorage read/write test failed');
        }

        setIsStorageAvailable(true);
      } catch (error) {
        console.error('Storage availability check failed:', error);
        
        // Determine the specific error
        let message = 'Storage is not available. ';
        if (error instanceof Error) {
          if (error.name === 'SecurityError' || error.name === 'QuotaExceededError') {
            message += 'Please check your browser settings and ensure cookies and site data are enabled.';
          } else {
            message += error.message;
          }
        }
        
        setErrorMessage(message);
        setIsStorageAvailable(false);

        // Redirect after showing error briefly
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 2000);
      }
    };

    checkLocalStorage();
  }, [redirectUrl, skipCheck]);

  // Show loading while checking
  if (isStorageAvailable === null && !skipCheck) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div>Checking browser storage availability...</div>
      </div>
    );
  }

  // Show error message if storage is not available
  if (isStorageAvailable === false && !skipCheck) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        flexDirection: 'column',
        gap: '20px',
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          padding: '20px',
          maxWidth: '500px',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#c00', marginBottom: '10px' }}>Storage Access Required</h2>
          <p style={{ color: '#666' }}>{errorMessage}</p>
          <p style={{ color: '#666', marginTop: '10px' }}>Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  // Render children if storage is available
  return <>{children}</>;
};

export default LocalStorageCheck;