import React, { useState, useEffect } from 'react';
import SwitchProjectButton from '../common/SwitchProjectButton';
import { getUserData, setLastRoute } from '../../lib/storage/sharedStorage';
import { UserData } from '../../types/menu';

interface UserInfoProps {
  onLogout: () => void;
  disableNavigation?: boolean;
}

const UserInfo: React.FC<UserInfoProps> = ({ onLogout, disableNavigation = false }) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  
  useEffect(() => {
    // Get user data from storage with more robust fallbacks
    const loadUserData = () => {
      // Check if we have the specially formatted userInfo in localStorage
      try {
        const userInfoStr = localStorage.getItem('userInfo');
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          if (userInfo && userInfo.name) {
            // console.log('Found user info in localStorage:', userInfo);
            setUserData(userInfo);
            return;
          }
        }
      } catch (e) {
        console.error('Error parsing userInfo from localStorage:', e);
      }
      
      // Next try using the shared storage utility
      const user = getUserData();
      
      if (user && user.name && user.email) {
        console.log('Found user data in shared storage:', user);
        setUserData(user);
        return;
      }
      
      // Try direct localStorage access for userData
      try {
        const userDataStr = localStorage.getItem('userData') || localStorage.getItem('currentUser');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          if (userData) {
            // Extract user information from various possible structures
            const userName = userData.firstName || userData.fullName || userData.name || userData.username || 
                           (userData.user ? userData.user.firstName || userData.user.name || userData.user.username : null);
            const userEmail = userData.userName || userData.email || userData.emailId || 
                            (userData.user ? userData.user.email || userData.user.emailId : null);
            
            if (userName) {
              console.log('Found user data in localStorage:', { name: userName, email: userEmail });
              setUserData({
                name: userName,
                email: userEmail || userName,
                id: userData.id || '',
                role: userData.role || ''
              });
              return;
            }
          }
        }
      } catch (e) {
        console.error('Error parsing user data from localStorage:', e);
      }
      
      // Fallback to default values if nothing is found
      console.warn('No user data found, using default values');
      setUserData({ name: 'User', email: 'user@example.com', id: '', role: '' });
    };
    
    loadUserData();
    
    // Check for user data changes periodically
    const interval = setInterval(loadUserData, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleDropdown = (): void => {
    setDropdownOpen(!dropdownOpen);
  };

  // Set a timestamp for logout synchronization
  const handleLogoutClick = (): void => {
    // Use the shared storage utility instead of direct localStorage calls
    // This ensures proper keys and consistent behavior
    // The timestamp will be set by clearAuthData()
    // Store current app for redirect after login
    setLastRoute('nextjs_logout');
    // Call the provided logout handler
    onLogout();
  };

  return (
    <div className="relative flex items-center gap-3" style={{ opacity: disableNavigation ? 0.5 : 1, pointerEvents: disableNavigation ? 'none' : 'auto' }}>
      {/* Switch Project Button */}
      <SwitchProjectButton userName={userData?.name} />

      {/* User Avatar and Info - Clickable Trigger */}
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-3 py-2 rounded-xl hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {/* User Name */}
        <div className="text-right hidden sm:block">
          <div className="text-sm font-medium text-gray-700">
            Hi, {userData?.name ? userData.name.split(' ')[0] : 'User'}
          </div>
        </div>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-semibold text-sm shadow-lg">
          {userData?.name ? userData.name[0]?.toUpperCase() : 'U'}
        </div>

        {/* Dropdown Arrow */}
        {/*<svg 
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            dropdownOpen ? 'rotate-180' : 'rotate-0'
          }`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>*/}
      </button>
      
      {/* Modern Dropdown Menu */}
      {dropdownOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setDropdownOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div className="absolute top-full right-0 mt-2 w-72 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 z-50 overflow-hidden">
            {/* User Info Section */}
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center space-x-4">
                {/* Large Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg">
                  {userData?.name ? userData.name[0]?.toUpperCase() : 'U'}
                </div>
                
                {/* User Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {userData?.name || 'User'}
                  </h3>
                  <p className="text-sm text-gray-500 truncate">
                    {userData?.email || 'user@example.com'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Actions Section */}
            <div className="p-4">
              {/* Logout Button */}
              <button 
                onClick={handleLogoutClick}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                {/* Logout Icon */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UserInfo;
