import { useEffect } from 'react';
import { checkCrossAppLogout, clearAuthData } from '../../lib/storage/sharedStorage';
import { navigateTo } from '../../lib/navigation/appNavigator';

/**
 * LogoutSynchronizer component that monitors for logout events across applications
 * and ensures both Angular and Next.js apps maintain the same authentication state
 */
const LogoutSynchronizer: React.FC = () => {
  useEffect(() => {
    // Create an interval to check for cross-app logout events
    const checkInterval = setInterval(() => {
      // Check if another app has initiated logout
      if (checkCrossAppLogout()) {
        console.log('Detected logout from another application. Synchronizing logout state.');
        // Clear local auth data
        clearAuthData();
        // Redirect to login page
        navigateTo('auth', 'nextjs');
      }
    }, 5000); // Check every 5 seconds
    
    // Clean up the interval on component unmount
    return () => clearInterval(checkInterval);
  }, []);
  
  // This is a utility component that doesn't render anything
  return null;
};

export default LogoutSynchronizer;
