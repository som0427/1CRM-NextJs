import React from "react";

/**
 * StatusCell Component
 *
 * A styled status badge component for displaying status values in AG Grid cells or standalone.
 * Automatically applies color styling based on status value.
 *
 * @component
 *
 * @example
 * // Basic usage in AG Grid
 * const columnDefs = [{
 *   field: 'status',
 *   cellRenderer: StatusCell
 * }];
 *
 * @example
 * // With numeric value (1 = Active, 0 = Inactive)
 * <StatusCell value={1} />  // Displays "Active" with green styling
 * <StatusCell value={0} />  // Displays "Inactive" with red styling
 *
 * @example
 * // With string value
 * <StatusCell value="Active" />
 * <StatusCell value="Inactive" />
 * <StatusCell value="Pending" />
 *
 * @example
 * // With system field indicator
 * <StatusCell value="Active" data={{ showSystemFieldStatus: true }} />
 *
 * Props:
 * ------
 * @param {string | number} value - Status value (required)
 *   - Number: 1 = "Active", 0 = "Inactive", other = toString()
 *   - String: Displayed as-is
 * @param {any} [data] - AG Grid row data object
 *   - data.showSystemFieldStatus: If true, uses "system-field-status" class for Active
 *
 * Status Classes:
 * ---------------
 * - "active" → "active-status" (or "system-field-status" if showSystemFieldStatus)
 * - "inactive" → "inactive-status"
 * - "pending" → "pending-status"
 *
 * Features:
 * ---------
 * - Centered badge display
 * - Rounded pill shape
 * - White text on colored background
 * - Auto-converts numeric status to text
 * - Case-insensitive status matching
 */
interface StatusCellProps {
  value: string | number;
  data?: any;
}

const StatusCell: React.FC<StatusCellProps> = ({ value, data }) => {
  const displayValue =
    typeof value === "number"
      ? value === 1
        ? "Active"
        : value === 0
        ? "Inactive"
        : value.toString()
      : (value ?? "").toString();

  if (!displayValue) {
    return null;
  }

  const statusKey = displayValue.toLowerCase();
  const showSystemField = !!data?.showSystemFieldStatus;

  let statusClass = "";

  if (statusKey === "active") {
    statusClass = showSystemField
      ? "system-field-status"
      : "active-status";
  } else if (statusKey === "inactive") {
    statusClass ="inactive-status";
  } else if (statusKey === "pending") {
    statusClass = "pending-status"
  }

  return (
    <span className="flex justify-center items-center w-full h-full">
      <span
        className={` rounded-full text-sm font-medium text-white ${statusClass}
          }`}
      >
        {displayValue}
      </span>
    </span>
  );
};

export default StatusCell;
