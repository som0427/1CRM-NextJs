import React from 'react';
import { Controller, Control } from 'react-hook-form';

/**
 * ToggleSwitchInput Component
 *
 * A toggle switch with React Hook Form integration, featuring a pill-shaped
 * slider that transitions between on/off states.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <ToggleSwitchInput name="notifications" control={control} />
 *
 * @example
 * // With label
 * <ToggleSwitchInput
 *   name="darkMode"
 *   control={control}
 *   label="Enable Dark Mode"
 * />
 *
 * @example
 * // With hint text
 * <ToggleSwitchInput
 *   name="advancedSettings"
 *   control={control}
 *   label="Advanced Settings"
 *   hint="Show additional configuration options"
 * />
 *
 * @example
 * // With onChange callback
 * <ToggleSwitchInput
 *   name="autoSave"
 *   control={control}
 *   label="Auto Save"
 *   onChange={(enabled) => console.log('Auto save:', enabled)}
 * />
 *
 * @example
 * // Disabled state
 * <ToggleSwitchInput name="lockedOption" control={control} disabled={true} />
 *
 * Props:
 * ------
 * @param {string} name - Form field name (required)
 * @param {Control<any>} control - React Hook Form control object (required)
 * @param {any} [validationRules] - React Hook Form validation rules
 * @param {string} [label] - Toggle label text (displayed to the right)
 * @param {any} [hint] - Hint text displayed below toggle
 * @param {boolean} [disabled=false] - Disabled state
 * @param {string} [className=""] - Additional CSS classes for container
 * @param {(enabled: boolean) => void} [onChange] - Callback when state changes
 * @param {"left" | "right"} [labelPosition="right"] - Position of label relative to toggle
 *
 * Features:
 * ---------
 * - React Hook Form integration via Controller
 * - Smooth sliding animation (200ms transition)
 * - Green when enabled (#1BC5BD), gray when disabled
 * - White circular knob slides left/right
 * - Error message display
 * - Hint text support
 * - Accessible label click
 */
interface ToggleSwitchInputProps {
  name: string;
  control: Control<any>;
  validationRules?: any;
  label?: string;
  hint?: any;
  disabled?: boolean;
  className?: string;
  onChange?: (enabled: boolean) => void;
  labelPosition?: 'left' | 'right';
}

const ToggleSwitchInput: React.FC<ToggleSwitchInputProps> = ({
  name,
  control,
  validationRules,
  label,
  hint,
  disabled = false,
  className = '',
  onChange,
  labelPosition = 'right',
}) => {
  return (
    <Controller
      name={name}
      control={control}
      rules={validationRules}
      render={({ field, fieldState }) => (
        <div>
          <div className={`flex items-center ${className}`}>
            {label && labelPosition === 'left' && (
              <span
                className={`mr-3 text-sm font-medium cursor-default ${
                  disabled ? 'text-gray-400' : 'text-gray-700'
                }`}
              >
                {label}
              </span>
            )}
            <button
              type="button"
              role="switch"
              aria-checked={!!field.value}
              onClick={() => {
                if (disabled) return;
                const newValue = !field.value;
                field.onChange(newValue);
                if (onChange) {
                  onChange(newValue);
                }
              }}
              disabled={disabled}
              className={`
                relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent
                transition-colors duration-200 ease-in-out focus:outline-none
                ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                ${field.value ? 'bg-[#58B19F]' : 'bg-[#F64E60]'}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                  transition-transform duration-200 ease-in-out
                  ${field.value ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
            {label && labelPosition === 'right' && (
              <span
                className={`ml-3 text-sm font-medium cursor-default ${
                  disabled ? 'text-gray-400' : 'text-gray-700'
                }`}
              >
                {label}
              </span>
            )}
          </div>

          {fieldState.error && !disabled && (
            <div className="text-xs text-red-500 mt-1">
              {fieldState.error.message}
            </div>
          )}

          {/* Hint Text */}
          {hint && (!fieldState.error || disabled) && (
            <div className="text-xs text-gray-500 mt-1">{hint}</div>
          )}
        </div>
      )}
    />
  );
};

ToggleSwitchInput.displayName = 'ToggleSwitchInput';

export default ToggleSwitchInput;
