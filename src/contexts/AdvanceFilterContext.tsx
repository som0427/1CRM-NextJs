import { CustomAttibute } from '@/lib/models/custom-attibute.model';
import React, { createContext, useContext, useMemo } from 'react';
import type { Control, UseFormClearErrors, UseFormSetValue, UseFormTrigger, UseFormWatch } from 'react-hook-form';

export interface FilterRuleCtx {
  id: string;
  entityFieldId: number;
  attributeTypeId: number;
  operatorId: number;
  value: string;
  fromValue?: string;
  toValue?: string;
}


export interface OperatorItem {
  key: number;
  value: string;
}

interface AdvanceFilterContextValue {
  // Form
  control: Control<Record<string, any>>;
  setValue: UseFormSetValue<Record<string, any>>;
  clearErrors: UseFormClearErrors<Record<string, any>>;
  trigger: UseFormTrigger<Record<string, any>>;
  watch: UseFormWatch<Record<string, any>>;

  // Data/state
  filterRules: FilterRuleCtx[];
  entityFields: CustomAttibute[];
  operatorListMap: Map<number, OperatorItem[]>;
  operatorOverridesByFieldId?: Map<number, OperatorItem[]>;
  fieldValuesMap: Map<number, Array<{ id: number; name: string }>>;
  // Field ids whose dropdown options are currently being fetched. Optional so
  // legacy providers that don't track loading state still satisfy the type.
  fieldValuesLoadingSet?: Set<number>;

  // Helpers/handlers
  needsValueInput: (operatorId: number) => boolean;
  shouldUseTextInput: (attributeTypeId: number) => boolean;
  hasBetweenOperator: (attributeTypeId: number, operatorId: number | string) => boolean;
  handleFieldChange: (ruleId: string, field: CustomAttibute) => void;
  handleOperatorChange: (ruleId: string, operatorId: number, attributeTypeId: number) => void;
  loadFieldValues: (field: CustomAttibute) => void;
  updateFilterRule: (id: string, key: keyof FilterRuleCtx, value: string | number) => void;
}

const AdvanceFilterContext = createContext<AdvanceFilterContextValue | null>(null);

export const useAdvanceFilterContext = () => {
  const ctx = useContext(AdvanceFilterContext);
  if (!ctx) throw new Error('useAdvanceFilterContext must be used within AdvanceFilterProvider');
  return ctx;
};

interface ProviderProps extends AdvanceFilterContextValue {
  children: React.ReactNode;
}

export const AdvanceFilterProvider: React.FC<ProviderProps> = ({ children, ...value }) => {
  const memoValue = useMemo(() => value, [
    value.control,
    value.setValue,
    value.clearErrors,
    value.trigger,
    value.watch,
    value.filterRules,
    value.entityFields,
    value.operatorListMap,
    value.operatorOverridesByFieldId,
    value.fieldValuesMap,
    value.fieldValuesLoadingSet,
    value.needsValueInput,
    value.shouldUseTextInput,
    value.hasBetweenOperator,
    value.handleFieldChange,
    value.handleOperatorChange,
    value.loadFieldValues,
    value.updateFilterRule,
  ]);

  return (
    <AdvanceFilterContext.Provider value={memoValue}>
      {children}
    </AdvanceFilterContext.Provider>
  );
};
