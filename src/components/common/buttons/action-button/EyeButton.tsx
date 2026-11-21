import React from "react";

/**
 * EyeButton Component
 *
 * A compact icon button for viewing item details, typically used in AG Grid action cells.
 * Features an eye icon on a blue background. Supports disabled state.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <EyeButton id={row.id} onView={handleView} />
 *
 * @example
 * // Disabled state
 * <EyeButton id={row.id} onView={handleView} disabled={!canView} />
 *
 * Props:
 * ------
 * @param {number} id - Row/item ID to pass to callback (required)
 * @param {(id: number) => void} [onView] - View callback with ID
 * @param {boolean} [disabled=false] - Disabled state
 * @param {string} [className] - Additional CSS classes
 *
 * Features:
 * ---------
 * - Compact square button (24px)
 * - Blue background with white eye icon
 * - Hover state with darker blue
 * - Disabled state with reduced opacity
 * - Tooltip shows "View" or "View (disabled)"
 */
interface EyeButtonProps {
  id: number;
  onView?: (id: number) => void;
  disabled?: boolean;
  className?: string;
}

const EyeButton: React.FC<EyeButtonProps> = ({ id, onView, disabled = false, className }) => (
  <button
    title={disabled ? "View (disabled)" : "View"}
    onClick={() => !disabled && onView && onView(id)}
    type="button"
    disabled={disabled}
    className={`inline-flex items-center justify-center w-6 h-6 rounded-sm bg-[#3699FF] transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className || ''}`}
  >
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
      <path d="M3.75897 12.1021C4.44241 8.82689 7.29425 6.5 10.4999 6.5C13.7055 6.5 16.5573 8.82688 17.2408 12.1021C17.2972 12.3725 17.5621 12.5459 17.8324 12.4895C18.1027 12.433 18.2761 12.1682 18.2197 11.8979C17.4424 8.17312 14.1933 5.5 10.4999 5.5C6.80648 5.5 3.5573 8.17311 2.78005 11.8979C2.72364 12.1682 2.89705 12.433 3.16737 12.4895C3.43769 12.5459 3.70256 12.3725 3.75897 12.1021ZM10.4999 8.5C8.56688 8.5 6.99988 10.067 6.99988 12C6.99988 13.933 8.56688 15.5 10.4999 15.5C12.4329 15.5 13.9999 13.933 13.9999 12C13.9999 10.067 12.4329 8.5 10.4999 8.5ZM7.99988 12C7.99988 10.6193 9.11917 9.5 10.4999 9.5C11.8806 9.5 12.9999 10.6193 12.9999 12C12.9999 13.3807 11.8806 14.5 10.4999 14.5C9.11917 14.5 7.99988 13.3807 7.99988 12Z" fill="white"/>
    </svg>
  </button>
);

export default EyeButton;
