import React, { useRef, useState, useEffect } from "react";
import { IHeaderParams, Column } from "ag-grid-community";

/**
 * GridHeaderCenterCell Component
 *
 * A center-aligned AG Grid header cell component with sorting and filter menu support.
 * Used as a custom headerComponent in AG Grid column definitions.
 *
 * @component
 *
 * @example
 * // Basic usage in AG Grid column definition
 * const columnDefs = [{
 *   field: 'name',
 *   headerComponent: GridHeaderCenterCell,
 *   headerComponentParams: { label: 'Name' }
 * }];
 *
 * @example
 * // With sorting enabled
 * {
 *   field: 'price',
 *   headerComponent: GridHeaderCenterCell,
 *   headerComponentParams: {
 *     label: 'Price',
 *     enableSorting: true
 *   }
 * }
 *
 * @example
 * // With filter menu
 * {
 *   field: 'category',
 *   headerComponent: GridHeaderCenterCell,
 *   headerComponentParams: {
 *     label: 'Category',
 *     showFilter: true
 *   }
 * }
 *
 * Props:
 * ------
 * @param {string} label - Header text to display (required)
 * @param {boolean} [showFilter=false] - Show filter menu icon on hover
 * @param {boolean} [enableSorting=false] - Enable click-to-sort functionality
 * @param {IHeaderParams['api']} [api] - AG Grid API (auto-injected by AG Grid)
 * @param {Column} [column] - AG Grid column (auto-injected by AG Grid)
 * @param {IHeaderParams['showColumnMenu']} [showColumnMenu] - Show menu function (auto-injected)
 * @param {IHeaderParams['setSort']} [setSort] - Set sort function (auto-injected)
 * @param {boolean} [enableMenu] - Enable column menu
 *
 * Features:
 * ---------
 * - Center-aligned header text
 * - Click to cycle sort: none → asc → desc → none
 * - Sort indicator icons (ag-icon-asc/desc)
 * - Shift+click for multi-column sort
 * - Filter menu icon appears on hover
 * - Listens to sort changes on column
 */
interface GridHeaderCenterCellProps {
  label: string;
  showFilter?: boolean;
  enableSorting?: boolean;
  // AG Grid header params (optional - only available when used as headerComponent)
  api?: IHeaderParams['api'];
  column?: Column;
  showColumnMenu?: IHeaderParams['showColumnMenu'];
  setSort?: IHeaderParams['setSort'];
  enableMenu?: boolean;
}

const GridHeaderCenterCell: React.FC<GridHeaderCenterCellProps> = ({
  label,
  showFilter = false,
  enableSorting = false,
  showColumnMenu,
  column,
  setSort,
}) => {
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [sortState, setSortState] = useState<'asc' | 'desc' | null>(null);

  // Listen to sort changes on the column
  useEffect(() => {
    if (!column) return;

    const updateSortState = () => {
      const sort = column.getSort();
      setSortState(sort === 'asc' ? 'asc' : sort === 'desc' ? 'desc' : null);
    };

    // Initial state
    updateSortState();

    // Listen for sort changes
    column.addEventListener('sortChanged', updateSortState);

    return () => {
      column.removeEventListener('sortChanged', updateSortState);
    };
  }, [column]);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showColumnMenu && menuButtonRef.current) {
      showColumnMenu(menuButtonRef.current);
    }
  };

  const handleSortClick = (e: React.MouseEvent) => {
    if (!enableSorting || !setSort) return;

    const isShiftKey = e.shiftKey;

    // Cycle through: none -> asc -> desc -> none
    if (sortState === null) {
      setSort('asc', isShiftKey);
    } else if (sortState === 'asc') {
      setSort('desc', isShiftKey);
    } else {
      setSort(null, isShiftKey);
    }
  };

  return (
    <div
      className="relative flex items-center justify-center w-full h-full font-semibold text-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="flex items-center ml-2 cursor-pointer select-none"
        onClick={handleSortClick}
      >
        <span>{label}</span>
        {enableSorting && (
          <span
            className={`ag-icon ${sortState === 'asc' ? 'ag-icon-asc' : sortState === 'desc' ? 'ag-icon-desc' : ''}`}
          />
        )}
      </div>
      <div className="absolute right-0 flex items-center gap-0.5">
        {showFilter && showColumnMenu && isHovered && (
          <button
            ref={menuButtonRef}
            onClick={handleMenuClick}
            className="ag-icon ag-icon-menu"
            aria-label="Open column menu"
          />
        )}
      </div>
    </div>
  );
};

export default GridHeaderCenterCell;
