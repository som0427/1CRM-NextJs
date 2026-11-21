import React, { ReactNode } from 'react';

/**
 * FormField Component
 *
 * A wrapper component for form fields that provides consistent layout with label,
 * input field, and optional instructions. Uses a 12-column grid system.
 *
 * @component
 *
 * @example
 * // Basic usage with TextInput
 * <FormField label="Field Name" required>
 *   <TextInput name="fieldName" control={control} />
 * </FormField>
 *
 * @example
 * // With hint/instructions (passed to input component)
 * <FormField label="Email" required>
 *   <TextInput name="email" control={control} hint="Enter a valid email address" />
 * </FormField>
 *
 * @example
 * // Custom column spans
 * <FormField label="Description" labelColSpan={3} inputColSpan={9}>
 *   <TextArea name="description" control={control} />
 * </FormField>
 *
 * @example
 * // Without fixed height (for multi-line inputs)
 * <FormField label="Options" fixedHeight={false}>
 *   <MultiSelect name="options" control={control} options={options} />
 * </FormField>
 *
 * @example
 * // Without label (input spans full width)
 * <FormField>
 *   <ToggleSwitchInput name="advancedSettings" control={control} />
 * </FormField>
 *
 * Props:
 * ------
 * @param {string} [label] - Label text for the field. If not provided, label is not rendered and input spans full width.
 * @param {boolean} [required=false] - Shows red asterisk if true
 * @param {ReactNode} children - The input field component(s)
 * @param {number | null} [labelColSpan=4] - Column span for label (out of 12). If null, label is not rendered.
 * @param {number | null} [inputColSpan=8] - Column span for input (out of 12). If null, uses default or 12 if no label.
 * @param {boolean} [fixedHeight=false] - When true, height is exactly 54px. When false (default), min-height is 54px but can expand.
 * @param {string} [className] - Additional CSS classes for the container
 * @param {string} [labelClassName] - Additional CSS classes for the label
 * @param {string} [inputClassName] - Additional CSS classes for the input container
 * @param {number} [labelPaddingTop] - Custom padding top for label (0-8), defaults to 1.5
 * @param {number | null} [gap=6] - Gap between label and input (null, 1, 2, 3, 6, 7, 8), defaults to 6
 */

interface FormFieldProps {
  label?: string;
  required?: boolean;
  children: ReactNode;
  labelColSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | null;
  inputColSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | null;
  fixedHeight?: boolean;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
  labelPaddingTop?: 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | null;
  gap?: 1 | 2 | 3 | 6 | 7 | 8 | null;
}

// Tailwind requires full class names at build time, so we use a mapping
const colSpanClasses: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  5: 'col-span-5',
  6: 'col-span-6',
  7: 'col-span-7',
  8: 'col-span-8',
  9: 'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12',
};

const paddingTopClasses: Record<number, string> = {
  0: 'pt-0',
  0.5: 'pt-0.5',
  1: 'pt-1',
  1.5: 'pt-1.5',
  2: 'pt-2',
  3: 'pt-3',
  4: 'pt-4',
  5: 'pt-5',
  6: 'pt-6',
  7: 'pt-7',
  8: 'pt-8',
};

const gapClasses: Record<number, string> = {
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  6: 'gap-6',
  7: 'gap-7',
  8: 'gap-8',
};

const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  children,
  labelColSpan = 4,
  inputColSpan = 8,
  fixedHeight = false,
  className = '',
  labelClassName = '',
  inputClassName = '',
  labelPaddingTop = 1.5,
  gap = 6,
}) => {
  const gapClass = gap !== null ? gapClasses[gap] : '';
  const hasLabel = label !== undefined && label !== null && label !== '';

  // Determine effective column spans (use defaults if null, or 12 if no label)
  const effectiveLabelColSpan = labelColSpan !== null ? labelColSpan : 4;
  const effectiveInputColSpan = !hasLabel ? 12 : (inputColSpan !== null ? inputColSpan : 8);

  // Get col span classes (empty string if null was explicitly passed and no label)
  const labelColClass = hasLabel && labelColSpan !== null ? colSpanClasses[effectiveLabelColSpan] : '';
  const inputColClass = inputColSpan !== null || !hasLabel ? colSpanClasses[effectiveInputColSpan] : '';

  return (
    <div className={`grid grid-cols-12 ${gapClass} items-start ${fixedHeight ? 'h-[54px]' : 'min-h-[54px]'} ${className}`}>
      {hasLabel && (
        <div className={`${labelColClass} ${labelPaddingTop !== null ? paddingTopClasses[labelPaddingTop] : ''} ${labelClassName}`}>
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-[#F64E60] ml-1">*</span>}
          </label>
        </div>
      )}
      <div className={`${inputColClass} ${inputClassName}`}>
        {children}
      </div>
    </div>
  );
};

FormField.displayName = 'FormField';

export default FormField;
