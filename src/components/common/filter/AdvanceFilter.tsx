import React, { useState, useImperativeHandle, forwardRef, useCallback, useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { UseFormSetValue } from 'react-hook-form';
import { Button } from '../../ui/tailwind';
import { AdvanceFilterProvider, FilterRuleCtx, OperatorItem } from '../../../contexts/AdvanceFilterContext';
import { CustomAttibute } from '../../../lib/models/custom-attibute.model';
import { CustomAttributeTypeEnum } from '../../../lib/constants/CustomAttributeTypeEnum.constant';
import EntityFieldSelect from './EntityFieldSelect';
import OperatorSelect from './OperatorSelect';
import ValueInput from './ValueInput';
import advanceSearchService from '../../../lib/services/advanceSearchService';
import settingsService from '../../../lib/services/settingsService';
import { getProjectId } from '../../../lib/storage/sharedStorage';
import Spinner from '../Spinner';
import AddActionButton from '../buttons/action-button/AddActionButton';
import RemoveActionButton from '../buttons/action-button/RemoveActionButton';

/**
 * Resolve a date-range operator into a concrete `{from, to}` window.
 *
 * Returns:
 *   `'between'`  → operator 5 (Between): caller should clear the inputs so
 *                  the user picks the dates.
 *   `null`       → unrelated operator (e.g. Equals): caller clears from/to.
 *   `{...}`      → preset range (operators 6–10).
 */
type PresetRange = { fromDateStr: string; toDateStr: string };
const PRESET_DATE_RANGE_OPS: Record<number, (today: Date) => Date> = {
  6:  (today) => { const d = new Date(today); d.setDate(today.getDate() - 7);  return d; },
  7:  (today) => { const d = new Date(today); d.setDate(today.getDate() - 15); return d; },
  8:  (today) => { const d = new Date(today); d.setDate(today.getDate() - 30); return d; },
  9:  (today) => { const d = new Date(today); d.setMonth(today.getMonth() - 3); return d; },
  10: (today) => { const d = new Date(today); d.setMonth(today.getMonth() - 6); return d; },
};
const computePresetDateRange = (operatorId: number): PresetRange | 'between' | null => {
  if (operatorId === 5) return 'between';
  const compute = PRESET_DATE_RANGE_OPS[operatorId];
  if (!compute) return null;
  const today = new Date();
  const fromDate = compute(today);
  return {
    fromDateStr: fromDate.toISOString().split('T')[0],
    toDateStr: today.toISOString().split('T')[0],
  };
};

const DROPDOWN_ATTRIBUTE_TYPE_IDS = new Set<number>([
  CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN,
  CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN,
]);

/**
 * Multi-select values are serialized to CSV at apply-time, so split them back
 * into an array; otherwise MultiSelect renders the whole CSV as one chip.
 */
const restoreRuleValue = (rule: FilterRuleCtx): string | string[] => {
  const isDropdown = DROPDOWN_ATTRIBUTE_TYPE_IDS.has(rule.attributeTypeId);
  if (!isDropdown || typeof rule.value !== 'string' || !rule.value.includes(',')) {
    return rule.value;
  }
  return rule.value.split(',').map((v) => v.trim()).filter(Boolean);
};

/** Repopulate the form inputs from a set of previously applied filter rules. */
const restoreFormValuesFromRules = (
  rules: FilterRuleCtx[],
  setValue: UseFormSetValue<Record<string, any>>,
): void => {
  rules.forEach((rule) => {
    if (rule.entityFieldId !== 0) {
      setValue(`entityField_${rule.id}`, rule.entityFieldId);
    }
    if (rule.operatorId !== 0) {
      setValue(`operator_${rule.id}`, rule.operatorId.toString());
    }
    if (rule.value) {
      setValue(`value_${rule.id}`, restoreRuleValue(rule));
    }
    // Restore Between / preset-range date bounds (operators 5, 6-10).
    if (rule.fromValue) {
      setValue(`fromValue_${rule.id}`, rule.fromValue);
    }
    if (rule.toValue) {
      setValue(`toValue_${rule.id}`, rule.toValue);
    }
  });
};

export interface AdvanceFilterRef {
  clearFilters: () => void;
  clear: () => void;
}

export interface FilterResult {
  entityFieldId: number;
  attributeTypeId: number;
  operatorId: number;
  value: string | null;
  fromValue: string | null;
  toValue: string | null;
}

interface AdvanceFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterResult[]) => void;
  onClear: () => void;
  moduleId: number;
  serialKeyId: number;
  entityFieldsOverride?: CustomAttibute[];
  operatorOverridesByFieldId?: Map<number, OperatorItem[]>;
  title?: string;
  fieldFilter?: (field: CustomAttibute) => boolean;
  /** Optional restricted attribute type IDs to exclude */
  restrictedAttributeIds?: number[];
  /** Optional restricted system attribute IDs to exclude */
  restrictedSystemIds?: number[];
  /** Optional custom field values loader for special system attributes */
  customFieldValuesLoader?: (field: CustomAttibute, projectId: number) => Promise<Array<{ id: number; name: string }> | null>;
}

