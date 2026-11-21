import React from "react";

/**
 * ViewActionButton Component
 *
 * A text-based action button for viewing item details.
 * Displays as a blue link-style button with underline on hover.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <ViewActionButton id={row.id} onView={handleView} />
 *
 * Props:
 * ------
 * @param {number} id - Row/item ID to pass to callback (required)
 * @param {(id: number) => void} [onView] - View callback with ID
 *
 * Features:
 * ---------
 * - Text "View" button
 * - Blue text color
 * - Underline on hover
 * - Passes item ID to callback
 */
interface ViewActionButtonProps {
  id: number;
  onView?: (id: number) => void;
}

const ViewActionButton: React.FC<ViewActionButtonProps> = ({ id, onView }) => (
  <button
    className="text-blue-600 hover:underline"
    onClick={() => onView && onView(id)}
  >
    View
  </button>
);

export default ViewActionButton;
