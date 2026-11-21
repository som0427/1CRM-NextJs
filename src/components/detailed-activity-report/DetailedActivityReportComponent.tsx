import React from 'react';

import DetailedActivityReportDataGrid from './DetailedActivityReportDataGrid';
import { useDetailedActivityReport } from '@/contexts/DetailedActivityReportContext';

const DetailedActivityReportComponent: React.FC = () => {
  const { reportData, gridDataLoaded, loading } = useDetailedActivityReport();

  const showNoData = gridDataLoaded && (!Array.isArray(reportData) || reportData.length === 0);

  if (loading && !gridDataLoaded) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4" />
          <div className="text-gray-600">Loading report data...</div>
        </div>
      </div>
    );
  }

  if (showNoData) {
    return (
      <div className="p-8 text-center bg-white rounded-lg shadow">
        <div className="text-gray-500 mb-4">No data found</div>
        <p className="text-gray-400">Try changing your date range or wait for data to be available</p>
      </div>
    );
  }

  return <DetailedActivityReportDataGrid />;
};

export default DetailedActivityReportComponent;
