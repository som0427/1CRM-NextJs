import React , { createContext, useContext } from 'react';

export interface CustomerContextType {
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
  // Load More functionality
  handleLoadMore: () => void;
  isLoadingMore: boolean;
  totalCount: number | null;
  currentCount: number;
  // Filter functionality
  handleOpenFilterModal: () => void;
  hasActiveFilters: boolean;
  activeFiltersCount: number;
  handleClearFilters: () => void;
}

export const CustomerContext = createContext<CustomerContextType | undefined>(undefined);
export const useCustomer = () => {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error('useCustomer must be used within CustomerContext.Provider');
  return ctx;
};

export const CustomerProvider = CustomerContext.Provider;
