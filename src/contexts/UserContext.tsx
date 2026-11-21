import React, { createContext, useContext } from 'react';

export interface UserContextType {
  pageHeading: string;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  handleSearch: () => void;
  setLoading: (loading: boolean) => void;
  setNeedsListRefresh: (refresh: boolean) => void;
  gridDataLoaded: boolean;
  exporting: boolean;
  exportUsers: () => void;
  handleOpenAddModal: () => void;
  // Pagination / Load More
  handleLoadMore: () => void;
  isLoadingMore: boolean;
  totalCount: number | null;
  currentCount: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  currentPageSize: number;
  setCurrentPageSize: (size: number) => void;
  // Filters
  handleOpenFilterModal: () => void;
  hasActiveFilters: boolean;
  activeFiltersCount: number;
  handleClearFilters: () => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUsers = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUsers must be used within UserContext.Provider');
  return ctx;
};

export const UserProvider = UserContext.Provider;
