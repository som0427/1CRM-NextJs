import React from "react";

/**
 * RemoveActionButton Component
 *
 * An icon button for removing items from a list, typically used in AG Grid action cells.
 * Supports disabled state with different icon.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <RemoveActionButton id={row.id} onRemove={handleRemove} />
 *
 * @example
 * // Disabled state
 * <RemoveActionButton id={row.id} onRemove={handleRemove} disabled={!canRemove} />
 *
 * Props:
 * ------
 * @param {number} id - Row/item ID to pass to callback (required)
 * @param {(id: number) => void} [onRemove] - Remove callback with ID
 * @param {boolean} [disabled=false] - Disabled state
 * @param {string} [className] - Additional CSS classes
 * @param {"original"} [variant="original"] - Icon variant (currently only original)
 *
 * Features:
 * ---------
 * - Circular button (40px)
 * - Minus icon from SVG
 * - Different icon for disabled state
 * - Opacity transition on hover
 * - Tooltip shows "Remove" or "Remove (disabled)"
 */
interface RemoveActionButtonProps {
  id: number;
  onRemove?: (id: number) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'original' ;
}

const RemoveActionButton: React.FC<RemoveActionButtonProps> = ({ id, onRemove, disabled = false, className, variant = 'original' }) => {
  const getIconSrc = () => {
    return disabled 
        ? "/svg/icons/general/Minus-Disabled.svg" 
        : "/svg/icons/general/Minus.svg";
  };

  return (
    <button
      title={disabled ? "Remove (disabled)" : "Remove"}
      onClick={() => !disabled && onRemove && onRemove(id)}
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ease-in-out${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className || ''}`}
    >
      <img src={getIconSrc()} alt={disabled ? "Remove Disabled" : "Remove"} className="h-6 w-6" />
    </button>
  );
};

export default RemoveActionButton;
