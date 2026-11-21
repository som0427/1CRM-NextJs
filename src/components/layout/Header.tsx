import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getUserData, clearAuthData } from '../../lib/storage/sharedStorage';
import { navigateTo } from '../../lib/navigation/appNavigator';
import MainNav from './MainNav';
import UserInfo from './UserInfo';
import authService from '../../lib/services/authService';

interface HeaderProps {
  disableNavigation?: boolean;
}

const Header: React.FC<HeaderProps> = ({ disableNavigation = false }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if user is logged in
    const checkLoginStatus = () => {
      const token = getUserData();
      setIsLoggedIn(!!token);
    };
    
    // Initial check
    checkLoginStatus();
    
    // Set up periodic check to detect Angular login
    const intervalId = setInterval(checkLoginStatus, 3000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  const handleLogout = (): void => {
    // Call authService.logout() to completely clear localStorage and sessionStorage
    authService.logout();
    
    // Also call clearAuthData to handle cross-app sync if needed
    clearAuthData();
    
    // Navigate to login page
    navigateTo('auth', 'nextjs');
  };

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      height: '64px',
      borderBottom: '1px solid #eaeaea',
      backgroundColor: 'white',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <div className="logo" style={{ display: 'flex', alignItems: 'center', opacity: disableNavigation ? 0.5 : 1, pointerEvents: disableNavigation ? 'none' : 'auto' }}>
        <Link
          href="/"
          style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', cursor: disableNavigation ? 'not-allowed' : 'pointer' }}
          onClick={(e) => disableNavigation && e.preventDefault()}>

          <div style={{ position: 'relative', width: '180px', height: '40px', marginRight: '10px' }}>
            <Image 
              src="/logos/assistive_logo.png"
              alt="Assistive Logo"
              fill
              style={{ objectFit: "contain" }}
            />
          </div>

        </Link>
      </div>
      <MainNav disableNavigation={disableNavigation} />
      <UserInfo onLogout={handleLogout} disableNavigation={disableNavigation} />
    </header>
  );
};

export default Header;
