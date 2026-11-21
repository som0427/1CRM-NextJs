import React, { useRef, forwardRef, useState } from 'react';
import { Controller, Control } from 'react-hook-form';
import DatePicker from 'react-datepicker';
import { getMonth, getYear } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

/**
 * DateInput Component
 *
 * A date picker input with React Hook Form integration, using react-datepicker
 * with custom styling, month/year dropdowns, and smooth animations.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <DateInput name="birthDate" control={control} />
 *
 * @example
 * // With min and max date constraints
 * <DateInput
 *   name="eventDate"
 *   control={control}
 *   minDate="2024-01-01"
 *   maxDate="2024-12-31"
 * />
 *
 * @example
 * // With validation and hint
 * <DateInput
 *   name="startDate"
 *   control={control}
 *   validationRules={{ required: 'Start date is required' }}
 *   hint="Select the project start date"
 * />
 *
 * @example
 * // Disabled state (shows lock icon)
 * <DateInput name="lockedDate" control={control} disabled={true} />
 *
 * Props:
 * ------
 * @param {string} name - Form field name (required)
 * @param {Control<any>} control - React Hook Form control object (required)
 * @param {any} [validationRules] - React Hook Form validation rules
 * @param {string} [placeholder="YYYY-MM-DD"] - Placeholder text
 * @param {boolean} [disabled=false] - Disabled state (shows lock icon when true)
 * @param {string} [width="w-full"] - Container width class
 * @param {string} [minDate="1996-01-01"] - Minimum selectable date (YYYY-MM-DD format)
 * @param {string} [maxDate] - Maximum selectable date (YYYY-MM-DD format)
 * @param {any} [hint] - Hint text displayed below input
 *
 * Features:
 * ---------
 * - React Hook Form integration via Controller
 * - react-datepicker with smooth animations
 * - Month and year dropdown selectors for easy navigation
 * - Calendar icon triggers date picker on click
 * - Min/max date constraints with year range restriction
 * - Lock icon for disabled state
 * - Error message display
 * - Hint text support
 * - Underline-style border design
 * - YYYY-MM-DD format display
 */

// Month names for dropdown
const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];
interface DateInputProps {
    name: string;
    control: Control<any>;
    validationRules?: any;
    placeholder?: string;
    disabled?: boolean;
    width?: string;
    minDate?: string;
    maxDate?: string;
    hint?: any;
}

// Custom input component for react-datepicker
interface CustomInputProps {
    value?: string;
    onClick?: () => void;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: () => void;
    placeholder?: string;
    disabled?: boolean;
    hasError?: boolean;
    onToggle?: () => void;
    isFocused?: boolean;
}

