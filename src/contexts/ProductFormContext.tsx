import React, { createContext, useContext } from 'react';

export interface ProductFormContextType {
  pageHeading: string;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  handleSearch: () => void;
  viewMode: 'table' | 'grid';
  setViewMode: (mode: 'table' | 'grid') => void;
  exporting: boolean;
  exportEntities: () => void;
  handleOpenAddModal: () => void;
  handleLoadMore: () => void;
  isLoadingMore: boolean;
  totalCount: number | null;
  currentCount: number;
  handleSaveDisplayOrder: () => void;
  isSavingDisplayOrder: boolean;
}

const ProductFormContext = createContext<ProductFormContextType | undefined>(undefined);

export const ProductFormProvider = ProductFormContext.Provider;

export const useProductForms = () => {
  const context = useContext(ProductFormContext);
  if (!context) {
    throw new Error('useProductForms must be used within a ProductFormProvider');
  }
  return context;
};
