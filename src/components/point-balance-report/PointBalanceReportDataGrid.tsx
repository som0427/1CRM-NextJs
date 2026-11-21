import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import AGGridPagination from '../common/AGGridPagination';
import { usePointBalanceReport } from '@/contexts/PointBalanceReportContext';

const PointBalanceReportDataGrid: React.FC = () => {
  const { 
    reportData,
    columnDefs,
    defaultColDef,
    totalCount,
    handleLoadMore,
    isLoadingMore,
    gridDataLoaded,
    searchTerm,
    setGridApi,
    loading,
  } = usePointBalanceReport();

  // Debug logging
  console.log('PointBalanceReportDataGrid render:', {
    reportData: reportData?.length,
    columnDefs: columnDefs?.length,
    gridDataLoaded,
    loading,
    totalCount
  });

  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setLocalGridApi] = useState<GridApi | null>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(0);

  const gridOptions = useMemo<GridOptions>(() => ({
    pagination: true,
    paginationPageSize: currentPageSize,
    paginationPageSizeSelector: [10, 20, 50, 100],
    suppressMovableColumns: true,
    animateRows: true,
    domLayout: 'autoHeight',
    suppressPaginationPanel: true,
    rowClass: 'ag-row-bordered',
    //suppressHorizontalScroll: false,
    //suppressColumnVirtualisation: false,
  }), [currentPageSize]);

  const handleGridReady = useCallback((params: GridReadyEvent) => {
    setLocalGridApi(params.api);
    setGridApi(params.api);
  }, [setGridApi]);

  useEffect(() => {
    if (!gridApi) return;
    gridApi.hideOverlay();
  }, [gridApi]);

  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.setQuickFilter(searchTerm || '');
    }
  }, [searchTerm]);

  const noRowsOverlayComponent = useMemo(() => () => (
    <div className="ag-overlay-no-rows-center flex items-center justify-center">
      <div className="flex flex-col items-center p-4">
        <div className="text-lg text-gray-600 mb-2">No records found</div>
        <div className="text-sm text-gray-500">Try adjusting your date range</div>
      </div>
    </div>
  ), []);

  const loadingOverlayComponent = useMemo(() => () => (
    <div className="ag-overlay-loading-center flex items-center justify-center">
      <div className="flex flex-col items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-2"></div>
        <div className="text-sm text-gray-600">Loading data...</div>
      </div>
    </div>
  ), []);

  return (
    <div className="flex flex-col w-full grid-height-190">
      <div className="flex-1 w-full ag-theme-alpine">
        <div className="w-full h-full relative">
          <AgGridReact
            ref={gridRef}
            gridOptions={gridOptions}
            rowData={reportData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            onGridReady={handleGridReady}
            enableCellTextSelection={false}
            domLayout='normal'
            overlayNoRowsTemplate="No records found"
            noRowsOverlayComponent={noRowsOverlayComponent}
            loadingOverlayComponent={loadingOverlayComponent}
            suppressLoadingOverlay={!loading}
          />
        </div>

        <AGGridPagination
          gridApi={gridApi}
          totalItems={reportData.length}
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          setCurrentPage={setCurrentPage}
          setCurrentPageSize={setCurrentPageSize}
          handleLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
          totalCount={totalCount}
          currentCount={reportData.length}
          pageSizeOptions={[20, 50, 100, 500]}
        />

        {isLoadingMore && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg p-6 flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
              <div className="text-gray-700">Loading more records...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PointBalanceReportDataGrid;
