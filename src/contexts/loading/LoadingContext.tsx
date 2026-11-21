import React, { createContext, useState, useContext, useEffect } from 'react';

type LoadingContextType = {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  pendingAPIs: Set<string>;
  addPendingAPI: (apiName: string) => void;
  removePendingAPI: (apiName: string) => void;
};

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAPIs, setPendingAPIs] = useState<Set<string>>(new Set());

  // Set loading state based on pending APIs
  useEffect(() => {
    // If we have any pending APIs, we're loading
    setIsLoading(pendingAPIs.size > 0);
    
    console.log('Loading state updated:', pendingAPIs.size > 0, 'Pending APIs:', Array.from(pendingAPIs));
  }, [pendingAPIs]);

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  const addPendingAPI = (apiName: string) => {
    console.log(`Adding pending API: ${apiName}`);
    setPendingAPIs(prev => {
      const newSet = new Set(prev);
      newSet.add(apiName);
      return newSet;
    });
  };

  const removePendingAPI = (apiName: string) => {
    console.log(`Removing pending API: ${apiName}`);
    setPendingAPIs(prev => {
      const newSet = new Set(prev);
      newSet.delete(apiName);
      return newSet;
    });
  };

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading, pendingAPIs, addPendingAPI, removePendingAPI }}>
      {children}
    </LoadingContext.Provider>
  );
};
