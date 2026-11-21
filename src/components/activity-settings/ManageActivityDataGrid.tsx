import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, GridApi, GridOptions, GridReadyEvent } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useDispatch } from "react-redux";
import StatusCell from "../common/StatusCell";
import GridHeaderCenterCell from "../common/GridHeaderCenterCell";
import ManageActivityActionsCell from "./sub-components/ManageActivityActionsCell";
import Spinner from "../common/Spinner";
import NoRecordsFound from "../common/NoRecordsFound";
import { useSnackbar } from "notistack";
import activitiesService from "@/lib/services/activitiesService";
import { ManageActivitiesModel } from "@/lib/models/activities/manage-activities.model";
import { ROW_DRAG_ICON } from "@/lib/constants/gridIcons.constant";
import { setActivities as setActivitiesInStore } from "@/store/activitySettingsSlice";

export interface ManageActivityDataGridHandle {
  reload: () => Promise<void>;
  getDisplayOrderPayload: () => Array<{
    key: number;
    activityName: string;
    value: number;
  }>;
}
// test
interface ManageActivityDataGridProps {
  onGridReady?: (gridApi: GridApi) => void;
  onEditActivity?: (activityId: number) => void;
  onDeleteActivity?: (activityId: number) => void;
  projectId: number;
  searchTerm?: string;
  onHandlersChange?: (handlers: ManageActivityDataGridHandle | null) => void;
}

interface ActivityGridData extends ManageActivitiesModel {
  status: string;
  allowCompanies: string;
  allowOpportunities: string;
}

