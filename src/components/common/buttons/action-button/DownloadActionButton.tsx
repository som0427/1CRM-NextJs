import React from "react";

/**
 * DownloadActionButton Component
 *
 * An icon button for downloading individual items, typically used in AG Grid action cells.
 * Supports loading and disabled states.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <DownloadActionButton id={row.id} onClick={handleDownload} />
 *
 * @example
 * // With loading state
 * <DownloadActionButton id={row.id} onClick={handleDownload} loading={isDownloading} />
 *
 * @example
 * // Custom tooltip
 * <DownloadActionButton
 *   id={row.id}
 *   onClick={handleDownload}
 *   title="Download Report"
 * />
 *
 * Props:
 * ------
 * @param {number} id - Row/item ID to pass to callback (required)
 * @param {(id: number) => void} [onClick] - Download callback with ID
 * @param {string} [title="Download"] - Tooltip text
 * @param {string} [className] - Additional CSS classes
 * @param {boolean} [loading] - Show loading spinner
 * @param {boolean} [disabled] - Disabled state
 *
 * Features:
 * ---------
 * - Square button (40px)
 * - Download arrow icon from SVG
 * - Loading spinner animation
 * - Disabled state with reduced opacity
 * - Custom tooltip support
 */
interface DownloadActionButtonProps {
  id: number | string;
  onClick?: (id: number | string) => void;
  title?: string;
  className?: string;
  loading?: boolean;
  disabled?: boolean;
}

const DownloadActionButton: React.FC<DownloadActionButtonProps> = ({
  id,
  onClick,
  title,
  className,
  loading,
  disabled,
}) => {
  const isDisabled = disabled || loading;
  return (
    <button
      title={title || "Download"}
      onClick={() => !isDisabled && onClick && onClick(id)}
      type="button"
      disabled={isDisabled}
      className={`flex justify-center items-center w-10 h-10 rounded ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''} ${className || ''}`}
    >
      {loading ? (
        <span className="inline-block h-5 w-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      ) : (
        <img
          src="/svg/icons/general/Download_Arrow.svg"
          alt="Download"
          className="h-6 w-6"
          style={isDisabled ? { filter: 'grayscale(1)', opacity: 0.5 } : undefined}
        />
      )}
    </button>
  );
};

export default DownloadActionButton;
