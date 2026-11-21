import React from "react";

/**
 * GridHeaderLeftCell Component
 *
 * A simple left-aligned AG Grid header cell component.
 * Used as a custom headerComponent in AG Grid column definitions.
 *
 * @component
 *
 * @example
 * // Usage in AG Grid column definition
 * const columnDefs = [{
 *   field: 'name',
 *   headerComponent: GridHeaderLeftCell,
 *   headerComponentParams: { label: 'Name' }
 * }];
 *
 * Props:
 * ------
 * @param {string} label - Header text to display (required)
 *
 * Features:
 * ---------
 * - Left-aligned header text
 * - Semibold font weight
 * - Small text size (text-sm)
 */
const GridHeaderLeftCell: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center justify-start w-full h-full font-semibold text-sm">
    {label}
  </div>
);

export default GridHeaderLeftCell;
