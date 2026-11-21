import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, GridApi, GridOptions, GridReadyEvent } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import AGGridPagination from "../common/AGGridPagination";
import StatusCell from "../common/StatusCell";
import GridHeaderCenterCell from "../common/GridHeaderCenterCell";
import ContentTopicActionsCell from "./sub-components/ContentTopicActionsCell";
import { ContentTopicItem } from "@/lib/services/contentTopicService";

interface ContentTopicDataGridProps {
  data: ContentTopicItem[];
  searchText: string;
  onEdit: (id: number) => void;
  onSequence: (id: number, topicName: string) => void;
}

const ContentTopicDataGrid: React.FC<ContentTopicDataGridProps> = ({
  data,
  searchText,
  onEdit,
  onSequence,
}) => {
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(0);

  useEffect(() => {
    if (gridApi) {
      gridApi.setGridOption("quickFilterText", searchText);
    }
  }, [searchText, gridApi]);

  const defaultColDef: ColDef = useMemo(
    () => ({
      flex: 1,
      minWidth: 120,
      resizable: true,
      sortable: true,
      filter: true,
    }),
    []
  );

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        headerName: "Topic Name",
        field: "topicName",
        sortable: true,
        flex: 1.5,
        minWidth: 200,
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Description",
        field: "description",
        sortable: true,
        flex: 2,
        minWidth: 250,
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Status",
        field: "status",
        sortable: true,
        width: 130,
        cellRenderer: StatusCell,
        headerComponent: () => <GridHeaderCenterCell label="Status" />,
      },
      {
        headerName: "Actions",
        field: "actions",
        cellRenderer: (params: any) => (
          <ContentTopicActionsCell
            data={params.data}
            onEdit={onEdit}
            onSequence={onSequence}
          />
        ),
        width: 140,
        sortable: false,
        filter: false,
        headerComponent: () => <GridHeaderCenterCell label="Actions" />,
      },
    ],
    [onEdit, onSequence]
  );

  const handleGridReady = useCallback(
    (params: GridReadyEvent) => {
      setGridApi(params.api);
      setTimeout(() => {
        params.api.sizeColumnsToFit();
      }, 100);
    },
    []
  );

  const gridOptions = useMemo<GridOptions>(
    () => ({
      pagination: true,
      paginationPageSize: currentPageSize,
      paginationPageSizeSelector: false,
      suppressMovableColumns: true,
      animateRows: true,
      domLayout: "normal",
      headerHeight: 48,
      suppressColumnVirtualisation: true,
      suppressRowHoverHighlight: false,
      suppressPaginationPanel: true,
      paginationAutoPageSize: false,
    }),
    [currentPageSize]
  );

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
            rowHeight={48}
            domLayout="normal"
          />
        </div>

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

export default ContentTopicDataGrid;
