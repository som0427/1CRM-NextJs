import React, { createContext, useContext } from 'react';
import { AuthProvider as CentralAuthProvider, useAuth as useCentralAuth } from '../lib/auth';
import { User } from '../lib/models/User';

// Interface for the legacy auth context
interface LegacyAuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  logout: () => void;
  updateUser: (userData: User) => void;
}

// Create a context that matches the original structure
const AuthContext = createContext<LegacyAuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // We'll use the central auth provider but expose a compatible interface
  return (
    <CentralAuthProvider>
      <LegacyAuthAdapter>
        {children}
      </LegacyAuthAdapter>
    </CentralAuthProvider>
  );
};

// Adapter component to bridge between the new auth system and legacy components
const LegacyAuthAdapter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const centralAuth = useCentralAuth();
  
  // Create an adapter that provides the legacy interface using the new auth system
  const legacyAuthValue: LegacyAuthContextType = {
    isAuthenticated: centralAuth.isAuthenticated,
    user: centralAuth.user,
    loading: centralAuth.loading,
    logout: centralAuth.logout,
    // Add an updateUser method to maintain compatibility with the original interface
    updateUser: (userData: User) => {
      // This is a no-op since our central auth system manages the user state differently
      // But we provide it to maintain the same interface
      console.warn('updateUser is deprecated. User state is managed automatically.');
    }
  };

  return (
    <AuthContext.Provider value={legacyAuthValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use the auth context
export const useAuth = (): LegacyAuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
