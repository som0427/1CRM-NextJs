import React, { createContext, useContext } from 'react';

interface ProductContextType {
  pageHeading: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleSearch: () => void;
  setLoading: (loading: boolean) => void;
  setNeedsListRefresh: (refresh: boolean) => void;
  gridDataLoaded: boolean;
  exporting: boolean;
  exportProducts: () => void;
  handleOpenAddModal: () => void;
  handleOpenFilterModal: () => void;
  hasActiveFilters: boolean;
  activeFiltersCount: number;
  handleClearFilters: () => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ 
  children: React.ReactNode; 
  value: ProductContextType 
}> = ({ children, value }) => {
  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
