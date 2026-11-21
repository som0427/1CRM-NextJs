import React , { createContext, useContext } from 'react';

export interface ContactContextType {
  pageHeading: string;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  handleSearch: () => void;
  setLoading: (loading: boolean) => void;
  setNeedsListRefresh: (refresh: boolean) => void;
  gridDataLoaded: boolean;
  exporting: boolean;
  exportContacts: () => void;
  selectedView: 'self' | 'team' | 'all';
  setSelectedView: (view: 'self' | 'team' | 'all') => void;
  handleOpenAddModal: () => void;
}

export const ContactContext = createContext<ContactContextType | undefined>(undefined);
export const useContacts = () => {
  const ctx = useContext(ContactContext);
  if (!ctx) throw new Error('useContacts must be used within ContactContext.Provider');
  return ctx;
};

export const ContactProvider = ContactContext.Provider;
