import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Controller, Control } from 'react-hook-form';
import { createPortal } from 'react-dom';

/**
 * MultiSelect Component
 *
 * A multi-select dropdown with React Hook Form integration, search functionality,
 * tag display, and Select All capability.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <MultiSelect
 *   name="tags"
 *   control={control}
 *   options={[
 *     { value: 'react', label: 'React' },
 *     { value: 'vue', label: 'Vue' },
 *     { value: 'angular', label: 'Angular' }
 *   ]}
 * />
 *
 * @example
 * // With validation
 * <MultiSelect
 *   name="categories"
 *   control={control}
 *   options={categoryOptions}
 *   validationRules={{ required: 'Select at least one category' }}
 * />
 *
 * @example
 * // Without Select All option
 * <MultiSelect
 *   name="skills"
 *   control={control}
 *   options={skillOptions}
 *   showSelectAll={false}
 * />
 *
 * @example
 * // With exclusive "All" option (selecting "All" deselects others)
 * <MultiSelect
 *   name="regions"
 *   control={control}
 *   options={[
 *     { value: '', label: 'All Regions' },
 *     { value: 'north', label: 'North' },
 *     { value: 'south', label: 'South' }
 *   ]}
 *   exclusiveAllOption={true}
 * />
 *
 * Props:
 * ------
 * @param {string} name - Form field name (required)
 * @param {Control<any>} control - React Hook Form control object (required)
 * @param {MultiSelectOption[]} options - Array of {value, label} options (required)
 * @param {any} [validationRules] - React Hook Form validation rules
 * @param {string} [placeholder="Select options..."] - Placeholder text
 * @param {boolean} [disabled=false] - Disabled state (shows lock icon when true)
 * @param {string} [maxWidth="w-full"] - Container width class
 * @param {string} [hint] - Hint text displayed below dropdown
 * @param {boolean} [showSelectAll=true] - Show "Select All" / "Deselect All" option
 * @param {boolean} [exclusiveAllOption=false] - When true, "All" option (value='') is mutually exclusive
 *
 * Features:
 * ---------
 * - React Hook Form integration via Controller
 * - Multiple selection with tag display
 * - Search/filter functionality
 * - Select All / Deselect All option
 * - Exclusive "All" option mode
 * - Removable tags inside dropdown
 * - Portal-based dropdown
 * - Smart positioning (opens up or down)
 * - Lock icon for disabled state
 * - Checkmarks for selected options
 * - Error message display
 * - Closes on outside click or scroll
 */
interface MultiSelectOption {
    value: string;
    label: string;
}

interface MultiSelectProps {
    name: string;
    control: Control<any>;
    validationRules?: any;
    options: MultiSelectOption[];
    placeholder?: string;
    disabled?: boolean;
    maxWidth?: string;
    hint?: string;
    showSelectAll?: boolean;
    exclusiveAllOption?: boolean;
    onChange?: (values: string[]) => void;
}

