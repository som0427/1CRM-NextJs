import React from "react";

/**
 * DashboardActionButton Component
 *
 * An icon button for navigating to dashboard/detail views, typically used in AG Grid action cells.
 * Supports disabled state.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <DashboardActionButton id={row.id} onDashboard={handleViewDashboard} />
 *
 * @example
 * // Disabled state
 * <DashboardActionButton id={row.id} onDashboard={handleViewDashboard} disabled={!hasDashboard} />
 *
 * Props:
 * ------
 * @param {number} id - Row/item ID to pass to callback (required)
 * @param {(id: number) => void} [onDashboard] - Dashboard callback with ID
 * @param {boolean} [disabled=false] - Disabled state
 * @param {string} [className] - Additional CSS classes
 *
 * Features:
 * ---------
 * - Circular button (40px)
 * - Dashboard icon from SVG
 * - Disabled state with reduced opacity
 * - Tooltip shows "Action" or "Action (disabled)"
 */
interface DashboardActionButtonProps {
  id: number;
  onDashboard?: (id: number) => void;
  disabled?: boolean;
  className?: string;
}

const DashboardActionButton: React.FC<DashboardActionButtonProps> = ({ id, onDashboard, disabled = false, className }) => (
  <button
    title={disabled ? "Action (disabled)" : "Action"}
    onClick={() => !disabled && onDashboard && onDashboard(id)}
    type="button"
    disabled={disabled}
    className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className || ''}`}
  >
    <img 
      src="/svg/icons/general/dashboard-1.svg" 
      alt={disabled ? "Dashboard Disabled" : "Dashboard"} 
      className="h-6 w-6" 
    />
  </button>
);

export default DashboardActionButton;
