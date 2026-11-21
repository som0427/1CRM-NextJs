import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions, GridReadyEvent, GridApi, RowDragEndEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { DocumentData } from '../../lib/models/document.model';
import StatusCell from '../common/StatusCell';

import DocumentActionsCellRenderer from './subs/DocumentActionsCellRenderer';
import GridHeaderCenterCell from '../common/GridHeaderCenterCell';
import GridHeaderLeftCell from '../common/GridHeaderLeftCell';

interface DocumentDataGridProps {
  documents: DocumentData[];
  allDocuments?: DocumentData[];
  loading: boolean;
  onDocumentView?: (document: DocumentData) => void;
  onDocumentEdit: (document: DocumentData) => void;
  onDocumentDelete: (document: DocumentData) => void;
  onDocumentDownload: (document: DocumentData) => void;
  onDocumentShare: (document: DocumentData) => void;
  onGridReady?: (gridApi: any) => void;
  searchText?: string;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  totalCount?: number | null;
  currentCount?: number;
  onRowDragEnd?: (event: RowDragEndEvent) => void;
  onToggleExpand?: (documentId: number) => void;
}

const DocumentDataGrid: React.FC<DocumentDataGridProps> = ({
  documents,
  allDocuments,
  loading,
  onDocumentView,
  onDocumentEdit,
  onDocumentDelete,
  onDocumentDownload,
  onDocumentShare,
  onGridReady: propOnGridReady,
  searchText,
  onLoadMore,
  isLoadingMore = false,
  totalCount = null,
  currentCount = 0,

  onToggleExpand
}) => {
  const gridRef = React.useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<DocumentData[]>([]);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  // Effect to update row data when documents prop changes
  useEffect(() => {
    if (documents) {
      setRowData(documents);
      // Force grid to refresh cells to update expand/collapse icons
      if (gridApi) {
        gridApi.refreshCells({ force: true });
      }
    }
  }, [documents, gridApi]);

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

  // Name cell renderer with tree structure and custom HTML5 drag and drop
  const NameCellRenderer = (props: any) => {
    const { data, node } = props;
    if (!data) return null;

    const isFolder = data.type === 'folder'; // Now properly checking string type
    const level = data.level || 0; // Use data.level instead of node.level for better control
    const isExpanded = data.isExpanded;
    const paddingLeft = level * 20; // Similar to Angular padding

    // Check if this folder has any children (sub-folders or documents)
    // Use allDocuments (complete dataset) if available, otherwise fall back to rowData
    const datasetToCheck = allDocuments || rowData;
    const hasChildren = isFolder && datasetToCheck.some(doc => doc.parentId === data.id);

    const handleToggleExpand = (e: React.MouseEvent) => {
      e.stopPropagation();
      // Call the parent's toggle function to update the main state
      if (onToggleExpand && isFolder && hasChildren) {
        onToggleExpand(data.id);
      }
    };



    return (
      <div 
        key={`name-cell-${data.id}-${data.isExpanded}`}
        className="flex items-center h-full w-full"
        style={{ paddingLeft: `${paddingLeft}px` }}
      >

        {/* Expand/Collapse arrow for folders - only show if folder has children */}
        {isFolder && hasChildren ? (
          <button
            onClick={handleToggleExpand}
            className="mr-2 flex items-center justify-center w-4 h-4 text-gray-600 hover:text-gray-800"
          >
            {isExpanded ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ) : (
          <div className="w-6 h-4 mr-2"></div> // Spacer for non-folders or empty folders
        )}

        {/* Icon - Different for folders vs documents */}
        <div className="mr-2 flex items-center">
          {isFolder ? (
            <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /> 
            </svg>
          )}
        </div>

        {/* Name */}
        <span className="text-sm text-gray-900 truncate" key={`${data.id}-${data.isExpanded}`}>
          {data.name}
        </span>
      </div>
    );
  };

  
  // Custom cell renderer for the actions column
  const ActionsCellRenderer = (params: any) => {
    return (
      <DocumentActionsCellRenderer
        params={params}
        onDocumentEdit={onDocumentEdit}
        onDocumentDelete={onDocumentDelete}
        onDocumentDownload={onDocumentDownload}
        onDocumentShare={onDocumentShare}
      />
    );
  };

  // Handle cell clicked for action buttons
  const onCellClicked = (params: any) => {
    const action = params.event?.target?.getAttribute('data-action');
    if (!action) return;
    
    const document = params.data;
    if (action === 'edit' && onDocumentEdit) {
      onDocumentEdit(document);
    } else if (action === 'download' && onDocumentDownload) {
      onDocumentDownload(document);
    }
  };

  // Column definitions
  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'Name (In Display Order)',
      field: 'name',
      // Use flex so the grid fills available width responsively
      flex: 1,
      minWidth: 500,

      cellRenderer: NameCellRenderer,
      headerComponent: () => <GridHeaderLeftCell label="Name (In Display Order)" />,
      resizable: true,
      filter: true
    },
    {
      headerName: 'Shared With',
      field: 'sharedWith',
      flex: 0.6,
      minWidth: 220,
      headerComponent: () => <GridHeaderLeftCell label="Shared With" />,
      resizable: true,
      filter: true
    },
    {
      headerName: 'Status',
      field: 'status',
      flex: 0.4,
      minWidth: 160,
      cellRenderer: StatusCell,
      headerComponent: () => <GridHeaderCenterCell label="Status" />,
      cellStyle: { 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center'
      },
      resizable: true
    },
    {
      headerName: 'Actions',
      field: 'actions',
      flex: 0.4,
      minWidth: 160,
      sortable: false,
      filter: false,
      cellRenderer: ActionsCellRenderer,
      headerComponent: () => <GridHeaderLeftCell label="Actions" />,
      resizable: false,
      cellStyle: { 
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center'
      }
    }
  ], []);

  // Default column definition
  const defaultColDef: ColDef = useMemo(() => ({
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

  // Grid options
  const gridOptions: GridOptions = useMemo(() => ({
    headerHeight: 48,
    rowHeight: 48,
    animateRows: true,
    suppressCellFocus: false,
    suppressRowHoverHighlight: false,
    rowSelection: 'single',
    pagination: false,
    suppressPaginationPanel: true,
    suppressScrollOnNewData: true,
    getRowId: (params) => params.data.id.toString(),
    // Fit columns to grid width to avoid right-side whitespace when zooming out
    autoSizeStrategy: { type: 'fitGridWidth', defaultMinWidth: 100 },
    // Completely disable AG Grid drag to prevent blank page
    // We'll implement custom drag using HTML5 drag and drop
    suppressRowClickSelection: false,
    enableCellTextSelection: true,
    rowClassRules: {
      'ag-row-selected-custom': (params) => {
        // Custom selected row styling
        return params.node.isSelected();
      },
    }
  }), [documents]);
  
  // Handle grid ready and perform initial sizing
  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    if (propOnGridReady) {
      propOnGridReady(params.api);
    }
    try {
      // Fit columns to grid width
      // @ts-ignore optional legacy API present for backwards compatibility
      if (typeof (params.api as any).sizeColumnsToFit === 'function') {
        (params.api as any).sizeColumnsToFit();
      }
    } catch {}
  }, [propOnGridReady]);

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

  // Refit on window resize (and zoom level changes)
  useEffect(() => {
    if (!gridApi) return;
    const handleResize = () => {
      try {
        // Fit columns to grid width on window resize
        // @ts-ignore optional legacy API present for backwards compatibility
        if (typeof (gridApi as any).sizeColumnsToFit === 'function') {
          (gridApi as any).sizeColumnsToFit();
        }
      } catch {}
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [gridApi]);

  const loadingOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-loading-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <div className="mt-4 text-sm text-gray-700">Loading documents...</div>
        </div>
      </div>
    );
  }, []);

  // Custom no rows overlay component
  const noRowsOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-no-rows-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="text-lg text-gray-600 mb-2">No documents found</div>
          <div className="text-sm text-gray-500">Try adjusting your filters or uploading a new document</div>
        </div>
      </div>
    );
  }, []);

  return (
    <div className="flex flex-col w-full grid-height-190">
      <div className="flex-1 w-full ag-theme-alpine" style={{ position: 'relative', zIndex: 1 }}>
        <div 
          className="w-full h-full relative" 
          style={{ 
            minHeight: '400px',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#ffffff'
          }}
        >
          <style jsx global>{`
            .ag-theme-alpine {
              --ag-row-hover-color: rgba(59, 130, 246, 0.1);
            }
            .ag-theme-alpine .ag-root-wrapper {
              border: none !important;
            }
          `}</style>
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
              loadingMessage: 'Loading documents...'
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

        {/* Save Display Order Button */}
       {/* <div className="flex items-center justify-start">
          <button
            onClick={() => {
              // TODO: Implement save display order functionality
              console.log('Save Display Order clicked');
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
          >
            Save Display Order
          </button>
        </div>*/}
      </div>
    </div>
  );
};

export default DocumentDataGrid;
