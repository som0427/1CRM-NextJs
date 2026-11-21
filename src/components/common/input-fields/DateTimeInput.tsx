import React, { useRef, forwardRef, useState, useEffect } from 'react';
import { Controller, Control } from 'react-hook-form';
import { format, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { createPortal } from 'react-dom';

/**
 * DateTimeInput Component
 *
 * Side-by-side layout with light theme:
 * - Left: Calendar with month/year dropdown
 * - Right: Scrollable hour, minute, AM/PM columns
 */

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface DateTimeInputProps {
    name: string;
    control: Control<any>;
    validationRules?: any;
    placeholder?: string;
    disabled?: boolean;
    width?: string;
    minDateTime?: string;
    maxDateTime?: string;
    hint?: any;
    /**
     * Show a clear button once a value is picked. Opt-in: a field that is required, or
     * that is always expected to hold a value, should not offer one.
     */
    allowClear?: boolean;
}

// Parse datetime string to Date
const parseDateTime = (dateTimeStr: string | null | undefined): Date | null => {
    if (!dateTimeStr) return null;
    const normalizedStr = dateTimeStr.replace(' ', 'T');
    const date = new Date(normalizedStr);
    return isNaN(date.getTime()) ? null : date;
};

// Format Date to YYYY-MM-DD HH:mm
const formatDateTime = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// Custom Input
const CustomInput = forwardRef<HTMLInputElement, any>(
    ({ onClick, placeholder, disabled, hasError, isFocused, displayValue, onClear }, ref) => (
        <div
            onClick={!disabled ? onClick : undefined}
            className={`
                relative w-full flex items-center cursor-pointer
                border-b-2 transition-all duration-200
                ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
                ${hasError ? 'border-[#F64E60]' : disabled ? 'border-gray-200' : isFocused ? 'border-[#3699FF]' : 'border-gray-300'}
            `}
        >
            <input
                ref={ref}
                type="text"
                value={displayValue || ''}
                placeholder={placeholder}
                disabled={disabled}
                readOnly
                className={`
                    w-full border-0 bg-transparent pl-0 py-[6px] text-sm
                    ${onClear ? 'pr-14' : 'pr-8'}
                    focus:outline-none cursor-pointer
                    ${disabled ? 'cursor-not-allowed text-gray-400' : 'text-gray-700'}
                    placeholder-[#787878]
                `}
            />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {onClear && (
                    <button
                        type="button"
                        // The wrapper opens the picker, so keep the click from reaching it
                        onClick={(e) => { e.stopPropagation(); onClear(); }}
                        aria-label="Clear date and time"
                        title="Clear"
                        className="flex items-center justify-center text-gray-400 hover:text-[#F64E60] transition-colors"
                    >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                    </button>
                )}
                {disabled ? (
                    <svg width="14" height="18" viewBox="0 0 14 18" fill="none">
                        <path d="M7 0C9.415 0 11.375 1.92 11.375 4.286V6H12.25C13.212 6 14 6.771 14 7.714V16.286C14 17.229 13.212 18 12.25 18H1.75C.788 18 0 17.229 0 16.286V7.714C0 6.771.788 6 1.75 6H2.625V4.286C2.625 1.92 4.585 0 7 0ZM7 1.714C5.548 1.714 4.375 2.863 4.375 4.286V6H9.625V4.286C9.625 2.863 8.452 1.714 7 1.714Z" fill="#3F4254" fillOpacity="0.6"/>
                    </svg>
                ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4.5 1V2H11.5V1H13V2H14C14.552 2 15 2.448 15 3V14C15 14.552 14.552 15 14 15H2C1.448 15 1 14.552 1 14V3C1 2.448 1.448 2 2 2H3V1H4.5ZM13.5 7H2.5V13.5H13.5V7ZM3 3.5H2.5V5.5H13.5V3.5H13V4H11.5V3.5H4.5V4H3V3.5Z" fill="#3699FF"/>
                    </svg>
                )}
            </div>
        </div>
    )
);

CustomInput.displayName = 'CustomDateTimeInput';

// Scrollable Time Column Component
interface TimeColumnProps {
    items: { value: number | string; label: string }[];
    selectedValue: number | string;
    onSelect: (value: number | string) => void;
    itemHeight?: number;
    centered?: boolean;
    maxItems?: number;
    /** Greys out an option and ignores clicks on it, e.g. a time before minDateTime. */
    isDisabled?: (value: number | string) => boolean;
}

const TimeColumn: React.FC<TimeColumnProps> = ({ items, selectedValue, onSelect, itemHeight = 28, centered = false, maxItems = 8, isDisabled }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && !centered) {
            const selectedIndex = items.findIndex(item => item.value === selectedValue);
            if (selectedIndex >= 0) {
                const containerHeight = containerRef.current.clientHeight;
                const itemTop = selectedIndex * itemHeight;
                // Center the selected item in the visible area
                const centerOffset = Math.max(0, itemTop - (containerHeight / 2) + (itemHeight / 2));
                containerRef.current.scrollTo({ top: centerOffset, behavior: 'smooth' });
            }
        }
    }, [selectedValue, items, itemHeight, centered]);

    // For centered columns (like AM/PM with few items)
    if (centered) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-1 py-2">
                {items.map((item) => {
                    const itemDisabled = isDisabled?.(item.value) ?? false;
                    return (
                        <div
                            key={item.value}
                            onClick={() => !itemDisabled && onSelect(item.value)}
                            className={`
                                w-8 h-8 flex items-center justify-center transition-colors text-xs font-medium rounded-full
                                ${itemDisabled
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : selectedValue === item.value
                                        ? 'bg-[#3699FF] text-white cursor-pointer'
                                        : 'text-gray-600 hover:bg-gray-100 cursor-pointer'}
                            `}
                        >
                            {item.label}
                        </div>
                    );
                })}
            </div>
        );
    }

    // Max height based on maxItems
    const maxHeight = itemHeight * maxItems;

    return (
        <div
            ref={containerRef}
            className="overflow-y-auto datetime-thin-scrollbar py-1"
            style={{ maxHeight }}
        >
            {items.map((item) => {
                const itemDisabled = isDisabled?.(item.value) ?? false;
                return (
                    <div
                        key={item.value}
                        className="flex items-center justify-center"
                        style={{ height: itemHeight }}
                    >
                        <div
                            onClick={() => !itemDisabled && onSelect(item.value)}
                            className={`
                                w-7 h-7 flex items-center justify-center transition-colors text-xs font-medium rounded-full
                                ${itemDisabled
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : selectedValue === item.value
                                        ? 'bg-[#3699FF] text-white cursor-pointer'
                                        : 'text-gray-600 hover:bg-gray-100 cursor-pointer'}
                            `}
                        >
                            {item.label}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const DateTimeInput: React.FC<DateTimeInputProps> = ({
    name,
    control,
    validationRules,
    placeholder = "Select date & time",
    disabled = false,
    width = "w-full",
    minDateTime = "1996-01-01T00:00",
    maxDateTime,
    hint,
    allowClear = false,
}) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [pickerPosition, setPickerPosition] = useState<{ top: number; left: number } | null>(null);

    // Calendar state
    const [viewMonth, setViewMonth] = useState(new Date().getMonth());
    const [viewYear, setViewYear] = useState(new Date().getFullYear());
    const [showMonthDropdown, setShowMonthDropdown] = useState(false);

    // Time state
    const [selectedHour, setSelectedHour] = useState(6);
    const [selectedMinute, setSelectedMinute] = useState(0);
    const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');

    // Selected date
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    // Parse min/max dates
    const minDate = parseDateTime(minDateTime);
    const maxDate = parseDateTime(maxDateTime);

    // Year range
    const minYear = minDate?.getFullYear() || 1996;
    const maxYear = maxDate?.getFullYear() || new Date().getFullYear() + 10;

    // Check if a day is disabled (outside min/max range)
    const isDayDisabled = (day: number): boolean => {
        const date = new Date(viewYear, viewMonth, day);
        if (minDate) {
            const minDay = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
            if (date < minDay) return true;
        }
        if (maxDate) {
            const maxDay = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
            if (date > maxDay) return true;
        }
        return false;
    };

    // Check if can navigate to previous month
    const canGoPrevMonth = (): boolean => {
        if (!minDate) return true;
        const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
        const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
        const lastDayOfPrevMonth = getDaysInMonth(new Date(prevYear, prevMonth));
        const lastDateOfPrevMonth = new Date(prevYear, prevMonth, lastDayOfPrevMonth);
        const minDay = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
        return lastDateOfPrevMonth >= minDay;
    };

    // Check if can navigate to next month
    const canGoNextMonth = (): boolean => {
        if (!maxDate) return true;
        const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
        const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
        const firstDateOfNextMonth = new Date(nextYear, nextMonth, 1);
        const maxDay = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
        return firstDateOfNextMonth <= maxDay;
    };

    // Calculate number of weeks/rows in calendar
    const getCalendarRows = (): number => {
        const daysInMonth = getDaysInMonth(new Date(viewYear, viewMonth));
        const firstDayOfMonth = getDay(startOfMonth(new Date(viewYear, viewMonth)));
        const totalCells = firstDayOfMonth + daysInMonth;
        return Math.ceil(totalCells / 7);
    };

    // Get max items for time columns based on calendar rows
    const getTimeColumnMaxItems = (): number => {
        const rows = getCalendarRows();
        return rows >= 6 ? 9 : 8;
    };

    // Generate calendar days
    const generateCalendarDays = () => {
        const daysInMonth = getDaysInMonth(new Date(viewYear, viewMonth));
        const firstDayOfMonth = getDay(startOfMonth(new Date(viewYear, viewMonth)));

        const days: (number | null)[] = [];

        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    };

    // Generate hour options (1-12)
    const hourOptions = Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: String(i + 1).padStart(2, '0')
    }));

    // Generate minute options (0-59)
    const minuteOptions = Array.from({ length: 60 }, (_, i) => ({
        value: i,
        label: String(i).padStart(2, '0')
    }));

    // Period options
    const periodOptions = [
        { value: 'AM', label: 'AM' },
        { value: 'PM', label: 'PM' }
    ];

    // Convert 12h to 24h
    const to24Hour = (h: number, p: 'AM' | 'PM'): number => {
        if (p === 'AM') return h === 12 ? 0 : h;
        return h === 12 ? 12 : h + 12;
    };

    // Convert 24h to 12h
    const to12Hour = (h24: number): { hour: number; period: 'AM' | 'PM' } => {
        if (h24 === 0) return { hour: 12, period: 'AM' };
        if (h24 === 12) return { hour: 12, period: 'PM' };
        if (h24 > 12) return { hour: h24 - 12, period: 'PM' };
        return { hour: h24, period: 'AM' };
    };

    /**
     * minDateTime's time-of-day only bites on the boundary day itself — a later day is
     * unconstrained, and an earlier one is already blocked by isDayDisabled. Returns null
     * on any other day so the time columns stay fully open.
     *
     * Only the lower bound is enforced this way. maxDateTime is left at day granularity on
     * purpose: callers pass date-only bounds (a min of "2026-01-01" floors to 00:00 and
     * disables nothing, while a max would ceiling to 00:00 and disable almost every time
     * on the final day).
     */
    const minTimeOnSelectedDay = (): { hour24: number; minute: number } | null => {
        if (!minDate || selectedDay == null) return null;
        const isMinDay = viewYear === minDate.getFullYear()
            && viewMonth === minDate.getMonth()
            && selectedDay === minDate.getDate();
        if (!isMinDay) return null;
        return { hour24: minDate.getHours(), minute: minDate.getMinutes() };
    };

    const isPeriodDisabled = (period: number | string): boolean => {
        const floor = minTimeOnSelectedDay();
        if (!floor) return false;
        // AM is unreachable once the earliest allowed time is past noon
        return period === 'AM' && floor.hour24 >= 12;
    };

    const isHourDisabled = (hour: number | string): boolean => {
        const floor = minTimeOnSelectedDay();
        if (!floor) return false;
        return to24Hour(Number(hour), selectedPeriod) < floor.hour24;
    };

    /**
     * Picking the boundary day while an earlier time is selected would grey out every time
     * option and leave OK building an out-of-range value, so lift the time to the floor.
     */
    const selectDay = (day: number): void => {
        setSelectedDay(day);
        if (!minDate) return;
        const isMinDay = viewYear === minDate.getFullYear()
            && viewMonth === minDate.getMonth()
            && day === minDate.getDate();
        if (!isMinDay) return;
        const selectedMinutes = to24Hour(selectedHour, selectedPeriod) * 60 + selectedMinute;
        const floorMinutes = minDate.getHours() * 60 + minDate.getMinutes();
        if (selectedMinutes < floorMinutes) {
            const { hour, period } = to12Hour(minDate.getHours());
            setSelectedHour(hour);
            setSelectedPeriod(period);
            setSelectedMinute(minDate.getMinutes());
        }
    };

    const isMinuteDisabled = (minute: number | string): boolean => {
        const floor = minTimeOnSelectedDay();
        if (!floor) return false;
        // Minutes only narrow within the boundary hour; a later hour takes any minute
        if (to24Hour(selectedHour, selectedPeriod) !== floor.hour24) return false;
        return Number(minute) < floor.minute;
    };

    // Format display
    const getDisplayValue = (date: Date | null): string => {
        if (!date) return '';
        const { hour, period } = to12Hour(date.getHours());
        return `${format(date, 'dd MMM yyyy')}  ${String(hour).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} ${period}`;
    };

    // Update picker position with viewport boundary check
    useEffect(() => {
        if (isOpen && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const pickerWidth = 380; // Approximate picker width
            const pickerHeight = 300; // Approximate picker height
            const padding = 10;

            let top = rect.bottom + window.scrollY + 4;
            let left = rect.left + window.scrollX;

            // Check if picker would exceed right edge of viewport
            if (left + pickerWidth > window.innerWidth - padding) {
                left = Math.max(padding, window.innerWidth - pickerWidth - padding);
            }

            // Check if picker would exceed bottom edge of viewport
            if (rect.bottom + pickerHeight > window.innerHeight - padding) {
                // Position above the input if there's more space
                if (rect.top > pickerHeight + padding) {
                    top = rect.top + window.scrollY - pickerHeight - 4;
                } else {
                    // Keep it at bottom but adjust to fit
                    top = Math.max(padding + window.scrollY, window.innerHeight - pickerHeight - padding + window.scrollY);
                }
            }

            setPickerPosition({ top, left });
        }
    }, [isOpen]);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                wrapperRef.current && !wrapperRef.current.contains(e.target as Node) &&
                pickerRef.current && !pickerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
                setShowMonthDropdown(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handlePrevMonth = () => {
        if (!canGoPrevMonth()) return;
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(viewYear - 1);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (!canGoNextMonth()) return;
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(viewYear + 1);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    return (
        <Controller
            name={name}
            control={control}
            rules={validationRules}
            render={({ field, fieldState }) => {
                const currentDate = parseDateTime(field.value);

                // Sync state from field value
                useEffect(() => {
                    if (currentDate) {
                        const { hour, period } = to12Hour(currentDate.getHours());
                        setSelectedHour(hour);
                        setSelectedMinute(currentDate.getMinutes());
                        setSelectedPeriod(period);
                        setSelectedDay(currentDate.getDate());
                        setViewMonth(currentDate.getMonth());
                        setViewYear(currentDate.getFullYear());
                    } else {
                        // Cleared: drop the old selection too, or reopening the picker would
                        // still show the day that was just erased
                        const today = new Date();
                        setSelectedHour(6);
                        setSelectedMinute(0);
                        setSelectedPeriod('AM');
                        setSelectedDay(null);
                        setViewMonth(today.getMonth());
                        setViewYear(today.getFullYear());
                    }
                }, [field.value]);

                // Build date from selection
                const buildDate = (): Date => {
                    const date = new Date(viewYear, viewMonth, selectedDay || 1);
                    date.setHours(to24Hour(selectedHour, selectedPeriod));
                    date.setMinutes(selectedMinute);
                    date.setSeconds(0);
                    return date;
                };

                const handleOk = () => {
                    if (selectedDay) {
                        const next = buildDate();
                        // Belt and braces: the disabled options and selectDay's snap should
                        // already keep this in range. Clamp rather than no-op so OK never
                        // looks like it did nothing. Only the lower bound is clamped, for the
                        // reason given on minTimeOnSelectedDay.
                        field.onChange(formatDateTime(minDate && next < minDate ? minDate : next));
                    }
                    setIsOpen(false);
                };

                const handleCancel = () => {
                    if (currentDate) {
                        const { hour, period } = to12Hour(currentDate.getHours());
                        setSelectedHour(hour);
                        setSelectedMinute(currentDate.getMinutes());
                        setSelectedPeriod(period);
                        setSelectedDay(currentDate.getDate());
                        setViewMonth(currentDate.getMonth());
                        setViewYear(currentDate.getFullYear());
                    }
                    setIsOpen(false);
                };

                const calendarDays = generateCalendarDays();

                return (
                    <div ref={wrapperRef} className={`${width} relative`}>
                        <CustomInput
                            hasError={!!fieldState.error}
                            disabled={disabled}
                            placeholder={placeholder}
                            isFocused={isOpen}
                            displayValue={getDisplayValue(currentDate)}
                            onClick={() => !disabled && setIsOpen(true)}
                            onClear={allowClear && !disabled && !!field.value
                                ? () => {
                                    field.onChange('');
                                    setIsOpen(false);
                                }
                                : undefined}
                        />

                        {/* DateTime Picker Portal */}
                        {isOpen && pickerPosition && typeof document !== 'undefined' && createPortal(
                            <div
                                ref={pickerRef}
                                className="bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
                                style={{
                                    position: 'absolute',
                                    top: pickerPosition.top,
                                    left: pickerPosition.left,
                                    zIndex: 9999,
                                }}
                            >
                                <div className="flex">
                                    {/* Left: Calendar */}
                                    <div className="p-2">
                                        {/* Header with Month/Year */}
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                                                    className="flex items-center gap-1 text-gray-700 font-semibold text-sm hover:text-[#3699FF]"
                                                >
                                                    {months[viewMonth]} {viewYear}
                                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                    </svg>
                                                </button>

                                                {/* Month/Year Dropdown */}
                                                {showMonthDropdown && (
                                                    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-10 p-2 max-h-48 overflow-auto" style={{ width: '200px' }}>
                                                        {Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i).map(year => (
                                                            <div key={year}>
                                                                <div className="text-gray-400 text-[10px] px-1 py-0.5 font-medium">{year}</div>
                                                                <div className="grid grid-cols-4 gap-0.5">
                                                                    {months.map((month, idx) => {
                                                                        // Check if this month is within valid range
                                                                        const isMonthDisabled = (() => {
                                                                            const lastDayOfMonth = getDaysInMonth(new Date(year, idx));
                                                                            const firstOfMonth = new Date(year, idx, 1);
                                                                            const lastOfMonth = new Date(year, idx, lastDayOfMonth);
                                                                            if (minDate) {
                                                                                const minDay = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
                                                                                if (lastOfMonth < minDay) return true;
                                                                            }
                                                                            if (maxDate) {
                                                                                const maxDay = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
                                                                                if (firstOfMonth > maxDay) return true;
                                                                            }
                                                                            return false;
                                                                        })();

                                                                        return (
                                                                            <button
                                                                                key={`${year}-${idx}`}
                                                                                type="button"
                                                                                disabled={isMonthDisabled}
                                                                                onClick={() => {
                                                                                    if (!isMonthDisabled) {
                                                                                        setViewMonth(idx);
                                                                                        setViewYear(year);
                                                                                        setShowMonthDropdown(false);
                                                                                    }
                                                                                }}
                                                                                className={`px-1 py-0.5 text-[10px] rounded ${
                                                                                    isMonthDisabled
                                                                                        ? 'text-gray-300 cursor-not-allowed'
                                                                                        : viewMonth === idx && viewYear === year
                                                                                            ? 'bg-[#3699FF] text-white'
                                                                                            : 'text-gray-600 hover:bg-gray-100'
                                                                                }`}
                                                                            >
                                                                                {month.substring(0, 3)}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-0.5">
                                                <button
                                                    type="button"
                                                    onClick={handlePrevMonth}
                                                    disabled={!canGoPrevMonth()}
                                                    className={`p-0.5 rounded ${canGoPrevMonth() ? 'text-gray-500 hover:text-[#3699FF] hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'}`}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleNextMonth}
                                                    disabled={!canGoNextMonth()}
                                                    className={`p-0.5 rounded ${canGoNextMonth() ? 'text-gray-500 hover:text-[#3699FF] hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed'}`}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Day Names */}
                                        <div className="grid grid-cols-7 mb-1">
                                            {dayNames.map((day, i) => (
                                                <div key={i} className="text-center text-gray-400 text-[11px] font-medium py-1 w-8">
                                                    {day}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Calendar Days */}
                                        <div className="grid grid-cols-7 gap-0.5">
                                            {calendarDays.map((day, i) => {
                                                const isDisabled = day ? isDayDisabled(day) : false;
                                                return (
                                                    <div key={i} className="flex items-center justify-center w-8 h-8">
                                                        {day && (
                                                            <button
                                                                type="button"
                                                                onClick={() => !isDisabled && selectDay(day)}
                                                                disabled={isDisabled}
                                                                className={`w-7 h-7 rounded-full text-xs transition-colors ${
                                                                    isDisabled
                                                                        ? 'text-gray-300 cursor-not-allowed'
                                                                        : selectedDay === day
                                                                            ? 'bg-[#3699FF] text-white font-medium'
                                                                            : 'text-gray-700 hover:bg-gray-100'
                                                                }`}
                                                            >
                                                                {day}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Right: Time Picker */}
                                    <div className="border-l border-gray-200 flex items-center bg-gray-50 py-2">
                                        {/* Hours */}
                                        <div className="w-12">
                                            <TimeColumn
                                                items={hourOptions}
                                                selectedValue={selectedHour}
                                                onSelect={(v) => setSelectedHour(v as number)}
                                                isDisabled={isHourDisabled}
                                                maxItems={getTimeColumnMaxItems()}
                                            />
                                        </div>

                                        {/* Minutes */}
                                        <div className="w-12 border-l border-gray-200">
                                            <TimeColumn
                                                items={minuteOptions}
                                                selectedValue={selectedMinute}
                                                onSelect={(v) => setSelectedMinute(v as number)}
                                                isDisabled={isMinuteDisabled}
                                                maxItems={getTimeColumnMaxItems()}
                                            />
                                        </div>

                                        {/* AM/PM - vertically centered */}
                                        <div className="w-12 border-l border-gray-200">
                                            <TimeColumn
                                                items={periodOptions}
                                                selectedValue={selectedPeriod}
                                                onSelect={(v) => setSelectedPeriod(v as 'AM' | 'PM')}
                                                isDisabled={isPeriodDisabled}
                                                centered
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex justify-end gap-2 px-3 py-2.5 bg-gray-50 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="bg-[#E4E6EF] hover:bg-gray-300 text-[#3F4254] rounded h-8 px-3 py-1 text-xs font-medium shadow-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleOk}
                                        className="bg-[#3699FF] hover:bg-blue-600 text-white rounded h-8 px-3 py-1 text-xs font-medium shadow-sm transition-colors min-w-[60px]"
                                    >
                                        OK
                                    </button>
                                </div>
                            </div>,
                            document.body
                        )}

                        {/* Hint */}
                        {hint && (!fieldState.error || disabled) && (
                            <p className="text-xs text-gray-500 mt-1">{hint}</p>
                        )}

                        {/* Error */}
                        {fieldState.error && !disabled && (
                            <p className="text-xs text-[#F64E60] mt-1">{fieldState.error.message}</p>
                        )}
                    </div>
                );
            }}
        />
    );
};

export default DateTimeInput;
