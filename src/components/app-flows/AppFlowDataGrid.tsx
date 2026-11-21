import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { AgGridReact } from "ag-grid-react";
import { ColDef, GridApi, GridOptions, GridReadyEvent } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import AGGridPagination from "../common/AGGridPagination";
import StatusCell from "../common/StatusCell";
import GridHeaderCenterCell from "../common/GridHeaderCenterCell";
import AppFlowActionsCell from "./sub-components/AppFlowActionsCell";

interface AppFlowGridData {
  id: number;
  flowName: string;
  flowType: string;
  roleName: string;
  createdBy: string;
  createdOn: string;
  status: number;
}

interface AppFlowDataGridProps {
    onGridReady?: (gridApi: GridApi) => void;
    onEditFlow?: (id: number) => void;
    onCopyFlow?: (id: number) => void;
    data: AppFlowGridData[];
    loading?: boolean;
}

const AppFlowDataGrid: React.FC<AppFlowDataGridProps> = ({
    onGridReady,
    onEditFlow,
    onCopyFlow,
    data,
    loading = false,
}) => {
    const searchTerm = useSelector((state: RootState) => state.appflow.searchTerm);
    const gridRef = useRef<AgGridReact<AppFlowGridData>>(null);

    const [gridApi, setGridApi] = useState<GridApi | null>(null);
    const [currentPageSize, setCurrentPageSize] = useState<number>(10);
    const [currentPage, setCurrentPage] = useState<number>(0);

    // Use AG Grid quick filter for global search
    useEffect(() => {
        if (gridApi) {
            gridApi.setGridOption('quickFilterText', searchTerm);
        }
    }, [searchTerm, gridApi]);

    // Show/hide loading overlay
    useEffect(() => {
        if (gridApi) {
            if (loading) gridApi.showLoadingOverlay();
            else gridApi.hideOverlay();
        }
    }, [loading, gridApi]);

    const defaultColDef: ColDef = {
        flex: 1,
        minWidth: 120,
        resizable: true,
        sortable: true,
        filter: true,
    };

    const handleEdit = useCallback((id: number) => {
        if (onEditFlow) {
            onEditFlow(id);
        }
    }, [onEditFlow]);

    const handleCopy = useCallback((id: number) => {
        if (onCopyFlow) {
            onCopyFlow(id);
        }
    }, [onCopyFlow]);


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

    const columnDefs: ColDef[] = useMemo(() => [
        {
            field: 'flowName',
            headerName: 'Flow Name',
            sortable: true,
            minWidth: 120,
            tooltipField: 'flow',
            cellRenderer : renderTruncatedName,
            cellStyle: { overflow: 'hidden' }
        },
        {
            field: 'flowType',
            headerName: 'Flow Type',
            sortable: true,
            minWidth: 120
        },
        {
            field: 'roleName',
            headerName: 'Role',
            sortable: true,
            width: 150,
        },
        {
            field: 'createdBy',
            headerName: 'Created By',
            sortable: true,
            width: 150
        },
        {
            field: 'createdOn',
            headerName: 'Created On',
            sortable: true,
            width: 180,
            valueFormatter: (params) => {
                if (!params.value) return '';
                const date = new Date(params.value);
                const day = date.getDate().toString().padStart(2, '0');
                const month = date.toLocaleString('en-US', { month: 'short' });
                const year = date.getFullYear();
                const hours = date.getHours();
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const formattedHours = (hours % 12 || 12).toString().padStart(2, '0');
                return `${day} ${month}, ${year} at ${formattedHours}:${minutes} ${ampm}`;
            }
        },
        {
            field: 'status',
            headerName: 'Status',
            sortable: true,
            width: 80,
            cellRenderer: StatusCell,
            headerComponent: () => <GridHeaderCenterCell label="Status" />
        },
        {
            headerName: 'Actions',
            field: 'actions',
            cellRenderer: (params: any) => (
                <AppFlowActionsCell
                    data={params.data}
                    onFlowEdit={handleEdit}
                    onFlowCopy={handleCopy}
                />
            ),
            width: 80,
            sortable: false,
            filter: false,
            headerComponent: () => <GridHeaderCenterCell label="Actions" />
        }
    ], [handleEdit, handleCopy]);

    // Grid ready handler
    const handleGridReady = useCallback((params: GridReadyEvent) => {
        setGridApi(params.api);
        
        // Set the row data first
        if (data && data.length > 0) {
            params.api.setRowData(data);
        }
        
        // Size columns after data is loaded
        setTimeout(() => {
            params.api.sizeColumnsToFit();
        }, 100);
        
        // Initialize pagination with our state values
        params.api.paginationSetPageSize(currentPageSize);
        if (currentPage > 0) {
            params.api.paginationGoToPage(currentPage);
        }
        
        // Call the parent's onGridReady if provided
        if (onGridReady) onGridReady(params.api);
    }, [data, onGridReady, currentPageSize, currentPage]);

    const loadingOverlayComponent = useMemo(() => {
        return () => (
            <div className="ag-overlay-loading-center flex items-center justify-center">
                <div className="flex flex-col items-center p-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            </div>
        );
    }, []);

    // Grid options for AG Grid pagination
    const gridOptions = useMemo<GridOptions>(() => ({
        pagination: true,
        paginationPageSize: currentPageSize,
        paginationPageSizeSelector: false,
        suppressMovableColumns: true,
        animateRows: true,
        domLayout: 'normal',
        headerHeight: 48,
        suppressColumnVirtualisation: true,
        suppressRowHoverHighlight: false,
        suppressPaginationPanel: true,
        paginationAutoPageSize: false
    }), [currentPageSize]);

    return (
        <div className="flex flex-col w-full grid-height-190">
            <div className="flex-1 w-full ag-theme-alpine">
                <div className="w-full h-full relative">
                    <AgGridReact
                        ref={gridRef}
                        gridOptions={gridOptions}
                        rowData={data}
                        columnDefs={columnDefs}
                        defaultColDef={defaultColDef}
                        onGridReady={handleGridReady}
                        suppressRowClickSelection={true}
                        rowSelection="single"
                        overlayNoRowsTemplate="No app flows found"
                        loadingOverlayComponent={loadingOverlayComponent}
                        loadingOverlayComponentParams={{
                            loadingMessage: 'Loading App Flows...'
                        }}
                        rowHeight={48}
                        domLayout='normal'
                    />
                </div>
                
                {/* AG Grid Pagination Component */}
                <AGGridPagination
                    gridApi={gridApi}
                    totalItems={data.length}
                    currentPage={currentPage}
                    currentPageSize={currentPageSize}
                    setCurrentPage={setCurrentPage}
                    setCurrentPageSize={setCurrentPageSize}
                    handleLoadMore={undefined}
                    isLoadingMore={false}
                    totalCount={data.length}
                    currentCount={data.length}
                    pageSizeOptions={[20, 50, 100, 500]}
                />
            </div>
        </div>
    );
};

export default AppFlowDataGrid;