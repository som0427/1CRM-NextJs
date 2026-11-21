import React from 'react';
import PageHeading from '../common/PageHeading';
import SearchBar from '../common/SearchBar';
import DateRangePicker from '../common/DateRangePicker';
import DownloadButton from '../common/buttons/DownloadButton';

interface DailyActivityReportHeaderProps {
  pageHeading: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleSearch: () => void;
  startDate: string;
  endDate: string;
  handleDateRangeChange: (startDate: string, endDate: string) => void;
  exportData: () => void;
  exporting: boolean;
}

const DailyActivityReportHeader: React.FC<DailyActivityReportHeaderProps> = ({
  pageHeading,
  searchTerm,
  setSearchTerm,
  handleSearch,
  startDate,
  endDate,
  handleDateRangeChange,
  exportData,
  exporting,
}) => {
  return (
    <div className="flex flex-col space-y-4 bg-white py-4 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <PageHeading heading={pageHeading} />
        </div>

        <div className="flex h-11 items-center gap-4 min-w-0 flex-1 justify-end">
          <div className="flex-shrink-0 min-w-fit">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onDateRangeChange={handleDateRangeChange}
              maxDays={60}
            />
          </div>

          <div className="min-w-0 flex-shrink">
            <SearchBar
              searchTerm={searchTerm}
              border="blue"
              variant="expandable"
              setSearchTerm={setSearchTerm}
              handleSearch={handleSearch}
            />
          </div>

          <div className="flex-shrink-0">
            <DownloadButton exporting={exporting} exportEntities={exportData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyActivityReportHeader;
