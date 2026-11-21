import React from 'react';
import { Controller, Control } from 'react-hook-form';

/**
 * CheckboxGroupInput Component
 *
 * A group of checkboxes with two selection modes:
 * - allowOne: Only one checkbox can be selected at a time (radio-like behavior)
 * - allowAll: Multiple checkboxes can be selected independently
 *
 * @component
 *
 * @example
 * // Allow only one selection (radio-like)
 * <CheckboxGroupInput
 *   name="category"
 *   control={control}
 *   mode="allowOne"
 *   options={[
 *     { value: 'option1', label: 'Option 1' },
 *     { value: 'option2', label: 'Option 2' },
 *     { value: 'option3', label: 'Option 3' },
 *   ]}
 * />
 *
 * @example
 * // Allow multiple selections (independent checkboxes)
 * <CheckboxGroupInput
 *   name="features"
 *   control={control}
 *   mode="allowAll"
 *   options={[
 *     { value: 'activities', label: 'Activities' },
 *     { value: 'consumers', label: 'Consumers' },
 *     { value: 'opportunities', label: 'Opportunities' },
 *   ]}
 * />
 *
 * @example
 * // With hint text
 * <CheckboxGroupInput
 *   name="permissions"
 *   control={control}
 *   mode="allowAll"
 *   options={options}
 *   hint="Select the permissions you want to enable"
 * />
 *
 * Props:
 * ------
 * @param {string} name - Form field name (required)
 * @param {Control<any>} control - React Hook Form control object (required)
 * @param {Array<{value: string, label: string, disabled?: boolean}>} options - Array of checkbox options (required)
 * @param {"allowOne" | "allowAll"} [mode="allowAll"] - Selection mode
 * @param {any} [validationRules] - React Hook Form validation rules
 * @param {string} [hint] - Hint text displayed below the checkboxes
 * @param {boolean} [disabled=false] - Disabled state for all checkboxes
 * @param {string} [className=""] - Additional CSS classes for the container
 * @param {"horizontal" | "vertical"} [layout="horizontal"] - Layout direction
 * @param {string} [gap="gap-6"] - Gap between checkboxes
 */

interface CheckboxOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CheckboxGroupInputProps {
  name: string;
  control: Control<any>;
  options: CheckboxOption[];
  mode?: 'allowOne' | 'allowAll';
  validationRules?: any;
  hint?: string;
  disabled?: boolean;
  className?: string;
  layout?: 'horizontal' | 'vertical';
  gap?: string;
}

const CheckboxGroupInput: React.FC<CheckboxGroupInputProps> = ({
  name,
  control,
  options,
  mode = 'allowAll',
  validationRules,
  hint,
  disabled = false,
  className = '',
  layout = 'horizontal',
  gap = 'gap-6',
}) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={validationRules}
      render={({ field, fieldState }) => {
        // For allowOne mode, field.value is a single string
        // For allowAll mode, field.value is an array of strings
        const currentValue = field.value;

        const handleCheckboxChange = (optionValue: string, isChecked: boolean, optionDisabled?: boolean) => {
          if (disabled || optionDisabled) return;

          if (mode === 'allowOne') {
            // In allowOne mode, selecting one deselects others
            if (isChecked) {
              field.onChange(optionValue);
            } else {
              // Allow unchecking in allowOne mode
              field.onChange('');
            }
          } else {
            // In allowAll mode, toggle independently
            const currentArray = Array.isArray(currentValue) ? currentValue : [];
            if (isChecked) {
              field.onChange([...currentArray, optionValue]);
            } else {
              field.onChange(currentArray.filter((v: string) => v !== optionValue));
            }
          }
        };

        const isChecked = (optionValue: string): boolean => {
          if (mode === 'allowOne') {
            return currentValue === optionValue;
          } else {
            return Array.isArray(currentValue) && currentValue.includes(optionValue);
          }
        };

        return (
          <div className='ml-1 mt-1'>
            <div
              className={`flex ${layout === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'} ${gap} ${className}`}
            >
              {options.map((option) => {
                const isOptionDisabled = disabled || option.disabled;
                return (
                  <label
                    key={option.value}
                    className={`flex items-center cursor-pointer ${isOptionDisabled ? 'cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked(option.value)}
                      onChange={(e) => handleCheckboxChange(option.value, e.target.checked, option.disabled)}
                      className="hidden"
                      disabled={isOptionDisabled}
                    />
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isOptionDisabled
                          ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                          : isChecked(option.value)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-400 hover:border-blue-400'
                      }`}
                    >
                      {isChecked(option.value) && (
                        <svg
                          className={`w-5 h-5 ${isOptionDisabled ? 'text-gray-400' : 'text-white'}`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          viewBox="0 0 16 16"
                        >
                          <path d="M3 8l3 3L13 3" />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`ml-3 text-sm cursor-default ${
                        isOptionDisabled ? 'text-gray-400' : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </span>
                  </label>
                );
              })}
            </div>

            {fieldState.error && !disabled && (
              <div className="text-xs text-red-500 mt-1">
                {fieldState.error.message}
              </div>
            )}

            {hint && (!fieldState.error || disabled) && (
              <div className="text-xs text-gray-500 mt-1">
                {hint}
              </div>
            )}
          </div>
        );
      }}
    />
  );
};

CheckboxGroupInput.displayName = 'CheckboxGroupInput';

export default CheckboxGroupInput;
