import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken } from '../lib/storage/sharedStorage';
import { NextPage } from 'next';
import Head from 'next/head';

// Redirect to login or dashboard based on authentication
const Home: NextPage = () => {
  const router = useRouter();
  
  useEffect(() => {
    if (router.pathname === '/' || router.asPath === '/') {
      // Check if user is authenticated
      const token = typeof window !== 'undefined' ? getAuthToken() : null;
      
      if (token) {
        // Check if this is a page refresh
        const isRefresh = typeof window !== 'undefined' ? sessionStorage.getItem('is_refresh') : null;
        const lastPath = typeof window !== 'undefined' ? sessionStorage.getItem('last_path') : null;
        
        // Clear refresh flag
        if (isRefresh) {
          sessionStorage.removeItem('is_refresh');
        }
        
        // If refreshing and we have a last path, go back to that page
        if (isRefresh && lastPath && lastPath !== '/' && !lastPath.includes('/auth/')) {
          console.log('Restoring path after refresh:', lastPath);
          router.push(lastPath);
        } else {
          // Otherwise go to dashboard
          router.push('/dashboard');
        }
      } else {
        // If not authenticated, redirect to login
        router.push('/auth/login');
      }
    }
  }, [router]);
  
  // Display loading state while redirecting
  return (
    <>
      <Head>
        <title>{process.env.NEXT_PUBLIC_APP_NAME || 'Assistive'}</title>
      </Head>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Arial, sans-serif',
        flexDirection: 'column'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <img 
            src="/logos/assistive_logo.png" 
            alt="Assistive Logo" 
            style={{ width: '200px', height: 'auto' }} 
          />
        </div>
        <p>Redirecting...</p>
      </div>
    </>
  );
};

export default Home;
