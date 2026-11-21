import React, { useRef, useEffect } from 'react';

/**
 * CheckBox Component (Standalone)
 *
 * A standalone checkbox component WITHOUT React Hook Form integration.
 * Supports indeterminate state for "select all" scenarios.
 * Use CheckboxInput for form-integrated checkboxes.
 *
 * @component
 *
 * @example
 * // Basic controlled usage
 * <CheckBox
 *   checked={isChecked}
 *   onChange={(checked) => setIsChecked(checked)}
 * />
 *
 * @example
 * // With label
 * <CheckBox
 *   label="Enable feature"
 *   checked={enabled}
 *   onChange={setEnabled}
 * />
 *
 * @example
 * // With indeterminate state (for "select all" checkboxes)
 * <CheckBox
 *   label="Select All"
 *   indeterminate={someSelected && !allSelected}
 *   checked={allSelected}
 *   onChange={handleSelectAll}
 * />
 *
 * @example
 * // Using checkState prop (alternative to checked/indeterminate)
 * <CheckBox
 *   label="Status"
 *   checkState={1}  // 1=checked, -1=indeterminate, 0=unchecked
 *   onChange={handleChange}
 * />
 *
 * @example
 * // Disabled state
 * <CheckBox label="Locked" checked={true} disabled={true} />
 *
 * Props:
 * ------
 * @param {string} [name] - Input name attribute
 * @param {string} [label="Yes"] - Checkbox label text
 * @param {boolean} [disabled=false] - Disabled state
 * @param {string} [className=""] - Additional CSS classes for container
 * @param {(checked: boolean) => void} [onChange] - Callback when checked state changes
 * @param {boolean} [checked=false] - Checked state
 * @param {boolean} [indeterminate=false] - Indeterminate state (shows minus icon)
 * @param {number} [checkState] - Alternative state control: 1=checked, -1=indeterminate, other=unchecked
 *
 * Features:
 * ---------
 * - Standalone (no React Hook Form dependency)
 * - Indeterminate state support (minus icon)
 * - checkState prop for simplified tri-state control
 * - Custom styled checkbox (blue when checked/indeterminate)
 * - Accessible aria-checked attribute
 * - Click on label toggles checkbox
 */
interface CheckBoxProps {
  name?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  onChange?: (checked: boolean) => void;
  checked?: boolean;
  indeterminate?: boolean;
  checkState?: number; // 1 = checked, -1 = indeterminate, anything else = unchecked
}

const CheckBox: React.FC<CheckBoxProps> = ({
  name,
  label = 'Yes',
  disabled = false,
  className = '',
  onChange,
  checked = false,
  indeterminate = false,
  checkState
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Derive checked and indeterminate from checkState if provided
  const isChecked = checkState !== undefined ? checkState === 1 : checked;
  const isIndeterminate = checkState !== undefined ? checkState === -1 : indeterminate;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  return (
    <div className={`flex items-center ml-1 ${className}`}>
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          ref={inputRef}
          name={name}
          checked={isChecked}
          onChange={e => {
            const next = e.target.checked;
            if (onChange) onChange(next);
          }}
          className="hidden"
          disabled={disabled}
          aria-checked={isIndeterminate ? 'mixed' : isChecked}
        />
        <div
          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
            disabled
              ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
              : isChecked || isIndeterminate
                ? 'bg-blue-500 border-blue-500'
                : 'border-gray-400 hover:border-blue-400'
          }`}
        >
          {isIndeterminate ? (
            <svg
              className={`w-4 h-4 ${disabled ? 'text-gray-400' : 'text-white'}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 16 16"
            >
              <path d="M4 8h8" />
            </svg>
          ) : (
            isChecked && (
              <svg
                className={`w-5 h-5 ${disabled ? 'text-gray-400' : 'text-white'}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 16 16"
              >
                <path d="M3 8l3 3L13 3" />
              </svg>
            )
          )}
        </div>
      </label>
      <span className={`ml-3 text-sm cursor-default ${disabled ? 'text-gray-400' : 'text-gray-700'}`}>
        {label}
      </span>
    </div>
  );
};

CheckBox.displayName = 'CheckBox';

export default CheckBox;
