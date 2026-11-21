import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import userService from '../lib/services/userService';
import settingsService from '../lib/services/settingsService';
import { getProjectId } from '../lib/storage/sharedStorage';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';

// Types
interface FieldValue {
  id: number;
  name: string;
}

interface FieldValuesContextType {
  getFieldValues: (fieldId: number, isOwnerField: boolean) => Promise<FieldValue[]>;
  clearProgress: () => void;
}

// Create context
const FieldValuesContext = createContext<FieldValuesContextType | undefined>(undefined);

// Provider component
export const FieldValuesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const apiCallsInProgress = useRef<Set<string>>(new Set());

  const getFieldValues = async (fieldId: number, isOwnerField: boolean): Promise<FieldValue[]> => {
    const projectId = getProjectId() || 0;
    
    if (isOwnerField) {
      const apiKey = `owner_${projectId}`;
      
      // Check if this API call is already in progress
      if (apiCallsInProgress.current.has(apiKey)) {
        // Return empty array if call already in progress to prevent duplicate
        return [];
      }

      // Mark API call as in progress
      apiCallsInProgress.current.add(apiKey);

      try {
        const data = await userService.getOwner(projectId, SystemAttributeEnum.COMPANY_MODULE);
        
        if (data.statusCode < 400) {
          const values = data.responseData.map((lookup: any) => ({
            id: lookup.id,
            name: lookup.fullName
          }));
          
          return values;
        }
        
        return [];
      } catch (error) {
        console.error('Error loading owner values:', error);
        return [];
      } finally {
        // Remove from progress tracking
        apiCallsInProgress.current.delete(apiKey);
      }
    } else {
      const apiKey = `attrib_${fieldId}`;
      
      // Check if this API call is already in progress
      if (apiCallsInProgress.current.has(apiKey)) {
        // Return empty array if call already in progress to prevent duplicate
        return [];
      }

      // Mark API call as in progress
      apiCallsInProgress.current.add(apiKey);

      try {
        const data = await settingsService.getAttribLookup(fieldId);
        
        if (data.statusCode < 400) {
          const values = data.responseData.map((lookup: any) => ({
            id: lookup.id,
            name: lookup.lookupValue
          }));
          
          return values;
        }
        
        return [];
      } catch (error) {
        console.error('Error loading attribute lookup values:', error);
        return [];
      } finally {
        // Remove from progress tracking
        apiCallsInProgress.current.delete(apiKey);
      }
    }
  };

  const clearProgress = () => {
    apiCallsInProgress.current.clear();
  };

  const value: FieldValuesContextType = {
    getFieldValues,
    clearProgress
  };

  return (
    <FieldValuesContext.Provider value={value}>
      {children}
    </FieldValuesContext.Provider>
  );
};

// Custom hook to use the context
export const useFieldValues = (): FieldValuesContextType => {
  const context = useContext(FieldValuesContext);
  if (!context) {
    throw new Error('useFieldValues must be used within a FieldValuesProvider');
  }
  return context;
};