const AdvanceFilter = forwardRef<AdvanceFilterRef, AdvanceFilterProps>(
  ({ 
    isOpen, 
    onClose, 
    onApply, 
    onClear, 
    moduleId,
    serialKeyId,
    entityFieldsOverride,
    title = 'Filters',
    fieldFilter,
    restrictedAttributeIds = [],
    restrictedSystemIds = [],
    customFieldValuesLoader,
    operatorOverridesByFieldId
  }, ref) => {
    const [filterRules, setFilterRules] = useState<FilterRuleCtx[]>([
      { id: '1', entityFieldId: 0, attributeTypeId: 0, operatorId: 0, value: '' }
    ]);
    const [appliedFilterRules, setAppliedFilterRules] = useState<FilterRuleCtx[]>([
      { id: '1', entityFieldId: 0, attributeTypeId: 0, operatorId: 0, value: '' }
    ]);
    const [autoOpenRuleId, setAutoOpenRuleId] = useState<string | null>(null);
    const [entityFields, setEntityFields] = useState<CustomAttibute[]>([]);
    const [operatorListMap, setOperatorListMap] = useState<Map<number, OperatorItem[]>>(new Map());
    const [fieldValuesMap, setFieldValuesMap] = useState<Map<number, Array<{ id: number; name: string }>>>(new Map());
    // Tracks which field-id dropdowns are mid-fetch so the value input can show a loader.
    const [fieldValuesLoadingSet, setFieldValuesLoadingSet] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState<boolean>(true);
    const [dataLoaded, setDataLoaded] = useState<boolean>(false);
    const [applying, setApplying] = useState<boolean>(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const { control, reset, setValue, clearErrors, trigger, watch, getValues, formState: { errors } } = useForm({ mode: 'onChange' });

    useImperativeHandle(ref, () => ({
      clearFilters: () => {
        const emptyRules = [{ id: '1', entityFieldId: 0, attributeTypeId: 0, operatorId: 0, value: '' }];
        setFilterRules(emptyRules);
        setAppliedFilterRules(emptyRules);
        reset();
      },
      clear: () => {
        const emptyRules = [{ id: '1', entityFieldId: 0, attributeTypeId: 0, operatorId: 0, value: '' }];
        setFilterRules(emptyRules);
        setAppliedFilterRules(emptyRules);
        reset();
      }
    }));

    useEffect(() => {
      if (isOpen) {
        setLoading(true);
        setDataLoaded(false);
        clearErrors(); // Clear all validation errors when modal opens
        reset(); // Drop any in-progress selections so cancel closes with a clean slate
        // Restore to last applied state when modal opens
        const restoredRules = JSON.parse(JSON.stringify(appliedFilterRules));
        setFilterRules(restoredRules);
        // Auto-open the first filter's entity field dropdown only if no filter is applied yet
        const hasAppliedFilter = restoredRules.some((rule: FilterRuleCtx) => rule.entityFieldId !== 0);
        if (!hasAppliedFilter) {
          setAutoOpenRuleId(restoredRules[0]?.id || '1');
        }
        Promise.all([loadEntityFields(), loadOperators()]).then(() => {
          restoreFormValuesFromRules(restoredRules, setValue);
          setDataLoaded(true);
          setLoading(false);
        });
      } else {
        setDataLoaded(false);
        setAutoOpenRuleId(null);
      }
    }, [isOpen]);

    const loadEntityFields = async () => {
      try {
        if (Array.isArray(entityFieldsOverride)) {
          setEntityFields(entityFieldsOverride);
          return;
        }
        const projectId = getProjectId();
        if (projectId) {
          const response = await settingsService.getFieldDetails(projectId, moduleId);
          if (response.statusCode === 200 && response.responseData) {
            let filteredFields = response.responseData.filter((field: CustomAttibute) => {
              // Base filter: must have attributeType and be active
              if (!field.attributeType || !field.attributeType.id) return false;
              if (field.isActive !== undefined && field.isActive !== 1) return false;
              
              // Check restricted attribute types
              if (restrictedAttributeIds.includes(field.attributeType.id)) return false;
              
              // Check restricted system attributes
              if (field.systemAttribute?.id && restrictedSystemIds.includes(field.systemAttribute.id)) return false;
              
              // Apply custom filter if provided
              if (fieldFilter && !fieldFilter(field)) return false;
              
              return true;
            });

            // Add static fields
            const staticFields = advanceSearchService.fetchStaticFields(serialKeyId);
            filteredFields.push(...staticFields);

            // Sort fields: negative IDs first, then by displayOrder
            filteredFields.sort((a: CustomAttibute, b: CustomAttibute) => {
              if (a.id < 0 && b.id >= 0) return -1;
              if (b.id < 0 && a.id >= 0) return 1;
              if (a.id < 0 && b.id < 0) return a.id - b.id;
              return (a.displayOrder || 0) - (b.displayOrder || 0);
            });

            setEntityFields(filteredFields);
          }
        }
      } catch (error) {
        console.error('Error loading entity fields:', error);
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
      const projectId = getProjectId();
      if (!projectId) return;

      // Mark this field as loading so ValueInput can render a loader instead
      // of an empty dropdown while the options are fetched.
      setFieldValuesLoadingSet(prev => {
        const next = new Set(prev);
        next.add(field.id);
        return next;
      });

      try {
        // First try custom field values loader if provided (for special system attributes)
        if (customFieldValuesLoader) {
          const customValues = await customFieldValuesLoader(field, projectId);
          if (customValues) {
            setFieldValuesMap(prev => new Map(prev.set(field.id, customValues)));
            return;
          }
        }

        // Default: load from attribute lookup for dropdown types
        if (field.attributeType?.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN ||
            field.attributeType?.id === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
          const response = await settingsService.getAttribLookup(field.id);
          if (response.statusCode === 200 && response.responseData) {
            const transformedData = response.responseData.map((item: any) => ({
              id: item.id,
              name: item.lookupValue
            }));
            setFieldValuesMap(prev => new Map(prev.set(field.id, transformedData)));
          }
        }
      } catch (error) {
        console.error('Error loading field values:', error);
      } finally {
        setFieldValuesLoadingSet(prev => {
          if (!prev.has(field.id)) return prev;
          const next = new Set(prev);
          next.delete(field.id);
          return next;
        });
      }
    }, [customFieldValuesLoader]);

    const addFilterRule = () => {
      // Snapshot the form values for existing rules so we can restore them
      // after the new rule is appended. (Defensive: prevents a re-render race
      // from clearing the previous rules' visible labels/values.)
      const existingFormValues = getValues();

      const newRuleId = Date.now().toString();
      const newRule: FilterRuleCtx = {
        id: newRuleId,
        entityFieldId: 0,
        attributeTypeId: 0,
        operatorId: 0,
        value: ''
      };
      setFilterRules(prev => [...prev, newRule]);

      // Re-apply the snapshot on the next tick so any re-render triggered by
      // the state update doesn't visually drop existing rules' selections.
      setTimeout(() => {
        filterRules.forEach(rule => {
          const ef = existingFormValues[`entityField_${rule.id}`];
          const op = existingFormValues[`operator_${rule.id}`];
          const v  = existingFormValues[`value_${rule.id}`];
          const fv = existingFormValues[`fromValue_${rule.id}`];
          const tv = existingFormValues[`toValue_${rule.id}`];
          if (ef !== undefined && ef !== '') setValue(`entityField_${rule.id}`, ef);
          if (op !== undefined && op !== '') setValue(`operator_${rule.id}`, op);
          if (v  !== undefined && v  !== '') setValue(`value_${rule.id}`, v);
          if (fv !== undefined && fv !== '') setValue(`fromValue_${rule.id}`, fv);
          if (tv !== undefined && tv !== '') setValue(`toValue_${rule.id}`, tv);
        });
        if (contentRef.current) {
          contentRef.current.scrollTo({
            top: contentRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 50);
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
      setFilterRules(prev => prev.map(rule => {
        if (rule.id === ruleId) {
          const updatedRule = {
            ...rule,
            entityFieldId: field.id,
            attributeTypeId: field.attributeType?.id || 0,
            operatorId: 0,
            value: ''
          };

          setValue(`entityField_${ruleId}`, field.id);
          setValue(`operator_${ruleId}`, '');
          setValue(`value_${ruleId}`, '');
          setValue(`fromValue_${ruleId}`, '');
          setValue(`toValue_${ruleId}`, '');

          if (field.attributeType?.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN ||
              field.attributeType?.id === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
            loadFieldValues(field);
          }

          return updatedRule;
        }
        return rule;
      }));
    }, [setValue, loadFieldValues]);

    const handleOperatorChange = useCallback((ruleId: string, operatorId: number, attributeTypeId: number) => {
      updateFilterRule(ruleId, 'operatorId', operatorId);
      setValue(`value_${ruleId}`, '');

      const isDateType =
        [CustomAttributeTypeEnum.DATE, CustomAttributeTypeEnum.DATE_TIME].includes(attributeTypeId) ||
        attributeTypeId === -1;

      if (!isDateType) {
        setValue(`fromValue_${ruleId}`, '');
        setValue(`toValue_${ruleId}`, '');
        return;
      }

      const range = computePresetDateRange(operatorId);
      if (range === 'between' || range === null) {
        const opts = range === 'between'
          ? { shouldDirty: true, shouldTouch: true, shouldValidate: true }
          : undefined;
        setValue(`fromValue_${ruleId}`, '', opts);
        setValue(`toValue_${ruleId}`, '', opts);
        return;
      }

      const { fromDateStr, toDateStr } = range;
      const opts = { shouldDirty: true, shouldTouch: true, shouldValidate: true };
      setValue(`fromValue_${ruleId}`, fromDateStr, opts);
      setValue(`toValue_${ruleId}`, toDateStr, opts);
      setFilterRules(prev => prev.map(rule =>
        rule.id === ruleId ? { ...rule, operatorId, fromValue: fromDateStr, toValue: toDateStr } : rule
      ));
    }, [updateFilterRule, setValue]);

    const needsValueInput = useCallback((operatorId: number) => {
      return ![6, 7, 8, 9, 10].includes(operatorId);
    }, []);

    const shouldUseTextInput = useCallback((attributeTypeId: number) => {
      return ![CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN, CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN].includes(attributeTypeId);
    }, []);

    const hasBetweenOperator = useCallback((attributeTypeId: number, operatorId: number | string) => {
      return operatorId === 5;
    }, []);

    const handleApply = async () => {
      try {
        setApplying(true);
        const isValid = await trigger();
        if (!isValid) return;

        const formValues = getValues();

        const validRules = filterRules.filter(rule => {
          const entityFieldId = formValues[`entityField_${rule.id}`];
          const operatorId = formValues[`operator_${rule.id}`];
          return entityFieldId && operatorId;
        });

        if (validRules.length === 0) {
          onClose();
          return;
        }

        const filterRequestBody: FilterResult[] = validRules.map(rule => {
          const formEntityFieldId = parseInt(formValues[`entityField_${rule.id}`]);
          const formOperatorId = parseInt(formValues[`operator_${rule.id}`]);
          const formValue = formValues[`value_${rule.id}`] || '';
          const formFromValue = formValues[`fromValue_${rule.id}`] || null;
          const formToValue = formValues[`toValue_${rule.id}`] || null;

          const field = entityFields.find(f => f.id === formEntityFieldId);
          const attributeTypeId = field?.attributeType?.id || rule.attributeTypeId;

          let value = formValue;
          if (Array.isArray(formValue)) {
            value = formValue.join(',');
          }

          return {
            entityFieldId: formEntityFieldId,
            attributeTypeId: attributeTypeId,
            operatorId: formOperatorId,
            value: value || null,
            fromValue: formFromValue,
            toValue: formToValue
          };
        });

        // Save current filter rules as applied state with form values. Persist
        // fromValue/toValue too so range operators (Between, presets) restore
        // their dates when the modal reopens.
        const appliedRulesWithValues = validRules.map(rule => {
          const formEntityFieldId = parseInt(formValues[`entityField_${rule.id}`]);
          const formOperatorId = parseInt(formValues[`operator_${rule.id}`]);
          const formValue = formValues[`value_${rule.id}`] || '';
          const formFromValue = formValues[`fromValue_${rule.id}`] || '';
          const formToValue = formValues[`toValue_${rule.id}`] || '';
          const field = entityFields.find(f => f.id === formEntityFieldId);
          return {
            id: rule.id,
            entityFieldId: formEntityFieldId,
            attributeTypeId: field?.attributeType?.id || rule.attributeTypeId,
            operatorId: formOperatorId,
            value: Array.isArray(formValue) ? formValue.join(',') : formValue,
            fromValue: formFromValue,
            toValue: formToValue,
          };
        });
        setAppliedFilterRules(appliedRulesWithValues);
        onApply(filterRequestBody);
        onClose();
      } catch (error) {
        console.error('Error applying filters:', error);
      } finally {
        setApplying(false);
      }
    };

    const handleCancel = () => {
      // Just close the modal - the applied state will be restored when modal reopens
      onClose();
    };

    const handleClear = () => {
      // Clear all input values but keep the existing filter rows structure
      const clearedRules = filterRules.map(rule => ({
        ...rule,
        entityFieldId: 0,
        attributeTypeId: 0,
        operatorId: 0,
        value: ''
      }));
      setFilterRules(clearedRules);
      // Clear all form values
      filterRules.forEach(rule => {
        setValue(`entityField_${rule.id}`, '');
        setValue(`operator_${rule.id}`, '');
        setValue(`value_${rule.id}`, '');
        setValue(`fromValue_${rule.id}`, '');
        setValue(`toValue_${rule.id}`, '');
      });
      clearErrors();
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
      operatorOverridesByFieldId,
      fieldValuesMap,
      fieldValuesLoadingSet,
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
      operatorOverridesByFieldId,
      fieldValuesMap,
      fieldValuesLoadingSet,
      needsValueInput,
      shouldUseTextInput,
      hasBetweenOperator,
      handleFieldChange,
      handleOperatorChange,
      loadFieldValues,
      updateFilterRule,
    ]);

    if (!isOpen) return null;

    // Show full-screen loader until data is fully loaded
    if (!dataLoaded) {
      return (
        <div className="fixed inset-0 z-[9999]">
          <Spinner blur={true} customLoadingName="Loading Filters..." />
        </div>
      );
    }

    return (
      <AdvanceFilterProvider {...contextValue}>
        <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black-100 bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-[752px] max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
              <h4 className="text-xl font-medium text-gray-900">{title}</h4>
            </div>

            <div ref={contentRef} className="px-6 py-4 flex-1 overflow-y-auto min-h-0" style={{ scrollbarGutter: 'stable' }}>
                <div className="flex flex-col">
                  {filterRules.map((rule, index) => (
                    <div 
                        key={rule.id}
                        className="animate-fadeIn"
                        style={{ animationDuration: '0.2s' }}
                      >
                      <div className="flex items-end" style={{ gap: '16px', minHeight: '37px' }}>
                        {(() => {
                          // Check if this rule needs From/To date range (only ValueInput expands)
                          const isDateType = rule.attributeTypeId === CustomAttributeTypeEnum.DATE || rule.attributeTypeId === CustomAttributeTypeEnum.CREATED_UPDATED_DATE;
                          const needsFromTo = (isDateType && [5, 6, 7, 8, 9, 10].includes(rule.operatorId)) || 
                                              (rule.attributeTypeId === CustomAttributeTypeEnum.NUMERIC && rule.operatorId === 5);
                          
                          return (
                            <>
                              <div style={{ width: '200px', flexShrink: 0 }}>
                                <EntityFieldSelect rule={{ id: rule.id }} autoOpen={autoOpenRuleId === rule.id} />
                              </div>

                              <div style={{ width: '160px', flexShrink: 0 }}>
                                <OperatorSelect rule={{ id: rule.id, entityFieldId: rule.entityFieldId, attributeTypeId: rule.attributeTypeId }} />
                              </div>

                              <div style={{ flex: '1 1 0', minWidth: 0 }}>
                                <ValueInput rule={{ id: rule.id, entityFieldId: rule.entityFieldId, attributeTypeId: rule.attributeTypeId, operatorId: rule.operatorId }} />
                              </div>

                              <div className="flex items-end justify-start flex-shrink-0" style={{ gap: '8px', width: '56px' }}>
                                {filterRules.length > 1 && (
                                  <RemoveActionButton
                                    id={index}
                                    onRemove={() => removeFilterRule(rule.id)}
                                    className="!w-6 !h-6"
                                  />
                                )}
                                {index === filterRules.length - 1 && (
                                  <AddActionButton
                                    onAdd={addFilterRule}
                                    className="!w-6 !h-6"
                                  />
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {index < filterRules.length - 1 && (() => {
                        const hasRowErrors = !!(errors[`entityField_${rule.id}`] || errors[`operator_${rule.id}`] || errors[`value_${rule.id}`]);
                        return (
                          <div className="flex justify-start items-center" style={{ marginTop: hasRowErrors ? '32px' : '16px', marginBottom: '16px' }}>
                            <span className="bg-blue-500 px-3.5 py-1.5 rounded-md text-sm font-medium text-white shadow-sm transition-colors duration-200">
                              AND
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
            </div>

            <div className="flex items-center justify-end gap-4 px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0">
              <Button
                onClick={handleClear}
                className="px-4 py-1.5 text-sm bg-[#E4E6EF] hover:bg-gray-300 text-black rounded"
              >
                Clear
              </Button>
              <Button
                onClick={handleCancel}
                className="px-4 py-1.5 text-sm bg-[#E4E6EF] hover:bg-gray-300 text-black rounded"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                disabled={applying}
                className="px-4 py-1.5 text-sm bg-[#3699FF] hover:bg-blue-600 text-white disabled:opacity-50 rounded"
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

AdvanceFilter.displayName = 'AdvanceFilter';

export default AdvanceFilter;
