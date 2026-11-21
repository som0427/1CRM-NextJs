import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '../ui/tailwind';
import { useForm, Controller } from 'react-hook-form';
import { AdvanceFilterProvider } from '../../contexts/AdvanceFilterContext';
import EntityFieldSelect from '../common/filter/EntityFieldSelect';
import OperatorSelect from '../common/filter/OperatorSelect';
import ValueInput from '../common/filter/ValueInput';
import settingsService from '../../lib/services/settingsService';
import { getProjectId } from '../../lib/storage/sharedStorage';
import { useFieldValues } from '../../contexts/FieldValuesContext';
import { SystemAttributeEnum } from '../../lib/constants/SystemAttributeEnum.constant';
import { CustomAttributeTypeEnum } from '../../lib/constants/CustomAttributeTypeEnum.constant';
import advanceSearchService from '@/lib/services/advanceSearchService';
import { CustomAttibute } from '@/lib/models/custom-attibute.model';
import AddActionButton from '../common/buttons/action-button/AddActionButton';
import RemoveActionButton from '../common/buttons/action-button/RemoveActionButton';
import Spinner from '../common/Spinner';

interface FilterRule {
  id: string;
  entityFieldId: number;
  attributeTypeId: number;
  operatorId: number;
  value: string;
  fromValue?: string;
  toValue?: string;
}



interface Operator {
  key: number;
  value: string;
}

interface AdvanceSearchRequest {
  advanceSearch: Array<{
    entityFieldId: number;
    attributeTypeId: number;
    operatorId: number;
    value: string;
    fromValue: string | null;
    toValue: string | null;
  }>;
  isFirstAdvSearch: boolean;
}

interface AdvanceFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (searchRequest: AdvanceSearchRequest) => void;
  onClear: () => void;
}

export interface AdvanceFilterRef {
  clear: () => void;
}