const MultiSelect: React.FC<MultiSelectProps> = memo(({
    name,
    control,
    validationRules,
    options,
    placeholder = "Select options...",
    disabled = false,
    maxWidth = "w-full",
    hint,
    showSelectAll = true,
    exclusiveAllOption = false,
    onChange
}) => {
    return (
        <Controller
            name={name}
            control={control}
            rules={validationRules}
            render={({ field, fieldState }) => {
                const [isOpen, setIsOpen] = useState(false);
                const [isClosing, setIsClosing] = useState(false);
                const [searchTerm, setSearchTerm] = useState('');
                const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
                const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down');
                const [maxDropdownHeight, setMaxDropdownHeight] = useState(240); // default max-h-60 = 240px
                const inputRef = useRef<HTMLDivElement>(null);
                const dropdownRef = useRef<HTMLDivElement>(null);
                const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
                
                const singleValueAsArray = field.value ? [field.value] : [];
                const fieldValue = Array.isArray(field.value) ? field.value : singleValueAsArray;
                const hasError = !!fieldState.error && !disabled;
                const errorMessage = fieldState.error?.message;

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

                const filteredOptions = options.filter(option =>
                    option?.label?.toLowerCase().includes(searchTerm.toLowerCase())
                );

                const handleToggleOption = useCallback((optionValue: string) => {
                    let newValue: string[];
                    if (exclusiveAllOption) {
                        // If clicking on "All" (empty string)
                        if (optionValue === '') {
                            // Toggle "All" - if selected, deselect it; if not, select only it
                            newValue = fieldValue?.includes('') ? [] : [''];
                        } else {
                            // If clicking on any other option
                            // Remove "All" if it's selected, then toggle the clicked option
                            const withoutAll = fieldValue?.filter((v: string) => v !== '') || [];
                            newValue = withoutAll.includes(optionValue)
                                ? withoutAll.filter((v: string) => v !== optionValue)
                                : [...withoutAll, optionValue];
                        }
                    } else {
                        // Default behavior
                        newValue = fieldValue?.includes(optionValue)
                            ? fieldValue.filter((v: string) => v !== optionValue)
                            : [...fieldValue, optionValue];
                    }
                    field.onChange(newValue);
                    onChange?.(newValue);
                }, [fieldValue, field, exclusiveAllOption, onChange]);

                const handleRemoveTag = useCallback((optionValue: string) => {
                    const newValue = fieldValue.filter((v: string) => v !== optionValue);
                    field.onChange(newValue);
                    onChange?.(newValue);
                }, [fieldValue, field, onChange]);

                const handleSelectAll = useCallback(() => {
                    let newValue: string[];
                    if (fieldValue.length === options.length) {
                        // If all are selected, deselect all
                        newValue = [];
                    } else {
                        // Select all options
                        newValue = options.map(opt => opt.value);
                    }
                    field.onChange(newValue);
                    onChange?.(newValue);
                }, [fieldValue.length, options, field, onChange]);

                const getSelectedLabels = () => {
                    return fieldValue.map((v: string) => options.find(opt => opt.value === v)?.label || v);
                };

                const getDisplayText = () => {
                    const labels = getSelectedLabels();
                    const maxDisplay = 2; // Show only 2 items
                    if (labels.length <= maxDisplay) {
                        return { text: labels.join(', '), hasMore: false, moreText: '' };
                    }
                    const displayedLabels = labels.slice(0, maxDisplay).join(', ');
                    const remainingCount = labels.length - maxDisplay;
                    return { text: displayedLabels, hasMore: true, moreText: `+${remainingCount} more` };
                };

                const isAllSelected = fieldValue.length === options.length;

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
                    <div className="flex items-center pt-1.5 pb-1.5 pr-8 text-sm bg-transparent focus:outline-none w-full">
                        {fieldValue.length === 0 ? (
                            <span style={{ color: disabled ? '#9ca3af' : '#787878' }}>{placeholder}</span>
                        ) : (
                            <span className={`truncate block w-full ${disabled ? "text-gray-400" : "text-gray-700"}`}>
                                {getDisplayText().text}
                                {getDisplayText().hasMore && <span className="font-semibold"> {getDisplayText().moreText}</span>}
                            </span>
                        )}
                    </div>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2">
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
                        {/* Search Input as First Option */}
                        <div className="px-3 py-2 text-sm hover:bg-gray-50 flex items-center">
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

                        {/* Selected Tags Inside Dropdown */}
                        {fieldValue.length > 0 && (
                            <div className="px-3 py-2 border-b border-gray-100">
                                <div
                                    className="flex gap-2 overflow-x-auto hide-scrollbar"
                                    style={{
                                        scrollbarWidth: 'none',
                                        msOverflowStyle: 'none'
                                    }}
                                >
                                    {getSelectedLabels().map((label, index) => (
                                        <span
                                            key={fieldValue[index]}
                                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap flex-shrink-0"
                                        >
                                            {label}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTag(fieldValue[index])}
                                                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200 focus:outline-none"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Select All Option */}
                        {showSelectAll && (
                            <div
                                onClick={handleSelectAll}
                                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 ${isAllSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                    }`}
                            >
                                <span className="font-medium">
                                    {isAllSelected ? 'Deselect All' : 'Select All'}
                                </span>
                                {isAllSelected && (
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        )}

                        {/* Options List */}
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">No options found</div>
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    onClick={() => handleToggleOption(option.value)}
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 flex items-center justify-between ${fieldValue.includes(option.value) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                        }`}
                                >
                                    <span>{option.label}</span>
                                    {fieldValue.includes(option.value) && (
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            ))
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

MultiSelect.displayName = 'MultiSelect';

export default MultiSelect;
