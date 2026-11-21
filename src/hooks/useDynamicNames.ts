import { useState, useEffect } from 'react';

interface NamesMap {
  [key: string]: string;
}

type EntityNameType = 'singular' | 'plural';

interface UseEntityNamesReturn {
  singularNames: NamesMap;
  pluralNames: NamesMap;
  getSingularName: (key: string) => string;
  getPluralName: (key: string) => string;
  getEntityName: (key: string, type: EntityNameType) => string;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for managing both singular and plural names from localStorage
 * Provides a safe way to access entity names across different entities
 */
export const useEntityNames = (): UseEntityNamesReturn => {
  const [singularNames, setSingularNames] = useState<NamesMap>({});
  const [pluralNames, setPluralNames] = useState<NamesMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default fallback values
  const defaultSingularNames: NamesMap = {
    'contacts': 'Contact',
    'customers': 'Customer',
    'opportunities': 'Opportunity',
    'user': 'User'
  };

  const defaultPluralNames: NamesMap = {
    'contacts': 'Contacts',
    'customers': 'Customers',
    'user': 'Users'
  };

  useEffect(() => {
    const loadEntityNames = () => {
      try {
        setIsLoading(true);
        setError(null);

        // Helper to normalize keys to lowercase
        const normalizeKeys = (obj: NamesMap): NamesMap => {
          const normalized: NamesMap = {};
          Object.keys(obj).forEach(key => {
            normalized[key.toLowerCase()] = obj[key];
          });
          return normalized;
        };

        // Load singular names (localStorage key is 'singularName' without 's')
        const singularNamesStr = localStorage.getItem('singularName');
        let mergedSingularNames = { ...defaultSingularNames };
        
        if (singularNamesStr) {
          const parsedSingularNames = JSON.parse(singularNamesStr);
          // Normalize localStorage keys to lowercase and merge (localStorage takes priority)
          const normalizedParsed = normalizeKeys(parsedSingularNames);
          mergedSingularNames = {
            ...defaultSingularNames,
            ...normalizedParsed
          };
        } 
        // Load plural names (localStorage key is 'pluralName' without 's')
        const pluralNamesStr = localStorage.getItem('pluralName');
        let mergedPluralNames = { ...defaultPluralNames };
        
        if (pluralNamesStr) {
          const parsedPluralNames = JSON.parse(pluralNamesStr);
          // Normalize localStorage keys to lowercase and merge (localStorage takes priority)
          const normalizedParsed = normalizeKeys(parsedPluralNames);
          mergedPluralNames = {
            ...defaultPluralNames,
            ...normalizedParsed
          };
        }

        setSingularNames(mergedSingularNames);
        setPluralNames(mergedPluralNames);
      } catch (err) {
        console.error('Error loading entity names from localStorage:', err);
        setError('Failed to load entity names');
        
        // Fallback to defaults on error
        setSingularNames(defaultSingularNames);
        setPluralNames(defaultPluralNames);
      } finally {
        setIsLoading(false);
      }
    };

    loadEntityNames();

    // Listen for localStorage changes to update in real-time
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'singularName' || e.key === 'pluralName') {
        loadEntityNames();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  /**
   * Safely get singular name for a given key
   * @param key - The entity key (e.g., 'contacts', 'customers')
   * @returns The singular name or the key itself if not found
   */
  const getSingularName = (key: string): string => {
    // Keys are normalized to lowercase during load
    const lowerKey = key.toLowerCase();
    return singularNames[lowerKey] || key;
  };

  /**
   * Safely get plural name for a given key
   * @param key - The entity key (e.g., 'contacts', 'customers')
   * @returns The plural name or the key itself if not found
   */
  const getPluralName = (key: string): string => {
    // Keys are normalized to lowercase during load
    const lowerKey = key.toLowerCase();
    return pluralNames[lowerKey] || key;
  };

  /**
   * Unified function to get entity name in either singular or plural form
   * @param key - The entity key (e.g., 'contacts', 'customers')
   * @param type - The form type: 'singular' or 'plural'
   * @returns The appropriate name form or the key itself if not found
   * @example
   * getEntityName('customers', 'singular') // "Customer"
   * getEntityName('customers', 'plural')   // "Customers"
   */
  const getEntityName = (key: string, type: EntityNameType): string => {
    return type === 'singular' ? getSingularName(key) : getPluralName(key);
  };

  return {
    singularNames,
    pluralNames,
    getSingularName,
    getPluralName,
    getEntityName,
    isLoading,
    error
  };
};

// Export individual utility functions for specific use cases
export const getSingularNameStatic = (key: string): string => {
  try {
    const singularNamesStr = localStorage.getItem('singularName');
    if (singularNamesStr) {
      const names = JSON.parse(singularNamesStr);
      const lowerKey = key.toLowerCase();
      // Check for both lowercase and original case keys from localStorage
      const value = Object.keys(names).find(k => k.toLowerCase() === lowerKey);
      if (value) return names[value];
    }
  } catch (error) {
    console.error('Error getting singular name:', error);
  }
  
  // Default mappings as fallback
  const defaults: NamesMap = {
    'contacts': 'Contact',
    'customers': 'Customer',
    'opportunities': 'Opportunity'
  };
  
  return defaults[key.toLowerCase()] || key;
};

export const getPluralNameStatic = (key: string): string => {
  try {
    const pluralNamesStr = localStorage.getItem('pluralName');
    if (pluralNamesStr) {
      const names = JSON.parse(pluralNamesStr);
      const lowerKey = key.toLowerCase();
      // Check for both lowercase and original case keys from localStorage
      const value = Object.keys(names).find(k => k.toLowerCase() === lowerKey);
      if (value) return names[value];
    }
  } catch (error) {
    console.error('Error getting plural name:', error);
  }
  
  // Default mappings as fallback
  const defaults: NamesMap = {
    'contacts': 'Contacts',
    'customers': 'Customers',
    'opportunities': 'Opportunities'
  };
  
  return defaults[key.toLowerCase()] || key;
};

/**
 * Static unified function to get entity name in either singular or plural form
 * @param key - The entity key (e.g., 'contacts', 'customers')
 * @param type - The form type: 'singular' or 'plural'
 * @returns The appropriate name form or the key itself if not found
 * @example
 * getEntityNameStatic('customers', 'singular') // "Customer"
 * getEntityNameStatic('customers', 'plural')   // "Customers"
 */
export const getEntityNameStatic = (key: string, type: EntityNameType): string => {
  return type === 'singular' ? getSingularNameStatic(key) : getPluralNameStatic(key);
};

// Export the main hook with the new name
export const useDynamicNames = useEntityNames;

// Export types for external use
export type { EntityNameType };

// Main export
export default useDynamicNames;