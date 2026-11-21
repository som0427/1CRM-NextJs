import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { Controller, Control } from 'react-hook-form';
import { createPortal } from 'react-dom';

/**
 * Select Component
 *
 * A single-select dropdown with React Hook Form integration, search functionality,
 * and smart positioning (auto-detects whether to open upward or downward).
 *
 * @component
 *
 * @example
 * // Basic usage
 * <Select
 *   name="country"
 *   control={control}
 *   options={[
 *     { value: 'us', label: 'United States' },
 *     { value: 'uk', label: 'United Kingdom' }
 *   ]}
 * />
 *
 * @example
 * // With validation and hint
 * <Select
 *   name="category"
 *   control={control}
 *   options={categoryOptions}
 *   validationRules={{ required: 'Category is required' }}
 *   hint="Select a category for your item"
 * />
 *
 * @example
 * // With onChange callback
 * <Select
 *   name="status"
 *   control={control}
 *   options={statusOptions}
 *   onChange={(value) => console.log('Selected:', value)}
 * />
 *
 * @example
 * // Loading state
 * <Select
 *   name="dynamicField"
 *   control={control}
 *   options={options}
 *   loading={isLoading}
 * />
 *
 * @example
 * // Disabled state (shows lock icon)
 * <Select name="lockedField" control={control} options={[]} disabled={true} />
 *
 * Props:
 * ------
 * @param {string} name - Form field name (required)
 * @param {Control<any>} control - React Hook Form control object (required)
 * @param {SelectOption[]} options - Array of {value, label} options (required)
 * @param {any} [validationRules] - React Hook Form validation rules
 * @param {string} [placeholder="Select option..."] - Placeholder text
 * @param {boolean} [disabled=false] - Disabled state (shows lock icon when true)
 * @param {string} [maxWidth="w-full"] - Container width class
 * @param {any} [hint] - Hint text displayed below dropdown (hidden when error exists)
 * @param {(value: string) => void} [onChange] - Callback when selection changes
 * @param {boolean} [loading=false] - Show loading spinner
 *
 * Features:
 * ---------
 * - React Hook Form integration via Controller
 * - Search/filter functionality in dropdown
 * - Portal-based dropdown (avoids z-index issues)
 * - Smart positioning (opens up or down based on available space)
 * - Loading spinner display
 * - Lock icon for disabled state
 * - Checkmark for selected option
 * - Error message display
 * - Hint text support
 * - Closes on outside click or scroll
 * - Animated open/close transitions
 */
interface SelectOption {
    value: any;
    label: string;
    disabled?: boolean;
}

interface SelectProps {
    name: string;
    control: Control<any>;
    validationRules?: any;
    options: SelectOption[];
    allOptions?: SelectOption[];
    lookupMap?: Map<string, SelectOption[]>;
    placeholder?: string;
    disabled?: boolean;
    maxWidth?: string;
    hint?: any;
    onChange?: (value: string) => void;
    loading?: boolean;
    autoOpen?: boolean;
}


