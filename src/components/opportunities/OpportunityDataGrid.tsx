import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions, GridReadyEvent, GridApi } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { OpportunityData } from '../../lib/models/opportunity/opportunityModels';
import { useRouter } from 'next/router';
import AGGridPagination from '../common/AGGridPagination';
import OpportunityActionsCellRenderer from './subs/OpportunityActionsCellRenderer';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import FileViewerCellRenderer from '@/components/common/FileViewerCellRenderer';
import GridHeaderCenterCell from '../common/GridHeaderCenterCell';

interface OpportunityDataGridProps {
  opportunities: OpportunityData[];
  loading: boolean;
  dynamicColumns?: {field: string, headerName: string, attributeType: number}[]; // Add dynamicColumns prop
  onOpportunityView: (opportunityId:number) => void;
  onOpportunityEdit: (opportunityId: number) => void;
  onOpportunityDashboard?: (opportunityId: number) => void;
  onGridReady?: (gridApi: any) => void;
  searchText?: string;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  totalCount?: number | null;
  currentCount?: number;
}

const OpportunityDataGrid: React.FC<OpportunityDataGridProps> = ({
  opportunities,
  loading,
  dynamicColumns = [], // Default to empty array
  onOpportunityView,
  onOpportunityEdit,
  onOpportunityDashboard,
  onGridReady: propOnGridReady,
  searchText,
  onLoadMore,
  isLoadingMore = false,
  totalCount = null,
  currentCount = 0
}) => {
  const router = useRouter();
  const gridRef = React.useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<OpportunityData[]>([]);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Update rowData when opportunities prop changes
  useEffect(() => {
    // Ensure opportunities is an array before setting rowData
    if (Array.isArray(opportunities)) {
      setRowData(opportunities);
    } else {
      console.error('OpportunityDataGrid received non-array opportunities:', opportunities);
      setRowData([]);
    }
  }, [opportunities]);

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

  // Status cell renderer component
  const StatusCellRenderer = (props: any) => {
    const status = props.value;
    if (!status) {
      return <span className="text-gray-400">-</span>;
    }
    
    let statusClass = '';
    
    if (status === 'Active') {
      statusClass = 'bg-green-500';
    } else if (status === 'Won') {
      statusClass = 'bg-blue-500';
    } else if (status === 'Lost') {
      statusClass = 'bg-red-500';
    } else if (status === 'In Progress') {
      statusClass = 'bg-yellow-500';
    } else if (status === 'Closed') {
      statusClass = 'bg-gray-500';
    } else {
      statusClass = 'bg-gray-500';
    }
    
    return (
      <span className={`${statusClass} text-white px-2 py-2 h-10 w-full rounded text-xs font-medium`}>
        {status}
      </span>
    );
  };
  
  // Value cell renderer for currency
  const ValueCellRenderer = (props: any) => {
    const value = props.value;
    if (value === undefined || value === null) {
      return <span>-</span>;
    }
    return (
      <span>${value.toLocaleString()}</span>
    );
  };
  
  // Probability cell renderer
  const ProbabilityCellRenderer = (props: any) => {
    const probability = props.value;
    if (probability === undefined || probability === null) {
      return <span>-</span>;
    }
    
    let colorClass = '';
    
    if (probability >= 70) {
      colorClass = 'text-green-600';
    } else if (probability >= 40) {
      colorClass = 'text-amber-600';
    } else {
      colorClass = 'text-red-600';
    }
    
    return (
      <span className={colorClass}>{probability}%</span>
    );
  };

  // Custom cell renderer for the actions column
  const ActionsCellRenderer = (params: any) => {
    return (
      <OpportunityActionsCellRenderer
        params={params}
        onOpportunityView={onOpportunityView}
        onOpportunityEdit={onOpportunityEdit}
        onOpportunityDashboard={onOpportunityDashboard}
      />
    );
  };

  // Handle cell clicked for action buttons
  const onCellClicked = (params: any) => {
    const action = params.event?.target?.getAttribute('data-action');
    if (!action) return;
    
    const opportunity = params.data;
    
    if (action === 'view' && onOpportunityView) {
      onOpportunityView(opportunity);
    } else if (action === 'edit' && onOpportunityEdit) {
      onOpportunityEdit(opportunity);
    } else if (action === 'dashboard') {
      // Navigate to entity-dashboard page with opportunityId and type parameters
      router.push(`/opportunity-dashboard/${opportunity.id}`);
    }
  };

  // Build column definitions dynamically based on props, with only Actions column as static
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
    
    // Always add the actions column at the end
    columns.push({
      field: 'actions',
      headerName: 'Actions',
      width: 140,
      minWidth: 140,
      maxWidth: 140,
      cellRenderer: ActionsCellRenderer,
      headerComponent: () => <GridHeaderCenterCell label="Actions" />,
      cellStyle: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        textAlign: 'right',
        paddingRight: '8px'
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
    headerClass: 'ag-left-header',
    cellClass: 'ag-cell-left'
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
    suppressPaginationPanel: true
  }), [currentPageSize]);

  // Grid ready handler
  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    
    // Set the row data first
    if (opportunities && opportunities.length > 0) {
      params.api.setRowData(opportunities);
      setRowData(opportunities);
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
  }, [opportunities, propOnGridReady, currentPageSize, currentPage]);

  const loadingOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-loading-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <div className="mt-4 text-sm text-gray-700">Loading opportunities...</div>
        </div>
      </div>
    );
  }, []);

  // Custom no rows overlay component
  const noRowsOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-no-rows-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="text-lg text-gray-600 mb-2">No opportunities found</div>
          <div className="text-sm text-gray-500">Try adjusting your filters or adding a new opportunity</div>
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
            enableCellTextSelection={false}
            domLayout='normal'
            overlayNoRowsTemplate="No records found"
            loadingOverlayComponent={loadingOverlayComponent}
            loadingOverlayComponentParams={{
              loadingMessage: 'Loading opportunities...'
            }}
            noRowsOverlayComponent={noRowsOverlayComponent}

          />
        </div>

        {/* Pagination and Load More controls */}
        <AGGridPagination
          gridApi={gridApi}
          totalItems={opportunities.length}
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          setCurrentPage={setCurrentPage}
          setCurrentPageSize={setCurrentPageSize}
          handleLoadMore={onLoadMore}
          isLoadingMore={isLoadingMore}
          totalCount={totalCount}
          currentCount={currentCount || opportunities.length}
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
export default OpportunityDataGrid;
