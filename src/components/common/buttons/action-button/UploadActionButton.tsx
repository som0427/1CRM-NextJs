import React from "react";

/**
 * UploadActionButton Component
 *
 * An icon button for uploading files/content, typically used in AG Grid action cells.
 * Supports loading and disabled states.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <UploadActionButton id={row.id} onClick={handleUpload} />
 *
 * @example
 * // With loading state
 * <UploadActionButton id={row.id} onClick={handleUpload} loading={isUploading} />
 *
 * @example
 * // Custom tooltip
 * <UploadActionButton
 *   id={row.id}
 *   onClick={handleUpload}
 *   title="Upload Document"
 * />
 *
 * Props:
 * ------
 * @param {number} id - Row/item ID to pass to callback (required)
 * @param {(id: number) => void} [onClick] - Upload callback with ID
 * @param {string} [title="Upload"] - Tooltip text
 * @param {string} [className] - Additional CSS classes
 * @param {boolean} [loading] - Show loading spinner
 * @param {boolean} [disabled] - Disabled state
 *
 * Features:
 * ---------
 * - Square button (40px)
 * - Upload arrow icon from SVG
 * - Loading spinner animation
 * - Disabled state with reduced opacity
 * - Custom tooltip support
 */
interface UploadActionButtonProps {
  id: number;
  onClick?: (id: number) => void;
  title?: string;
  className?: string;
  loading?: boolean;
  disabled?: boolean;
}

const UploadActionButton: React.FC<UploadActionButtonProps> = ({ id, onClick, title, className, loading, disabled }) => (
  <button
    title={title || "Upload"}
    onClick={() => !loading && !disabled && onClick && onClick(id)}
    type="button"
    disabled={disabled || loading}
    className={`flex justify-center items-center w-10 h-10 ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className || ''}`}
  >
    {loading ? (
      <span className="inline-block h-5 w-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
    ) : (
      <img src="/svg/icons/general/Arrow-upload.svg" alt="Upload" className="h-6 w-6" />
    )}
  </button>
);

export default UploadActionButton;
