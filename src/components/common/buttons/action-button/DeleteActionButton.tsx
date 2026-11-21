import React from "react";

/**
 * DeleteActionButton Component
 *
 * An icon button for deleting items, typically used in AG Grid action cells.
 * Supports loading and disabled states.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <DeleteActionButton id={row.id} onClick={handleDelete} />
 *
 * @example
 * // With loading state
 * <DeleteActionButton id={row.id} onClick={handleDelete} loading={isDeleting} />
 *
 * @example
 * // Disabled with custom title
 * <DeleteActionButton
 *   id={row.id}
 *   onClick={handleDelete}
 *   disabled={!canDelete}
 *   title="Remove item"
 * />
 *
 * Props:
 * ------
 * @param {number} id - Row/item ID to pass to callback (required)
 * @param {(id: number) => void} [onClick] - Delete callback with ID
 * @param {string} [title="Delete"] - Tooltip text
 * @param {string} [className] - Additional CSS classes
 * @param {boolean} [loading] - Show loading spinner
 * @param {boolean} [disabled] - Disabled state
 *
 * Features:
 * ---------
 * - Square button (40px)
 * - Delete icon from SVG
 * - Loading spinner animation
 * - Disabled state with reduced opacity
 * - Custom tooltip support
 */
interface DeleteActionButtonProps {
  id: number;
  onClick?: (id: number) => void;
  title?: string;
  className?: string;
  loading?: boolean;
  disabled?: boolean;
}

const DeleteActionButton: React.FC<DeleteActionButtonProps> = ({ id, onClick, title, className, loading, disabled }) => (
  <button
    title={title || "Delete"}
    onClick={() => !loading && !disabled && onClick && onClick(id)}
    type="button"
    disabled={disabled || loading}
    className={`flex justify-center items-center w-10 h-10 ${disabled || loading ? 'opacity-60 cursor-not-allowed' : ''} ${className || ''}`}
  >
    {loading ? (
      <span className="inline-block h-5 w-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
    ) : (
      <img src="/svg/icons/general/delete-post.svg" alt="Delete" className="h-6 w-6" />
    )}
  </button>
);

export default DeleteActionButton;
