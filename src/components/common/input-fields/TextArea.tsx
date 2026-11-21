import React from 'react';
import { Controller, Control } from 'react-hook-form';

/**
 * TextArea Component
 *
 * A multi-line text input field with React Hook Form integration, character counting,
 * and configurable resize behavior.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <TextArea name="description" control={control} />
 *
 * @example
 * // With custom rows and max length
 * <TextArea
 *   name="bio"
 *   control={control}
 *   rows={5}
 *   maxLength={1000}
 *   placeholder="Tell us about yourself..."
 * />
 *
 * @example
 * // Without character count
 * <TextArea
 *   name="notes"
 *   control={control}
 *   showCharacterCount={false}
 * />
 *
 * @example
 * // With resize disabled (textarea is vertically resizable by default)
 * <TextArea
 *   name="content"
 *   control={control}
 *   resize="none"
 * />
 *
 * @example
 * // Disabled state
 * <TextArea name="readOnlyField" control={control} disabled={true} />
 *
 * Props:
 * ------
 * @param {string} name - Form field name (required)
 * @param {Control<any>} control - React Hook Form control object (required)
 * @param {any} [validationRules] - React Hook Form validation rules
 * @param {string} [placeholder="Type here..."] - Placeholder text
 * @param {number} [maxLength=500] - Maximum character limit
 * @param {number} [rows=3] - Number of visible text rows
 * @param {boolean} [disabled=false] - Disabled state (shows lock icon when true)
 * @param {string} [className=""] - Additional CSS classes for container
 * @param {boolean} [showCharacterCount=true] - Show character counter (e.g., "150/500")
 * @param {'none'|'both'|'horizontal'|'vertical'} [resize='vertical'] - Resize behavior (default: vertical for user-expandable height)
 *
 * Features:
 * ---------
 * - React Hook Form integration via Controller
 * - Character count display (bottom-right corner)
 * - Configurable resize behavior
 * - Lock icon for disabled state
 * - Error message display
 * - Underline-style border design
 */
interface TextAreaProps {
    name: string;
    control: Control<any>;
    validationRules?: any;
    placeholder?: string;
    maxLength?: number;
    rows?: number;
    disabled?: boolean;
    className?: string;
    showCharacterCount?: boolean;
    resize?: 'none' | 'both' | 'horizontal' | 'vertical';
}

const TextArea: React.FC<TextAreaProps> = ({
    name,
    control,
    validationRules,
    placeholder = "Type here...",
    maxLength = 500,
    rows = 3,
    disabled = false,
    className = "",
    showCharacterCount = true,
    resize = 'vertical'
}) => {
    return (
        <Controller
            name={name}
            control={control}
            rules={validationRules}
            render={({ field, fieldState }) => (
                <div className={className}>
                    <div className="relative">
                        <textarea
                            {...field}
                            className={`w-full border-0 border-b-2 ${
                                fieldState.error
                                    ? 'border-red-500'
                                    : disabled
                                        ? 'border-gray-200'
                                        : 'border-gray-300 focus:border-blue-600'
                            } pl-0 pt-1.5 pb-1.5 ${showCharacterCount ? 'pr-14' : disabled ? 'pr-8' : 'pr-0'} text-sm focus:outline-none transition-colors ${
                                disabled ? 'bg-gray-50 cursor-not-allowed' : ''
                            } min-h-[2em] ${resize === 'vertical' ? 'resize-y' : resize === 'horizontal' ? 'resize-x' : resize === 'both' ? 'resize' : 'resize-none'} placeholder-[#787878]`}
                            rows={rows}
                            placeholder={placeholder}
                            maxLength={maxLength}
                            disabled={disabled}
                        />
                        {disabled ? (
                            <div className="absolute right-2 top-2">
                                <svg width="14" height="18" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7 0C9.415 0 11.375 1.92042 11.375 4.28613V6H12.25C13.2124 6 13.9998 6.7712 14 7.71387V16.2861C13.9998 17.2288 13.2124 18 12.25 18H1.75C0.787642 18 0.000232912 17.2288 0 16.2861V7.71387C0.000233044 6.7712 0.787642 6 1.75 6H2.625V4.28613C2.625 1.92042 4.585 0 7 0ZM2.625 7.71484C2.14386 7.71484 1.75019 8.10001 1.75 8.57129V15.4287C1.75 15.9001 2.14375 16.2861 2.625 16.2861H11.375C11.8562 16.2861 12.25 15.9001 12.25 15.4287V8.57129C12.2498 8.10001 11.8561 7.71484 11.375 7.71484H2.625ZM6.75 9.5C7.71236 9.5 8.49977 10.2712 8.5 11.2139C8.5 12.1567 7.7125 12.9287 6.75 12.9287C5.7875 12.9287 5 12.1567 5 11.2139C5.00023 10.2712 5.78764 9.5 6.75 9.5ZM7 1.71387C5.5475 1.71387 4.375 2.86328 4.375 4.28613V6H9.625V4.28613C9.625 2.86328 8.4525 1.71387 7 1.71387Z" fill="#3F4254" fillOpacity="0.6"/>
                                </svg>
                            </div>
                        ) : showCharacterCount && (
                            <div className="absolute right-0 bottom-2 text-xs text-gray-400">
                                {field.value?.length || 0}/{maxLength}
                            </div>
                        )}
                    </div>
                    {fieldState.error && !disabled && (
                        <div className="text-xs text-red-500 mt-1">
                            {fieldState.error.message}
                        </div>
                    )}
                </div>
            )}
        />
    );
};

TextArea.displayName = 'TextArea';

export default TextArea;
