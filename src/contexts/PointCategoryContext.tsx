import React, { createContext, useContext } from 'react';

interface PointCategoryContextValue {
  pageHeading: string;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  handleSearch: () => void;
  setLoading?: (v: boolean) => void;
  setNeedsListRefresh?: (v: boolean) => void;
  gridDataLoaded?: boolean;
  exporting?: boolean;
  exportPointCategory?: () => void;
  handleOpenAddModal?: () => void;
}

const PointCategoryContext = createContext<PointCategoryContextValue | undefined>(undefined);

export const PointCategoryProvider: React.FC<{ value: PointCategoryContextValue; children: React.ReactNode }> = ({ value, children }) => {
  return (
    <PointCategoryContext.Provider value={value}>{children}</PointCategoryContext.Provider>
  );
};

export const usePointCategory = () => {
  const ctx = useContext(PointCategoryContext);
  if (!ctx) throw new Error('usePointCategory must be used within PointCategoryProvider');
  return ctx;
};
