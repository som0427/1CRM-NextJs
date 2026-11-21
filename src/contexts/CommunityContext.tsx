import React, { createContext, useContext } from 'react';

interface CommunityContextValue {
  pageHeading: string;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  handleSearch: () => void;
  setLoading?: (v: boolean) => void;
  setNeedsListRefresh?: (v: boolean) => void;
  gridDataLoaded?: boolean;
  exporting?: boolean;
  exportCommunity?: () => void;
  handleOpenAddModal?: () => void;
}

const CommunityContext = createContext<CommunityContextValue | undefined>(undefined);

export const CommunityProvider: React.FC<{ value: CommunityContextValue; children: React.ReactNode }> = ({ value, children }) => {
  return (
    <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>
  );
};

export const useCommunity = () => {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error('useCommunity must be used within CommunityProvider');
  return ctx;
};
