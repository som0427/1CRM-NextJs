import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions, GridApi } from 'ag-grid-community';
import AGGridPagination from '../common/AGGridPagination';
import GridHeaderCenterCell from '../common/GridHeaderCenterCell';
import StatusCell from '../common/StatusCell';
import TargetActionsCellRenderer from './subs/targetActionsCellRenderer/TargetActionsCellRenderer';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

interface TargetManagementDataGridProps {
  targets: any[];
  loading: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  totalCount: number;
  currentCount: number;
  onGridReady?: (params: any) => void;
  onTargetEdit?: (targetId: number) => void;
  onTargetUpload?: (targetId: number) => void;
  searchText?: string;
}

const TargetManagementDataGrid: React.FC<TargetManagementDataGridProps> = ({
  targets,
  loading,
  onLoadMore,
  isLoadingMore,
  totalCount,
  currentCount,
  onGridReady,
  onTargetEdit,
  onTargetUpload,
  searchText
}) => {
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentPageSize, setCurrentPageSize] = useState(20);
  const [rowData, setRowData] = useState<any[]>([]);

  // Update rowData when targets prop changes
  useEffect(() => {
    if (Array.isArray(targets)) {
      setRowData(targets);
    } else {
      setRowData([]);
    }
  }, [targets]);

  // Effect to show/hide loading overlay based on loading prop
  useEffect(() => {
    if (gridApi) {
      if (loading) {
        gridApi.showLoadingOverlay();
      } else {
        gridApi.hideOverlay();
      }
    }
  }, [loading, gridApi]);

  // Effect to apply quick filter when searchText changes
  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.setQuickFilter(searchText || '');
    }
  }, [searchText]);

  const renderTruncatedName = useCallback((params: any) => {
    const value = params.value;
    const displayValue = value !== undefined && value !== null && value !== '' ? value : '-';

    return (
      <span
        className="block w-full truncate"
        title={typeof value === 'string' && value.length > 0 ? value : undefined}
      >
        {displayValue}
      </span>
    );
  }, []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    suppressMovable: true,
    floatingFilter: false,
    flex: 1,
    minWidth: 100,
    headerClass: 'target-header-cell'
  }), []);

  // Custom cell renderer for the actions column
  const ActionsCellRenderer = (params: any) => {
    return (
      <TargetActionsCellRenderer
        params={params}
        onTargetEdit={onTargetEdit}
        onTargetUpload={onTargetUpload}
      />
    );
  };

  // Column definitions
  const columnDefs = useMemo<ColDef[]>(() => [
    {
      headerName: 'Target Name',
      field: 'targetName',
      sortable: true,
      filter: 'agTextColumnFilter',
      minWidth: 200,
      flex: 1.5,
      tooltipField: 'targetName',
      cellRenderer: renderTruncatedName,
      cellStyle: { overflow: 'hidden' }
    },
    {
      headerName: 'Target Period',
      field: 'targetPeriod',
      sortable: true,
      filter: 'agTextColumnFilter',
      minWidth: 150,
      flex: 1,
      valueFormatter: (params: any) => {
        return params.value !== undefined && params.value !== null ? params.value : '-';
      }
    },
    {
      headerName: 'Target For',
      field: 'targetFor',
      sortable: true,
      filter: 'agTextColumnFilter',
      minWidth: 150,
      flex: 1,
      valueFormatter: (params: any) => {
        return params.value !== undefined && params.value !== null ? params.value : '-';
      }
    },
    {
      headerName: 'Status',
      field: 'status',
      sortable: true,
      filter: 'agTextColumnFilter',
      minWidth: 120,
      flex: 0.8,
      cellRenderer: StatusCell,
      headerComponent: () => <GridHeaderCenterCell label="Status" />,
      getQuickFilterText: (params) => {
        // Convert numeric status to text for search functionality
        const status = params.value;
        if (typeof status === "number") {
          return status === 1 ? "Active" : status === 0 ? "Inactive" : status.toString();
        }
        return (status ?? "").toString();
      }
    },
    {
      headerName: 'Actions',
      field: 'actions',
      cellRenderer: ActionsCellRenderer,
      flex: 0.6,
      width: 160,
      minWidth: 160,
      maxWidth: 200,
      sortable: false,
      filter: false,
      resizable: false,
      cellStyle: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        paddingLeft: 0,
        paddingRight: 0
      },
      headerComponent: () => <GridHeaderCenterCell label="Actions" />
    }
  ], [onTargetEdit, onTargetUpload, renderTruncatedName]);

  // Grid options for the ag-grid component
  const gridOptions = useMemo<GridOptions>(() => ({
    pagination: true,
    paginationPageSize: currentPageSize,
    paginationPageSizeSelector: [20, 50, 100, 500],
    suppressMovableColumns: true,
    animateRows: true,
    domLayout: 'normal',
    rowHeight: undefined,
    headerHeight: 48,
    suppressColumnVirtualisation: true,
    suppressRowHoverHighlight: false,
    suppressPaginationPanel: true
  }), [currentPageSize]);

  const handleGridReady = useCallback((params: any) => {
    console.log('TargetManagementDataGrid grid ready, setting gridApi', params.api);
    setGridApi(params.api);

    // Initialize pagination settings
    if (params.api) {
      params.api.paginationSetPageSize(currentPageSize);
      if (currentPage > 0) {
        params.api.paginationGoToPage(currentPage);
      }
    }

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

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [isLoadingMore, onLoadMore]);

  const loadingOverlayComponent = useMemo(() => {
    return () => (
      <div
        className="ag-overlay-loading-center flex items-center justify-center bg-transparent shadow-none border-none"
        style={{ backgroundColor: 'transparent', boxShadow: 'none', border: 'none' }}
      >
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <div className="mt-4 text-sm text-gray-700">Loading targets...</div>
        </div>
      </div>
    );
  }, []);

  // Custom no rows overlay component
  const noRowsOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-no-rows-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="text-lg text-gray-600 mb-2">No targets found</div>
          <div className="text-sm text-gray-500">Try adjusting your filters or add a new target</div>
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
            rowData={rowData}
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
              loadingMessage: 'Loading targets...'
            }}
            noRowsOverlayComponent={noRowsOverlayComponent}
          />
        </div>

        {/* Pagination and Load More controls */}
        <AGGridPagination
          gridApi={gridApi}
          totalItems={targets.length}
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          setCurrentPage={setCurrentPage}
          setCurrentPageSize={setCurrentPageSize}
          handleLoadMore={onLoadMore}
          isLoadingMore={isLoadingMore}
          totalCount={totalCount}
          currentCount={currentCount || targets.length}
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

export default TargetManagementDataGrid;
