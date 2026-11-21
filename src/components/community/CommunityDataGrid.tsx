import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions, GridReadyEvent, GridApi } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { CommunityData } from '../../lib/models/community/community.model';
import AGGridPagination from '../common/AGGridPagination'; 
import GridHeaderCenterCell from '../common/GridHeaderCenterCell';
import GridHeaderLeftCell from '../common/GridHeaderLeftCell';
import CommunityActionsCellRenderer from './subs/CommunityActionsCellRenderer';

interface CommunityDataGridProps {
  community: CommunityData[];
  loading: boolean;
  onCommunityEdit?: (Community: CommunityData) => void;
  onGridReady?: (gridApi: any) => void;
  searchText?: string;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  totalCount?: number | null;
  currentCount?: number;
}

const CommunityDataGrid: React.FC<CommunityDataGridProps> = ({
  community,
  loading,
  onCommunityEdit,
  onGridReady: propOnGridReady,
  searchText,
  onLoadMore,
  isLoadingMore = false,
  totalCount = null,
  currentCount = 0
}) => {
  const gridRef = React.useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<CommunityData[]>([]);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Update rowData when Communitys prop changes
  useEffect(() => {
    // Ensure Communitys is an array before setting rowData
    if (Array.isArray(community)) {
      setRowData(community);
    } else {
      console.error('CommunityDataGrid received non-array Communitys:', community);
      setRowData([]);
    }
  }, [community]);

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

  // Custom cell renderer for the actions column
  const ActionsCellRenderer = (params: any) => {
    return (
      <CommunityActionsCellRenderer
        params={params}
        onCommunityEdit={onCommunityEdit}
      />
    );
  };

  // Handle cell clicked for action buttons
  const onCellClicked = (params: any) => {
    const action = params.event?.target?.getAttribute('data-action');
    if (!action) return;
    
    const community = params.data;
    
    if (action === 'edit' && onCommunityEdit) {
      onCommunityEdit(community);
    }
  };

  // Build column definitions: Community Name, Posted By, Description, Posted, Reactions, Actions
  const columnDefs = useMemo<ColDef[]>(() => {
      const columns: ColDef[] = [];

      columns.push({
        field: 'communityName',
        headerName: 'Community Name',
        flex: 2,
        minWidth: 300,
        sortable: true,
        filter: true,
        suppressSizeToFit: false,
        resizable: true,
        headerComponent: () => <GridHeaderLeftCell label="Community Name" />
      });

      columns.push({
        field: 'postedBy',
        headerName: 'Posted By',
        flex: 1,
        minWidth: 180,
        sortable: true,
        filter: true,
        resizable: true,
        headerComponent: () => <GridHeaderLeftCell label="Posted By" />
      });

      columns.push({
        field: 'description',
        headerName: 'Description',
        flex: 2,
        minWidth: 250,
        sortable: true,
        filter: true,
        resizable: true,
        headerComponent: () => <GridHeaderLeftCell label="Description" />
      });

      columns.push({
        field: 'postedTime',
        headerName: 'Posted',
        flex: 1,
        minWidth: 200,
        sortable: true,
        filter: true,
        resizable: true,
        headerComponent: () => <GridHeaderLeftCell label="Posted" />
      });

      columns.push({
        field: 'reactions',
        headerName: 'Reactions',
        flex: 1,
        minWidth: 140,
        sortable: true,
        filter: true,
        resizable: true,
        headerComponent: () => <GridHeaderLeftCell label="Reactions" />
      });

      columns.push({
        field: 'actions',
        headerName: 'Actions',
        width: 160,
        minWidth: 160,
        sortable: false,
        filter: false,
        cellRenderer: ActionsCellRenderer,
        headerComponent: () => <GridHeaderCenterCell label="Actions" />,
        cellStyle: {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        },
        suppressSizeToFit: true,
        resizable: false
      });

      return columns;
    }, []);

  // Default column definitions
  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    suppressMovable: true,
    lockPosition: true,
    lockVisible: true,
    lockPinned: true,  // This disables pinning
    floatingFilter: false,
    suppressMenu: false,
    menuTabs: ['filterMenuTab', 'generalMenuTab', 'columnsMenuTab']
  }), []);

  // Grid options for the ag-grid component
  const gridOptions = useMemo<GridOptions>(() => ({
    pagination: true,
    paginationPageSize: currentPageSize,
    paginationPageSizeSelector: [10, 20, 50, 100],
    suppressMovableColumns: true,
    animateRows: true,
    // Using normal layout to ensure proper row display
    domLayout: 'normal',
    // Use default row height which works well with the default AG Grid styling
    rowHeight: undefined,
    headerHeight: 48,
    suppressColumnVirtualisation: true,
    suppressRowHoverHighlight: false,
    suppressPaginationPanel: true,
    // Prevent default browser context menu to avoid visibility issues
    suppressContextMenu: false,
    preventDefaultOnContextMenu: false
  }), [currentPageSize]);

  // Grid ready handler
  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    
    // Set the row data first
    if (community && community.length > 0) {
      params.api.setRowData(community);
      setRowData(community);
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
    if (propOnGridReady) {
      propOnGridReady(params.api);
    }
  }, [community, propOnGridReady, currentPageSize, currentPage]);

  // Ensure columns fit when grid size changes (e.g., container width changes)
  const onGridSizeChanged = useCallback(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.sizeColumnsToFit();
    }
  }, []);

  // Ensure columns fit when the first batch of data is rendered
  const onFirstDataRendered = useCallback(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.sizeColumnsToFit();
    }
  }, []);

  // Additionally, respond to window resizes
  useEffect(() => {
    const handleResize = () => {
      if (gridRef.current?.api) {
        gridRef.current.api.sizeColumnsToFit();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadingOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-loading-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <div className="mt-4 text-sm text-gray-700">Loading community...</div>
        </div>
      </div>
    );
  }, []);

  // Custom no rows overlay component
  const noRowsOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-no-rows-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="text-lg text-gray-600 mb-2">No community found</div>
          <div className="text-sm text-gray-500">Try adjusting your filters or adding a new community</div>
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
            onCellClicked={onCellClicked}
            enableCellTextSelection={true}
            ensureDomOrder={true}
            domLayout='normal'
            overlayNoRowsTemplate="No records found"
            loadingOverlayComponent={loadingOverlayComponent}
            loadingOverlayComponentParams={{
              loadingMessage: 'Loading community...'
            }}
            noRowsOverlayComponent={noRowsOverlayComponent}
            suppressCellFocus={false}
            stopEditingWhenCellsLoseFocus={true}
            onCellContextMenu={(params) => {
              // Prevent focus loss on right-click
              if (params.event) {
                const cellElement = params.event.target as HTMLElement;
                if (cellElement) {
                  // Force text to stay visible
                  cellElement.style.color = '#000';
                  cellElement.style.opacity = '1';
                  
                  // Prevent default AG Grid behavior that might hide content
                  setTimeout(() => {
                    const cells = document.querySelectorAll('.ag-cell-focus');
                    cells.forEach((cell: any) => {
                      cell.style.color = '#000';
                      cell.style.opacity = '1';
                    });
                  }, 0);
                }
              }
            }}
          />
        </div>

        {/* Pagination and Load More controls */}
        <AGGridPagination
          gridApi={gridApi}
          totalItems={community.length}
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          setCurrentPage={setCurrentPage}
          setCurrentPageSize={setCurrentPageSize}
          handleLoadMore={onLoadMore}
          isLoadingMore={isLoadingMore}
          totalCount={totalCount}
          currentCount={currentCount || community.length}
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

// Export as a default export for compatibility with the import statement
export default CommunityDataGrid;