const ManageActivityDataGrid: React.FC<ManageActivityDataGridProps> = ({
  onGridReady,
  onEditActivity,
  onDeleteActivity,
  projectId,
  searchTerm = "",
  onHandlersChange,
}) => {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const fetchControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [activities, setActivities] = useState<ActivityGridData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      fetchControllerRef.current?.abort('Abort Request: Component unmounted');
    };
  }, []);

  // Fetch activities from API
  const loadActivities = useCallback(async () => {
    fetchControllerRef.current?.abort('Abort Request: New request started');
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    setLoading(true);
    try {
      const response = await activitiesService.getAllActivities(projectId, false);

      if (!isMountedRef.current || fetchControllerRef.current !== controller) {
        return;
      }

      const data = response.responseData || [];

      // Store activity names in Redux and cookies
      const activityList = data.map((activity: ManageActivitiesModel) => ({
        activityId: activity.activityId,
        activityName: activity.activityName,
      }));
      dispatch(setActivitiesInStore(activityList));

      // Store in cookies (expires in 1 day)
      try {
        document.cookie = `activityNames=${encodeURIComponent(JSON.stringify(activityList))}; path=/; max-age=86400`;
      } catch (e) {
        console.error('Error setting activity cookies:', e);
      }

      // Transform data for grid display
      const transformedData: ActivityGridData[] = data.map((activity: ManageActivitiesModel) => ({
        ...activity,
        status: activity.active === 1 ? "Active" : "Inactive",
        allowCompanies: activity.allowForCompanies === 1 ? "Yes" : "No",
        allowOpportunities: activity.allowForOpportunities === 1 ? "Yes" : "No"
      }));

      setActivities(transformedData);
    } catch (error) {
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      if ((error as DOMException)?.name === 'AbortError' ||
          errorMessage.includes('Abort Request:')) {
        return;
      }
      console.error('Error fetching activities:', error);
      if (isMountedRef.current && fetchControllerRef.current === controller) {
        enqueueSnackbar('Failed to load activities', { variant: 'error' });
        setActivities([]);
      }
    } finally {
      if (isMountedRef.current && fetchControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [projectId, enqueueSnackbar]);

  const buildDisplayOrderPayload = useCallback(() => {
    if (!gridApi) return [];

    const orderData: {
      key: number;
      activityName: string;
      value: number;
    }[] = [];

    let displayOrder = 1;
    gridApi.forEachNode((node) => {
      if (!node?.data) return;
      orderData.push({
        key: node.data.activityId,
        activityName: node.data.activityName || "",
        value: displayOrder,
      });
      displayOrder += 1;
    });

    return orderData;
  }, [gridApi]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    if (onHandlersChange) {
      onHandlersChange({
        reload: () => loadActivities(),
        getDisplayOrderPayload: () => buildDisplayOrderPayload(),
      });
      return () => onHandlersChange(null);
    }
  }, [onHandlersChange, loadActivities, buildDisplayOrderPayload]);

  // Use AG Grid quick filter for global search
  useEffect(() => {
    if (gridApi) {
      gridApi.setGridOption('quickFilterText', searchTerm);
    }
  }, [searchTerm, gridApi]);

  // Show/hide loading overlay
  useEffect(() => {
    if (gridApi) {
      if (loading) gridApi.showLoadingOverlay();
      else gridApi.hideOverlay();
    }
  }, [loading, gridApi]);

  const defaultColDef: ColDef = {
    flex: 1,
    minWidth: 100,
    resizable: true,
    sortable: true,
    filter: true,
    cellClass: 'cell-ellipsis',
    suppressHeaderMenuButton: false,
    menuTabs: ['filterMenuTab', 'generalMenuTab', 'columnsMenuTab'],
  };

  const handleEdit = useCallback((activityId: number) => {
    if (onEditActivity) {
      onEditActivity(activityId);
    }
  }, [onEditActivity]);

  const handleDelete = useCallback((activityId: number) => {
    if (onDeleteActivity) {
      onDeleteActivity(activityId);
    }
  }, [onDeleteActivity]);

  const columnDefs: ColDef[] = useMemo(() => {
    return [
      {
        field: 'activityName',
        headerName: 'Activity Name',
        sortable: true,
        flex: 2,
        minWidth: 340,
        rowDrag: true,
      },
      {
        field: 'allowCompanies',
        headerName: 'Allow Company',
        sortable: true,
        minWidth: 200,
      },
      {
        field: 'allowOpportunities',
        headerName: 'Allow Opportunity',
        sortable: true,
        minWidth: 200,
      },
      {
        field: 'status',
        headerName: 'Status',
        flex: 0.5,
        sortable: true,
        filter: true,
        width: 150,
        cellRenderer: StatusCell,
        headerComponent: (params: any) => (
          <GridHeaderCenterCell
            label="Status"
            showFilter={true}
            enableSorting={true}
            showColumnMenu={params.showColumnMenu}
            column={params.column}
            setSort={params.setSort}
          />
        )
      },
      {
        headerName: 'Actions',
        field: 'actions',
        cellRenderer: (params: any) => (
          <ManageActivityActionsCell
            data={params.data}
            onEdit={handleEdit}
            // onDelete={handleDelete} // Temporarily hidden
          />
        ),
        maxWidth: 150,
        sortable: false,
        filter: false,
        headerComponent: () => <GridHeaderCenterCell label="Actions" />
      }
    ];
  }, [handleEdit, handleDelete]);

  // Grid ready handler
  const handleGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);

    setTimeout(() => {
      params.api.sizeColumnsToFit();
    }, 100);

    if (onGridReady) onGridReady(params.api);
  }, [onGridReady]);

  const loadingOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-loading-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }, []);

  // Grid options for AG Grid with drag-and-drop enabled
  const gridOptions = useMemo<GridOptions>(() => ({
    pagination: false,
    suppressMovableColumns: true,
    animateRows: true,
    domLayout: 'normal',
    headerHeight: 48,
    suppressColumnVirtualisation: false,
    suppressRowHoverHighlight: false,
    rowDragManaged: true,
    icons: {
      rowDrag: ROW_DRAG_ICON,
    },
  }), []);

  if (loading) {
    return <Spinner />;
  }

  if (activities.length === 0) {
    return <NoRecordsFound heading="Activities" />;
  }

  return (
    <div className="flex flex-col w-full h-[90%] overflow-auto">
      <div className="w-full h-full ag-theme-alpine">
        <AgGridReact
          gridOptions={gridOptions}
          rowData={activities}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={handleGridReady}
          suppressRowClickSelection={true}
          suppressRowTransform={true}
          rowDragManaged={true}
          domLayout="normal"
          rowSelection="single"
          overlayNoRowsTemplate="No records found"
          loadingOverlayComponent={loadingOverlayComponent}
          loadingOverlayComponentParams={{
            loadingMessage: 'Loading Activities...'
          }}
          rowHeight={48}
        />
      </div>
    </div>
  );
};

export default ManageActivityDataGrid;
