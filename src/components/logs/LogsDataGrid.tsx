import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions, GridReadyEvent, GridApi, ICellRendererParams } from 'ag-grid-community';
import AGGridPagination from '../common/AGGridPagination';
import GridHeaderCenterCell from '../common/GridHeaderCenterCell';

interface LogsDataGridProps {
  logs: any[];
  loading: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  totalCount: number;
  currentCount: number;
  onGridReady?: (params: any) => void;
  entityName?: string;
}

const LogsDataGrid: React.FC<LogsDataGridProps> = ({
  logs,
  loading,
  onLoadMore,
  isLoadingMore,
  totalCount,
  currentCount,
  onGridReady,
  entityName = ''
}) => {
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentPageSize, setCurrentPageSize] = useState(20);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    suppressMovable: true,
    lockPosition: true,
    lockVisible: true,
  }), []);

  // Event cell renderer
  const EventCellRenderer = (props: any) => {
    const eventValue = props.value;
    
    let badgeClass = '';
    let text = '';
    
    if (eventValue == '1') {
      badgeClass = 'px-2 py-1.5 rounded-full text-sm font-medium created-status';
      text = 'Created';
    } else if (eventValue == '2') {
      badgeClass = 'px-2 py-1.5 rounded-full text-sm font-medium updated-status';
      text = 'Updated';
    } else if (eventValue == '0') {
      badgeClass = 'px-2 py-1.5 rounded-full text-sm font-medium inactive-status';
      text = 'Deleted';
    } else {
      badgeClass = 'px-2 py-1.5 rounded-full text-sm font-medium default-status';
      text = 'Unknown';
    } 
    return (
     <span className="flex justify-center items-center w-full h-full">
       <span className={`${badgeClass}`}>
         {text}
       </span>
     </span>
   );
 };

// Column definitions
  const columnDefs = useMemo<ColDef[]>(() => [
    { 
      headerName: 'Serial No', 
      field: 'serialNo', 
      sortable: true, 
      filter: true, 
      minWidth: 150
    },
    { 
      headerName: `${entityName || 'Entity'} Name`, 
      field: 'entityName', 
      sortable: true, 
      filter: true, 
      minWidth: 180
    },
    { 
      headerName: 'Field Name', 
      field: 'fieldName', 
      sortable: true, 
      filter: true, 
      minWidth: 180,
      flex: 1
    },
    { 
      headerName: 'Old Value', 
      field: 'oldValue', 
      sortable: true, 
      filter: true, 
      minWidth: 150
    },
    { 
      headerName: 'New Value', 
      field: 'newValue', 
      sortable: true, 
      filter: true, 
      minWidth: 150
    },
    { 
      headerName: 'Performed By', 
      field: 'performedBy', 
      sortable: true, 
      filter: true, 
      minWidth: 150
    },
    { 
      headerName: 'Date-Time', 
      field: 'dateTime', 
      sortable: true, 
      filter: true, 
      minWidth: 150
    },
    {
      headerName: 'Event',
      field: 'event',
      sortable: true,
      filter: true,
      minWidth: 120,
      cellRenderer: EventCellRenderer,
      valueFormatter: (params: any) => {
        const v = params.value;
        if (v == '1') return 'Created';
        if (v == '2') return 'Updated';
        if (v == '0') return 'Deleted';
        return 'Unknown';
      },
      filterParams: {
        valueFormatter: (params: any) => {
          const v = params.value;
          if (v == '1') return 'Created';
          if (v == '2') return 'Updated';
          if (v == '0') return 'Deleted';
          return 'Unknown';
        }
      },
      headerComponent: (params: any) => (
        <GridHeaderCenterCell
          label="Event"
          showFilter={true}
          enableSorting={true}
          showColumnMenu={params.showColumnMenu}
          column={params.column}
          setSort={params.setSort}
        />
      )
    }
  ], [entityName]);

  // Grid options for the ag-grid component
    const gridOptions = useMemo<GridOptions>(() => ({
      pagination: true,
      paginationPageSize: currentPageSize,
      paginationPageSizeSelector: [20, 50, 100, 500],
      suppressMovableColumns: true,
      animateRows: true,
      // Using normal layout to ensure proper row display
      domLayout: 'normal',
      // Use default row height which works well with the default AG Grid styling
      rowHeight: undefined,
      headerHeight: 48,
      suppressColumnVirtualisation: true,
      suppressRowHoverHighlight: false,
      suppressPaginationPanel: true
    }), [currentPageSize]);


  // Event cell renderer definition has been moved above columnDefs

  // Get search term from Redux store
  const searchTerm = useSelector((state: RootState) => state.logs.searchTerm);

  const handleGridReady = useCallback((params: any) => {
    console.log('LogsDataGrid grid ready, setting gridApi', params.api);
    setGridApi(params.api);
    
    // Initialize pagination settings
    if (params.api) {
      params.api.paginationSetPageSize(currentPageSize);
      if (currentPage > 0) {
        params.api.paginationGoToPage(currentPage);
      }
    }
    
    // Let CSS handle all sizing - no JavaScript resize operations
    if (onGridReady) {
      onGridReady(params.api);
    }
  }, [onGridReady, currentPageSize, currentPage]);
  
  // Effect to update pagination when currentPageSize or currentPage changes
  useEffect(() => {
    if (gridApi) {
      gridApi.paginationSetPageSize(currentPageSize);
      if (currentPage > 0) {
        gridApi.paginationGoToPage(currentPage);
      }
    }
  }, [gridApi, currentPageSize, currentPage]);
  
  // We no longer need the filtering effect as filtering is handled in the logs page

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [isLoadingMore, onLoadMore]);

const loadingOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-loading-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <div className="mt-4 text-sm text-gray-700">Loading logs...</div>
        </div>
      </div>
    );
  }, []);

  // Custom no rows overlay component
  const noRowsOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-no-rows-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="text-lg text-gray-600 mb-2">No logs found</div>
          <div className="text-sm text-gray-500">Try adjusting your filters or adding a new log</div>
        </div>
      </div>
    );
  }, []);



  return (
    <div className="flex flex-col w-full grid-height-190">
      <div className="flex-1 w-full ag-theme-alpine">
        <div className="w-full h-full relative">
          <AgGridReact
            ref={gridRef}
            gridOptions={gridOptions}
            rowData={logs}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            onGridReady={handleGridReady}
            pagination={true}
            suppressPaginationPanel={true}
            enableCellTextSelection={false}
            domLayout='normal'
            overlayNoRowsTemplate="No records found"
            loadingOverlayComponent={loadingOverlayComponent}
            loadingOverlayComponentParams={{
              loadingMessage: 'Loading logs...'
            }}
            noRowsOverlayComponent={noRowsOverlayComponent}

          />
        </div>

        {/* Pagination and Load More controls */}
        <AGGridPagination
          gridApi={gridApi}
          totalItems={logs.length}
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          setCurrentPage={setCurrentPage}
          setCurrentPageSize={setCurrentPageSize}
          handleLoadMore={onLoadMore}
          isLoadingMore={isLoadingMore}
          totalCount={totalCount}
          currentCount={currentCount || logs.length}
          pageSizeOptions={[20, 50, 100, 500]}
        />

        {/* Global spinner for Load More - appears in center of screen*/}
        {isLoadingMore && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
    </div>
    
  );
};

export default LogsDataGrid;
