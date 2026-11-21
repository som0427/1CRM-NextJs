import React, { useMemo } from 'react';
import { Controller, useController, useWatch } from 'react-hook-form';
import TextInput from '../input-fields/TextInput';
import DateInput from '../input-fields/DateInput';
import MultiSelect from '../input-fields/MultiSelect';
import { useAdvanceFilterContext } from '../../../contexts/AdvanceFilterContext';
import { CustomAttributeTypeEnum } from '../../../lib/constants/CustomAttributeTypeEnum.constant';

interface Props {
  rule: {
    id: string;
    entityFieldId: number;
    attributeTypeId: number;
    operatorId: number;
  };
}

const ValueInput: React.FC<Props> = ({ rule }) => {
  const {
    control,
    fieldValuesMap,
    fieldValuesLoadingSet,
    needsValueInput,
    shouldUseTextInput,
    hasBetweenOperator,
    entityFields,
  } = useAdvanceFilterContext();

  // Watch the operator value from form state to get the latest value
  const watchedOperatorId = useWatch({ control, name: `operator_${rule.id}` });
  const currentOperatorId = watchedOperatorId ? parseInt(watchedOperatorId) : rule.operatorId;

  // Get the field name for dynamic placeholder
  const selectedField = entityFields.find(f => f.id === rule.entityFieldId);
  const fieldName = selectedField?.attributeName || 'value';

  const isDateType = rule.attributeTypeId === CustomAttributeTypeEnum.DATE || rule.attributeTypeId === CustomAttributeTypeEnum.CREATED_UPDATED_DATE;
  const isPresetOperator = [6, 7, 8, 9, 10].includes(currentOperatorId);
  
  // Get fromValue safely for validation purposes
  // Use a memoized value to prevent re-renders
  const fromValue = useMemo(() => {
    // For now, just return empty string to avoid the useWatch issue
    // The validation can be done differently if needed
    return '';
  }, []);

  // For Between on date types, watch sibling values without mutating form state
  const watchedFromDate: string | undefined = useWatch({ control, name: `fromValue_${rule.id}` });
  const watchedToDate: string | undefined = useWatch({ control, name: `toValue_${rule.id}` });

  if ((isDateType && currentOperatorId === 5) || hasBetweenOperator(rule.attributeTypeId, currentOperatorId)) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {(isDateType) ? (
          <>
            {/* From Date */}
            <DateInput
              name={`fromValue_${rule.id}`}
              control={control}
              placeholder="From date"
              disabled={false}
              validationRules={{
                required: 'From date is required',
              }}
              // If To is selected, cap From at To
              maxDate={watchedToDate || undefined}
            />
            {/* To Date - min constrained by From Date */}
            <DateInput
              name={`toValue_${rule.id}`}
              control={control}
              placeholder="To date"
              disabled={false}
              validationRules={{
                required: 'To date is required',
              }}
              // If From is selected, set min to From
              minDate={watchedFromDate || '1996-01-01'}
            />
          </>
        ) : shouldUseTextInput(rule.attributeTypeId) || rule.attributeTypeId === 0 ? (
          <>
            <TextInput
              name={`fromValue_${rule.id}`}
              control={control}
              placeholder="From"
              disabled={!needsValueInput(currentOperatorId) || [6, 7, 8, 9, 10].includes(currentOperatorId)}
              validationRules={{
                required: needsValueInput(currentOperatorId) && !([6, 7, 8, 9, 10].includes(currentOperatorId)) ? 'From value is required' : false,
              }}
              maxLength={rule.attributeTypeId === CustomAttributeTypeEnum.TEXT_SINGLE_LINE ? 100 :
                       rule.attributeTypeId === 0 ? 200 : 500}
              pattern={rule.attributeTypeId === CustomAttributeTypeEnum.EMAIL ? /^[a-zA-Z0-9._%+-@]*$/ :
                       rule.attributeTypeId === CustomAttributeTypeEnum.NUMERIC ? /^[0-9.-]*$/ : /^.*$/}
            />
            <TextInput
              name={`toValue_${rule.id}`}
              control={control}
              placeholder="To"
              disabled={!needsValueInput(currentOperatorId) || [6, 7, 8, 9, 10].includes(currentOperatorId)}
              validationRules={{
                required: needsValueInput(currentOperatorId) && !([6, 7, 8, 9, 10].includes(currentOperatorId)) ? 'To value is required' : false,
                validate: (val: string, formValues: any) => {
                  if (rule.attributeTypeId === CustomAttributeTypeEnum.NUMERIC) {
                    const from = formValues[`fromValue_${rule.id}`] as string | undefined;
                    if (val !== undefined && val !== '' && from !== undefined && from !== '') {
                      const toNum = Number(val);
                      const fromNum = Number(from);
                      if (!isNaN(toNum) && !isNaN(fromNum)) {
                        return toNum >= fromNum || 'To value must be greater than or equal to From value';
                      }
                    }
                  }
                  return true;
                }
              }}
              maxLength={rule.attributeTypeId === CustomAttributeTypeEnum.TEXT_SINGLE_LINE ? 100 :
                       rule.attributeTypeId === 0 ? 200 : 500}
              pattern={rule.attributeTypeId === CustomAttributeTypeEnum.EMAIL ? /^[a-zA-Z0-9._%+-@]*$/ :
                       rule.attributeTypeId === CustomAttributeTypeEnum.NUMERIC ? /^[0-9.-]*$/ : /^.*$/}
            />
          </>
        ) : (
          <>
            <Controller
              name={`fromValue_${rule.id}`}
              control={control}
              rules={{
                required: needsValueInput(currentOperatorId) && !([6, 7, 8, 9, 10].includes(currentOperatorId)) ? 'From value is required' : false,
              }}
              render={({ field, fieldState }) => (
                <div>
                  <input
                    {...field}
                    type={rule.attributeTypeId === CustomAttributeTypeEnum.NUMERIC ? 'number' :
                          [CustomAttributeTypeEnum.DATE, CustomAttributeTypeEnum.DATE_TIME].includes(rule.attributeTypeId) ? 'date' : 'text'}
                    placeholder="From"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldState.error ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={!needsValueInput(currentOperatorId) || [6, 7, 8, 9, 10].includes(currentOperatorId)}
                  />
                  {fieldState.error && (
                    <p className="text-red-500 text-xs mt-1">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
            <Controller
              name={`toValue_${rule.id}`}
              control={control}
              rules={{
                required: needsValueInput(currentOperatorId) && !([6, 7, 8, 9, 10].includes(currentOperatorId)) ? 'To value is required' : false,
                validate: (val: string, formValues: any) => {
                  if (rule.attributeTypeId === CustomAttributeTypeEnum.NUMERIC) {
                    const from = formValues[`fromValue_${rule.id}`] as string | undefined;
                    if (val !== undefined && val !== '' && from !== undefined && from !== '') {
                      const toNum = Number(val);
                      const fromNum = Number(from);
                      if (!isNaN(toNum) && !isNaN(fromNum)) {
                        return toNum >= fromNum || 'To value must be greater than or equal to From value';
                      }
                    }
                  }
                  return true;
                }
              }}
              render={({ field, fieldState }) => (
                <div>
                  <input
                    {...field}
                    type={rule.attributeTypeId === CustomAttributeTypeEnum.NUMERIC ? 'number' :
                          [CustomAttributeTypeEnum.DATE, CustomAttributeTypeEnum.DATE_TIME].includes(rule.attributeTypeId) ? 'date' : 'text'}
                    placeholder="To"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldState.error ? 'border-red-500' : 'border-gray-300'
                    }`}
                    disabled={!needsValueInput(currentOperatorId) || [6, 7, 8, 9, 10].includes(currentOperatorId)}
                  />
                  {fieldState.error && (
                    <p className="text-red-500 text-xs mt-1">{fieldState.error.message}</p>
                  )}
                </div>
              )}
            />
          </>
        )}
      </div>
    );
  }

  // Show read-only From/To for preset date operators as well
  if (isDateType && isPresetOperator) {
    return (
      <div className="grid grid-cols-2 gap-4">
        <DateInput
          name={`fromValue_${rule.id}`}
          control={control}
          placeholder="From date"
          disabled={true}
          validationRules={{}}
        />
        <DateInput
          name={`toValue_${rule.id}`}
          control={control}
          placeholder="To date"
          disabled={true}
          validationRules={{}}
        />
      </div>
    );
  }

  if (rule.attributeTypeId === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN ||
      rule.attributeTypeId === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN) {
    const isLoadingOptions = fieldValuesLoadingSet?.has(rule.entityFieldId) ?? false;
    if (isLoadingOptions) {
      // Show a disabled placeholder with a spinner while options are being fetched.
      return (
        <div className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-indigo-500" />
          <span>Loading values...</span>
        </div>
      );
    }
    return (
      <MultiSelect
        name={`value_${rule.id}`}
        control={control}
        options={fieldValuesMap.get(rule.entityFieldId)?.map(option => ({
          value: option.id.toString(),
          label: option.name,
        })) || []}
        placeholder={rule.attributeTypeId === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN ? 'Select values' : 'Select value'}
        disabled={!needsValueInput(currentOperatorId)}
        validationRules={{
          required: needsValueInput(currentOperatorId) ? 'Value is required' : false,
        }}
        maxWidth="w-full"
      />
    );
  }

  // For date types (including static -1 for Created_On/Updated_On), show single DateInput
  // This is for non-preset operators like equals, greater than, etc.
  // Note: Preset operators (Last 7 days, etc.) are handled earlier in the file
  if (isDateType && !isPresetOperator) {
    return (
      <DateInput
        name={`value_${rule.id}`}
        control={control}
        placeholder="YYYY-MM-DD"
        disabled={false}
        validationRules={{
          required: 'Date is required',
        }}
      />
    );
  }

  if (shouldUseTextInput(rule.attributeTypeId) || rule.attributeTypeId === 0) {
    return (
      <TextInput
        name={`value_${rule.id}`}
        control={control}
        placeholder={`Enter ${fieldName}`}
        disabled={!needsValueInput(currentOperatorId)}
        validationRules={{
          required: needsValueInput(currentOperatorId) ? 'Value is required' : false,
        }}
        maxLength={rule.attributeTypeId === CustomAttributeTypeEnum.TEXT_SINGLE_LINE ? 100 :
                 rule.attributeTypeId === 0 ? 200 : 500}
        pattern={rule.attributeTypeId === CustomAttributeTypeEnum.EMAIL ? /^[a-zA-Z0-9._%+-@]*$/ :
                 rule.attributeTypeId === CustomAttributeTypeEnum.NUMERIC ? /^[0-9.-]*$/ : /^.*$/}
        showCharacterCount={rule.attributeTypeId === CustomAttributeTypeEnum.TEXT_MULTI_LINE}
      />
    );
  }

  // Fallback for any remaining types
  return (
    <Controller
      name={`value_${rule.id}`}
      control={control}
      rules={{
        required: needsValueInput(currentOperatorId) ? 'Value is required' : false,
      }}
      render={({ field, fieldState }) => (
        <div>
          <input
            {...field}
            type={rule.attributeTypeId === CustomAttributeTypeEnum.NUMERIC ? 'number' : 'text'}
            placeholder={`Enter ${fieldName}`}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              fieldState.error ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={!needsValueInput(currentOperatorId)}
          />
          {fieldState.error && (
            <p className="text-red-500 text-xs mt-1">{fieldState.error.message}</p>
          )}
        </div>
      )}
    />
  );
};

export default React.memo(ValueInput);
