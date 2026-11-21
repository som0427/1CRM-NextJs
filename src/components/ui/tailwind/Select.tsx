import React, { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '../../../lib/utils';

export type SelectOption = {
  value: string | number;
  label: React.ReactNode;
  disabled?: boolean;
};

export interface SelectProps {
  options: SelectOption[];
  value?: string | number | (string | number)[] | null;
  defaultValue?: string | number | (string | number)[] | null;
  placeholder?: string;
  onChange?: (value: string | number | (string | number)[]) => void;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  multiple?: boolean;
}

/**
 * Select component - A Tailwind CSS replacement for Ant Design Select
 */
export const Select: React.FC<SelectProps> = ({
  options,
  value,
  defaultValue,
  placeholder = 'Select option',
  onChange,
  className,
  disabled = false,
  loading = false,
  error,
  label,
  size = 'medium',
  multiple = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | number | (string | number)[] | null>(
    value !== undefined ? value : defaultValue || (multiple ? [] : null)
  );
  const selectRef = useRef<HTMLDivElement>(null);

  // Update internal state when value prop changes
  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    if (multiple) {
      const current = new Set(Array.isArray(selectedValue) ? selectedValue : []);
      if (current.has(option.value)) {
        current.delete(option.value);
      } else {
        current.add(option.value);
      }
      const next = Array.from(current);
      setSelectedValue(next);
      onChange?.(next);
      // keep open for multiselect
    } else {
      setSelectedValue(option.value);
      setIsOpen(false);
      onChange?.(option.value);
    }
  };

  const selectedOption = !multiple && (options.find(option => option.value === selectedValue));
  const selectedLabels = useMemo(() => {
    if (!multiple) return [] as string[];
    const selSet = new Set(Array.isArray(selectedValue) ? selectedValue : []);
    return options.filter(o => selSet.has(o.value)).map(o => String(o.label));
  }, [multiple, selectedValue, options]);

  // Size classes (fixed heights for consistent alignment)
  const sizeClasses = {
    small: 'h-8 text-xs',
    medium: 'h-10 text-sm',
    large: 'h-12 text-base',
  } as const;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div 
        ref={selectRef}
        className={cn(
          "relative",
          className
        )}
      >
        <button
          type="button"
          className={cn(
            "relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 text-gray-900",
            sizeClasses[size],
            "text-left cursor-default focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary",
            disabled && "opacity-50 cursor-not-allowed",
            error && "border-red-500 focus:ring-red-500 focus:border-red-500",
            className
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className="flex items-center">
            <span className={cn(
              "block truncate",
              !selectedOption && "text-gray-700"
            )}>
              {multiple
                ? (selectedLabels.length === 0
                    ? placeholder
                    : selectedLabels.length <= 2
                      ? selectedLabels.join(', ')
                      : `${selectedLabels[0]}, ${selectedLabels[1]} +${selectedLabels.length - 2}`)
                : (selectedOption ? selectedOption.label : placeholder)}
            </span>
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            {loading ? (
              <svg className="h-4 w-4 text-gray-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg
                className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd" />
              </svg>
            )}
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-blue-300 overflow-auto focus:outline-none sm:text-sm">
            {options.length === 0 ? (
              <div className="text-gray-500 py-2 px-3">No options</div>
            ) : (
              options.map((option, index) => (
                <div
                  key={`${option.value}-${index}`}
                  className={cn(
                    "cursor-pointer select-none relative py-2 pl-3 pr-9",
                    (multiple
                      ? Array.isArray(selectedValue) && selectedValue.includes(option.value)
                      : selectedValue === option.value) ? "bg-blue-50 text-blue-700" : "text-gray-900",
                    option.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100",
                    index === 0 && "rounded-t-md",
                    index === options.length - 1 && "rounded-b-md"
                  )}
                  onClick={() => !option.disabled && handleSelect(option)}
                >
                  <span className={cn(
                    "block truncate",
                    (multiple
                      ? Array.isArray(selectedValue) && selectedValue.includes(option.value)
                      : selectedValue === option.value) ? "font-medium" : "font-normal"
                  )}>
                    {option.label}
                  </span>
                  
                  {(multiple
                    ? Array.isArray(selectedValue) && selectedValue.includes(option.value)
                    : selectedValue === option.value) && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-700">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default Select;
