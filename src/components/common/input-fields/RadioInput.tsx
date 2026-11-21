import React from 'react';
import { Controller, Control } from 'react-hook-form';

/**
 * RadioInput Component
 *
 * A radio button group with React Hook Form integration for single-choice selection.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <RadioInput
 *   name="gender"
 *   control={control}
 *   options={[
 *     { value: 'male', label: 'Male' },
 *     { value: 'female', label: 'Female' },
 *     { value: 'other', label: 'Other' }
 *   ]}
 * />
 *
 * @example
 * // With validation
 * <RadioInput
 *   name="priority"
 *   control={control}
 *   options={priorityOptions}
 *   validationRules={{ required: 'Please select a priority' }}
 * />
 *
 * @example
 * // With onChange callback
 * <RadioInput
 *   name="status"
 *   control={control}
 *   options={statusOptions}
 *   onChange={(value) => console.log('Selected:', value)}
 * />
 *
 * @example
 * // With individually disabled options
 * <RadioInput
 *   name="plan"
 *   control={control}
 *   options={[
 *     { value: 'free', label: 'Free' },
 *     { value: 'pro', label: 'Pro', disabled: true },
 *     { value: 'enterprise', label: 'Enterprise' }
 *   ]}
 * />
 *
 * @example
 * // Fully disabled
 * <RadioInput name="lockedField" control={control} options={options} disabled={true} />
 *
 * Props:
 * ------
 * @param {string} name - Form field name (required)
 * @param {Control<any>} control - React Hook Form control object (required)
 * @param {RadioOption[]} options - Array of {value, label, disabled?} options (required)
 * @param {any} [validationRules] - React Hook Form validation rules
 * @param {(value: string) => void} [onChange] - Callback when selection changes
 * @param {boolean} [disabled=false] - Disable all radio options
 * @param {any} [hint] - Hint text displayed below radio group
 *
 * Features:
 * ---------
 * - React Hook Form integration via Controller
 * - Horizontal layout with spacing
 * - Individual option disable support
 * - Scaled radio buttons (110%)
 * - Error message display
 * - Hint text support
 */
interface RadioOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface RadioInputProps {
    name: string;
    control: Control<any>;
    validationRules?: any;
    options: RadioOption[];
    onChange?: (value: string) => void;
    disabled?: boolean;
    hint?: any;
}

const RadioInput: React.FC<RadioInputProps> = ({ 
    name,
    control, 
    validationRules,
    options,
    onChange,
    disabled = false,
    hint
}) => {
    return (
        <Controller
            name={name}
            control={control}
            rules={validationRules}
            render={({ field, fieldState }) => (
                <div>
                    <div className="flex items-center space-x-8">
                        {options.map((option) => (
                            <label key={option.value} className={`flex items-center ${disabled || option.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                <input
                                    type="radio"
                                    value={option.value}
                                    checked={field.value === option.value}
                                    onChange={(e) => {
                                        if (!disabled && !option.disabled) {
                                            field.onChange(e.target.value);
                                            if (onChange) {
                                                onChange(e.target.value);
                                            }
                                        }
                                    }}
                                    disabled={disabled || option.disabled}
                                    className="h-4 w-4 scale-110 disabled:opacity-50"
                                />
                                <span className={`ml-2 text-sm ${disabled || option.disabled ? 'text-gray-400' : 'text-gray-700'}`}>
                                    {option.label}
                                </span>
                            </label>
                        ))}
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
            )}
        />
    );
};

export default RadioInput;
