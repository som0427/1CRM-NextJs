import React from 'react';
import { Control } from 'react-hook-form';
import TextInput from '../TextInput';

interface NumericInputProps {
  name: string;
  control: Control<any>;
  validationRules?: any;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  showCharacterCount?: boolean;
  decimalAllowed?: boolean;
  maxWidth?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  instructions?: string;
  patternOverride?: RegExp;
  numericValidationType?: number | null;
  maxDigits?: number | null;
  maxNumber?: number | null;
  minDigits?: number | null;
  addValidation?: boolean;
  regexExpression?: string;
  errorMessage?: string;
  isSystemAttribute?: boolean;
  minNumber?: number | null;
  labelForMessage?: string;
}

const NumericInput: React.FC<NumericInputProps> = ({
  name,
  control,
  validationRules,
  placeholder,
  disabled = false,
  maxLength,
  showCharacterCount = false,
  decimalAllowed = false,
  maxWidth = 'w-full',
  inputProps = {},
  instructions = '',
  patternOverride,
  numericValidationType = null,
  maxDigits = null,
  maxNumber = null,
  minDigits = null,
  addValidation = false,
  regexExpression,
  errorMessage,
  isSystemAttribute = false,
  minNumber,
  labelForMessage,
}) => {
  const allowNegative = !(isSystemAttribute || (minNumber !== undefined && minNumber !== null && minNumber >= 0));

  const defaultPattern = decimalAllowed
    ? /^-?\d*(\.\d{0,2})?$/
    : /^-?(0|[1-9][0-9]*)$/;
  const overridePattern =
    !decimalAllowed && addValidation && regexExpression
      ? (() => {
          try {
            return new RegExp(regexExpression);
          } catch {
            return null;
          }
        })()
      : null;
  const pattern = patternOverride ?? overridePattern ?? defaultPattern;
  const blockingPattern = new RegExp(`^$|${pattern.source}`);
  const hintContent = `Only numeric values are allowed${instructions ? `. ${instructions}` : '.'}`;

  // Compute maxLength based on numericValidationType:
  // Type 1 = Number range validation (uses maxNumber)
  // Type 2 = Digit count validation (uses maxDigits)
  let computedMaxLength: number | undefined = undefined;
  if (numericValidationType === 2 && maxDigits != null) {
    // Digit validation - use maxDigits directly
    const extraForDecimal = decimalAllowed ? 3 : 0; // '.' + two decimals
    computedMaxLength = maxDigits + extraForDecimal;
  } else if (numericValidationType === 1 && maxNumber != null) {
    // Number range validation - compute digits from maxNumber
    const digits = String(maxNumber).replace('-', '').length;
    computedMaxLength = digits;
  }

  const resolvedMaxLength = computedMaxLength ?? maxLength;
  const resolvedShowCount = computedMaxLength != null || minDigits != null ? true : showCharacterCount;

  // Merge validation rules with pattern
  const mergedValidationRules = {
    ...(validationRules || {}),
    pattern: {
      value: pattern,
      message: errorMessage || validationRules?.pattern?.message || 'Enter a valid number',
    },
    validate: {
      ...(validationRules?.validate || {}),
      minDigits: (val: any) => {
        if (val === undefined || val === null || val === '') return true;
        if (minDigits == null) return true;
        const digitCount = String(val).replace(/[^0-9]/g, '').length;
        return (
          digitCount >= minDigits ||
          `Enter number greater than ${minDigits} digits${labelForMessage ? ` for ${labelForMessage}` : ''}`
        );
      },
    },
  };

  return (
    <TextInput
      name={name}
      control={control}
      validationRules={mergedValidationRules}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={resolvedMaxLength}
      showCharacterCount={resolvedShowCount}
      blockInvalidInput={true}
      pattern={blockingPattern}
      hint={<div className="text-[10px] text-gray-500">{hintContent}</div>}
      maxWidth={maxWidth}
      inputProps={{
        inputMode: decimalAllowed ? 'decimal' : 'numeric',
        ...inputProps,
      }}
    />
  );
};

NumericInput.displayName = 'NumericInput';

export default NumericInput;
