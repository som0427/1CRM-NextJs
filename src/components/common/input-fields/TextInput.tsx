import React from 'react';
import { Controller, Control } from 'react-hook-form';

/**
 * TextInput Component
 *
 * A single-line text input field with React Hook Form integration, character counting,
 * and input validation/blocking capabilities.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <TextInput name="username" control={control} />
 *
 * @example
 * // With character count and max length
 * <TextInput
 *   name="title"
 *   control={control}
 *   maxLength={100}
 *   showCharacterCount={true}
 *   placeholder="Enter title..."
 * />
 *
 * @example
 * // With input blocking (only allows alphanumeric)
 * <TextInput
 *   name="code"
 *   control={control}
 *   blockInvalidInput={true}
 *   pattern={/^[a-zA-Z0-9]*$/}
 * />
 *
 * @example
 * // Email input with validation
 * <TextInput
 *   name="email"
 *   control={control}
 *   type="email"
 *   validationRules={{
 *     required: 'Email is required',
 *     pattern: { value: /^\S+@\S+$/i, message: 'Invalid email' }
 *   }}
 * />
 *
 * @example
 * // Disabled state (shows lock icon)
 * <TextInput name="lockedField" control={control} disabled={true} />
 *
 * Props:
 * ------
 * @param {string} name - Form field name (required)
 * @param {Control<any>} control - React Hook Form control object (required)
 * @param {any} [validationRules] - React Hook Form validation rules
 * @param {string} [placeholder="Enter text..."] - Placeholder text
 * @param {number} [maxLength=200] - Maximum character limit
 * @param {string} [type='text'] - Input type (text, email, number, tel, etc.)
 * @param {boolean} [showCharacterCount=false] - Show character counter (e.g., "50/200")
 * @param {boolean} [blockInvalidInput=false] - When true, prevents invalid characters from being typed
 * @param {RegExp} [pattern] - Regex pattern for blocking input (only used when blockInvalidInput=true)
 * @param {boolean} [disabled=false] - Disabled state (shows lock icon when true)
 * @param {any} [hint] - Hint text displayed below input (hidden when error exists)
 * @param {string} [maxWidth='w-full'] - Container width class
 * @param {React.InputHTMLAttributes} [inputProps={}] - Additional HTML input attributes
 *
 * Features:
 * ---------
 * - React Hook Form integration via Controller
 * - Character count display
 * - Input blocking with regex pattern
 * - Lock icon for disabled state
 * - Error message display
 * - Hint text support
 * - Underline-style border design
 */
interface TextInputProps {
    name: string;
    control: Control<any>;
    validationRules?: any;
    placeholder?: string;
    maxLength?: number;
    type?: string;
    showCharacterCount?: boolean;
    blockInvalidInput?: boolean; // If true, blocks invalid characters from being typed
    pattern?: RegExp; // Pattern for blocking input (only used if blockInvalidInput is true)
    disabled?: boolean;
    hint?: any;
    maxWidth?: string; // Optional prop for max width
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>; // Additional input attributes
    onChange?: (value: string) => void; // External onChange callback - called after field value is updated
}

const TextInput: React.FC<TextInputProps> = ({
    name,
    control,
    validationRules,
    placeholder = "Enter text...",
    maxLength = 200,
    type = 'text',
    showCharacterCount = false,
    blockInvalidInput = false,
    pattern,
    disabled = false,
    maxWidth = 'w-full',
    hint,
    inputProps = {},
    onChange: externalOnChange
}) => {
    return (
        <Controller
            name={name}
            control={control}
            rules={validationRules}
            render={({ field, fieldState }) => (
                <div className={`${maxWidth} relative`}>
                    <div className="relative">
                        <input
                            {...field}
                            {...inputProps}
                            type={type}
                            disabled={disabled}
                            className={`w-full border-0 border-b-2 pl-0 ${showCharacterCount ? 'pr-14' : disabled ? 'pr-8' : 'pr-0'} pt-1.5 pb-1.5 text-sm focus:outline-none transition-colors bg-transparent ${disabled ? 'cursor-not-allowed text-grey-500' : ''} ${(fieldState.error && !disabled)
                                ? 'border-red-500 focus:border-red-500'
                                : disabled
                                    ? 'border-gray-200'
                                    : 'border-gray-300 focus:border-blue-600'
                                } placeholder-[#787878]`}
                            onChange={(e) => {
                                if (disabled) return;
                                const value = e.target.value;
                                const effectiveMax = maxLength ?? Number.POSITIVE_INFINITY;

                                // Always allow clearing
                                if (value === '') {
                                    field.onChange(value);
                                    externalOnChange?.(value);
                                    return;
                                }

                                if (blockInvalidInput && pattern) {
                                    if (pattern.test(value) && value.length <= effectiveMax) {
                                        field.onChange(value);
                                        externalOnChange?.(value);
                                    }
                                } else {
                                    if (value.length <= effectiveMax) {
                                        field.onChange(value);
                                        externalOnChange?.(value);
                                    }
                                }
                            }}
                            value={field.value || ''}
                            placeholder={placeholder}
                            maxLength={maxLength}
                        />
                        {disabled ? (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                                <svg width="14" height="18" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7 0C9.415 0 11.375 1.92042 11.375 4.28613V6H12.25C13.2124 6 13.9998 6.7712 14 7.71387V16.2861C13.9998 17.2288 13.2124 18 12.25 18H1.75C0.787642 18 0.000232912 17.2288 0 16.2861V7.71387C0.000233044 6.7712 0.787642 6 1.75 6H2.625V4.28613C2.625 1.92042 4.585 0 7 0ZM2.625 7.71484C2.14386 7.71484 1.75019 8.10001 1.75 8.57129V15.4287C1.75 15.9001 2.14375 16.2861 2.625 16.2861H11.375C11.8562 16.2861 12.25 15.9001 12.25 15.4287V8.57129C12.2498 8.10001 11.8561 7.71484 11.375 7.71484H2.625ZM6.75 9.5C7.71236 9.5 8.49977 10.2712 8.5 11.2139C8.5 12.1567 7.7125 12.9287 6.75 12.9287C5.7875 12.9287 5 12.1567 5 11.2139C5.00023 10.2712 5.78764 9.5 6.75 9.5ZM7 1.71387C5.5475 1.71387 4.375 2.86328 4.375 4.28613V6H9.625V4.28613C9.625 2.86328 8.4525 1.71387 7 1.71387Z" fill="#3F4254" fillOpacity="0.6"/>
                                </svg>
                            </div>
                        ) : showCharacterCount && (
                            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                                {field.value?.length || 0}{maxLength ? `/${maxLength}` : ''}
                            </div>
                        )}
                    </div>
                    {fieldState.error && !disabled && (
                        <div className="absolute text-xs text-red-500 mt-0.5 left-0 whitespace-nowrap">
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

export default TextInput;
