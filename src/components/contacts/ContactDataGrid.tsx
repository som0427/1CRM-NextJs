import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions, GridReadyEvent, GridApi } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { ContactData } from '../../lib/models/contact/contactModels';
import { useRouter } from 'next/router';
import AGGridPagination from '../common/AGGridPagination';
import ContactActionsCellRenderer from './subs/ContactActionsCellRenderer';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import FileViewerCellRenderer from '@/components/common/FileViewerCellRenderer';
import GridHeaderCenterCell from '../common/GridHeaderCenterCell';
import StatusCell from '../common/StatusCell';

interface ContactDataGridProps {
  contacts: ContactData[];
  loading: boolean;
  dynamicColumns?: {field: string, headerName: string, attributeType: number}[]; // Add dynamicColumns prop
  onContactView?: (contact: ContactData) => void;
  onContactEdit: (contact: ContactData) => void;
  onGridReady?: (gridApi: any) => void;
  searchText?: string;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  totalCount?: number | null;
  currentCount?: number;
}

const ContactDataGrid: React.FC<ContactDataGridProps> = ({
  contacts,
  loading,
  dynamicColumns = [], // Default to empty array
  onContactView,
  onContactEdit,
  onGridReady: propOnGridReady,
  searchText,
  onLoadMore,
  isLoadingMore = false,
  totalCount = null,
  currentCount = 0
}) => {
  const router = useRouter();
  const gridRef = React.useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<ContactData[]>([]);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Update rowData when contacts prop changes
  useEffect(() => {
    // Ensure contacts is an array before setting rowData
    if (Array.isArray(contacts)) {
      setRowData(contacts);
    } else {
      console.error('ContactDataGrid received non-array contacts:', contacts);
      setRowData([]);
    }
  }, [contacts]);

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
      <ContactActionsCellRenderer
        params={params}
        onContactView={onContactView}
        onContactEdit={onContactEdit}
      />
    );
  };

  // Handle cell clicked for action buttons
  const onCellClicked = (params: any) => {
    const action = params.event?.target?.getAttribute('data-action');
    if (!action) return;
    
    const contact = params.data;
    
    if (action === 'view' && onContactView) {
      onContactView(contact);
    } else if (action === 'edit' && onContactEdit) {
      onContactEdit(contact);
    } else if (action === 'dashboard') {
      // Navigate to entity-dashboard page with contactId and type parameters
      router.push(`/contact-dashboard/${contact.id}`);
    }
  };

  // Build column definitions dynamically based on props, with ID column pinned left and Actions pinned right
  const columnDefs = useMemo<ColDef[]>(() => {
      // Start with dynamic columns from the parent component
      const columns: ColDef[] = [];
      
      // Process dynamic columns
      if (dynamicColumns && dynamicColumns.length > 0) {
        dynamicColumns.forEach(col => {
          if([CustomAttributeTypeEnum.IMAGE,
            CustomAttributeTypeEnum.AUDIO_VIDEO,
            CustomAttributeTypeEnum.DOCUMENT_UPLOAD].includes(col.attributeType)){
              columns.push({
                field: col.field,
                headerName: col.headerName,
                cellRenderer: (params: any) => {
                  return (
                    <FileViewerCellRenderer
                      value={params.value}
                      data={params.data}
                      colDef={params.colDef}
                      attributeType={col.attributeType}
                    />
                  );
                },
                flex: 1,
                minWidth: 120,
                sortable: false,
                filter: false
              });
            }
            else{
              columns.push({
                field: col.field,
                headerName: col.headerName,
                sortable: true,
                flex: 1,
                minWidth: 120
              });
            }
        });
      }
      
      // Add Status column before Actions column
      columns.push({
        field: 'status',
        headerName: 'Status',
        width: 120,
        minWidth: 120,
        maxWidth: 120,
        cellRenderer: StatusCell,
        headerComponent: () => <GridHeaderCenterCell label="Status" />,
        cellStyle: {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        },
        suppressSizeToFit: true,
        resizable: true
      });
      
      // Always add the actions column at the end, pinned to the right
      columns.push({
        field: 'actions',
        headerName: 'Actions',
        width: 150,
        minWidth: 150,
        maxWidth: 150,
        sortable: false,
        filter: false,
        cellRenderer: ActionsCellRenderer,
        headerComponent: () => <GridHeaderCenterCell label="Actions" />,
        cellStyle: {
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          textAlign: 'left'
        },
        suppressSizeToFit: true,
        resizable: false
      });
      
      return columns;
    }, [dynamicColumns]);

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
    if (contacts && contacts.length > 0) {
      params.api.setRowData(contacts);
      setRowData(contacts);
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
  }, [contacts, propOnGridReady, currentPageSize, currentPage]);

  const loadingOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-loading-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <div className="mt-4 text-sm text-gray-700">Loading contacts...</div>
        </div>
      </div>
    );
  }, []);

  // Custom no rows overlay component
  const noRowsOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-no-rows-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="text-lg text-gray-600 mb-2">No contacts found</div>
          <div className="text-sm text-gray-500">Try adjusting your filters or adding a new contact</div>
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
            onCellClicked={onCellClicked}
            enableCellTextSelection={true}
            ensureDomOrder={true}
            domLayout='normal'
            overlayNoRowsTemplate="No records found"
            loadingOverlayComponent={loadingOverlayComponent}
            loadingOverlayComponentParams={{
              loadingMessage: 'Loading contacts...'
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
          totalItems={contacts.length}
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          setCurrentPage={setCurrentPage}
          setCurrentPageSize={setCurrentPageSize}
          handleLoadMore={onLoadMore}
          isLoadingMore={isLoadingMore}
          totalCount={totalCount}
          currentCount={currentCount || contacts.length}
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
export default ContactDataGrid;
