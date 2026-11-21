import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridOptions, GridReadyEvent, GridApi } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import PendingApprovalActionsCellRenderer from './PendingApprovalActionsCellRenderer';
import approvalService from '../../../lib/services/approvalServie';
import { UserLocalizationService } from '../../../lib/services/userLocalizationService';
import { getProjectId } from '@/lib/storage/sharedStorage';
import AGGridPagination from '../../common/AGGridPagination';
import GridHeaderCenterCell from '../../common/GridHeaderCenterCell';
import ApprovalEditModal from './ApprovalEditModal';
import Spinner from '../../common/Spinner';
import { useSnackbar } from 'notistack';
import { preloadCustomerEditFormData, PreloadedCustomerFormData } from '@/components/customers/AddEditForm/subs/formDataPreloader';
import { preloadEditFormData as preloadActivityEditFormData, PreloadedFormData as PreloadedActivityFormData } from '@/components/activities/AddEditForm/subs/formDataPreloader';
import { preloadContactEditFormData, PreloadedContactFormData } from '@/components/contacts/AddEditForm/subs/formDataPreloader';
import { preloadOpportunityEditFormData, PreloadedOpportunityFormData } from '@/components/opportunities/AddEditForm/subs/formDataPreloader';

interface ApprovalRowData {
  id: number;
  entityRecordId: number;
  entityRecordName: string;
  moduleType: number;
  moduleName: string;
  serialNo: string;
  workflowApprovalId: number;
  workflowApprovalName: string;
  workflowNodeId: number;
  submittedBy: number;
  submittedByUserName: string;
  createdOn: string;
  projectId: number;
  advanceSetting: number;
  approvalActionId: number | null;
  approvalActionName: string | null;
  approvalRemarks: string | null;
  actionBy: number | null;
  actionOn: string | null;
}

interface PendingApprovalsProps {
  searchText?: string;
  onLoadingChange?: (loading: boolean) => void;
}

// Module type constants
const MODULE_TYPE = {
  CONTACT: 1,
  CUSTOMER: 2,
  OPPORTUNITY: 3,
  ACTIVITY_MIN: 100,
};

