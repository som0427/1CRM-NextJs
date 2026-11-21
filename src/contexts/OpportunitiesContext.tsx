import React , { createContext, useContext } from 'react';

export interface OpportunitiesContextType {
  pageHeading: string;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  handleSearch: () => void;
  viewMode: 'table' | 'grid';
  setViewMode: (mode: 'table' | 'grid') => void;
  setLoading: (loading: boolean) => void;
  setNeedsListRefresh: (refresh: boolean) => void;
  gridDataLoaded: boolean;
  exporting: boolean;
  exportOpportunities: () => void;
  selectedView: 'self' | 'team' | 'all';
  setSelectedView: (view: 'self' | 'team' | 'all') => void;
  handleOpenAddModal: () => void;
}

export const OpportunitiesContext = createContext<OpportunitiesContextType | undefined>(undefined);
export const useOpportunities = () => {
  const ctx = useContext(OpportunitiesContext);
  if (!ctx) throw new Error('useOpportunities must be used within OpportunitiesContext.Provider');
  return ctx;
};

export const OpportunitiesProvider = OpportunitiesContext.Provider;
