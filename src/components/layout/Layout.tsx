import React, { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import Header from './Header';
import Footer from './Footer';
import LogoutSynchronizer from '../auth/LogoutSynchronizer';
import { setActiveApp } from '../../lib/storage/sharedStorage';

interface LayoutProps {
  children: ReactNode;
  disableNavigation?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, disableNavigation = false }) => {
  const router = useRouter();
  const isLoginPage = router.pathname === '/login';
  
  // Set this app as the active app for cross-app communication
  useEffect(() => {
    setActiveApp('nextjs');
  }, []);
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh', // Use fixed height instead of minHeight
      overflow: 'hidden' // Prevent scrolling on the main container
    }}>
      <LogoutSynchronizer />
      <Header disableNavigation={disableNavigation} />
      <main style={{
        flex: '1',
        backgroundColor: '#f5f8fa',
      //  overflowY: 'auto' // Only add scrolling to the main content area
      }}>
        {children}
      </main>
      {isLoginPage && <Footer />}
    </div>
  );
};

export default Layout;
