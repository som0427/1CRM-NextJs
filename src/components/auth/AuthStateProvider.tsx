import React, { useEffect } from 'react';
import { useAuth as useCentralAuth, AuthProvider as CentralAuthProvider } from '../../lib/auth';
import { User } from '../../lib/models/User';

// Create a context interface compatible with the original AuthStateProvider
interface LegacyAuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
}

// Create a legacy-style provider that wraps the central auth provider
// This ensures backward compatibility with components using the old AuthStateProvider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <CentralAuthProvider>
      {children}
    </CentralAuthProvider>
  );
}

// Hook for child components to get auth state in the format expected by legacy components
export const useAuth = (): LegacyAuthContextType => {
  const centralAuth = useCentralAuth();
  
  return {
    isAuthenticated: centralAuth.isAuthenticated,
    user: centralAuth.user,
    loading: centralAuth.loading
  };
};

// For components that need the full auth context capabilities
export const useFullAuth = () => useCentralAuth();
