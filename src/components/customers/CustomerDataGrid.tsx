import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions, GridReadyEvent, GridApi } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
// Import CustomerData interface from customerService instead of customerModels
import { CustomerData } from '../../lib/services/customerService';
import { useRouter } from 'next/router';
import { useCustomer } from '../../contexts/CustomerContext';
import CustomerActionsCellRenderer from './subs/CustomerActionsCellRenderer';
import AGGridPagination from '../common/AGGridPagination';

// Import AG Grid Enterprise and license
import 'ag-grid-enterprise';
import { agGridLicenseInitialized } from '../../lib/agGridLicense';

// Import AG Grid CSS
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { useEntityHeading } from '@/hooks/useEntityHeading';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import FileViewerCellRenderer from '@/components/common/FileViewerCellRenderer';
import GridHeaderCenterCell from '../common/GridHeaderCenterCell';
import StatusCell from '../common/StatusCell';

interface CustomerDataGridProps {
  customers: CustomerData[];
  loading: boolean;
  dynamicColumns?: { field: string, headerName: string, attributeType: number }[];
  onCustomerView: (customerId: number) => void;
  onCustomerEdit: (customerId: number) => void;
  onCustomerDashboard?: (customerId: number) => void;
  onGridReady?: (gridApi: any) => void;
  searchText?: string;
}

const CustomerDataGrid: React.FC<CustomerDataGridProps> = ({
  customers,
  loading,
  dynamicColumns = [], // Default to empty array
  onCustomerView,
  onCustomerEdit,
  onCustomerDashboard,
  onGridReady: propOnGridReady,
  searchText
}) => {
  // Get loadMore functionality from context
  const { handleLoadMore, isLoadingMore, totalCount, currentCount } = useCustomer();
  const router = useRouter();
  const gridRef = React.useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<CustomerData[]>([]);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const dynamicEntityName = useEntityHeading('Customers');

  // Update rowData when customers prop changes
  useEffect(() => {

    // Ensure customers is an array before setting rowData
    if (Array.isArray(customers)) {
      setRowData(customers);
    } else {
      setRowData([]);
    }
  }, [customers]);

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
      <CustomerActionsCellRenderer
        params={params}
        onCustomerView={onCustomerView}
        onCustomerEdit={onCustomerEdit}
        onCustomerDashboard={onCustomerDashboard}
      />
    );
  };

  // Handle cell clicked for action buttons
  const onCellClicked = (params: any) => {
    if (params.column.getColId() === 'actions') {
      // Let the cell renderer handle it
      return;
    }

    const customerId = params.data?.id;
    if (customerId && params.column.getColId() !== 'actions') {
      // Default action when clicking on a row (any cell except actions)
      onCustomerView(customerId);
    }
  };

  // Define column definitions - dynamic columns + status + actions
  const columnDefs = useMemo<ColDef[]>(() => {
    const columns: ColDef[] = [];

    // Add dynamic columns if they exist
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
          flex: 1, // Use flex instead of fixed width for automatic distribution
          minWidth: 120, // Minimum width to ensure readability
          filter: 'agTextColumnFilter',
          // Handle potential null/undefined values
          valueFormatter: (params: any) => {
            return params.value !== undefined && params.value !== null ? params.value : '-';
          }
        });
      }
      });
    }

    // Add Status column
    columns.push({
      field: 'status',
      headerName: 'Status',
      sortable: true,
      cellRenderer: StatusCell,
      flex: 0.8, // Slightly smaller flex for status column
      minWidth: 100,
      filter: 'agTextColumnFilter',
      headerComponent: () => <GridHeaderCenterCell label="Status" />
    });

    // Add Actions column (not pinned to avoid separator line)
    columns.push({
      headerName: 'Actions',
      field: 'actions',
      cellRenderer: ActionsCellRenderer,
      flex: 0.6, // Smaller flex for actions column
      width: 160,
      minWidth: 160,
      maxWidth: 200, // Prevent actions column from getting too wide
      sortable: false,
      filter: false,
      resizable: false,
      headerComponent: () => <GridHeaderCenterCell label="Actions" />
    });

    return columns;
  }, [dynamicColumns, onCustomerDashboard]);

  // Default column definition
  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    floatingFilter: false,
    flex: 1,
    minWidth: 100,
    suppressMovable: true,
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

  // Handle grid ready event
  const handleGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    // Let CSS handle all sizing - no JavaScript resize operations
    if (propOnGridReady) {
      propOnGridReady(params.api);
    }
  }, [propOnGridReady]);



  // Custom loading overlay component
  const loadingOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-loading-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <div className="mt-4 text-sm text-gray-700">Loading {dynamicEntityName}...</div>
        </div>
      </div>
    );
  }, [dynamicEntityName]);

  // Custom no rows overlay component
  const noRowsOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-no-rows-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="text-lg text-gray-600 mb-2">No {dynamicEntityName} found</div>
          <div className="text-sm text-gray-500">Try adjusting your filters or adding a new {dynamicEntityName}</div>
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
            onCellClicked={onCellClicked}
            enableCellTextSelection={false}
            domLayout='normal'
            overlayNoRowsTemplate="No records found"
            loadingOverlayComponent={loadingOverlayComponent}
            loadingOverlayComponentParams={{
              loadingMessage: 'Loading '+dynamicEntityName+'...'
            }}
            noRowsOverlayComponent={noRowsOverlayComponent}

          />
        </div>

        {/* Pagination and Load More controls */}
        <AGGridPagination
          gridApi={gridApi}
          totalItems={customers.length}
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          setCurrentPage={setCurrentPage}
          setCurrentPageSize={setCurrentPageSize}
          handleLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
          totalCount={totalCount}
          currentCount={currentCount}
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

export default CustomerDataGrid;