const AdvanceFilter = forwardRef<AdvanceFilterRef, AdvanceFilterProps>(({ 
  isOpen,
  onClose,
  onApply,
  onClear
}, ref) => {
  const [filterRules, setFilterRules] = useState<FilterRule[]>([
    { id: '1', entityFieldId: 0, attributeTypeId: 0, operatorId: 0, value: '' }
  ]);
  
  // React Hook Form setup for Select/MultiSelect components
  const { control, reset, watch, setValue, trigger, clearErrors, getValues } = useForm<Record<string, any>>({
    mode: 'onChange', // Validate on change to clear errors immediately
    defaultValues: {
      // Initialize default values for the initial filter rule to prevent controlled/uncontrolled warnings
      'entityField_1': '',
      'operator_1': '',
      'value_1': '',
      'fromValue_1': '',
      'toValue_1': ''
    }
  });
  
  // State for entity fields and operators
  const [entityFields, setEntityFields] = useState<CustomAttibute[]>([]);
  const [operatorListMap, setOperatorListMap] = useState<Map<number, Operator[]>>(new Map());
  const [fieldValuesMap, setFieldValuesMap] = useState<Map<number, Array<{ id: number; name: string }>>>(new Map());
  
  // Use field values context
  const { getFieldValues, clearProgress } = useFieldValues();
  const [loading, setLoading] = useState<boolean>(false);
  const [applying, setApplying] = useState<boolean>(false);
  
  // State to track applied filters for persistence
  const [appliedFilters, setAppliedFilters] = useState<FilterRule[]>([]);
  
  // Flag to prevent watch subscription interference during restoration
  const [isRestoringFilters, setIsRestoringFilters] = useState<boolean>(false);
  
  // Get project ID
  const projectId = getProjectId() || 0;
  
  // Utility functions
  const needsValueInput = (operatorId: number): boolean => {
    // Operators that don't need value input based on actual API response
    // 6-10: predefined date ranges (Last 7 days, Last 15 days, etc.)
    // Note: operator 5 is "Between" which DOES need value input
    return ![6, 7, 8, 9, 10].includes(operatorId);
  };

  const shouldUseTextInput = (attributeTypeId: number): boolean => {
    // Use TextInput for TEXT_SINGLE_LINE, TEXT_MULTI_LINE, EMAIL, and NUMERIC
    return [
      CustomAttributeTypeEnum.TEXT_SINGLE_LINE,    // 6
      CustomAttributeTypeEnum.TEXT_MULTI_LINE,     // 8
      CustomAttributeTypeEnum.EMAIL,               // 9
      CustomAttributeTypeEnum.NUMERIC              // 7
    ].includes(attributeTypeId);
  };

  const hasBetweenOperator = (attributeTypeId: number, operatorId: number | string): boolean => {
    // Convert operatorId to number to handle both string and number types
    const opId = typeof operatorId === 'string' ? parseInt(operatorId) : operatorId;
    
    // Only show between fields for NUMERIC attribute type (7) with Between operator (5)
    if (attributeTypeId === CustomAttributeTypeEnum.NUMERIC && opId === 5) {
      return true;
    }
    
    // Also support for DATE fields if needed
    if ([CustomAttributeTypeEnum.DATE, CustomAttributeTypeEnum.DATE_TIME].includes(attributeTypeId) && opId === 5) {
      return true;
    }
    
    // Support for CREATED_UPDATED_DATE
    if (attributeTypeId === -1 && opId === 5) {
      return true;
    }
    
    return false;
  };

  // Restricted attribute types (similar to Angular)
  const restrictedAttributeIds = [
    CustomAttributeTypeEnum.IMAGE,
    CustomAttributeTypeEnum.HEADER_TEXT,
    CustomAttributeTypeEnum.NORMAL_TEXT,
    CustomAttributeTypeEnum.PAGE_SEPARATOR,
    CustomAttributeTypeEnum.DOCUMENT_UPLOAD,
    CustomAttributeTypeEnum.AUDIO_VIDEO,
    CustomAttributeTypeEnum.DATA_LIST,
    CustomAttributeTypeEnum.QR_CODE_SCANNER,
    CustomAttributeTypeEnum.DATE_TIME,
    CustomAttributeTypeEnum.TIME_DURATION
  ];

  const restrictedSystemIds = [
    SystemAttributeEnum.COMPANY_GEO_FIELD_ID];



  
  const fetchOperatorsThenSetEntityFieldLists = async () => {
    if (!projectId) return;
    
    setLoading(true);
    
    try {
      // First fetch operators from API (like Angular component)
      const operatorResponse = await advanceSearchService.getAdvanceSearchOperators();
      
      if (operatorResponse.statusCode === 200 && operatorResponse.responseData) {
        const operatorMap = new Map<number, Operator[]>();
        
        // Process operators by attribute type (NEW - handle actual API structure)
        const operatorGroups = operatorResponse.responseData;
        
        // Process each operator group from API response
        operatorGroups.forEach((group: any) => {
          const attributeType = group.attributeType;
          const operators = group.operators || [];
          
          // Map the operators directly to the attribute type
          operatorMap.set(attributeType, operators);
        });
        setOperatorListMap(operatorMap);
      }
      
      // Then fetch entity fields
      const fieldsResponse = await settingsService.getFieldDetails(projectId, SystemAttributeEnum.COMPANY_MODULE);
      
      if (fieldsResponse.statusCode === 200 && fieldsResponse.responseData) {
        // Filter out restricted attribute types
        let filteredFields = fieldsResponse.responseData.filter((field: CustomAttibute) => 
          field.attributeType && !(restrictedSystemIds.includes(field.systemAttribute?.id) || restrictedAttributeIds.includes(field.attributeType.id))
        );
        filteredFields.push(...advanceSearchService.fetchStaticFields(SystemAttributeEnum.COMPANY_SERIAL_KEY_ID));
        filteredFields = sortFieldsByAttributeIdOrDisplayOrder(filteredFields, 'id', true);
        setEntityFields(filteredFields);
      }
      
      
    } catch (error) {
      console.error('Error fetching operators and fields:', error);
    } finally {
      setLoading(false);
    }
  };
  function sortFieldsByAttributeIdOrDisplayOrder(fieldList: CustomAttibute[], attribute: string, negativeIdFirst: boolean = false): CustomAttibute[] {
    return fieldList.sort((a, b) => {
      if (negativeIdFirst && a[attribute] < 0 && b[attribute] < 0) {
        return a[attribute] - b[attribute]; // Sort negative ids in ascending order
      }
      if (negativeIdFirst && a[attribute] < 0) {
        return -1; // a is negative, b is positive: a comes first
      }
      if (negativeIdFirst && b[attribute] < 0) {
        return 1; // b is negative, a is positive: b comes first
      }
      // Sort by displayOrder if no negativeIdFirst condition is met
      return a?.displayOrder - b?.displayOrder;
    });
  }

  // Check if there are any active filters applied
  const hasActiveFilters = filterRules.some(rule => 
    rule.entityFieldId > 0 && rule.operatorId > 0 && 
    (needsValueInput(rule.operatorId) ? (rule.value || rule.fromValue || rule.toValue) : true)
  );

  // Call APIs every time modal opens and restore applied filters or reset to clean state
  useEffect(() => {
    if (isOpen) {
      // Clear progress tracking to allow fresh API calls on modal open
      clearProgress();
      
      fetchOperatorsThenSetEntityFieldLists();
      
      // Clear all validation errors (defer to next tick to avoid render-phase updates)
      setTimeout(() => clearErrors(), 0);
    }
  }, [isOpen, projectId, reset, clearErrors, clearProgress]);

  // Separate useEffect to handle applied filters restoration only on modal open
  useEffect(() => {
    if (isOpen) {
      // If there are applied filters, restore them; otherwise, reset to clean state
      if (appliedFilters.length > 0) {
        // Restore applied filters
        setFilterRules([...appliedFilters]);
      } else {
        // Reset to clean state with single empty rule
        setFilterRules([{ id: '1', entityFieldId: 0, attributeTypeId: 0, operatorId: 0, value: '' }]);
        // Reset form state to clear any previous validation errors
        reset({
          // Reinitialize with default values for the initial filter rule
          'entityField_1': '',
          'operator_1': '',
          'value_1': '',
          'fromValue_1': '',
          'toValue_1': ''
        });
      }
    }
  }, [isOpen, appliedFilters, reset]);

  // Load field values for existing filter rules when entity fields are available
  useEffect(() => {
    if (isOpen && entityFields.length > 0) {
      // Create a Set to track unique field IDs to prevent duplicate API calls in same execution
      const processedFieldIds = new Set<number>();
      
      filterRules.forEach(rule => {
        if (rule.entityFieldId > 0 && !processedFieldIds.has(rule.entityFieldId)) {
          const field = entityFields.find(f => f.id === rule.entityFieldId);
          if (field && [CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN, CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN].includes(field.attributeType.id)) {
            // Load fresh data on modal open
            loadFieldValues(field);
            // Mark this field as processed to prevent duplicate calls in same execution
            processedFieldIds.add(rule.entityFieldId);
          }
        }
      });
    }
  }, [isOpen, entityFields]);

  // Handle field change (similar to Angular changeEntityField)
  const handleFieldChange = (ruleId: string, field: CustomAttibute) => {
    setFilterRules(prev => prev.map(rule => {
      if (rule.id === ruleId) {
        // Reset operator and value when field changes
        const updatedRule = {
          ...rule,
          entityFieldId: field.id,
          attributeTypeId: field.attributeType.id,
          operatorId: 0,
          value: '',
          fromValue: '',
          toValue: ''
        };
        
        // Reset react-hook-form values for operator and value fields
        setValue(`operator_${ruleId}`, '');
        if ([CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN, CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN].includes(field.attributeType.id)) {
          setValue(`value_${ruleId}`, []); // MultiSelect expects array
        } else {
          setValue(`value_${ruleId}`, '');
        }
        setValue(`fromValue_${ruleId}`, '');
        setValue(`toValue_${ruleId}`, '');
        
        // Load field values for dropdown fields (similar to Angular logic)
        if ([CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN, CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN].includes(field.attributeType.id)) {
          loadFieldValues(field);
        }
        
        return updatedRule;
      }
      return rule;
    }));
  };

  // (Removed duplicate earlier handleOperatorChange block)

// Handle operator change (similar to Angular changeOperator)
const handleOperatorChange = (ruleId: string, operatorId: number, attributeTypeId: number) => {
  // First, clear all value fields in the form
  // Use appropriate default based on field type
  if ([CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN, CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN].includes(attributeTypeId)) {
    setValue(`value_${ruleId}`, []); // Array for dropdowns
  } else {
    setValue(`value_${ruleId}`, ''); // String for other types
  }
  setValue(`fromValue_${ruleId}`, '');
  setValue(`toValue_${ruleId}`, '');
  clearErrors([`value_${ruleId}`, `fromValue_${ruleId}`, `toValue_${ruleId}`]);
  
  setFilterRules(prev => prev.map(rule => {
    if (rule.id === ruleId) {
      let updatedRule = {
        ...rule,
        operatorId,
        value: '',
        fromValue: '',
        toValue: ''
      };
      
      // Handle predefined date ranges and between for date-like fields
      if ([CustomAttributeTypeEnum.DATE, CustomAttributeTypeEnum.DATE_TIME].includes(attributeTypeId) || attributeTypeId === -1) {
        const today = new Date();
        let fromDate: Date | null = null;
        let toDate: Date = today;
        
        switch (operatorId) {
          case 5: // Between: clear to let user pick
            setValue(`fromValue_${ruleId}`, '', { shouldDirty: true, shouldTouch: true, shouldValidate: true });
            setValue(`toValue_${ruleId}`, '', { shouldDirty: true, shouldTouch: true, shouldValidate: true });
            break;
          case 6: // Last 7 days
            fromDate = new Date(today);
            fromDate.setDate(today.getDate() - 7);
            break;
          case 7: // Last 15 days
            fromDate = new Date(today);
            fromDate.setDate(today.getDate() - 15);
            break;
          case 8: // Last 30 days
            fromDate = new Date(today);
            fromDate.setDate(today.getDate() - 30);
            break;
          case 9: // Last 3 months
            fromDate = new Date(today);
            fromDate.setMonth(today.getMonth() - 3);
            break;
          case 10: // Last 6 months
            fromDate = new Date(today);
            fromDate.setMonth(today.getMonth() - 6);
            break;
        }
        
        if (fromDate) {
          updatedRule.fromValue = fromDate.toISOString().split('T')[0];
          updatedRule.toValue = toDate.toISOString().split('T')[0];
          // Reflect immediately in RHF fields so UI updates
          setValue(`fromValue_${ruleId}`, updatedRule.fromValue, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
          setValue(`toValue_${ruleId}`, updatedRule.toValue, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        }
      }
      
      return updatedRule;
    }
    return rule;
  }));
};

// Initialize form values when filter rules change to prevent controlled/uncontrolled warnings
// Only initialize for new rules, don't overwrite existing form values or restored values
useEffect(() => {
  if (isRestoringFilters) return; // skip during restoration
  
  // Defer the entire operation to avoid render-phase updates
  const timeoutId = setTimeout(() => {
    // Get all current form values at once (doesn't trigger subscriptions like watch)
    const currentFormValues = getValues();
    
    // Then perform all setValue operations for undefined fields
    filterRules.forEach(rule => {
      const entityFieldKey = `entityField_${rule.id}`;
      const operatorKey = `operator_${rule.id}`;
      const valueKey = `value_${rule.id}`;
      const fromValueKey = `fromValue_${rule.id}`;
      const toValueKey = `toValue_${rule.id}`;
      
      if (currentFormValues[entityFieldKey] === undefined) {
        setValue(entityFieldKey, rule.entityFieldId ? rule.entityFieldId.toString() : '');
      }
      if (currentFormValues[operatorKey] === undefined) {
        setValue(operatorKey, rule.operatorId ? rule.operatorId.toString() : '');
      }
      if (currentFormValues[valueKey] === undefined) {
        // For dropdowns, ensure array default. Split comma string for both single and multi selects.
        if (
          rule.attributeTypeId === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN ||
          rule.attributeTypeId === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN
        ) {
          setValue(valueKey, rule.value ? rule.value.split(',').filter(Boolean) : []);
        } else {
          setValue(valueKey, rule.value || '');
        }
      }
      if (currentFormValues[fromValueKey] === undefined) {
        setValue(fromValueKey, rule.fromValue || '');
      }
      if (currentFormValues[toValueKey] === undefined) {
        setValue(toValueKey, rule.toValue || '');
      }
    });
  }, 0);
  
  return () => clearTimeout(timeoutId);
}, [filterRules, setValue, getValues, appliedFilters, isOpen, isRestoringFilters]);

// Restore form values when modal reopens with existing filters
useEffect(() => {
  if (isOpen && appliedFilters.length > 0) {
    setIsRestoringFilters(true);
    const defaults: Record<string, any> = {};
    appliedFilters.forEach(rule => {
      const entityFieldValue = rule.entityFieldId ? rule.entityFieldId.toString() : '';
      const operatorValue = rule.operatorId ? rule.operatorId.toString() : '';
      let valueValue: any = rule.value || '';
      if (rule.attributeTypeId === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
        valueValue = rule.value ? rule.value.split(',').filter(Boolean) : [];
      } else if (rule.attributeTypeId === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN) {
        // Treat single-select as array of one or more IDs (supports legacy comma string)
        valueValue = rule.value ? rule.value.split(',').filter(Boolean) : [];
      }
      defaults[`entityField_${rule.id}`] = entityFieldValue;
      defaults[`operator_${rule.id}`] = operatorValue;
      defaults[`value_${rule.id}`] = valueValue;
      defaults[`fromValue_${rule.id}`] = rule.fromValue || '';
      defaults[`toValue_${rule.id}`] = rule.toValue || '';
    });
    // Apply defaults on next tick to avoid updating Controller during render
    setTimeout(() => {
      // 1) Restore values in one batch
      reset(defaults, { keepDirty: true, keepTouched: false, keepValues: false });

      // 2) Ensure dropdown options are loaded so restored IDs map to labels
      setTimeout(() => {
        appliedFilters.forEach(rule => {
          if (
            rule.attributeTypeId === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN ||
            rule.attributeTypeId === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN
          ) {
            const field = entityFields.find(f => f.id === rule.entityFieldId);
            if (field) {
              loadFieldValues(field);
            }
          }
        });
      }, 0);

      setIsRestoringFilters(false);
      // Optionally trigger validation later if needed
      // setTimeout(() => trigger(), 0);
    }, 0);
  }
}, [isOpen, appliedFilters, reset, trigger]);

  // Watch for entity field and operator changes
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      // Skip watch handling during filter restoration to prevent interference
      if (isRestoringFilters) {
        return;
      }
      
      if (name && name.startsWith('entityField_')) {
        const ruleId = name.replace('entityField_', '');
        const selectedFieldId = value[name];
        
        if (selectedFieldId) {
          const selectedField = entityFields.find(f => f.id.toString() === selectedFieldId);
          if (selectedField) {
            // Defer updates to avoid render-phase Controller updates
            setTimeout(() => {
              handleFieldChange(ruleId, selectedField);
              clearErrors(`entityField_${ruleId}`);
            }, 0);
          }
        } else {
          // Handle entity field clearing - reset rule to initial state
          setFilterRules(prev => prev.map(rule => {
            if (rule.id === ruleId) {
              const clearedRule = {
                ...rule,
                entityFieldId: 0,
                attributeTypeId: 0,
                operatorId: 0,
                value: '',
                fromValue: '',
                toValue: ''
              };
              
              // Reset react-hook-form values (defer)
              setTimeout(() => {
                setValue(`operator_${ruleId}`, '');
                setValue(`value_${ruleId}`, '');
                setValue(`fromValue_${ruleId}`, '');
                setValue(`toValue_${ruleId}`, '');
              }, 0);
              
              return clearedRule;
            }
            return rule;
          }));
        }
      } else if (name && name.startsWith('operator_')) {
        const ruleId = name.replace('operator_', '');
        const selectedOperatorId = value[name];
        
        if (selectedOperatorId) {
          const rule = filterRules.find(r => r.id === ruleId);
          if (rule) {
            // Defer updates
            setTimeout(() => {
              handleOperatorChange(ruleId, parseInt(selectedOperatorId), rule.attributeTypeId);
              clearErrors(`operator_${ruleId}`);
            }, 0);
          }
        }
      } else if (name && (name.startsWith('value_') || name.startsWith('fromValue_') || name.startsWith('toValue_'))) {
        // Clear validation errors for value fields when they are populated
        if (value[name]) {
          setTimeout(() => clearErrors(name), 0);
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [watch, entityFields, filterRules, handleFieldChange, handleOperatorChange, clearErrors, isRestoringFilters]);

  const addFilterRule = () => {
    const newRule: FilterRule = {
      id: Date.now().toString(),
      entityFieldId: 0,
      attributeTypeId: 0,
      operatorId: 0,
      value: ''
    };
    
    // Immediately initialize form values for the new rule to prevent controlled/uncontrolled warnings
    setValue(`entityField_${newRule.id}`, '');
    setValue(`operator_${newRule.id}`, '');
    setValue(`value_${newRule.id}`, '');
    setValue(`fromValue_${newRule.id}`, '');
    setValue(`toValue_${newRule.id}`, '');
    
    setFilterRules([...filterRules, newRule]);
  };

  const removeFilterRule = (id: string) => {
    if (filterRules.length > 1) {
      setFilterRules(filterRules.filter(rule => rule.id !== id));
    }
  };

  const updateFilterRule = (id: string, key: keyof FilterRule, value: string | number) => {
    setFilterRules(prev => prev.map(rule => 
      rule.id === id ? { ...rule, [key]: value } : rule
    ));
  };


  // Load field values for dropdown fields using context
  const loadFieldValues = async (field: CustomAttibute) => {
    try {
      const isOwnerField = [SystemAttributeEnum.COMPANY_OWNER_FIELD_ID, SystemAttributeEnum.CONTACT_OWNER_FIELD_ID, SystemAttributeEnum.ACTIVITY_OWNER_FIELD_ID].includes(field.systemAttribute?.id);
      
      // Use context to get field values (prevents duplicate concurrent API calls)
      const values = await getFieldValues(field.id, isOwnerField);
      
      // Update local state for immediate UI updates
      if (values.length > 0) {
        setFieldValuesMap(prev => new Map(prev.set(field.id, values)));
      }
    } catch (error) {
      console.error('Error loading field values:', error);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      // Trigger form validation
      const isValid = await trigger();
      
      if (!isValid) {
        setApplying(false);
        return;
      }
      
      // Get current form values (snapshot)
      const formValues = getValues();
      
      // Filter valid rules (rules with entity field and operator selected)
      const validRules = filterRules.filter(rule => {
        const entityFieldId = formValues[`entityField_${rule.id}`];
        const operatorId = formValues[`operator_${rule.id}`];
        return entityFieldId && operatorId;
      });
      
      if (validRules.length === 0) {
        setApplying(false);
        return;
      }
      
      // Transform filter rules for API and create applied filters with actual form values
      const advanceSearchArray = [];
      const appliedFiltersToStore = [];
      
      validRules.forEach(rule => {
        // Get actual form values for this rule
        const formEntityFieldId = parseInt(formValues[`entityField_${rule.id}`]);
        const formOperatorId = parseInt(formValues[`operator_${rule.id}`]);
        const formValue = formValues[`value_${rule.id}`] || '';
        const formFromValue = formValues[`fromValue_${rule.id}`] || '';
        const formToValue = formValues[`toValue_${rule.id}`] || '';
        
        let value = formValue;
        let fromValue: string | null = null;
        let toValue: string | null = null;

        const isDateLike = [CustomAttributeTypeEnum.DATE, CustomAttributeTypeEnum.DATE_TIME].includes(rule.attributeTypeId) || rule.attributeTypeId === -1;
        const isPreset = [6, 7, 8, 9, 10].includes(formOperatorId);

        if (isDateLike) {
          // For Between or presets, take from/to from form values (they're set in handleOperatorChange)
          if (formOperatorId === 5 || isPreset || hasBetweenOperator(rule.attributeTypeId, formOperatorId)) {
            const fallbackFrom = (rule as any).fromValue as string | undefined;
            const fallbackTo = (rule as any).toValue as string | undefined;
            fromValue = (formFromValue && formFromValue !== '') ? formFromValue : (fallbackFrom || null);
            toValue = (formToValue && formToValue !== '') ? formToValue : (fallbackTo || null);
            value = '';
          } else {
            // Single date equals to style
            value = formValue;
          }
        } else if ([CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN, CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN].includes(rule.attributeTypeId)) {
          // Handle dropdown values
          if (Array.isArray(formValue)) {
            value = formValue.join(',');
          } else if (typeof formValue === 'string' && formValue.includes(',')) {
            value = formValue; // Already comma-separated
          }
        } else {
          // Other types
          value = formValue;
        }
        
        // Create API object for advanceSearch array
        advanceSearchArray.push({
          entityFieldId: formEntityFieldId,
          attributeTypeId: rule.attributeTypeId,
          operatorId: formOperatorId,
          value,
          fromValue,
          toValue
        });
        
        // Create applied filter object with computed values for persistence
        appliedFiltersToStore.push({
          id: rule.id,
          entityFieldId: formEntityFieldId,
          attributeTypeId: rule.attributeTypeId,
          operatorId: formOperatorId,
          value, // use computed single value ('' for between/presets)
          fromValue: fromValue,
          toValue: toValue
        });
      });
      
      // Store the successfully applied filters for persistence
      setAppliedFilters(appliedFiltersToStore);
      
      // Create the request object in the format expected by parent
      const searchRequest: AdvanceSearchRequest = {
        advanceSearch: advanceSearchArray,
        isFirstAdvSearch: true
      };
      
      onApply(searchRequest);
      onClose();
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setApplying(false);
    }
  };

  const handleClear = () => {
    // Reset local filter rules state
    setFilterRules([{ id: '1', entityFieldId: 0, attributeTypeId: 0, operatorId: 0, value: '' }]);
    
    // Clear applied filters to ensure fresh start on next modal open
    setAppliedFilters([]);
    
    // Clear field values map and progress tracking
    setFieldValuesMap(new Map());
    clearProgress();
    
    // Reset react-hook-form state to clear all Select/MultiSelect components
    reset();
    
    // Don't call onClear() to avoid triggering APIs - just clear local state
    // onClear();
  };

  // Expose clear() to parent via ref
  useImperativeHandle(ref, () => ({
    clear: handleClear,
  }));

  const handleCancel = () => {
    onClose();
  };

  // Don't render modal until APIs are successfully loaded
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 modalBackground">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <AdvanceFilterProvider
          control={control}
          setValue={setValue}
          clearErrors={clearErrors}
          trigger={trigger}
          watch={watch}
          filterRules={filterRules}
          entityFields={entityFields}
          operatorListMap={operatorListMap}
          fieldValuesMap={fieldValuesMap}
          needsValueInput={needsValueInput}
          shouldUseTextInput={shouldUseTextInput}
          hasBetweenOperator={hasBetweenOperator}
          handleFieldChange={handleFieldChange}
          handleOperatorChange={handleOperatorChange}
          loadFieldValues={loadFieldValues}
          updateFilterRule={updateFilterRule}
        >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
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
        </AdvanceFilterProvider>
      </div>
    </div>
  );
});

export default AdvanceFilter;