const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
    ({ value, onClick, onChange, onBlur, placeholder, disabled, hasError, onToggle, isFocused }, ref) => (
        <div className="relative w-full" style={{ width: '100%' }}>
            <input
                ref={ref}
                type="text"
                value={value || ''}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!disabled && onToggle) {
                        onToggle();
                    }
                }}
                onChange={onChange}
                onBlur={onBlur}
                placeholder={placeholder}
                disabled={disabled}
                readOnly
                className={`w-full border-0 border-b-2 pl-0 pr-8 pt-1.5 pb-1.5 text-sm focus:outline-none transition-colors cursor-pointer ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'} ${hasError
                    ? 'border-red-500'
                    : disabled
                        ? 'border-gray-200'
                        : isFocused
                            ? 'border-blue-600'
                            : 'border-gray-300'
                    } placeholder-[#787878]`}
            />
            <div
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!disabled && onToggle) {
                        onToggle();
                    }
                }}
            >
                {disabled ? (
                    <svg width="14" height="18" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 0C9.415 0 11.375 1.92042 11.375 4.28613V6H12.25C13.2124 6 13.9998 6.7712 14 7.71387V16.2861C13.9998 17.2288 13.2124 18 12.25 18H1.75C0.787642 18 0.000232912 17.2288 0 16.2861V7.71387C0.000233044 6.7712 0.787642 6 1.75 6H2.625V4.28613C2.625 1.92042 4.585 0 7 0ZM2.625 7.71484C2.14386 7.71484 1.75019 8.10001 1.75 8.57129V15.4287C1.75 15.9001 2.14375 16.2861 2.625 16.2861H11.375C11.8562 16.2861 12.25 15.9001 12.25 15.4287V8.57129C12.2498 8.10001 11.8561 7.71484 11.375 7.71484H2.625ZM6.75 9.5C7.71236 9.5 8.49977 10.2712 8.5 11.2139C8.5 12.1567 7.7125 12.9287 6.75 12.9287C5.7875 12.9287 5 12.1567 5 11.2139C5.00023 10.2712 5.78764 9.5 6.75 9.5ZM7 1.71387C5.5475 1.71387 4.375 2.86328 4.375 4.28613V6H9.625V4.28613C9.625 2.86328 8.4525 1.71387 7 1.71387Z" fill="#3F4254" fillOpacity="0.6"/>
                    </svg>
                ) : (
                    <svg width="12" height="13" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3.24848 7.49696C3.66186 7.49696 3.99696 7.16186 3.99696 6.74848C3.99696 6.33511 3.66186 6 3.24848 6C2.83511 6 2.5 6.33511 2.5 6.74848C2.5 7.16186 2.83511 7.49696 3.24848 7.49696ZM3.99696 9.24848C3.99696 9.66186 3.66186 9.99696 3.24848 9.99696C2.83511 9.99696 2.5 9.66186 2.5 9.24848C2.5 8.83511 2.83511 8.5 3.24848 8.5C3.66186 8.5 3.99696 8.83511 3.99696 9.24848ZM6.00043 7.49696C6.41381 7.49696 6.74892 7.16186 6.74892 6.74848C6.74892 6.33511 6.41381 6 6.00043 6C5.58706 6 5.25195 6.33511 5.25195 6.74848C5.25195 7.16186 5.58706 7.49696 6.00043 7.49696ZM6.74892 9.24848C6.74892 9.66186 6.41381 9.99696 6.00043 9.99696C5.58706 9.99696 5.25195 9.66186 5.25195 9.24848C5.25195 8.83511 5.58706 8.5 6.00043 8.5C6.41381 8.5 6.74892 8.83511 6.74892 9.24848ZM8.74848 7.49696C9.16186 7.49696 9.49696 7.16186 9.49696 6.74848C9.49696 6.33511 9.16186 6 8.74848 6C8.33511 6 8 6.33511 8 6.74848C8 7.16186 8.33511 7.49696 8.74848 7.49696ZM12 3C12 1.61929 10.8807 0.5 9.5 0.5H2.5C1.11929 0.5 0 1.61929 0 3V10C0 11.3807 1.11929 12.5 2.5 12.5H9.5C10.8807 12.5 12 11.3807 12 10V3ZM1 4.5H11V10C11 10.8284 10.3284 11.5 9.5 11.5H2.5C1.67157 11.5 1 10.8284 1 10V4.5ZM2.5 1.5H9.5C10.3284 1.5 11 2.17157 11 3V3.5H1V3C1 2.17157 1.67157 1.5 2.5 1.5Z" fill="#3699FF" />
                    </svg>
                )}
            </div>
        </div>
    )
);

CustomInput.displayName = 'CustomInput';

// Helper to parse YYYY-MM-DD string to Date
const parseDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
};

