import React from 'react';
import PageHeading from '../common/PageHeading';
import SearchBar from '../common/SearchBar';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { setSearchTerm } from '../../store/logsSlice';
import MenuDropdown from '../common/buttons/MenuDropdown';

interface LogsHeaderProps {
  pageHeading?: string;
  handleSearch?: () => void;
  onOpenFilterModal?: () => void;
  hasActiveFilters?: boolean;
  activeFiltersCount?: number;
  onClearFilters?: () => void;
}

const LogsHeader: React.FC<LogsHeaderProps> = ({
  pageHeading = "Logs",
  handleSearch,
  onOpenFilterModal,
  hasActiveFilters = false,
  activeFiltersCount = 0,
  onClearFilters,
}) => {
  const dispatch = useDispatch();
  const searchTerm = useSelector((state: RootState) => state.logs.searchTerm);
  return (
    <div className="flex flex-col space-y-4 bg-white py-4 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <PageHeading heading={pageHeading} />
        </div>
        <div className="flex items-center gap-4 px-2">
          <SearchBar
            searchTerm={searchTerm}
            border="blue"
            variant="expandable"
            setSearchTerm={(term: string) => dispatch(setSearchTerm(term))}
            handleSearch={handleSearch}
          />

          {onOpenFilterModal && (
            <MenuDropdown
              onClick={onOpenFilterModal}
              hasActiveFilters={hasActiveFilters}
              activeFiltersCount={activeFiltersCount}
              onClear={onClearFilters}
            />
          )}
        </div>
      </div>

    </div>

  );
};

export default LogsHeader;
