import React from "react";
import { Button } from "../../ui/tailwind";
import { ListFilter, X } from "lucide-react";

interface MenuDropdownProps {
  onClick?: () => void;
  hasActiveFilters?: boolean;
  activeFiltersCount?: number;
  onClear?: () => void;
  showCount?: boolean;
}

const MenuDropdown: React.FC<MenuDropdownProps> = ({
  onClick,
  hasActiveFilters = false,
  activeFiltersCount = 0,
  onClear,
  showCount = true,
}) => {
  const shouldShowCount = showCount && hasActiveFilters;

  return (
    <Button
      onClick={onClick}
      className={`${hasActiveFilters ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded-full h-10 ${shouldShowCount ? 'w-30 gap-3' : 'w-10 gap-0'} flex items-center justify-center shadow-sm transition-colors`}
      aria-label="Filter"
      aria-pressed={hasActiveFilters}
    >
      <ListFilter className="h-5 w-5 text-white" />
      {shouldShowCount && (
        <div className="relative inline-flex items-center">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
            {activeFiltersCount}
          </span>
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear filters"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClear && onClear();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onClear && onClear();
              }
            }}
            className="absolute -top-2 -right-2 inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500 text-white hover:bg-red-600 text-[10px] font-semibold cursor-pointer shadow"
          >
            <X className="h-3 w-3" />
          </span>
        </div>
      )}
    </Button>
  );
};

export default MenuDropdown;
