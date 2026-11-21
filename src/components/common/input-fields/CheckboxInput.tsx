import React from 'react';
import { Controller, Control } from 'react-hook-form';

/**
 * CheckboxInput Component
 *
 * A single checkbox with React Hook Form integration, custom styled checkbox,
 * and optional label.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <CheckboxInput name="agreeToTerms" control={control} />
 *
 * @example
 * // With custom label
 * <CheckboxInput
 *   name="newsletter"
 *   control={control}
 *   label="Subscribe to newsletter"
 * />
 *
 * @example
 * // With validation
 * <CheckboxInput
 *   name="terms"
 *   control={control}
 *   label="I agree to the terms and conditions"
 *   validationRules={{ required: 'You must accept the terms' }}
 * />
 *
 * @example
 * // With onChange callback
 * <CheckboxInput
 *   name="darkMode"
 *   control={control}
 *   label="Enable dark mode"
 *   onChange={(checked) => console.log('Dark mode:', checked)}
 * />
 *
 * @example
 * // Disabled state
 * <CheckboxInput name="lockedOption" control={control} disabled={true} />
 *
 * Props:
 * ------
 * @param {string} name - Form field name (required)
 * @param {Control<any>} control - React Hook Form control object (required)
 * @param {any} [validationRules] - React Hook Form validation rules
 * @param {string} [label="Yes"] - Checkbox label text
 * @param {any} [hint] - Hint text displayed below checkbox
 * @param {string} [hintSizeClass="text-xs"] - CSS class for hint text size
 * @param {boolean} [disabled=false] - Disabled state
 * @param {string} [className=""] - Additional CSS classes for container
 * @param {(checked: boolean) => void} [onChange] - Callback when checked state changes
 *
 * Features:
 * ---------
 * - React Hook Form integration via Controller
 * - Custom styled checkbox (blue when checked)
 * - Checkmark animation
 * - Error message display
 * - Hint text support with configurable size
 * - Accessible label click
 */
interface CheckboxInputProps {
    name: string;
    control: Control<any>;
    validationRules?: any;
    label?: string;
    hint?: any;
    hintSizeClass?: String;
    disabled?: boolean;
    className?: string;
    onChange?: (checked: boolean) => void;
}

const CheckboxInput: React.FC<CheckboxInputProps> = ({
    name,
    control,
    validationRules,
    label = "Yes",
    hint,
    hintSizeClass = "text-xs",
    disabled = false,
    className = "",
    onChange
}) => {
    return (
        <Controller
            name={name}
            control={control}
            rules={validationRules}
            render={({ field, fieldState }) => (
                <div>
                    <div className={`flex items-center ml-1 mt-1 ${className}`}>
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={!!field.value}
                                onChange={e => {
                                    const checked = e.target.checked;
                                    field.onChange(checked);
                                    if (onChange) {
                                        onChange(checked);
                                    }
                                }}
                                className="hidden"
                                disabled={disabled}
                            />
                            <div
                                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                    disabled 
                                        ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                                        : field.value
                                            ? 'bg-blue-500 border-blue-500'
                                            : 'border-gray-400 hover:border-blue-400'
                                }`}
                            >
                                {field.value && (
                                    <svg
                                        className={`w-5 h-5 ${disabled ? 'text-gray-400' : 'text-white'}`}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        viewBox="0 0 16 16"
                                    >
                                        <path d="M3 8l3 3L13 3" />
                                    </svg>
                                )}
                            </div>
                        </label>
                        <span className={`ml-3 text-sm cursor-default ${
                            disabled ? 'text-gray-400' : 'text-gray-700'
                        }`}>
                            {label}
                        </span>
                    </div>
                    
                    {fieldState.error && !disabled && (
                        <div className="text-xs text-red-500 mt-1 ml-1">
                            {fieldState.error.message}
                        </div>
                    )}
                    
                    {/* Hint Text */}
                    {hint && (!fieldState.error || disabled) && (
                        <div className={`${hintSizeClass} text-gray-500 mt-1 ml-1`}>
                            {hint}
                        </div>
                    )}
                </div>
            )}
        />
    );
};

CheckboxInput.displayName = 'CheckboxInput';

export default CheckboxInput;
