import React from 'react';
import { Filter } from 'lucide-react';

/**
 * FilterButton Component
 *
 * A button for toggling filter panels with active filter indicator.
 * Changes appearance based on whether filters are currently applied.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <FilterButton onClick={() => setShowFilters(true)} />
 *
 * @example
 * // With active filters
 * <FilterButton
 *   onClick={toggleFilters}
 *   hasActiveFilters={filters.length > 0}
 * />
 *
 * @example
 * // With custom className
 * <FilterButton
 *   onClick={toggleFilters}
 *   hasActiveFilters={hasFilters}
 *   className="ml-2"
 * />
 *
 * Props:
 * ------
 * @param {() => void} onClick - Click handler (required)
 * @param {boolean} [hasActiveFilters=false] - Show active filter state
 * @param {string} [className=""] - Additional CSS classes
 *
 * Features:
 * ---------
 * - Filter icon (lucide-react)
 * - Blue background when filters active
 * - White/gray background when no filters
 * - Red dot indicator when filters active
 * - Rounded corners
 * - Hover state
 */
interface FilterButtonProps {
  onClick: () => void;
  hasActiveFilters?: boolean;
  className?: string;
}

const FilterButton: React.FC<FilterButtonProps> = ({
  onClick,
  hasActiveFilters = false,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        relative inline-flex items-center justify-center p-2 rounded-md transition-colors duration-200
        ${hasActiveFilters 
          ? 'bg-blue-500 text-white hover:bg-blue-600' 
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        }
        ${className}
      `}
      title="Filter"
    >
      <Filter className="h-4 w-4" />
      
      {/* Active filter indicator */}
      {hasActiveFilters && (
        <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
      )}
    </button>
  );
};

export default FilterButton;
