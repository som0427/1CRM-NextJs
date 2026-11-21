import React from "react";
import PageHeading from "../common/PageHeading";
import SearchBar from "../common/SearchBar";
import DownloadButton from "../common/buttons/DownloadButton";
import { usePointBalanceReport } from '@/contexts/PointBalanceReportContext';

const PointBalanceReportHeader: React.FC = () => {
  const {
    pageHeading,
    searchTerm,
    setSearchTerm,
    handleSearch,
    exportData,
    exporting,
  } = usePointBalanceReport();

  return (
    <div className="flex flex-col space-y-4 bg-white py-4 rounded-lg">
      <div className="flex justify-between items-center min-w-0">
        <div className="flex items-center">
          <PageHeading heading={pageHeading} />
        </div>
        
        {/* Right side controls with optimized spacing */}
        <div className="flex h-11 items-center gap-4 min-w-0 flex-1 justify-end">
          {/* Search Bar - Can compress if needed */}
          <div className="min-w-0 flex-shrink">
            <SearchBar
              searchTerm={searchTerm}
              border="blue"
              variant="expandable"
              setSearchTerm={setSearchTerm}
              handleSearch={handleSearch}
            />
          </div>
          
          {/* Download Button - Compact circular design */}
          <div className="flex-shrink-0">
            <DownloadButton
              exporting={exporting}
              exportEntities={() => { void exportData(); }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PointBalanceReportHeader;
