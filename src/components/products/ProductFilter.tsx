import React, { useState, useImperativeHandle, forwardRef, useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/tailwind';
import { AdvanceFilterProvider, FilterRuleCtx, OperatorItem } from '../../contexts/AdvanceFilterContext';
import { CustomAttibute } from '../../lib/models/custom-attibute.model';
import { CustomAttributeTypeEnum } from '../../lib/constants/CustomAttributeTypeEnum.constant';
import EntityFieldSelect from '../common/filter/EntityFieldSelect';
import OperatorSelect from '../common/filter/OperatorSelect';
import ValueInput from '../common/filter/ValueInput';
import advanceSearchService from '../../lib/services/advanceSearchService';
import settingsService from '../../lib/services/settingsService';
import { SystemAttributeEnum } from '../../lib/constants/SystemAttributeEnum.constant';
import { getProjectId } from '../../lib/storage/sharedStorage';
import RemoveActionButton from '../common/buttons/action-button/RemoveActionButton';
import AddActionButton from '../common/buttons/action-button/AddActionButton';
import Spinner from '../common/Spinner';

export interface ProductFilterRef {
  clearFilters: () => void;
  clear: () => void;
}

interface ProductFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: any) => void;
  onClear: () => void;
}

const ProductFilter = forwardRef<ProductFilterRef, ProductFilterProps>(
  ({ isOpen, onClose, onApply, onClear }, ref) => {
    const [filterRules, setFilterRules] = useState<FilterRuleCtx[]>([
      { id: '1', entityFieldId: 0, attributeTypeId: 0, operatorId: 0, value: '' }
    ]);
    const [entityFields, setEntityFields] = useState<CustomAttibute[]>([]);
    const [operatorListMap, setOperatorListMap] = useState<Map<number, OperatorItem[]>>(new Map());
    const [fieldValuesMap, setFieldValuesMap] = useState<Map<number, Array<{ id: number; name: string }>>>(new Map());
    const [loading, setLoading] = useState<boolean>(false);
    const [applying, setApplying] = useState<boolean>(false);

    const { control, handleSubmit, reset, setValue, clearErrors, trigger, watch, getValues } = useForm();

    useImperativeHandle(ref, () => ({
      clearFilters: () => {
        setFilterRules([{ id: '1', entityFieldId: 0, attributeTypeId: 0, operatorId: 0, value: '' }]);
        reset();
      },
      clear: () => {
        setFilterRules([{ id: '1', entityFieldId: 0, attributeTypeId: 0, operatorId: 0, value: '' }]);
        reset();
      }
    }));

    // Load initial data
    useEffect(() => {
      console.log('ProductFilter useEffect triggered, isOpen:', isOpen);
      if (isOpen) {
        console.log('Calling loadEntityFields and loadOperators');
        loadEntityFields();
        loadOperators();
      }
    }, [isOpen]);

    const loadEntityFields = async () => {
      console.log('loadEntityFields called');
      try {
        setLoading(true);
        const projectId = getProjectId();
        console.log('ProjectId from getProjectId():', projectId);
        if (projectId) {
          console.log('Making API call to getFieldDetails with projectId:', projectId, 'moduleType:', SystemAttributeEnum.PRODUCT_MODULE);
          const response = await settingsService.getFieldDetails(projectId, SystemAttributeEnum.PRODUCT_MODULE);
          console.log('getFieldDetails API response:', response);
          if (response.statusCode === 200 && response.responseData) {
            // Process all fields from the API response
            let filteredFields = response.responseData.filter((field: CustomAttibute) => 
              field.attributeType && field.attributeType.id && field.isActive === 1
            );
            console.log('Filtered fields:', filteredFields);
            
            // Add static fields for products (Created On, Updated On, Serial Key)
            const staticFields = advanceSearchService.fetchStaticFields(SystemAttributeEnum.PRODUCT_SERIAL_KEY_ID);
            console.log('Static fields:', staticFields);
            filteredFields.push(...staticFields);
            
            // Sort fields by display order
            filteredFields.sort((a, b) => {
              // Put static fields (negative IDs) first
              if (a.id < 0 && b.id >= 0) return -1;
              if (b.id < 0 && a.id >= 0) return 1;
              if (a.id < 0 && b.id < 0) return a.id - b.id;
              // Then sort by displayOrder
              return (a.displayOrder || 0) - (b.displayOrder || 0);
            });
            
            console.log('Final entityFields to set:', filteredFields);
            setEntityFields(filteredFields);
          }
        } else {
          console.log('No projectId found from getProjectId()');
        }
      } catch (error) {
        console.error('Error loading entity fields:', error);
      } finally {
        setLoading(false);
      }
    };

    const loadOperators = async () => {
      try {
        const response = await advanceSearchService.getAdvanceSearchOperators();
        const operatorMap = new Map<number, OperatorItem[]>();
        
        if (response.statusCode === 200 && response.responseData) {
          const operatorGroups = response.responseData;
          
          operatorGroups.forEach((group: any) => {
            const attributeType = group.attributeType;
            const operators = group.operators || [];
            
            operatorMap.set(attributeType, operators);
          });
        }
        
        setOperatorListMap(operatorMap);
      } catch (error) {
        console.error('Error loading operators:', error);
      }
    };

    const loadFieldValues = useCallback(async (field: CustomAttibute) => {
      if (field.attributeType?.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN || 
          field.attributeType?.id === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
        try {
          const projectId = getProjectId();
          if (projectId) {
            console.log('Loading field values for:', field.attributeName, 'attributeId:', field.id);
            // Call the getAttribLookupValues API
            const response = await settingsService.getAttribLookup(field.id);
            console.log('getAttribLookupValues API response:', response);
            if (response.statusCode === 200 && response.responseData) {
              // Transform API response to match expected format
              const transformedData = response.responseData.map((item: any) => ({
                id: item.id,
                name: item.lookupValue
              }));
              setFieldValuesMap(prev => new Map(prev.set(field.id, transformedData)));
            }
          }
        } catch (error) {
          console.error('Error loading field values:', error);
        }
      }
    }, []);

    const addFilterRule = () => {
      const newRule: FilterRuleCtx = {
        id: Date.now().toString(),
        entityFieldId: 0,
        attributeTypeId: 0,
        operatorId: 0,
        value: ''
      };
      setFilterRules([...filterRules, newRule]);
    };

    const removeFilterRule = (id: string) => {
      if (filterRules.length > 1) {
        setFilterRules(filterRules.filter(rule => rule.id !== id));
      }
    };

    const updateFilterRule = useCallback((id: string, key: keyof FilterRuleCtx, value: string | number) => {
      setFilterRules(prev => prev.map(rule => 
        rule.id === id ? { ...rule, [key]: value } : rule
      ));
    }, []);

    const handleFieldChange = useCallback((ruleId: string, field: CustomAttibute) => {
      console.log('handleFieldChange called for ruleId:', ruleId, 'field:', field);
      
      // Update filter rule state
      setFilterRules(prev => prev.map(rule => {
        if (rule.id === ruleId) {
          const updatedRule = {
            ...rule,
            entityFieldId: field.id,
            attributeTypeId: field.attributeType?.id || 0,
            operatorId: 0,
            value: '',
            fromValue: '',
            toValue: ''
          };
          
          // Reset react-hook-form values for operator and value fields
          setValue(`operator_${ruleId}`, '');
          if ([CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN, CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN].includes(field.attributeType?.id || 0)) {
            setValue(`value_${ruleId}`, []); // MultiSelect expects array
          } else {
            setValue(`value_${ruleId}`, '');
          }
          setValue(`fromValue_${ruleId}`, '');
          setValue(`toValue_${ruleId}`, '');
          
          // Load field values for dropdown fields
          if ([CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN, CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN].includes(field.attributeType?.id || 0)) {
            loadFieldValues(field);
          }
          
          return updatedRule;
        }
        return rule;
      }));
    }, [setValue, loadFieldValues]);

    const handleOperatorChange = useCallback((ruleId: string, operatorId: number, attributeTypeId: number) => {
      updateFilterRule(ruleId, 'operatorId', operatorId);
      
      // Clear value fields when operator changes
      setValue(`value_${ruleId}`, '');
      setValue(`fromValue_${ruleId}`, '');
      setValue(`toValue_${ruleId}`, '');
    }, [updateFilterRule, setValue]);

    // Helper functions
    const needsValueInput = useCallback((operatorId: number) => {
      return ![6, 7, 8, 9, 10].includes(operatorId); // Preset operators that don't need value input
    }, []);

    const shouldUseTextInput = useCallback((attributeTypeId: number) => {
      return ![CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN, CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN].includes(attributeTypeId);
    }, []);

    const hasBetweenOperator = useCallback((attributeTypeId: number, operatorId: number | string) => {
      return operatorId === 5; // Between operator
    }, []);

    const handleApply = async () => {
      try {
        setApplying(true);
        
        // Trigger form validation
        const isValid = await trigger();
        
        if (!isValid) {
          return;
        }
        
        // Get current form values (snapshot)
        const formValues = getValues();
        console.log('Form values:', formValues);
        
        // Filter valid rules (rules with entity field and operator selected)
        const validRules = filterRules.filter(rule => {
          const entityFieldId = formValues[`entityField_${rule.id}`];
          const operatorId = formValues[`operator_${rule.id}`];
          return entityFieldId && operatorId;
        });
        
        console.log('Valid rules:', validRules);
        
        if (validRules.length === 0) {
          return;
        }
        
        // Transform filter rules for API - format for product API
        const filterRequestBody = validRules.map(rule => {
          // Get actual form values for this rule
          const formEntityFieldId = parseInt(formValues[`entityField_${rule.id}`]);
          const formOperatorId = parseInt(formValues[`operator_${rule.id}`]);
          const formValue = formValues[`value_${rule.id}`] || '';
          const formFromValue = formValues[`fromValue_${rule.id}`] || null;
          const formToValue = formValues[`toValue_${rule.id}`] || null;
          
          // Find the field to get attributeTypeId
          const field = entityFields.find(f => f.id === formEntityFieldId);
          const attributeTypeId = field?.attributeType?.id || rule.attributeTypeId;
          
          let value = formValue;
          let fromValue = formFromValue;
          let toValue = formToValue;
          
          // Handle array values for multi-select dropdowns
          if (Array.isArray(formValue)) {
            value = formValue.join(','); // Convert array to comma-separated string
          }
          
          return {
            entityFieldId: formEntityFieldId,
            attributeTypeId: attributeTypeId,
            operatorId: formOperatorId,
            value: value || null,
            fromValue: fromValue,
            toValue: toValue
          };
        });
        
        console.log('Filter request body:', filterRequestBody);
        
        // Call the onApply callback with the filter array directly
        onApply(filterRequestBody);
      } catch (error) {
        console.error('Error applying filters:', error);
      } finally {
        setApplying(false);
      }
    };

    const handleCancel = () => {
      onClose();
    };

    const handleClear = () => {
      setFilterRules([{ id: '1', entityFieldId: 0, attributeTypeId: 0, operatorId: 0, value: '' }]);
      reset();
      onClear();
    };

    const contextValue = useMemo(() => ({
      control,
      setValue,
      clearErrors,
      trigger,
      watch,
      filterRules,
      entityFields,
      operatorListMap,
      fieldValuesMap,
      needsValueInput,
      shouldUseTextInput,
      hasBetweenOperator,
      handleFieldChange,
      handleOperatorChange,
      loadFieldValues,
      updateFilterRule,
    }), [
      control,
      setValue,
      clearErrors,
      trigger,
      watch,
      filterRules,
      entityFields,
      operatorListMap,
      fieldValuesMap,
      needsValueInput,
      shouldUseTextInput,
      hasBetweenOperator,
      handleFieldChange,
      handleOperatorChange,
      loadFieldValues,
      updateFilterRule,
    ]);

    if (!isOpen) return null;

    return (
      <AdvanceFilterProvider {...contextValue}>
        <div className="fixed inset-0 flex items-center justify-center z-50 modalBackground">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h4 className="text-xl font-medium text-gray-900">Filters</h4>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto">
              {loading ? (
                <Spinner className="min-h-[200px]" />
              ) : (
                <div className="space-y-3">
                  {filterRules.map((rule, index) => (
                    <div key={rule.id}>
                      <div className="flex gap-3 items-start">
                        {/* Entity Field Dropdown */}
                        <div className="flex-1 min-w-[200px]">
                          <EntityFieldSelect rule={{ id: rule.id }} />
                        </div>
    
                        {/* Operator Dropdown */}
                        <div className="w-[140px]">
                          <OperatorSelect rule={{ id: rule.id, entityFieldId: rule.entityFieldId, attributeTypeId: rule.attributeTypeId }} />
                        </div>
    
                        {/* Value Input */}
                        <div className="flex-1 min-w-[150px]">
                          <ValueInput rule={{ id: rule.id, entityFieldId: rule.entityFieldId, attributeTypeId: rule.attributeTypeId, operatorId: rule.operatorId }} />
                        </div>
    
                        {/* Buttons row - positioned below and to the right (match ProductFilter) */}
                      </div>
                      <div className="flex justify-end mt-2">
                        <div className="flex items-center space-x-1">
                          {/* Add button - only on last row */}
                          {index === filterRules.length - 1 && (
                            <AddActionButton
                              onAdd={addFilterRule}
                              disabled={false}
                              className="!w-7 !h-7"
                            />
                          )}
                          {/* Remove button - hide when only one rule remains */}
                          {filterRules.length > 1 && (
                            <RemoveActionButton
                              id={Number(rule.id)}
                              onRemove={() => removeFilterRule(rule.id)}
                              disabled={false}
                              className="!w-7 !h-7"
                            />
                          )}
                        </div>
                      </div>
    
                      {/* AND separator for non-last rows */}
                      {index < filterRules.length - 1 && (
                        <div className="flex justify-start items-center">
                          <span className="bg-blue-500 px-3.5 py-1.5 rounded-md text-sm font-medium text-white shadow-sm transition-colors duration-200">
                            AND
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button
                onClick={handleClear}
                variant="outline"
                className="px-4 py-1.5 text-sm text-gray-700 border-gray-300 hover:bg-gray-100"
              >
                Clear
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                className="px-4 py-1.5 text-sm text-gray-700 border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                disabled={applying}
                className="px-4 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
              >
                {applying ? 'Applying...' : 'Apply'}
              </Button>
            </div>
          </div>
        </div>
      </AdvanceFilterProvider>
    );
  }
);

ProductFilter.displayName = 'ProductFilter';

export default ProductFilter;
