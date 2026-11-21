import React , { createContext, useContext } from 'react';

export interface UserRoleContextType {
  pageHeading: string;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  handleSearch: () => void;
  setLoading: (loading: boolean) => void;
  setNeedsListRefresh: (refresh: boolean) => void;
  gridDataLoaded: boolean;
  handleOpenAddModal: () => void;
}

export const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);
export const useUserRoles = () => {
  const ctx = useContext(UserRoleContext);
  if (!ctx) throw new Error('useUserRoles must be used within UserRoleContext.Provider');
  return ctx;
};

export const UserRoleProvider = UserRoleContext.Provider;
