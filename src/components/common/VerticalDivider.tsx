import React from "react";

/**
 * VerticalDivider Component
 *
 * A simple vertical line divider for separating content horizontally.
 * Commonly used in toolbars, headers, or inline element groups.
 *
 * @component
 *
 * @example
 * // Basic usage (default blue, h-8)
 * <VerticalDivider />
 *
 * @example
 * // Custom height
 * <VerticalDivider height="h-4" />
 * <VerticalDivider height="h-12" />
 *
 * @example
 * // Custom color
 * <VerticalDivider color="bg-gray-300" />
 * <VerticalDivider color="bg-red-500" />
 *
 * @example
 * // In a toolbar
 * <div className="flex items-center gap-4">
 *   <Button>Edit</Button>
 *   <VerticalDivider height="h-6" color="bg-gray-300" />
 *   <Button>Delete</Button>
 * </div>
 *
 * @example
 * // With additional classes
 * <VerticalDivider className="mx-2" />
 *
 * Props:
 * ------
 * @param {string} [height="h-8"] - Tailwind height class
 * @param {string} [color="bg-blue-500"] - Tailwind background color class
 * @param {string} [className=""] - Additional CSS classes
 *
 * Features:
 * ---------
 * - 1px width (w-[1px])
 * - Customizable height via Tailwind classes
 * - Customizable color via Tailwind classes
 * - Default blue color matches app theme
 */
interface VerticalDividerProps {
  height?: string;
  color?: string;
  className?: string;
}

const VerticalDivider: React.FC<VerticalDividerProps> = ({
  height = "h-[30px]",
  color = "bg-blue-500",
  className = "",
}) => {
  return <div className={`w-[1px] ${height} ${color} ${className}`}></div>;
};

export default VerticalDivider;
