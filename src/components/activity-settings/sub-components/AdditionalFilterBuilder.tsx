import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Control, UseFormSetValue } from 'react-hook-form';
import Select from '@/components/common/input-fields/Select';
import MultiSelect from '@/components/common/input-fields/MultiSelect';
import AddActionButton from '@/components/common/buttons/action-button/AddActionButton';
import RemoveActionButton from '@/components/common/buttons/action-button/RemoveActionButton';
import AndOrToggle from '@/components/common/buttons/action-button/AndOrToggle';
import settingsService from '@/lib/services/settingsService';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';

interface FilterRow {
  id: number;
  entity: string;
  entityField: string;
  values: string[];
  operator: 'AND' | 'OR';
}

interface EntityOption {
  value: string;
  label: string;
  moduleType: number;
}

interface FieldOption {
  value: string;
  label: string;
  attributeTypeId: number;
  lookupValues: { id: number; lookupValue: string }[];
}

interface AdditionalFilterBuilderProps {
  projectId: number;
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  associateWith: string[];
  dynamicNames: {
    customersLabel: string | null;
    opportunitiesLabel: string | null;
  };
  value?: FilterRow[];
  onChange?: (filters: FilterRow[]) => void;
  initialFieldOptionsMap?: Record<string, FieldOption[]>;
}

