import React from 'react';

import PageHeading from '../common/PageHeading';
import SearchBar from '../common/SearchBar';
import DownloadButton from '../common/buttons/DownloadButton';
import MenuDropdown from '../common/buttons/MenuDropdown';
import { useDetailedActivityReport } from '@/contexts/DetailedActivityReportContext';

const DetailedActivityReportHeader: React.FC = () => {
  const {
    pageHeading,
    searchTerm,
    setSearchTerm,
    handleSearch,
    exportData,
    exporting,
    openFilterModal,
    hasActiveFilters,
    activeFiltersCount,
    clearActivityTypeFilters,
  } = useDetailedActivityReport();

  return (
    <div className="flex flex-col space-y-4 bg-white py-4 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <PageHeading heading={pageHeading} />
        </div>

        <div className="flex h-11 items-center gap-4 min-w-0 flex-1 justify-end">
          <div className="min-w-0 flex-shrink">
            <SearchBar
              searchTerm={searchTerm}
              border="blue"
              variant="expandable"
              setSearchTerm={setSearchTerm}
              handleSearch={handleSearch}
            />
          </div>

          <div className="flex items-center gap-3">
            <MenuDropdown
              onClick={openFilterModal}
              hasActiveFilters={hasActiveFilters}
              activeFiltersCount={activeFiltersCount}
              onClear={clearActivityTypeFilters}
              showCount={false}
            />

            <DownloadButton exporting={exporting} exportEntities={exportData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedActivityReportHeader;
