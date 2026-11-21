import React from "react";

/**
 * EditActionButton Component
 *
 * An icon button for editing items, typically used in AG Grid action cells.
 * Supports multiple icon variants and disabled state.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <EditActionButton id={row.id} onEdit={handleEdit} />
 *
 * @example
 * // With new variant
 * <EditActionButton id={row.id} onEdit={handleEdit} variant="new" />
 *
 * @example
 * // Disabled state
 * <EditActionButton id={row.id} onEdit={handleEdit} disabled={!canEdit} />
 *
 * Props:
 * ------
 * @param {number} id - Row/item ID to pass to callback (required)
 * @param {(id: number) => void} [onEdit] - Edit callback with ID
 * @param {boolean} [disabled=false] - Disabled state
 * @param {string} [className] - Additional CSS classes
 * @param {"original" | "new"} [variant="original"] - Icon variant
 *
 * Features:
 * ---------
 * - Circular button (40px)
 * - SVG edit icon
 * - Different icons for disabled state
 * - Two icon variants available
 * - Tooltip shows "Edit" or "Edit (disabled)"
 */
interface EditActionButtonProps {
  id: number;
  onEdit?: (id: number) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'original' | 'new';
}

const EditActionButton: React.FC<EditActionButtonProps> = ({ id, onEdit, disabled = false, className, variant = 'original' }) => {
  const getIconSrc = () => {
    if (variant === 'original') {
      return disabled 
        ? "/svg/icons/general/Edit-3-disabled.svg" 
        : "/svg/icons/general/Edit-3.svg";
    }
    return disabled 
      ? "/svg/icons/general/edit-disable.svg" 
      : "/svg/icons/general/edit-new.svg";
  };

  return (
    <button
      title={disabled ? "Edit (disabled)" : "Edit"}
      onClick={() => !disabled && onEdit && onEdit(id)}
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className || ''}`}
    >
      <img src={getIconSrc()} alt={disabled ? "Edit Disabled" : "Edit"} className="h-6 w-6" />
    </button>
  );
};

export default EditActionButton;
