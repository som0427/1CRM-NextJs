import React from "react";

/**
 * NoRecordsFound Component
 *
 * A simple empty state component displayed when no data is available.
 * Shows a heading and suggestion text to help users take action.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <NoRecordsFound heading="products" />
 * // Displays: "No products found"
 * // "Try changing your filter settings or add a new products"
 *
 * @example
 * // For users
 * <NoRecordsFound heading="users" />
 *
 * @example
 * // For orders
 * <NoRecordsFound heading="orders" />
 *
 * Props:
 * ------
 * @param {string} heading - Entity name to display (required)
 *
 * Features:
 * ---------
 * - Centered text layout with padding
 * - Gray colored text for subtle appearance
 * - Helpful suggestion message
 * - Consistent empty state pattern
 */
interface NoRecordsFoundProps {
  heading: string;
}

const NoRecordsFound: React.FC<NoRecordsFoundProps> = ({ heading }) => (
    <div className="p-8 text-center">
    <div className="text-gray-500 mb-4">No {heading} found</div>
    <p className="text-gray-400">Try changing your filter settings or add a new {heading}</p>
  </div>
);

export default NoRecordsFound;
