import { useEffect, useState } from 'react';
import { getEntityHeading } from '../lib/storage/sharedStorage';

/**
 * Custom hook that provides entity-specific page heading
 * @param entityType The type of entity to get the heading for (e.g., 'Opportunities', 'Contacts')
 * @param defaultValue Default value to return if not found
 * @returns The entity-specific heading
 */
export const useEntityHeading = (entityType: string, defaultValue: string = entityType): string => {
  // Initialize with default or entity type
  const [heading, setHeading] = useState<string>(defaultValue);

  useEffect(() => {
    // Get entity-specific page heading
    const entityHeading = getEntityHeading(entityType, defaultValue);
    setHeading(entityHeading);
  }, [entityType, defaultValue]);

  return heading;
};
