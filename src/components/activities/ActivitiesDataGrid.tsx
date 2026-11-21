import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import AGGridPagination from '../common/AGGridPagination';
import { useActivities } from '../../contexts/ActivitiesContext';
import EditActionButton from '@/components/common/buttons/action-button/EditActionButton';
import DashboardActionButton from '@/components/common/buttons/action-button/DashboardActionButton';

interface ActivitiesDataGridProps {
  activities: any[];
  loading: boolean;
  searchText?: string;
  columnDefs: ColDef[];
  onActivityView?: (activityId: number) => void;
  onActivityEdit?: (activityId: number, activityModuleType: number, activityName?: string) => void;
}

const ActivitiesDataGrid: React.FC<ActivitiesDataGridProps> = ({
  activities,
  searchText,
  columnDefs,
  onActivityView,
  onActivityEdit,
}) => {
  const { defaultColDef, totalCount, handleLoadMore, isLoadingMore, activitiesData, activeTab, availableActivities } = useActivities() as any;

  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Columns with Actions appended
  const columnsWithActions = useMemo<ColDef[]>(() => ([
    ...columnDefs,
    {
      headerName: 'Actions',
      field: 'actions',
      minWidth: 80,
      maxWidth: 120,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: (params: any) => {
        const id = params?.data?.activityId;
        const moduleType = params?.data?.activityModuleType;
        // Get activity name from availableActivities using moduleType (which matches activityId in ManageActivitiesModel)
        const activityName = availableActivities?.find((a: any) => a.activityId === moduleType)?.activityName;
        if (activeTab === 'performed') {
          return (
            <div className="flex items-center">
              <EditActionButton id={id} onEdit={(activityId) => onActivityEdit?.(activityId, moduleType, activityName)} />
            </div>
          );
        }
        // Planned & Overdue: show only Dashboard action
        return (
          <div className="flex items-center">
            <DashboardActionButton id={id} onDashboard={onActivityView} />
          </div>
        );
      },
    },
  ]), [columnDefs, onActivityEdit, onActivityView, activeTab, availableActivities]);

  // Grid options aligned with global usage
  const gridOptions = useMemo<GridOptions>(() => ({
    pagination: true,
    paginationPageSize: currentPageSize,
    paginationPageSizeSelector: [10, 20, 50, 100],
    suppressMovableColumns: true,
    animateRows: true,
    domLayout: 'normal',
    suppressPaginationPanel: true,
  }), [currentPageSize]);

  const handleGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
  }, []);

  // No in-grid loading overlay; rely on global spinner (consistent with Customers/Opportunities)
  useEffect(() => {
    if (!gridApi) return;
    // Ensure any lingering overlays are hidden
    gridApi.hideOverlay();
  }, [gridApi]);

  // Quick filter
  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.setQuickFilter(searchText || '');
    }
  }, [searchText]);

  // No custom loading overlay component; we use global spinner instead

  const noRowsOverlayComponent = useMemo(() => () => (
    <div className="ag-overlay-no-rows-center flex items-center justify-center">
      <div className="flex flex-col items-center p-4">
        <div className="text-lg text-gray-600 mb-2">No activities found</div>
        <div className="text-sm text-gray-500">Try adjusting your filters or date range</div>
      </div>
    </div>
  ), []);

  return (
    <div className="flex flex-col w-full grid-height-190">
      <div className="flex-1 w-full ag-theme-alpine">
        <div className="w-full h-full relative">
          <AgGridReact
            ref={gridRef}
            gridOptions={gridOptions}
            rowData={activities}
            columnDefs={columnsWithActions}
            defaultColDef={defaultColDef}
            onGridReady={handleGridReady}
            enableCellTextSelection={false}
            domLayout='normal'
            overlayNoRowsTemplate="No records found"
            noRowsOverlayComponent={noRowsOverlayComponent}
          />
        </div>

        <AGGridPagination
          gridApi={gridApi}
          totalItems={activities.length}
          currentPage={currentPage}
          currentPageSize={currentPageSize}
          setCurrentPage={setCurrentPage}
          setCurrentPageSize={setCurrentPageSize}
          handleLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
          totalCount={totalCount}
          currentCount={activities.length}
          pageSizeOptions={[20, 50, 100, 500]}
        />

        {/* Global spinner for Load More - matches other modules */}
        {isLoadingMore && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivitiesDataGrid;
