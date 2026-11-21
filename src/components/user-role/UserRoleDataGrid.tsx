import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions, GridReadyEvent, GridApi } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { UserRoleData } from '../../lib/models/user-role.model';
import { useRouter } from 'next/router';
import AGGridPagination from '../common/AGGridPagination';
import GridHeaderCenterCell from '../common/GridHeaderCenterCell';
import StatusCell from '../common/StatusCell';
import UserRoleActionsCellRenderer from './subs/UserRoleActionsCellRenderer';

interface UserRoleDataGridProps {
  userRoles: UserRoleData[];
  loading: boolean;
  onUserRoleView?: (userRole: UserRoleData) => void;
  onUserRoleEdit: (userRole: UserRoleData) => void;
  onUserRoleDelete?: (userRole: UserRoleData) => void;
  onGridReady?: (gridApi: any) => void;
  searchText?: string;
}

const UserRoleDataGrid: React.FC<UserRoleDataGridProps> = ({
  userRoles,
  loading,
  onUserRoleView,
  onUserRoleEdit,
  onUserRoleDelete,
  onGridReady: propOnGridReady,
  searchText
}) => {
  const router = useRouter();
  const gridRef = React.useRef<AgGridReact>(null);
  const [rowData, setRowData] = useState<UserRoleData[]>([]);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Update rowData when userRoles prop changes
  useEffect(() => {
    if (Array.isArray(userRoles)) {
      setRowData(userRoles);
    } else {
      console.error('UserRoleDataGrid received non-array userRoles:', userRoles);
      setRowData([]);
    }
  }, [userRoles]);

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

  // Use React component directly for the actions column

  // Build column definitions for user roles
  const columnDefs = useMemo<ColDef[]>(() => {
    const columns: ColDef[] = [];
    
    // Role Name column
    columns.push({
      field: 'roleName',
      headerName: 'Role Name',
      width: 500,
      minWidth: 500,
      maxWidth: 550,
      sortable: true,
      filter: true,
      resizable: true
    });
    
    // User Count column
    columns.push({
      field: 'userCount',
      headerName: 'Users',
      width: 250,
      minWidth: 250,
      maxWidth: 300,
      sortable: true,
      resizable: true,
      headerComponent: (params: any) => (
        <GridHeaderCenterCell
          {...params}
          label="Users"
        />
      ),
      cellStyle: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }
    });
    
    // Status column
    columns.push({
      field: 'active',
      headerName: 'Status',
      flex: 1,
      minWidth: 250,
      cellRenderer: StatusCell,
      headerComponent: (params: any) => (
        <GridHeaderCenterCell
          {...params}
          label="Status"
        />
      ),
      cellStyle: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      },
      resizable: true
    });
    
    // Actions column (pinned right)
    columns.push({
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      minWidth: 200,
      maxWidth: 200,
      sortable: false,
      filter: false,
      cellRenderer: UserRoleActionsCellRenderer as any,
      cellRendererParams: { onUserRoleEdit },
      headerComponent: (params: any) => (
        <GridHeaderCenterCell
          {...params}
          label="Action"
          showFilter={false}
          enableSorting={false}
        />
      ),
      cellStyle: {
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        },
      resizable: false
    });
    
    return columns;
  }, [onUserRoleView, onUserRoleEdit, onUserRoleDelete]);

  // Default column definitions
  const defaultColDef = useMemo<ColDef>(() => ({
      sortable: true,
      filter: true,
      resizable: true,
      suppressMovable: true,
      lockPosition: true,
      lockVisible: true,
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
    
    if (userRoles && userRoles.length > 0) {
      params.api.setRowData(userRoles);
      setRowData(userRoles);
    }
    
    setTimeout(() => {
      params.api.sizeColumnsToFit();
    }, 100);
    
    
    if (propOnGridReady) {
      propOnGridReady(params.api);
    }
  }, [userRoles, propOnGridReady, currentPageSize, currentPage]);

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
          <div className="mt-4 text-sm text-gray-700">Loading user roles...</div>
        </div>
      </div>
    );
  }, []);

  const noRowsOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-no-rows-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="text-lg text-gray-600 mb-2">No user roles found</div>
          <div className="text-sm text-gray-500">Try adjusting your filters or adding a new user role</div>
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
              loadingMessage: 'Loading user roles...'
            }}
            noRowsOverlayComponent={noRowsOverlayComponent}
            suppressCellFocus={false}
            stopEditingWhenCellsLoseFocus={true}
          />
        </div>
      </div>
    </div>
  );
};

export default UserRoleDataGrid;