const Select: React.FC<SelectProps> = memo(({
    name,
    control,
    validationRules,
    options = [],
    allOptions = [],
    lookupMap,
    placeholder = "Select option...",
    disabled = false,
    maxWidth = "w-full",
    hint,
    onChange,
    loading = false,
    autoOpen = false,
}) => {
    return (
        <Controller
            name={name}
            control={control}
            rules={validationRules}
            render={({ field, fieldState }) => {
                const [isOpen, setIsOpen] = useState(autoOpen);
                const [isClosing, setIsClosing] = useState(false);
                const [searchTerm, setSearchTerm] = useState('');
                const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
                const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down');
                const [maxDropdownHeight, setMaxDropdownHeight] = useState(240); // default max-h-60 = 240px
                const inputRef = useRef<HTMLDivElement>(null);
                const dropdownRef = useRef<HTMLDivElement>(null);
                const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
                
                // Normalize field value to string for comparison with option values
                const fieldValue = field.value != null ? String(field.value) : '';
                const hasError = !!fieldState.error && !disabled;
                const errorMessage = fieldState.error?.message;
                const normalizeLabel = (label: string) => label ? label.toString().toLowerCase().trim() : '';

                const fullOptionList = useMemo(() => {
                    if (allOptions && allOptions.length) return allOptions;
                    if (lookupMap) {
                        const aggregated: SelectOption[] = [];
                        lookupMap.forEach(opts => aggregated.push(...opts));
                        return aggregated;
                    }
                    return options;
                }, [allOptions, lookupMap, options]);

                const optionLookupMap = useMemo(() => {
                    if (lookupMap) return lookupMap;
                    const map = new Map<string, SelectOption[]>();
                    fullOptionList.forEach(opt => {
                        const key = normalizeLabel(opt.label);
                        if (!map.has(key)) {
                            map.set(key, []);
                        }
                        map.get(key)!.push(opt);
                    });
                    return map;
                }, [lookupMap, fullOptionList]);

                const normalizedSearchTerm = searchTerm.trim().toLowerCase();

                const filteredOptions = useMemo(() => {
                    if (!normalizedSearchTerm) {
                        return options;
                    }

                    const matches: SelectOption[] = [];
                    const seen = new Set<string>();

                    optionLookupMap.forEach((opts, key) => {
                        if (key && key.includes(normalizedSearchTerm)) {
                            opts.forEach(opt => {
                                const valKey = String(opt.value);
                                if (!seen.has(valKey)) {
                                    seen.add(valKey);
                                    matches.push(opt);
                                }
                            });
                        }
                    });

                    if (matches.length === 0) {
                        return fullOptionList.filter(opt => normalizeLabel(opt.label).includes(normalizedSearchTerm));
                    }

                    return matches;
                }, [normalizedSearchTerm, options, optionLookupMap, fullOptionList]);

                const selectedOption = useMemo(() => {
                    const visibleMatch = options.find(opt => String(opt.value) === fieldValue);
                    if (visibleMatch) return visibleMatch;
                    return fullOptionList.find(opt => String(opt.value) === fieldValue);
                }, [options, fullOptionList, fieldValue]);

                // Close dropdown with animation
                const closeDropdown = useCallback(() => {
                    setIsClosing(true);
                    closeTimeoutRef.current = setTimeout(() => {
                        setIsOpen(false);
                        setIsClosing(false);
                        setSearchTerm('');
                    }, 200);
                }, []);

                // Update dropdown position and calculate available space
                useEffect(() => {
                    if (isOpen && inputRef.current) {
                        const rect = inputRef.current.getBoundingClientRect();
                        const viewportHeight = window.innerHeight;
                        const spaceBelow = viewportHeight - rect.bottom - 10; // 10px margin from viewport edge
                        const spaceAbove = rect.top - 10; // 10px margin from viewport edge
                        const preferredMaxHeight = 240; // max-h-60 = 240px

                        // Determine if dropdown should open upward or downward
                        if (spaceBelow < preferredMaxHeight && spaceAbove > spaceBelow) {
                            // Open upward - more space above
                            setOpenDirection('up');
                            setMaxDropdownHeight(Math.min(preferredMaxHeight, spaceAbove));
                        } else {
                            // Open downward - default or more space below
                            setOpenDirection('down');
                            setMaxDropdownHeight(Math.min(preferredMaxHeight, spaceBelow));
                        }

                        setDropdownRect(rect);
                    }
                }, [isOpen]);

                // Cleanup timeout on unmount
                useEffect(() => {
                    return () => {
                        if (closeTimeoutRef.current) {
                            clearTimeout(closeTimeoutRef.current);
                        }
                    };
                }, []);

                // Close dropdown on scroll (but not when scrolling inside the dropdown)
                useEffect(() => {
                    const handleScroll = (event: Event) => {
                        // Check if the scroll event is from within the dropdown
                        if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
                            // Scrolling inside dropdown - don't close
                            return;
                        }
                        
                        // Scrolling outside dropdown - close it
                        if (isOpen && !isClosing) {
                            closeDropdown();
                        }
                    };

                    if (isOpen) {
                        window.addEventListener('scroll', handleScroll, true);
                        return () => {
                            window.removeEventListener('scroll', handleScroll, true);
                        };
                    }
                }, [isOpen, isClosing, closeDropdown]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                inputRef.current && !inputRef.current.contains(event.target as Node)) {
                if (isOpen && !isClosing) {
                    closeDropdown();
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, isClosing, closeDropdown]);

    const handleSelectOption = useCallback((optionValue: string) => {
        // Preserve the original type when updating RHF value
        let nextValue: any = optionValue;
        if (field.value !== undefined && field.value !== null) {
            if (typeof field.value === 'number') {
                const num = Number(optionValue);
                nextValue = isNaN(num) ? optionValue : num;
            }
        }
        field.onChange(nextValue);
        closeDropdown();
        // Call the optional onChange callback
        if (onChange) {
            onChange(optionValue);
        }
    }, [field, onChange, closeDropdown]);

    return (
        <div className={`relative ${maxWidth}`}>
            {/* Input Field */}
            <div
                ref={inputRef}
                className={`relative border-0 border-b-2 transition-colors ${
                    disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                } ${
                    hasError ? 'border-red-500' : disabled ? 'border-gray-200' : 'border-gray-300 focus-within:border-blue-600'
                }`}
                onClick={() => {
                    if (disabled) return;
                    if (isOpen && !isClosing) {
                        closeDropdown();
                    } else if (!isOpen && !isClosing) {
                        setIsOpen(true);
                    }
                }}
            >
                <div className="flex items-center pt-1.5 pb-1.5 pr-8 text-sm bg-transparent focus:outline-none w-full min-w-0">
                    {selectedOption ? (
                        <span className={`truncate ${disabled ? "text-gray-400" : "text-gray-700"}`}>{selectedOption.label}</span>
                    ) : (
                        <span className="truncate" style={{ color: disabled ? '#9ca3af' : '#787878' }}>{placeholder}</span>
                    )}
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                    {/* Loading Spinner */}
                    {loading && (
                        <svg
                            className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                    )}
                    {/* Lock Icon when disabled, Dropdown Arrow otherwise */}
                    {disabled ? (
                        <svg width="14" height="18" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 0C9.415 0 11.375 1.92042 11.375 4.28613V6H12.25C13.2124 6 13.9998 6.7712 14 7.71387V16.2861C13.9998 17.2288 13.2124 18 12.25 18H1.75C0.787642 18 0.000232912 17.2288 0 16.2861V7.71387C0.000233044 6.7712 0.787642 6 1.75 6H2.625V4.28613C2.625 1.92042 4.585 0 7 0ZM2.625 7.71484C2.14386 7.71484 1.75019 8.10001 1.75 8.57129V15.4287C1.75 15.9001 2.14375 16.2861 2.625 16.2861H11.375C11.8562 16.2861 12.25 15.9001 12.25 15.4287V8.57129C12.2498 8.10001 11.8561 7.71484 11.375 7.71484H2.625ZM6.75 9.5C7.71236 9.5 8.49977 10.2712 8.5 11.2139C8.5 12.1567 7.7125 12.9287 6.75 12.9287C5.7875 12.9287 5 12.1567 5 11.2139C5.00023 10.2712 5.78764 9.5 6.75 9.5ZM7 1.71387C5.5475 1.71387 4.375 2.86328 4.375 4.28613V6H9.625V4.28613C9.625 2.86328 8.4525 1.71387 7 1.71387Z" fill="#3F4254" fillOpacity="0.6"/>
                        </svg>
                    ) : (
                        <svg
                            className={`w-8 h-8 -mr-[10px] transition-transform duration-200 ${
                                isOpen ? 'rotate-180' : 'rotate-0'
                            }`}
                            fill="#4F4F4F"
                            viewBox="0 0 24 24"
                        >
                            <path d="M7 10l5 5 5-5H7z" />
                        </svg>
                    )}
                </div>
            </div>

            {/* Dropdown Portal */}
            {(isOpen || isClosing) && dropdownRect && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dropdownRef}
                    className={`bg-white border border-gray-200 rounded-md shadow-lg overflow-auto ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
                    style={{
                        position: 'fixed',
                        ...(openDirection === 'down'
                            ? { top: `${dropdownRect.bottom + 2}px` }
                            : { bottom: `${window.innerHeight - dropdownRect.top + 2}px` }
                        ),
                        left: `${dropdownRect.left}px`,
                        width: `${dropdownRect.width}px`,
                        maxHeight: `${maxDropdownHeight}px`,
                        zIndex: 9999,
                        isolation: 'isolate'
                    }}>
                    {/* Search Input */}
                    <div className="px-3 py-2 text-sm hover:bg-gray-50 flex items-center border-b border-gray-100">
                        <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search option..."
                            className="w-full bg-transparent focus:outline-none text-gray-700"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    
                    {/* Options List */}
                    {filteredOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No options found</div>
                    ) : (
                        filteredOptions.map((option) => {
                            const optionValueStr = String(option.value);
                            // Only mark as selected if fieldValue is not empty and matches the option
                            const isSelected = fieldValue !== '' && fieldValue === optionValueStr;
                            return (
                                <div
                                    key={optionValueStr}
                                    onClick={() => !option.disabled && handleSelectOption(optionValueStr)}
                                    className={`px-3 py-2 text-sm flex items-center justify-between ${
                                        option.disabled
                                            ? 'text-gray-400 cursor-not-allowed bg-gray-100'
                                            : isSelected
                                                ? 'bg-blue-50 text-blue-700 cursor-pointer hover:bg-gray-50'
                                                : 'text-gray-700 cursor-pointer hover:bg-gray-50'
                                    }`}
                                >
                                    <span>{option.label}</span>
                                    {isSelected && (
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>,
                document.body
            )}

            {/* Hint Text */}
            {hint && !hasError && (
                <div className="text-xs text-gray-500 mt-1">
                    {hint}
                </div>
            )}

            {/* Error Message - absolute positioned to not push content */}
            {hasError && errorMessage && (
                <div className="absolute text-xs text-red-500 mt-0.5 left-0 whitespace-nowrap">
                    {errorMessage}
                </div>
            )}
                </div>
                );
            }}
        />
    );
});

Select.displayName = 'Select';

export default Select;