const AdditionalFilterBuilder: React.FC<AdditionalFilterBuilderProps> = ({
  projectId,
  control,
  setValue,
  associateWith,
  dynamicNames,
  value,
  onChange,
  initialFieldOptionsMap,
}) => {
  const [filters, setFilters] = useState<FilterRow[]>(
    value || [{ id: Date.now(), entity: '', entityField: '', values: [], operator: 'AND' }]
  );
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([]);
  const [fieldOptionsMap, setFieldOptionsMap] = useState<Record<string, FieldOption[]>>(initialFieldOptionsMap || {});
  const [isLoadingFields, setIsLoadingFields] = useState<Record<string, boolean>>({});

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef<boolean>(true);

  // Build entity options based on associateWith selections
  useEffect(() => {
    const options: EntityOption[] = [];

    if (associateWith?.includes('consumers') && dynamicNames.customersLabel) {
      options.push({
        value: 'consumer',
        label: dynamicNames.customersLabel,
        moduleType: SystemAttributeEnum.COMPANY_MODULE,
      });
    }

    if (associateWith?.includes('opportunities') && dynamicNames.opportunitiesLabel) {
      options.push({
        value: 'opportunity',
        label: dynamicNames.opportunitiesLabel,
        moduleType: SystemAttributeEnum.OPPORTUNITY_MODULE,
      });
    }

    setEntityOptions(options);
  }, [associateWith, dynamicNames]);

  // Fetch fields when entity is selected
  const fetchFieldsForEntity = useCallback(async (entityValue: string, moduleType: number) => {
    if (fieldOptionsMap[entityValue]) return; // Already loaded

    setIsLoadingFields(prev => ({ ...prev, [entityValue]: true }));

    try {
      const fields = await settingsService.getFormFields(projectId, moduleType);

      // Check if component was unmounted
      if (!isMountedRef.current) return;

      // Filter only single-select and multi-select fields
      const allowedTypes = new Set([
        CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN,
        CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN,
      ]);

      const filteredFields: FieldOption[] = (fields || [])
        .filter((field: any) => {
          const typeId = field?.attributeType?.id;
          return allowedTypes.has(typeId) && field.status !== 0;
        })
        .map((field: any) => ({
          value: String(field.id),
          label: field.attributeName || field.attributeIdentifierName || 'Field',
          attributeTypeId: field.attributeType?.id,
          lookupValues: field.lookupValues || [],
        }));

      setFieldOptionsMap(prev => ({ ...prev, [entityValue]: filteredFields }));
    } catch (error: any) {
      // Don't update state if component was unmounted
      if (!isMountedRef.current) return;
      console.error('Error fetching fields:', error);
      setFieldOptionsMap(prev => ({ ...prev, [entityValue]: [] }));
    } finally {
      // Only update loading state if component is still mounted
      if (isMountedRef.current) {
        setIsLoadingFields(prev => ({ ...prev, [entityValue]: false }));
      }
    }
  }, [projectId, fieldOptionsMap]);

  // Cleanup: mark component as unmounted
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Merge initialFieldOptionsMap when it changes (pre-fetched fields from parent)
  useEffect(() => {
    if (initialFieldOptionsMap && Object.keys(initialFieldOptionsMap).length > 0) {
      setFieldOptionsMap(prev => ({ ...prev, ...initialFieldOptionsMap }));
    }
  }, [initialFieldOptionsMap]);

  // Update filters when value prop changes (initial data load)
  useEffect(() => {
    if (value && value.length > 0) {
      setFilters(value);
    }
  }, [value]);

  // Sync filter values with React Hook Form after filters and field options are ready
  useEffect(() => {
    if (filters.length > 0 && Object.keys(fieldOptionsMap).length > 0) {
      filters.forEach(filter => {
        if (filter.entity) {
          setValue(`filter-entity-${filter.id}`, filter.entity);
        }
        if (filter.entityField && fieldOptionsMap[filter.entity]) {
          setValue(`filter-field-${filter.id}`, filter.entityField);
        }
        if (filter.values && filter.values.length > 0) {
          setValue(`filter-values-${filter.id}`, filter.values);
        }
      });
    }
  }, [filters, fieldOptionsMap, setValue]);

  // Fetch fields for entities that are already selected in initial data
  useEffect(() => {
    if (entityOptions.length > 0 && filters.length > 0) {
      // Get unique entities from filters that need field data
      const entitiesToFetch = new Set<string>();
      filters.forEach(filter => {
        if (filter.entity && !fieldOptionsMap[filter.entity]) {
          entitiesToFetch.add(filter.entity);
        }
      });

      // Fetch fields for each entity
      entitiesToFetch.forEach(entityValue => {
        const entityOption = entityOptions.find(e => e.value === entityValue);
        if (entityOption) {
          fetchFieldsForEntity(entityValue, entityOption.moduleType);
        }
      });
    }
  }, [entityOptions, filters, fieldOptionsMap, fetchFieldsForEntity]);

  // Notify parent of changes
  useEffect(() => {
    onChange?.(filters);
  }, [filters, onChange]);

  const handleAddFilter = () => {
    setFilters(prev => [
      ...prev,
      { id: Date.now(), entity: '', entityField: '', values: [], operator: globalOperator },
    ]);
  };

  const handleRemoveFilter = (id: number) => {
    if (filters.length > 1) {
      setFilters(prev => prev.filter(row => row.id !== id));
    }
  };

  const handleEntityChange = (id: number, entityValue: string) => {
    const entityOption = entityOptions.find(e => e.value === entityValue);
    if (entityOption) {
      fetchFieldsForEntity(entityValue, entityOption.moduleType);
    }

    setFilters(prev =>
      prev.map(row =>
        row.id === id
          ? { ...row, entity: entityValue, entityField: '', values: [] }
          : row
      )
    );
  };

  const handleFieldChange = (id: number, fieldValue: string) => {
    setFilters(prev =>
      prev.map(row =>
        row.id === id ? { ...row, entityField: fieldValue, values: [] } : row
      )
    );
  };

  const handleValuesChange = (id: number, values: string[]) => {
    setFilters(prev =>
      prev.map(row => (row.id === id ? { ...row, values } : row))
    );
  };

  // Get the global operator (from first filter row)
  const globalOperator = filters[0]?.operator || 'AND';

  const handleOperatorChange = (operator: 'AND' | 'OR') => {
    // Apply operator to ALL rows
    setFilters(prev =>
      prev.map(row => ({ ...row, operator }))
    );
  };

  const getFieldOptions = (entityValue: string): FieldOption[] => {
    return fieldOptionsMap[entityValue] || [];
  };

  const getLookupOptions = (entityValue: string, fieldValue: string) => {
    const fields = getFieldOptions(entityValue);
    const field = fields.find(f => f.value === fieldValue);
    return (field?.lookupValues || []).map(lv => ({
      value: String(lv.id),
      label: lv.lookupValue,
    }));
  };

  // Show validation error when no entities are available
  if (entityOptions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-12 gap-3 items-start">
          {/* Entity Select with empty state */}
          <div className="col-span-3">
            <Select
              name="filter-entity-empty"
              control={control}
              options={[]}
              placeholder="Entity"
              disabled
            />
            <div className="text-xs text-[#F64E60] mt-1">Add minimum one entity</div>
          </div>

          {/* Entity Field Select */}
          <div className="col-span-4">
            <Select
              name="filter-field-empty"
              control={control}
              options={[]}
              placeholder="Entity Field"
              disabled
            />
          </div>

          {/* Value */}
          <div className="col-span-4">
            <MultiSelect
              name="filter-values-empty"
              control={control}
              options={[]}
              placeholder="Value"
              disabled
            />
          </div>

          {/* Remove Button */}
          <div className="col-span-1 flex items-end gap-1 pb-1">
            <RemoveActionButton
              id={0}
              onRemove={() => {}}
              className="!w-6 !h-6"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filters.map((row, index) => (
        <div key={row.id}>
          <div className={`grid grid-cols-12 gap-3 items-end ${index == filters.length -1  ? 'pb-2' : ''}`}>
            {/* Entity Select */}
            <div className="col-span-3">
              <Select
                name={`filter-entity-${row.id}`}
                control={control}
                options={entityOptions.map(e => ({ value: e.value, label: e.label }))}
                placeholder="Select"
                onChange={(val) => handleEntityChange(row.id, val as string)}
              />
            </div>

            {/* Entity Field Select */}
            <div className="col-span-4">
              <Select
                name={`filter-field-${row.id}`}
                control={control}
                options={getFieldOptions(row.entity).map(f => ({ value: f.value, label: f.label }))}
                placeholder={isLoadingFields[row.entity] ? "Loading..." : "Entity Field"}
                disabled={!row.entity}
                loading={isLoadingFields[row.entity]}
                onChange={(val) => handleFieldChange(row.id, val as string)}
              />
            </div>

            {/* Value MultiSelect */}
            <div className="col-span-4">
              <MultiSelect
                name={`filter-values-${row.id}`}
                control={control}
                options={getLookupOptions(row.entity, row.entityField)}
                placeholder={!row.entityField ? "Value" : "Select values..."}
                disabled={!row.entityField}
                onChange={(val) => handleValuesChange(row.id, val as string[])}
              />
            </div>

            {/* Add/Remove Buttons */}
            <div className={`col-span-1 flex gap-1 pb-2`}>
              {filters.length > 1 && (
                <RemoveActionButton
                  id={row.id}
                  onRemove={() => handleRemoveFilter(row.id)}
                  className="!w-6 !h-6"
                />
              )}
              {index === filters.length - 1 && (
                <AddActionButton
                  onAdd={handleAddFilter}
                  className="!w-6 !h-6"
                />
              )}
            </div>
          </div>

          {/* AND/OR - Show between rows */}
          {index < filters.length - 1 && (
            <div className="flex items-center pt-4">
              {index === 0 ? (
                // Show toggle only for first row
                <AndOrToggle
                  value={globalOperator}
                  onChange={(val) => handleOperatorChange(val)}
                />
              ) : (
                // Show single state for subsequent rows
                <AndOrToggle
                  value={globalOperator}
                  onChange={() => {}}
                  showAnd={globalOperator === 'AND'}
                  showOr={globalOperator === 'OR'}
                />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdditionalFilterBuilder;
