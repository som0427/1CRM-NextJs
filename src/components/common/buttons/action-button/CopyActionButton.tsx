import React from "react";

/**
 * CopyActionButton Component
 *
 * An icon button for copying/duplicating items, typically used in AG Grid action cells.
 * Supports disabled state.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <CopyActionButton id={row.id} onCopy={handleCopy} />
 *
 * @example
 * // Disabled state
 * <CopyActionButton id={row.id} onCopy={handleCopy} disabled={!canCopy} />
 *
 * Props:
 * ------
 * @param {number} id - Row/item ID to pass to callback (required)
 * @param {(id: number) => void} [onCopy] - Copy callback with ID
 * @param {boolean} [disabled=false] - Disabled state
 * @param {string} [className] - Additional CSS classes
 *
 * Features:
 * ---------
 * - Circular button (40px)
 * - Copy icon from SVG
 * - Disabled state with reduced opacity
 * - Tooltip shows "Copy" or "Copy (disabled)"
 */
interface CopyActionButtonProps {
  id: number;
  onCopy?: (id: number) => void;
  disabled?: boolean;
  className?: string;
}

const CopyActionButton: React.FC<CopyActionButtonProps> = ({ id, onCopy, disabled = false, className }) => {
  return (
    <button
      title={disabled ? "Copy (disabled)" : "Copy"}
      onClick={() => !disabled && onCopy && onCopy(id)}
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className || ''}`}
    >
      <img 
        src={disabled ? "/svg/icons/general/copy.svg" : "/svg/icons/general/copy.svg"} 
        alt={disabled ? "Copy Disabled" : "Copy"} 
        className="h-6 w-6" 
      />
    </button>
  );
};

export default CopyActionButton;