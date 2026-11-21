import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, GridApi } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import GridHeaderCenterCell from '../common/GridHeaderCenterCell';
import StatusCell from '../common/StatusCell';
import EditActionButton from '../common/buttons/action-button/EditActionButton';
import AGGridPagination from '../common/AGGridPagination';

export interface UserGridItem {
  id: number | string;
  serialNo?: string;
  name: string;
  email?: string;
  mobile?: string;
  role?: string;
  status?: string;
  [key: string]: any;
}

interface UserDataGridProps {
  users: UserGridItem[];
  loading: boolean;
  onUserEdit: (user: UserGridItem) => void;
  onUserView?: (userId: number | string) => void;
  searchText?: string;
  onGridReady?: (gridApi: any) => void;
  dynamicColumns?: Array<{
    field: string;
    headerName: string;
    minWidth?: number;
    flex?: number;
    filter?: any;
    cellRenderer?: any;
    headerComponent?: any;
    attributeType?: number;
  }>;
  totalCount?: number | null;
  currentCount?: number;
  handleLoadMore?: () => void;
  isLoadingMore?: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  currentPageSize: number;
  setCurrentPageSize: (size: number) => void;
}

const UserDataGrid: React.FC<UserDataGridProps> = ({
  users,
  loading,
  onUserEdit,
  onUserView,
  searchText,
  onGridReady: propOnGridReady,
  dynamicColumns = [],
  totalCount = null,
  currentCount,
  handleLoadMore,
  isLoadingMore = false,
  currentPage,
  setCurrentPage,
  currentPageSize,
  setCurrentPageSize,
}) => {
  const [gridApi, setGridApi] = useState<GridApi | null>(null);

  useEffect(() => {
    if (gridApi) {
      gridApi.hideOverlay();
    }
  }, [loading, gridApi]);

  useEffect(() => {
    if (gridApi) {
      gridApi.setQuickFilter(searchText || '');
    }
  }, [searchText, gridApi]);

  const ActionsCellRenderer = useCallback(
    (params: any) => {
      const id = params.data?.id;
      return (
        <div className="flex items-center justify-center gap-2 w-full h-full">
          {onUserView && (
            <button
              type="button"
              className="text-blue-600 hover:underline text-sm"
              onClick={() => onUserView(id)}
            >
              View
            </button>
          )}
          <EditActionButton id={Number(id)} variant="new" onEdit={() => onUserEdit(params.data)} />
        </div>
      );
    },
    [onUserEdit, onUserView],
  );

  const columnDefs = useMemo<ColDef[]>(() => {
    const baseColumns: ColDef[] = (dynamicColumns && dynamicColumns.length > 0
      ? dynamicColumns
      : [
          { field: 'serialNo', headerName: 'Serial No' },
          { field: 'name', headerName: 'Name' },
          { field: 'email', headerName: 'Email' },
          { field: 'mobile', headerName: 'Mobile' },
          { field: 'role', headerName: 'Role' },
          { field: 'status', headerName: 'Status' },
        ]).map((col) => {
          const isStatus = (col.headerName || col.field || '').toString().trim().toLowerCase() === 'status';
          return {
            ...col,
            minWidth: col.minWidth ?? 130,
            flex: col.flex ?? 1,
            filter: col.filter ?? 'agTextColumnFilter',
            valueFormatter: (params: any) =>
              params.value !== undefined && params.value !== null && params.value !== ''
                ? params.value
                : '',
            cellRenderer: isStatus ? StatusCell : col.cellRenderer,
            headerComponent: isStatus
              ? (params: any) => (
                  <GridHeaderCenterCell
                    {...params}
                    label={col.headerName || 'Status'}
                  />
                )
              : col.headerComponent,
          } as ColDef;
        });

    baseColumns.push({
      headerName: 'Actions',
      field: 'actions',
      cellRenderer: ActionsCellRenderer as any,
      flex: 0.6,
      width: 140,
      minWidth: 140,
      maxWidth: 160,
      sortable: false,
      filter: false,
      cellClass: 'text-center',
      cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
      headerComponent: (params: any) => (
        <GridHeaderCenterCell
          {...params}
          label="Actions"
          showFilter={false}
          enableSorting={false}
        />
      ),
    });

    return baseColumns;
  }, [ActionsCellRenderer, dynamicColumns]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    editable: false,
    flex: 1,
    minWidth: 150,
  }), []);

  const handleGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    if (propOnGridReady) {
      propOnGridReady(params.api);
    }
  }, [propOnGridReady]);

  const handlePaginationChanged = useCallback(() => {
    if (gridApi) {
      setCurrentPage(gridApi.paginationGetCurrentPage());
    }
  }, [gridApi, setCurrentPage]);

  return (
    <div className="flex w-full flex-col grid-height-190">
      <div className="flex-1 w-full ag-theme-alpine">
        <div className="w-full h-full relative">
          <AgGridReact
            rowData={users}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            pagination
            paginationPageSize={currentPageSize}
            onGridReady={handleGridReady}
            onPaginationChanged={handlePaginationChanged}
            domLayout="normal"
            suppressPaginationPanel
            overlayNoRowsTemplate="There are no records."
          />
        </div>

        <AGGridPagination
          gridApi={gridApi}
          totalItems={users.length}
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          setCurrentPage={setCurrentPage}
          setCurrentPageSize={setCurrentPageSize}
          handleLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
          totalCount={totalCount ?? undefined}
          currentCount={currentCount ?? users.length}
          pageSizeOptions={[20, 50, 100, 500]}
        />
      </div>
    </div>
  );
};

export default UserDataGrid;
