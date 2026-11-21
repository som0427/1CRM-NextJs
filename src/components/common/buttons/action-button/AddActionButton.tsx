import React from "react";

/**
 * AddActionButton Component
 *
 * An icon button for adding new items, typically used in AG Grid action cells or inline forms.
 * Supports disabled state with different icon.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <AddActionButton onAdd={handleAdd} />
 *
 * @example
 * // Disabled state
 * <AddActionButton onAdd={handleAdd} disabled={!canAdd} />
 *
 * Props:
 * ------
 * @param {() => void} [onAdd] - Add callback (no ID passed)
 * @param {boolean} [disabled=false] - Disabled state
 * @param {string} [className] - Additional CSS classes
 * @param {"original"} [variant="original"] - Icon variant (currently only original)
 *
 * Features:
 * ---------
 * - Circular button (40px)
 * - Plus icon from SVG
 * - Different icon for disabled state
 * - Opacity transition on hover
 * - Tooltip shows "Add" or "Add (disabled)"
 */
interface AddActionButtonProps {
  onAdd?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: 'original' ;
}

const AddActionButton: React.FC<AddActionButtonProps> = ({ onAdd, disabled = false, className, variant = 'original' }) => {
  const getIconSrc = () => {
    return disabled 
      ? "/svg/icons/general/plus-disabled.svg" 
      : "/svg/icons/general/plus.svg";
  };

  return (
    <button
      title={disabled ? "Add (disabled)" : "Add"}
      onClick={() => !disabled && onAdd && onAdd()}
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ease-in-out ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className || ''}`}
    >
      <img src={getIconSrc()} alt={disabled ? "Add Disabled" : "Add"} className="h-6 w-6" />
    </button>
  );
};

export default AddActionButton;
