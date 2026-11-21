import React from "react";

/**
 * CallActionButton Component
 *
 * An icon button for initiating calls to customers, typically used in AG Grid action cells.
 * Supports disabled state.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <CallActionButton id={row.id} onCall={handleCall} />
 *
 * @example
 * // Disabled state
 * <CallActionButton id={row.id} onCall={handleCall} disabled={!hasPhone} />
 *
 * Props:
 * ------
 * @param {number} id - Row/item ID to pass to callback (required)
 * @param {(id: number) => void} [onCall] - Call callback with ID
 * @param {boolean} [disabled=false] - Disabled state
 * @param {string} [className] - Additional CSS classes
 *
 * Features:
 * ---------
 * - Circular button (40px)
 * - Phone/call icon from SVG
 * - Disabled state with reduced opacity
 * - Tooltip shows "Call Customer" or "Call (disabled)"
 */
interface CallActionButtonProps {
  id: number;
  onCall?: (id: number) => void;
  disabled?: boolean;
  className?: string;
}

const CallActionButton: React.FC<CallActionButtonProps> = ({ id, onCall, disabled = false, className }) => (
  <button
    title={disabled ? "Call (disabled)" : "Call Customer"}
    onClick={() => !disabled && onCall && onCall(id)}
    type="button"
    disabled={disabled}
    className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className || ''}`}
  >
    <img 
      src="/svg/icons/communication/call-icon.svg" 
      alt={disabled ? "Call Disabled" : "Call"} 
      className="h-6 w-6" 
    />
  </button>
);

export default CallActionButton;
