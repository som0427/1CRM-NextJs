import React, { useRef } from 'react';
import { Controller, Control } from 'react-hook-form';

/**
 * TimeInput Component
 *
 * A time picker input with React Hook Form integration, using native HTML5 time input
 * with optional seconds support.
 *
 * @component
 *
 * @example
 * // Basic usage (hours:minutes only)
 * <TimeInput name="startTime" control={control} />
 *
 * @example
 * // With seconds enabled
 * <TimeInput
 *   name="preciseTime"
 *   control={control}
 *   withSeconds={true}
 * />
 *
 * @example
 * // With validation and hint
 * <TimeInput
 *   name="openingTime"
 *   control={control}
 *   validationRules={{ required: 'Opening time is required' }}
 *   hint="Select store opening time"
 * />
 *
 * @example
 * // Disabled state (shows lock icon)
 * <TimeInput name="lockedTime" control={control} disabled={true} />
 *
 * Props:
 * ------
 * @param {string} name - Form field name (required)
 * @param {Control<any>} control - React Hook Form control object (required)
 * @param {any} [validationRules] - React Hook Form validation rules
 * @param {string} [placeholder="Select time..."] - Placeholder text
 * @param {boolean} [disabled=false] - Disabled state (shows lock icon when true)
 * @param {string} [width="w-full"] - Container width class
 * @param {any} [hint] - Hint text displayed below input
 * @param {boolean} [withSeconds=false] - Include seconds in time selection (HH:MM:SS vs HH:MM)
 *
 * Features:
 * ---------
 * - React Hook Form integration via Controller
 * - Native HTML5 time picker
 * - Clock icon triggers picker on click
 * - Optional seconds support
 * - Lock icon for disabled state
 * - Error message display
 * - Hint text support
 * - Underline-style border design
 */
interface TimeInputProps {
    name: string;
    control: Control<any>;
    validationRules?: any;
    placeholder?: string;
    disabled?: boolean;
    width?: string;
    hint?: any;
    withSeconds?: boolean; // Add prop to control seconds display
}

const TimeInput: React.FC<TimeInputProps> = ({
    name,
    control,
    validationRules,
    placeholder = "Select time...",
    disabled = false,
    width = "w-full",
    hint,
    withSeconds = false
}) => {
    const timeInputRef = useRef<HTMLInputElement>(null);
    return (
        <Controller
            name={name}
            control={control}
            rules={validationRules}
            render={({ field, fieldState }) => (
                <div className={width}>
                    <div className="relative">
                        <input
                            {...field}
                            type="time"
                            step={withSeconds ? "1" : "60"} // step="1" enables seconds, step="60" shows only hours:minutes
                            ref={(el) => {
                                // attach to RHF
                                if (typeof field.ref === 'function') {
                                    field.ref(el);
                                } else if (field.ref) {
                                    // @ts-ignore
                                    field.ref.current = el;
                                }
                                // store local ref for showPicker
                                // eslint-disable-next-line react-hooks/rules-of-hooks
                                timeInputRef.current = el as HTMLInputElement | null;
                            }}
                            disabled={disabled}
                            className={`hide-date-icon w-full border-0 border-b-2 pl-0 pr-8 pt-1.5 pb-1.5 text-sm focus:outline-none transition-colors ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'} ${fieldState.error
                                ? 'border-red-500 focus:border-red-500'
                                : disabled
                                    ? 'border-gray-200'
                                    : 'border-gray-300 focus:border-blue-600'
                                }`}
                            placeholder={placeholder}
                        />


                        <div
                            className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            onClick={() => {
                                const el = timeInputRef.current;
                                if (el && !el.disabled && !el.readOnly && typeof el.showPicker === 'function') {
                                    el.showPicker();
                                }
                            }}
                        >
                            {disabled ? (
                                <svg width="14" height="18" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7 0C9.415 0 11.375 1.92042 11.375 4.28613V6H12.25C13.2124 6 13.9998 6.7712 14 7.71387V16.2861C13.9998 17.2288 13.2124 18 12.25 18H1.75C0.787642 18 0.000232912 17.2288 0 16.2861V7.71387C0.000233044 6.7712 0.787642 6 1.75 6H2.625V4.28613C2.625 1.92042 4.585 0 7 0ZM2.625 7.71484C2.14386 7.71484 1.75019 8.10001 1.75 8.57129V15.4287C1.75 15.9001 2.14375 16.2861 2.625 16.2861H11.375C11.8562 16.2861 12.25 15.9001 12.25 15.4287V8.57129C12.2498 8.10001 11.8561 7.71484 11.375 7.71484H2.625ZM6.75 9.5C7.71236 9.5 8.49977 10.2712 8.5 11.2139C8.5 12.1567 7.7125 12.9287 6.75 12.9287C5.7875 12.9287 5 12.1567 5 11.2139C5.00023 10.2712 5.78764 9.5 6.75 9.5ZM7 1.71387C5.5475 1.71387 4.375 2.86328 4.375 4.28613V6H9.625V4.28613C9.625 2.86328 8.4525 1.71387 7 1.71387Z" fill="#3F4254" fillOpacity="0.6"/>
                                </svg>
                            ) : (
                                <svg width="12" height="13" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6 0.5C2.68629 0.5 0 3.18629 0 6.5C0 9.81371 2.68629 12.5 6 12.5C9.31371 12.5 12 9.81371 12 6.5C12 3.18629 9.31371 0.5 6 0.5ZM6 11.5C3.23858 11.5 1 9.26142 1 6.5C1 3.73858 3.23858 1.5 6 1.5C8.76142 1.5 11 3.73858 11 6.5C11 9.26142 8.76142 11.5 6 11.5ZM6.5 3.5H5.5V7L8.25 8.75L8.75 7.93L6.5 6.5V3.5Z" fill="#3699FF" />
                                </svg>
                            )}
                        </div>
                    </div>
                    {(!fieldState.error || disabled) && hint && (
                        <div className="text-xs text-gray-500 mt-1">
                            {hint}
                        </div>
                    )}
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

export default TimeInput;
