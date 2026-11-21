import React from "react";
import { List, Grid } from "lucide-react";
import { Button } from "../../ui/tailwind/Button";

/**
 * ViewToggle Component
 *
 * A pill-shaped toggle for switching between table and grid view modes.
 * Features smooth sliding animation for active indicator.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <ViewToggle
 *   viewMode={viewMode}
 *   setViewMode={setViewMode}
 *   setLoading={setLoading}
 *   setNeedsListRefresh={setNeedsListRefresh}
 *   gridDataLoaded={gridDataLoaded}
 * />
 *
 * Props:
 * ------
 * @param {"table" | "grid"} viewMode - Current view mode (required)
 * @param {(mode: "table" | "grid") => void} setViewMode - View mode setter (required)
 * @param {(loading: boolean) => void} setLoading - Loading state setter (required)
 * @param {(refresh: boolean) => void} setNeedsListRefresh - Refresh flag setter (required)
 * @param {boolean} gridDataLoaded - Whether grid data is already loaded (required)
 *
 * Features:
 * ---------
 * - Pill-shaped container with border
 * - Sliding blue indicator (40px circular)
 * - Table view: List icon (lucide-react)
 * - Grid view: Grid icon (lucide-react)
 * - 300ms smooth translate animation
 * - Sets loading state on view change
 * - Triggers refresh when switching to table
 * - Only loads grid data once
 */
interface ViewToggleProps {
  viewMode: "table" | "grid";
  setViewMode: (mode: "table" | "grid") => void;
  setLoading: (loading: boolean) => void;
  setNeedsListRefresh: (refresh: boolean) => void;
  gridDataLoaded: boolean;
}

const ViewToggle: React.FC<ViewToggleProps> = ({
  viewMode,
  setViewMode,
  setLoading,
  setNeedsListRefresh,
  gridDataLoaded,
}) => (
  <div className="relative flex bg-white border border-gray-200 rounded-full h-11 px-[1px] items-center shadow-sm mr-2">
    <div
      className={`absolute bg-blue-500 rounded-full h-10 w-10 transition-transform duration-300 ease-in-out ${
        viewMode === 'grid' ? 'translate-x-10' : 'translate-x-0'
      }`}
    />
    <Button
      className={`relative z-10 rounded-full h-10 w-10 flex items-center justify-center mx-0 transition-colors duration-300 ${
        viewMode === 'table' ? 'text-white' : 'text-gray-500 hover:text-gray-600'
      }`}
      aria-label="Table view"
      onClick={() => {
        setViewMode('table');
        setLoading(true);
        setNeedsListRefresh(true);
      }}
    >
      <List className="h-5 w-5" />
    </Button>
    <Button
      className={`relative z-10 rounded-full h-10 w-10 flex items-center justify-center mx-0 transition-colors duration-300 ${
        viewMode === 'grid' ? 'text-white' : 'text-gray-400 hover:text-gray-600'
      }`}
      aria-label="Grid view"
      onClick={() => {
        setViewMode('grid');
        if (!gridDataLoaded) {
          setLoading(true);
        }
      }}
    >
      <Grid className="h-5 w-5" />
    </Button>
  </div>
);

export default ViewToggle;
