import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions, GridReadyEvent, GridApi } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import AGGridPagination from '../common/AGGridPagination';
import GridHeaderCenterCell from '../common/GridHeaderCenterCell';
import { ExportItem } from '../../lib/models/exports.model';
import DownloadActionButton from '../common/buttons/action-button/DownloadActionButton';

// Static base URL for files (e.g., https://static.1channel.co/)
const STATIC_FILE_BASE_URL = process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL || '';

interface ExportsDataGridProps {
  data: ExportItem[];
  loading: boolean;
  onGridReady?: (gridApi: any) => void;
  searchText?: string;
}

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

const DownloadCell: React.FC<{ url: string; rowIndex: number }> = ({ url, rowIndex }) => {
  const buildDownloadUrl = (filePath: string): string => {
    if (!filePath) return '';
    // If already absolute, return as is
    if (/^https?:\/\//i.test(filePath)) return filePath;
    // Join base and path safely
    const base = STATIC_FILE_BASE_URL || '';
    const joined = `${base.replace(/\/+$/, '/')}${filePath.replace(/^\/+/, '')}`;
    return joined;
  };

  const onClick = () => {
    const fullUrl = buildDownloadUrl(url);
    if (fullUrl) {
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  };
  return (
    <div className="flex justify-center">
      <DownloadActionButton id={rowIndex} onClick={() => onClick()} />
    </div>
  );
};

const ExportsDataGrid: React.FC<ExportsDataGridProps> = ({
  data,
  loading,
  onGridReady: propOnGridReady,
  searchText,
}) => {
  const gridRef = React.useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<ExportItem[]>([]);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(0);

  useEffect(() => {
    if (Array.isArray(data)) {
      setRowData(data);
    } else {
      setRowData([]);
    }
  }, [data]);

  useEffect(() => {
    if (gridApi) {
      if (loading) gridApi.showLoadingOverlay();
      else gridApi.hideOverlay();
    }
  }, [loading, gridApi]);

  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.setQuickFilter(searchText || '');
    }
  }, [searchText]);

  const columnDefs = useMemo<ColDef[]>(() => {
    const columns: ColDef[] = [];

    columns.push({
      field: 'exportedBy',
      headerName: 'Exported By',
      width: 160,
      minWidth: 140,
      sortable: true,
      filter: true,
      resizable: true,
    });

    columns.push({
      field: 'exportedAt',
      headerName: 'Exported At',
      width: 220,
      minWidth: 180,
      sortable: true,
      filter: true,
      resizable: true,
    });

    columns.push({
      field: 'expiresIn',
      headerName: 'Expires In',
      width: 110,
      minWidth: 90,
      sortable: true,
      filter: true,
      resizable: true,
      cellStyle: (params: any) => {
        const text: string = params.value || '';
        const match = text.match(/\d+/);
        const days = match ? parseInt(match[0], 10) : NaN;
        if (!isNaN(days) && days <= 3) {
          return { color: '#ef4444' }; // red-500
        }
        return { color: '#111827' }; // gray-900
      },
    });

    columns.push({
      field: 'report',
      headerName: 'Report',
      width: 260,
      minWidth: 220,
      sortable: true,
      filter: true,
      resizable: true,
      cellRenderer: (params: any) => {
        const fullText: string = params.value || '';
        const shouldTruncate = typeof fullText === 'string' && fullText.length > 40;
        const displayText = shouldTruncate ? `${fullText.slice(0, 40)}...` : fullText;

        return (
          <div
            title={fullText}
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'clip',
              width: '100%'
            }}
          >
            {displayText}
          </div>
        );
      },
    });

    columns.push({
      field: 'dateRange',
      headerName: 'Date Range',
      width: 180,
      minWidth: 160,
      sortable: true,
      filter: true,
      resizable: true,
    });

    columns.push({
      field: 'status',
      headerName: 'Status',
      width: 110,
      minWidth: 110,
      cellRenderer: (params: any) => <StatusBadge value={params.value} />,
      headerComponent: () => <GridHeaderCenterCell label="Status" />,
      cellStyle: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
      resizable: true,
      sortable: true,
      filter: true,
    });

    columns.push({
      field: 'filePath',
      headerName: 'Exported Files',
      width: 130,
      minWidth: 120,
      resizable: false,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => <DownloadCell url={params.value} rowIndex={params.rowIndex} />,
      headerComponent: () => <GridHeaderCenterCell label="Exported Files" />,
      cellStyle: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      },
    });

    return columns;
  }, []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    suppressMovable: true,
    lockPosition: true,
    lockVisible: true,
    lockPinned: true,
    floatingFilter: false,
    suppressMenu: false,
    menuTabs: ['filterMenuTab', 'generalMenuTab', 'columnsMenuTab'],
  }), []);

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
    preventDefaultOnContextMenu: false,
  }), [currentPageSize]);

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
          <div className="mt-4 text-sm text-gray-700">Loading exports...</div>
        </div>
      </div>
    );
  }, []);

  const noRowsOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-no-rows-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="text-lg text-gray-600 mb-2">No exports found</div>
          <div className="text-sm text-gray-500">Try adjusting your search</div>
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
            onGridReady={onGridReady}
            onGridSizeChanged={onGridSizeChanged}
            onFirstDataRendered={onFirstDataRendered}
            enableCellTextSelection={true}
            ensureDomOrder={true}
            domLayout='normal'
            overlayNoRowsTemplate="No records found"
            loadingOverlayComponent={loadingOverlayComponent}
            loadingOverlayComponentParams={{
              loadingMessage: 'Loading exports...'
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

export default ExportsDataGrid;