// Helper to format Date to YYYY-MM-DD string
const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DateInput: React.FC<DateInputProps> = ({
    name,
    control,
    validationRules,
    placeholder = "YYYY-MM-DD",
    disabled = false,
    width = "w-full",
    minDate = "1996-01-01",
    maxDate,
    hint
}) => {
    const datePickerRef = useRef<DatePicker>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isOpen, setIsOpen] = useState(false);

    // Calculate year range based on minDate and maxDate
    const minYear = parseDate(minDate)?.getFullYear() || 1996;
    const maxYear = parseDate(maxDate)?.getFullYear() || new Date().getFullYear() + 10;
    const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

    const handleClickOutside = (event: MouseEvent) => {
        // Don't close if clicking on the input wrapper
        if (wrapperRef.current && wrapperRef.current.contains(event.target as Node)) {
            return;
        }
        setIsOpen(false);
    };

    // Calculate openToDate - if selected date is outside min/max range, open to a valid date
    const getOpenToDate = (selectedDate: Date | null, min: Date | null, max: Date | null): Date | undefined => {
        if (!selectedDate) return undefined;
        if (min && selectedDate < min) return min;
        if (max && selectedDate > max) return max;
        return undefined; // Use selected date by default
    };

    return (
        <Controller
            name={name}
            control={control}
            rules={validationRules}
            render={({ field, fieldState }) => {
                const selectedDate = parseDate(field.value);
                const minDateParsed = parseDate(minDate);
                const maxDateParsed = parseDate(maxDate);
                const openToDate = getOpenToDate(selectedDate, minDateParsed, maxDateParsed);
                
                return (
                <div ref={wrapperRef} className={`${width} relative`}>
                    <DatePicker
                        ref={datePickerRef}
                        selected={selectedDate}
                        openToDate={openToDate}
                        onChange={(date: Date | null) => {
                            field.onChange(formatDate(date));
                            setIsOpen(false);
                        }}
                        onBlur={field.onBlur}
                        dateFormat="yyyy-MM-dd"
                        placeholderText={placeholder}
                        disabled={disabled}
                        minDate={minDateParsed}
                        maxDate={maxDateParsed}
                        renderCustomHeader={({
                            date,
                            changeYear,
                            changeMonth,
                            decreaseMonth,
                            increaseMonth,
                            prevMonthButtonDisabled,
                            nextMonthButtonDisabled,
                        }) => (
                            <div className="flex items-center justify-between px-2 py-2 bg-white">
                                <button
                                    type="button"
                                    onClick={decreaseMonth}
                                    disabled={prevMonthButtonDisabled}
                                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <div className="flex gap-2">
                                    <select
                                        value={getMonth(date)}
                                        onChange={({ target: { value } }) => changeMonth(parseInt(value))}
                                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
                                    >
                                        {months.map((month, index) => (
                                            <option key={month} value={index}>
                                                {month}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={getYear(date)}
                                        onChange={({ target: { value } }) => changeYear(parseInt(value))}
                                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
                                    >
                                        {years.map((year) => (
                                            <option key={year} value={year}>
                                                {year}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    onClick={increaseMonth}
                                    disabled={nextMonthButtonDisabled}
                                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        customInput={
                            <CustomInput
                                ref={inputRef}
                                hasError={!!fieldState.error}
                                disabled={disabled}
                                placeholder={placeholder}
                                onToggle={() => setIsOpen(prev => !prev)}
                                isFocused={isOpen}
                            />
                        }
                        popperClassName="date-picker-popper"
                        showPopperArrow={false}
                        popperPlacement="bottom-start"
                        portalId="datepicker-portal"
                        open={isOpen}
                        onClickOutside={handleClickOutside}
                        shouldCloseOnSelect={true}
                        wrapperClassName="w-full"
                    />
                    {hint && (!fieldState.error || disabled) && (
                        <div className="absolute text-xs text-gray-500 mt-0.5 left-0">
                            {hint}
                        </div>
                    )}
                    {fieldState.error && !disabled && (
                        <div className="absolute text-xs text-red-500 mt-0.5 left-0">
                            {fieldState.error.message}
                        </div>
                    )}
                </div>
                );
            }}
        />
    );
};

export default DateInput;
