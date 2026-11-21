import React from "react";

/**
 * PageHeading Component
 *
 * A consistent page title component for displaying main headings across the application.
 * Provides standardized typography for page titles.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <PageHeading heading="Dashboard" />
 *
 * @example
 * // With custom className
 * <PageHeading heading="User Management" className="mb-4" />
 *
 * @example
 * // In a page layout
 * <div className="p-6">
 *   <PageHeading heading="Settings" className="mb-6" />
 *   <SettingsContent />
 * </div>
 *
 * Props:
 * ------
 * @param {string} heading - The heading text to display (required)
 * @param {string} [className=""] - Additional CSS classes
 *
 * Features:
 * ---------
 * - text-xl font size
 * - font-bold weight
 * - text-gray-800 color
 * - Customizable via className prop
 */
interface PageHeadingProps {
  heading: string;
  className?: string;
}

const PageHeading: React.FC<PageHeadingProps> = ({ heading, className = "" }) => (
  <h1 className={`text-xl font-bold text-gray-800 ${className}`}>{heading}</h1>
);

export default PageHeading;