const PendingApprovals: React.FC<PendingApprovalsProps> = ({ searchText, onLoadingChange }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [rowData, setRowData] = useState<ApprovalRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [currentPageSize, setCurrentPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const gridRef = React.useRef<AgGridReact>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRowData | null>(null);
  
  // Preloading states - show spinner until all APIs complete
  const [isPreloadingFormData, setIsPreloadingFormData] = useState(false);
  const [preloadedCustomerData, setPreloadedCustomerData] = useState<PreloadedCustomerFormData | null>(null);
  const [preloadedActivityData, setPreloadedActivityData] = useState<PreloadedActivityFormData | null>(null);
  const [preloadedContactData, setPreloadedContactData] = useState<PreloadedContactFormData | null>(null);
  const [preloadedOpportunityData, setPreloadedOpportunityData] = useState<PreloadedOpportunityFormData | null>(null);
  const [preloadedApprovalActions, setPreloadedApprovalActions] = useState<any[]>([]);
  const [preloadedFieldVisibility, setPreloadedFieldVisibility] = useState<any[]>([]);

  // Determine entity type based on moduleType
  const getEntityType = useCallback((moduleType: number): 'customer' | 'activity' | 'contact' | 'opportunity' | null => {
    if (moduleType === MODULE_TYPE.CUSTOMER) return 'customer';
    if (moduleType === MODULE_TYPE.CONTACT) return 'contact';
    if (moduleType === MODULE_TYPE.OPPORTUNITY) return 'opportunity';
    if (moduleType >= MODULE_TYPE.ACTIVITY_MIN) return 'activity';
    return null;
  }, []);

  const handleOpenModal = useCallback(async (data: ApprovalRowData) => {
    setSelectedApproval(data);
    setIsPreloadingFormData(true);
    
    try {
      const projectId = getProjectId() || 0;
      const entityType = getEntityType(data.moduleType);
      const source = 3; // 'all' view for approvals

      // Fetch approval actions and field visibility
      const [actionsResponse, visibilityResponse] = await Promise.all([
        approvalService.getActionOptions(projectId, data.id),
        approvalService.getApprovalFieldVisibilityConfig(projectId, data.moduleType, data.workflowApprovalId),
      ]);

      setPreloadedApprovalActions(actionsResponse?.responseData || []);
      setPreloadedFieldVisibility(visibilityResponse?.responseData || []);

      // Preload entity form data based on type
      // Clear all preloaded data first
      setPreloadedCustomerData(null);
      setPreloadedActivityData(null);
      setPreloadedContactData(null);
      setPreloadedOpportunityData(null);

      if (entityType === 'customer') {
        const preloadedData = await preloadCustomerEditFormData(projectId, data.entityRecordId, source);
        setPreloadedCustomerData(preloadedData);
      } else if (entityType === 'activity') {
        const preloadedData = await preloadActivityEditFormData(projectId, data.moduleType, data.entityRecordId, source);
        setPreloadedActivityData(preloadedData);
      } else if (entityType === 'contact') {
        const preloadedData = await preloadContactEditFormData(projectId, data.entityRecordId, source);
        setPreloadedContactData(preloadedData);
      } else if (entityType === 'opportunity') {
        const preloadedData = await preloadOpportunityEditFormData(projectId, data.entityRecordId, source);
        setPreloadedOpportunityData(preloadedData);
      }

      // Open modal only after all data is loaded
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error preloading form data:', error);
      enqueueSnackbar('Error loading form data. Please try again.', { variant: 'error' });
    } finally {
      setIsPreloadingFormData(false);
    }
  }, [getEntityType, enqueueSnackbar]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedApproval(null);
    // Clear preloaded data
    setPreloadedCustomerData(null);
    setPreloadedActivityData(null);
    setPreloadedContactData(null);
    setPreloadedOpportunityData(null);
    setPreloadedApprovalActions([]);
    setPreloadedFieldVisibility([]);
  }, []);

  const columnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'Entity Name',
      field: 'entityRecordName',
      tooltipValueGetter: (params: any) => {
        return params.value;
      },
      sortable: true,
      filter: true,
      flex: 1,
      minWidth: 150
    },
    {
      headerName: 'Serial No.',
      field: 'serialNo',
      sortable: true,
      filter: true,
      flex: 1,
      minWidth: 120
    },
    {
      headerName: 'Approval Name',
      field: 'workflowApprovalName',
      sortable: true,
      filter: true,
      flex: 1,
      minWidth: 150
    },
    {
      headerName: 'Submitted By',
      field: 'submittedByUserName',
      sortable: true,
      filter: true,
      flex: 1,
      minWidth: 150
    },
    {
      headerName: 'Submitted On',
      field: 'createdOn',
      valueFormatter: (params: any) => {
        return UserLocalizationService.formatToAmPm(params.value);
      },
      sortable: true,
      filter: true,
      flex: 1,
      minWidth: 180
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 160,
      minWidth: 160,
      maxWidth: 200,
      flex: 0.6,
      filter: false,
      sortable: false,
      resizable: false,
      cellRenderer: (params: any) => {
        if (!params || !params.data) return null;
        return (
          <PendingApprovalActionsCellRenderer 
            data={params.data}
            onApprovalView={() => handleOpenModal(params.data)}
          />
        );
      },
      headerComponent: () => <GridHeaderCenterCell label="Actions" />
    }
  ], [handleOpenModal]);

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

  const gridOptions = useMemo<GridOptions>(() => ({
    pagination: true,
    paginationPageSize: currentPageSize,
    paginationPageSizeSelector: [10, 20, 50, 100],
    suppressMovableColumns: true,
    animateRows: true,
    domLayout: 'normal',
    rowHeight: undefined,
    headerHeight: 48,
    suppressColumnVirtualisation: true,
    suppressRowHoverHighlight: false,
    suppressPaginationPanel: true
  }), [currentPageSize]);

  const fetchPendingApprovals = useCallback(async () => {
    const projectId = getProjectId() || 0;
        
    if (!projectId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await approvalService.getAllPendingApproval(projectId);
      if (response?.responseData) {
        setRowData(response.responseData);
      } else {
        setRowData([]);
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      setRowData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingApprovals();
  }, [fetchPendingApprovals]);

  // Notify parent component about loading state changes
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(loading);
    }
  }, [loading, onLoadingChange]);

  // Effect to apply quick filter when searchText changes
  useEffect(() => {
    if (gridApi) {
      gridApi.setGridOption('quickFilterText', searchText || '');
    }
  }, [searchText, gridApi]);

  // Effect to show/hide loading overlay based on loading prop
  useEffect(() => {
    if (gridApi && !loading && rowData.length === 0) {
      gridApi.showNoRowsOverlay();
    } else if (gridApi && !loading) {
      gridApi.hideOverlay();
    }
  }, [loading, gridApi, rowData.length]);

  // Handle grid ready event
  const handleGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
  }, []);

  // Custom loading overlay component
  const loadingOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-loading-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <div className="mt-4 text-sm text-gray-700">Loading Approvals...</div>
        </div>
      </div>
    );
  }, []);

  // Custom no rows overlay component
  const noRowsOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-no-rows-center flex items-center justify-center">
        <div className="flex flex-col items-center p-4">
          <div className="text-lg text-gray-600 mb-2">No Pending Approvals found</div>
          <div className="text-sm text-gray-500">There are no pending approvals at this time</div>
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
            enableCellTextSelection={false}
            domLayout='normal'
            overlayNoRowsTemplate="No records found"
            loadingOverlayComponent={loadingOverlayComponent}
            loadingOverlayComponentParams={{
              loadingMessage: 'Loading Approvals...'
            }}
            noRowsOverlayComponent={noRowsOverlayComponent}
          />
      </div>

      {/* Pagination controls without Load More */}
      <AGGridPagination
        gridApi={gridApi}
        totalItems={rowData.length}
        currentPage={currentPage}
        currentPageSize={currentPageSize}
        setCurrentPage={setCurrentPage}
        setCurrentPageSize={setCurrentPageSize}
        pageSizeOptions={[20, 50, 100, 500]}
      />
    </div>

      {/* Full-screen loading spinner while preloading form data */}
      {isPreloadingFormData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <Spinner size='medium' customLoadingName='Loading...'/>
        </div>
      )}

      <ApprovalEditModal
        open={isModalOpen}
        onClose={handleCloseModal}
        rowData={selectedApproval}
        onSuccess={fetchPendingApprovals}
        preloadedCustomerData={preloadedCustomerData}
        preloadedActivityData={preloadedActivityData}
        preloadedContactData={preloadedContactData}
        preloadedOpportunityData={preloadedOpportunityData}
        preloadedApprovalActions={preloadedApprovalActions}
        preloadedFieldVisibility={preloadedFieldVisibility}
      />
    </div>
  );
};

export default PendingApprovals;
