import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, GridApi, GridOptions, GridReadyEvent, GridSizeChangedEvent, FirstDataRenderedEvent, ModelUpdatedEvent } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import AGGridPagination from "@/components/common/AGGridPagination";
import StatusCell from "@/components/common/StatusCell";
import GridHeaderCenterCell from "@/components/common/GridHeaderCenterCell";
import WorkflowActionsCell from "./subs/WorkflowActionsCell";

export interface WorkflowRow {
  id: number;
  serialNo: string;
  name: string;
  description: string;
  entity?: string;
  trigger?: string;
  createdBy: string;
  createdOn: string;
  status: string | number;
}

interface WorkflowsDataGridProps {
  data: WorkflowRow[];
  loading?: boolean;
  searchText?: string;
  onGridReady?: (gridApi: GridApi) => void;
  onEdit?: (workflowId: number) => void;
  onOpen?: (workflowId: number) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  totalCount?: number;
  currentCount?: number;
}

const WorkflowsDataGrid: React.FC<WorkflowsDataGridProps> = ({
  data,
  loading = false,
  searchText = "",
  onGridReady,
  onEdit,
  onOpen,
  onLoadMore,
  isLoadingMore = false,
  totalCount,
  currentCount,
}) => {
  const gridRef = useRef<AgGridReact<WorkflowRow>>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [rowData, setRowData] = useState<WorkflowRow[]>([]);
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
    if (!gridApi) return;
    if (loading) {
      gridApi.showLoadingOverlay();
    } else if (rowData.length === 0) {
      gridApi.showNoRowsOverlay();
    } else {
      gridApi.hideOverlay();
    }
  }, [loading, gridApi, rowData.length]);

  useEffect(() => {
    if (gridApi) {
      const resize = () => {
        try {
          gridApi.sizeColumnsToFit();
        } catch {}
      };
      resize();
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }
  }, [gridApi]);

  useEffect(() => {
    if (!gridApi) return;
    const t = setTimeout(() => {
      try {
        gridApi.sizeColumnsToFit();
      } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, [rowData, gridApi]);

  useEffect(() => {
    if (gridApi) {
      gridApi.setQuickFilter(searchText || "");
    }
  }, [searchText, gridApi]);

  const statusLabel = useCallback((value: any) => {
    if (value === 1 || value === "1") return "Active";
    if (value === 0 || value === "0") return "Inactive";
    const str = (value ?? "").toString();
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, []);

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: "serialNo",
      headerName: "Serial No.",
      sortable: true,
      filter: true,
      flex: 1,
      minWidth: 100,
    },
    {
      field: "name",
      headerName: "Name",
      flex: 1.5,
      minWidth: 150,
      sortable: true,
      cellClass: "cell-ellipsis",
    },
    {
      field: "description",
      headerName: "Description",
      flex: 2,
      minWidth: 200,
      cellClass: "cell-ellipsis",
    },
    {
      field: "createdBy",
      headerName: "Created By",
      flex: 1.2,
      minWidth: 130,
    },
    {
      field: "createdOn",
      headerName: "Created On",
      flex: 1.2,
      minWidth: 130,
      sortable: true,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      minWidth: 100,
      filter: true,
      headerComponent: GridHeaderCenterCell,
      headerComponentParams: {
        label: "Status",
        showFilter: true,
        enableSorting: true,
      },
      sortable: true,
      cellRenderer: StatusCell,
    },
    {
      headerName: "Actions",
      field: "actions",
      flex: 1,
      minWidth: 120,
      sortable: false,
      filter: false,
      suppressMenu: true,
      cellRenderer: (params: any) => (
        <WorkflowActionsCell
          data={params.data}
          onEdit={onEdit}
          onOpen={onOpen}
        />
      ),
      headerComponent: () => <GridHeaderCenterCell label="Actions" />,
      cellStyle: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingRight: "8px",
      },
      resizable: true,
    },
  ], [onEdit, onOpen]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    suppressSizeToFit: false,
  }), []);

  const gridOptions = useMemo<GridOptions>(() => ({
    pagination: true,
    paginationPageSize: currentPageSize,
    paginationPageSizeSelector: [10, 20, 50, 100],
    suppressMovableColumns: true,
    animateRows: true,
    domLayout: "normal",
    headerHeight: 48,
    rowHeight: 42,
    rowStyle: { borderBottom: '1px solid #e5e7eb' },
    suppressColumnVirtualisation: true,
    suppressRowHoverHighlight: false,
    suppressPaginationPanel: true,
    getQuickFilterText: (params) => {
      const data = params?.data || {};
      const parts = [
        data.serialNo,
        data.name,
        data.description,
        data.createdBy,
        data.createdOn,
        statusLabel(data.status),
      ].filter(Boolean);
      return parts.join(" ").toString();
    },
  }), [currentPageSize, statusLabel]);

  const handleGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);

    if (data && data.length > 0) {
      params.api.setRowData(data);
    }

    params.api.paginationSetPageSize(currentPageSize);
    if (currentPage > 0) {
      params.api.paginationGoToPage(currentPage);
    }

    if (onGridReady) {
      onGridReady(params.api);
    }
    setTimeout(() => {
      try {
        params.api.sizeColumnsToFit();
      } catch {}
    }, 100);
  }, [data, onGridReady, currentPageSize, currentPage]);

  const handleGridSizeChanged = useCallback((params: GridSizeChangedEvent) => {
    if (params.api) {
      params.api.sizeColumnsToFit();
    }
  }, []);

  const handleFirstDataRendered = useCallback((params: FirstDataRenderedEvent) => {
    if (params.api) {
      params.api.sizeColumnsToFit();
    }
  }, []);

  const handleModelUpdated = useCallback((params: ModelUpdatedEvent) => {
    if (params.api) {
      params.api.sizeColumnsToFit();
    }
  }, []);

  const loadingOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-loading-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <div className="mt-4 text-sm text-gray-700">Loading workflows...</div>
        </div>
      </div>
    );
  }, []);

  const noRowsOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-no-rows-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="text-lg text-gray-600 mb-2">No workflows found</div>
          <div className="text-sm text-gray-500">Try adjusting your search or add a new workflow</div>
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
            domLayout="normal"
            overlayNoRowsTemplate="No workflows found"
            loadingOverlayComponent={loadingOverlayComponent}
            loadingOverlayComponentParams={{
              loadingMessage: "Loading workflows...",
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
          handleLoadMore={onLoadMore}
          isLoadingMore={isLoadingMore}
          totalCount={totalCount ?? rowData.length}
          currentCount={currentCount ?? rowData.length}
          pageSizeOptions={[20, 50, 100, 500]}
        />

        {isLoadingMore && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-40 z-30 flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowsDataGrid;
