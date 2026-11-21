import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, GridApi, GridOptions, GridReadyEvent } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import AGGridPagination from "../common/AGGridPagination";
import StatusCell from "../common/StatusCell";
import GridHeaderCenterCell from "../common/GridHeaderCenterCell";
import EditActionButton from "../common/buttons/action-button/EditActionButton";
import { UploadCreativeItem, CreativeTypeEnum } from "@/lib/services/uploadCreativeService";
import { getSingularNameStatic } from "@/hooks/useDynamicNames";
import { SystemAttributeEnum } from "@/lib/constants/SystemAttributeEnum.constant";
import { UserLocalizationService } from "@/lib/services/userLocalizationService";

/**
 * Resolve the "Visible To" display value based on visibleToType:
 * - 1: Contact singular name
 * - 2: Customer singular name
 * - 3: Opportunity singular name
 * - 4: Role name — use the visibleTo property directly
 */
const getVisibleToDisplay = (item: UploadCreativeItem): string => {
  switch (item.visibleToType) {
    case SystemAttributeEnum.CONTACT_MODULE:
      return getSingularNameStatic("contacts");
    case SystemAttributeEnum.COMPANY_MODULE:
      return getSingularNameStatic("customers");
    case SystemAttributeEnum.OPPORTUNITY_MODULE:
      return getSingularNameStatic("opportunities");
    default:
      return item.visibleTo || "-";
  }
};

/**
 * Creative type label. Records saved before `creativeType` existed have no value,
 * and the list response carries no items to derive one from, so they show "-"
 * until they are opened and re-saved.
 */
const getCreativeTypeDisplay = (item: UploadCreativeItem): string => {
  switch (item.creativeType) {
    case CreativeTypeEnum.CAROUSEL:
      return "Carousel";
    case CreativeTypeEnum.BANNER:
      return "Banner";
    default:
      return "-";
  }
};

interface UploadCreativeDataGridProps {
  data: UploadCreativeItem[];
  searchText: string;
  onEdit: (id: number) => void;
}

const UploadCreativeDataGrid: React.FC<UploadCreativeDataGridProps> = ({
  data,
  searchText,
  onEdit,
}) => {
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Apply quick filter on search text change
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
        headerName: "Visible To",
        field: "visibleTo",
        sortable: true,
        flex: 1,
        minWidth: 160,
        valueGetter: (params: any) => getVisibleToDisplay(params.data),
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Creative Type",
        field: "creativeType",
        sortable: true,
        flex: 1,
        minWidth: 140,
        valueGetter: (params: any) => getCreativeTypeDisplay(params.data),
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Created By",
        field: "createdByName",
        sortable: true,
        flex: 1,
        minWidth: 160,
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Created On",
        field: "createdOn",
        sortable: true,
        flex: 1,
        minWidth: 140,
        valueGetter: (params: any) => UserLocalizationService.formatDate(params.data.createdOn),
        filter: "agTextColumnFilter",
      },
      {
        headerName: "Status",
        field: "status",
        sortable: true,
        width: 130,
        valueGetter: (params: any) => {
          const val = params.data?.status;
          if (typeof val === "number") return val === 1 ? "Active" : "Inactive";
          return val ?? "";
        },
        cellRenderer: StatusCell,
        headerComponent: () => <GridHeaderCenterCell label="Status" />,
      },
      {
        headerName: "Actions",
        field: "actions",
        cellRenderer: (params: any) => (
          <div className="flex justify-center items-center w-full h-full">
            <EditActionButton
              id={params.data.id}
              onEdit={onEdit}
              variant="new"
            />
          </div>
        ),
        width: 100,
        sortable: false,
        filter: false,
        headerComponent: () => <GridHeaderCenterCell label="Actions" />,
      },
    ],
    [onEdit]
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

export default UploadCreativeDataGrid;
