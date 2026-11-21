import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { AgGridReact } from "ag-grid-react";
import { ColDef, GridApi, GridOptions, GridReadyEvent } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import AGGridPagination from "../common/AGGridPagination";
// Import the DeckGridData interface from the API file
interface DeckGridData {
  id: number;
  code: string;
  name: string;
  cards: number;
  assigned: number;
  due: string;
  completion: string;
  status: string;
  contentTopicName?: string;
}
import StatusCell from "../common/StatusCell";
import GridHeaderCenterCell from "../common/GridHeaderCenterCell";
import ContentActionsCell from "./sub-components/action-component/ContentActionsCell";
import styles from "./css/ContentDeckDataGrid.module.css";

interface ContentDeckDataGridProps {
    onGridReady?: (gridApi: GridApi) => void;
    onEditDeck?: (id: number) => void;
    data: DeckGridData[];
    loading?: boolean;
}

const ContentDeckDataGrid: React.FC<ContentDeckDataGridProps> = ({
    onGridReady,
    onEditDeck,
    data,
    loading = false,
}) => {
    const searchTerm = useSelector((state: RootState) => state.contentDeck.searchTerm);
    const gridRef = useRef<AgGridReact<DeckGridData>>(null);

    const [gridApi, setGridApi] = useState<GridApi | null>(null);
    const [currentPageSize, setCurrentPageSize] = useState<number>(10);
    const [currentPage, setCurrentPage] = useState<number>(0);


    // Download handler for action button
    const handleDownload = useCallback((id: number) => {
        // do nothing
    }, []);

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
        if (onEditDeck) {
            onEditDeck(id);
        }
    }, [onEditDeck]);

    const columnDefs: ColDef[] = useMemo(() => [
        {
            field: 'deckCode',
            headerName: 'Serial No',
            sortable: true,
            width: 120
        },
        {
            field: 'deckName',
            headerName: 'Deck Name',
            sortable: true,
            flex: 1,
            minWidth: 200
        },
        {
            field: 'contentTopicName',
            headerName: 'Content Topic',
            sortable: true,
            flex: 1,
            minWidth: 150
        },
        {
            field: 'cards',
            headerName: '#Cards',
            sortable: true,
            width: 100
        },
        {
            field: 'roleNames',
            headerName: 'Roles',
            sortable: true,
            width: 200
        },
        {
            field: 'dueBy',
            headerName: 'Due By',
            sortable: true,
            width: 120
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
                <ContentActionsCell
                    data={params.data}
                    onDeckEdit={handleEdit}
                    // onDownload={handleDownload}
                />
            ),
            width: 80,
            sortable: false,
            filter: false,
            headerComponent: () => <GridHeaderCenterCell label="Actions" />
        }
    ], [handleEdit, handleDownload]);

    // Grid ready handler (matches OpportunityDataGrid pattern)
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

    // Grid options for AG Grid pagination (matches OpportunityDataGrid)
    const gridOptions = useMemo<GridOptions>(() => ({
        pagination: true,
        paginationPageSize: currentPageSize,
        paginationPageSizeSelector: false, // Disable built-in page size selector
        suppressMovableColumns: true,
        animateRows: true,
        domLayout: 'normal',
        headerHeight: 48,
        suppressColumnVirtualisation: true,
        suppressRowHoverHighlight: false,
        suppressPaginationPanel: true, // Hide default pagination panel
        paginationAutoPageSize: false // Disable auto page sizing
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
                        overlayNoRowsTemplate="No records found"
                        loadingOverlayComponent={loadingOverlayComponent}
                        loadingOverlayComponentParams={{
                            loadingMessage: 'Loading Content Decks...'
                        }}
                        rowHeight={48}
                        domLayout='normal'
                    />
                </div>
                
                {/* AG Grid Pagination Component (matches OpportunityDataGrid) */}
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

export default ContentDeckDataGrid;
