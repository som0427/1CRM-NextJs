import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions, GridReadyEvent, GridApi } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import AGGridPagination from '../common/AGGridPagination';
import GridHeaderCenterCell from '../common/GridHeaderCenterCell';
import { UploadLogItem } from '../../lib/models/upload-log.model';
import styles from './UploadLogDataGrid.module.css';

interface UploadLogDataGridProps {
  data: UploadLogItem[];
  loading: boolean;
  onGridReady?: (gridApi: any) => void;
  searchText?: string;
}

// Status Badge Component
const StatusBadge = ({ value }: { value: string }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500';
      case 'In Progress':
        return 'bg-orange-400';
      case 'Failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex justify-center">
      <span className={`px-3 py-1 rounded-full text-white text-xs font-medium ${getStatusColor(value)}`}>
        {value}
      </span>
    </div>
  );
};

import DownloadActionButton from '../common/buttons/action-button/DownloadActionButton';

// Wrapper to use DownloadActionButton for opening URLs
const DownloadCell: React.FC<{ url: string; rowIndex: number; actionType?: string }> = ({ url, rowIndex, actionType }) => {
  const isBulkAction = actionType === 'Bulk Add' || actionType === 'Bulk Edit';

  const onClick = () => {
    if (!isBulkAction && url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="flex justify-center">
      <DownloadActionButton
        id={rowIndex}
        onClick={() => onClick()}
        disabled={isBulkAction}
        className={isBulkAction ? 'opacity-50 cursor-not-allowed' : ''}
      />
    </div>
  );
};

const UploadLogDataGrid: React.FC<UploadLogDataGridProps> = ({
  data,
  loading,
  onGridReady: propOnGridReady,
  searchText,
}) => {
  const gridRef = React.useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<UploadLogItem[]>([]);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Update rowData when data prop changes
  useEffect(() => {
    if (Array.isArray(data)) {
      setRowData(data);
    } else {
      setRowData([]);
    }
  }, [data]);

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

  // Tooltip renderer - shows full text on hover with ellipsis truncation
  const renderTruncatedCell = useCallback((params: any) => {
    const value = params.value;
    const displayValue = value !== undefined && value !== null && value !== '' ? value : '-';

    return (
      <span
        className={styles.ellipsisCell}
        title={typeof value === 'string' && value.length > 0 ? value : undefined}
      >
        {displayValue}
      </span>
    );
  }, []);


  // Column definitions
  const columnDefs = useMemo<ColDef[]>(() => {
    const columns: ColDef[] = [];

    // Uploaded By column
    columns.push({
      field: 'uploadedBy',
      headerName: 'Uploaded By',
      minWidth: 120,
      sortable: true,
      filter: true,
      cellRenderer: renderTruncatedCell,
      cellStyle: { overflow: 'hidden' },
    });

    // Uploaded On column
    columns.push({
      field: 'uploadedOn',
      headerName: 'Uploaded On',
      minWidth: 120,
      sortable: true,
      filter: true,
      cellRenderer: renderTruncatedCell,
      cellStyle: { overflow: 'hidden' },
    });

    // Records column
    columns.push({
      field: 'records',
      headerName: 'Records',
      minWidth: 120,
      flex: 0,
      sortable: true,
      filter: true,
      valueFormatter: (params) => {
        const value = params.value;
        return value != null ? value.toLocaleString() : '0';
      },
    });

    // Expires In column
    columns.push({
      field: 'expiresIn',
      headerName: 'Expires In',
      minWidth: 120,
      flex: 0,
      sortable: true,
      filter: true,
      cellStyle: (params: any) => {
        const text: string = params.value || '';
        const match = text.match(/\d+/);
        const days = match ? parseInt(match[0], 10) : NaN;
        if (!isNaN(days) && days <= 3) {
          return { color: '#ef4444' }; // red-500
        }
        return { color: '#111827' }; // gray-900 (default blackish)
      },
    });

    // Entity column
    columns.push({
      field: 'entity',
      headerName: 'Entity',
      minWidth: 120,
      sortable: true,
      filter: true,
      cellRenderer: renderTruncatedCell,
      cellStyle: { overflow: 'hidden' },
    });

    // Action Type column
    columns.push({
      field: 'actionType',
      headerName: 'Action Type',
      minWidth: 120,
      sortable: true,
      filter: true,
      cellRenderer: renderTruncatedCell,
      cellStyle: { overflow: 'hidden' },
    });

    // Status column
    columns.push({
      field: 'status',
      headerName: 'Status',
      minWidth: 120,
      flex: 0,
      cellRenderer: (params: any) => <StatusBadge value={params.value} />,
      headerComponent: () => <GridHeaderCenterCell label="Status" />,
      cellStyle: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
      sortable: true,
      filter: true,
    });

    // Uploaded Files column
    columns.push({
      field: 'uploadedFileUrl',
      headerName: 'Uploaded Files',
      minWidth: 150,
      flex: 0,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => (
        <DownloadCell
          url={params.value}
          rowIndex={params.rowIndex}
          actionType={params.data?.actionType}
        />
      ),
      headerComponent: () => <GridHeaderCenterCell label="Uploaded Files" />,
      cellStyle: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      },
    });

    // Response Files column
    columns.push({
      field: 'responseFileUrl',
      headerName: 'Response Files',
      minWidth: 150,
      flex: 0,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => <DownloadCell url={params.value} rowIndex={params.rowIndex} />,
      headerComponent: () => <GridHeaderCenterCell label="Response Files" />,
      cellStyle: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      },
    });

    return columns;
  }, [renderTruncatedCell]);

  // Default column definitions
  const defaultColDef = useMemo<ColDef>(() => ({
    flex: 1,
    minWidth: 100,
    sortable: true,
    filter: true,
    resizable: true,
    suppressMovable: true,
    lockPosition: true,
    lockVisible: true,
    lockPinned: true,
    floatingFilter: false,
    suppressMenu: false,
    menuTabs: ['filterMenuTab', 'generalMenuTab', 'columnsMenuTab']
  }), []);

  // Grid options
  const gridOptions = useMemo<GridOptions>(() => ({
    pagination: true,
    paginationPageSize: currentPageSize,
    paginationPageSizeSelector: [10, 20, 50, 100],
    suppressMovableColumns: true,
    animateRows: true,
    domLayout: 'normal',
    headerHeight: 48,
    suppressColumnVirtualisation: true,
    suppressRowHoverHighlight: false,
    suppressPaginationPanel: true,
    suppressContextMenu: false,
    preventDefaultOnContextMenu: false
  }), [currentPageSize]);

  // Grid ready handler
  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    
    if (data && data.length > 0) {
      params.api.setRowData(data);
      setRowData(data);
    }
    
    setTimeout(() => {
      params.api.sizeColumnsToFit();
    }, 100);
    
    params.api.paginationSetPageSize(currentPageSize);
    if (currentPage > 0) {
      params.api.paginationGoToPage(currentPage);
    }
    
    if (propOnGridReady) {
      propOnGridReady(params.api);
    }
  }, [data, propOnGridReady, currentPageSize, currentPage]);

  // Auto fit columns when grid size changes and when data is first rendered
  const onGridSizeChanged = useCallback(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.sizeColumnsToFit();
    }
  }, []);

  const onFirstDataRendered = useCallback(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.sizeColumnsToFit();
    }
  }, []);

  const loadingOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-loading-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <div className="mt-4 text-sm text-gray-700">Loading upload logs...</div>
        </div>
      </div>
    );
  }, []);

  const noRowsOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-no-rows-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="text-lg text-gray-600 mb-2">No upload logs found</div>
          <div className="text-sm text-gray-500">Try adjusting your search</div>
        </div>
      </div>
    );
  }, []);

  return (
    <div className={`${styles.wrapper} grid-height-190`}>
      <div className={`${styles.gridContainer} ag-theme-alpine`}>
        <div className="w-full h-full relative">
          <AgGridReact
            ref={gridRef}
            gridOptions={gridOptions}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            onGridReady={onGridReady}
            onGridSizeChanged={onGridSizeChanged}
            onFirstDataRendered={onFirstDataRendered}
            enableCellTextSelection={true}
            ensureDomOrder={true}
            domLayout='normal'
            overlayNoRowsTemplate="No records found"
            loadingOverlayComponent={loadingOverlayComponent}
            loadingOverlayComponentParams={{
              loadingMessage: 'Loading upload logs...'
            }}
            noRowsOverlayComponent={noRowsOverlayComponent}
            suppressCellFocus={false}
            stopEditingWhenCellsLoseFocus={true}
          />
        </div>

        <AGGridPagination
          gridApi={gridApi}
          totalItems={rowData.length}
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          setCurrentPage={setCurrentPage}
          setCurrentPageSize={setCurrentPageSize}
          pageSizeOptions={[20, 50, 100, 500]}
        />
      </div>
    </div>
  );
};

export default UploadLogDataGrid;
