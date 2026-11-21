import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSnackbar } from 'notistack';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import opportunityService from '../../lib/services/opportunityService';
import { OpportunityData } from '../../lib/models/opportunity/opportunityModels';
import { getProjectId } from '@/lib/storage/sharedStorage';
import { useEntityNames } from '@/hooks/useDynamicNames';
import { useEntityHeading } from '../../hooks/useEntityHeading';
import OpportunityDataGrid from '../../components/opportunities/OpportunityDataGrid';
import OpportunityGridView from '../../components/opportunities/OpportunityGridView';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import { OpportunityGridViewModel } from '@/lib/models/opportunity/opportunity-grid-view/opportunity-grid-view.model';
import OpportunitiesHeader from '../../components/opportunities/OpportunitiesHeader';
import { OpportunitiesProvider } from '../../contexts/OpportunitiesContext';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import TwinModal from '@/components/common/TwinModal';
import Spinner from '@/components/common/Spinner';
import dynamic from 'next/dynamic';
import {
  preloadOpportunityEditFormData,
  preloadOpportunityFormData,
  PreloadedOpportunityFormData,
} from '@/components/opportunities/AddEditForm/subs/formDataPreloader';

const AddForm = dynamic(
  () => import('@/components/opportunities/AddEditForm/AddForm'),
  { ssr: false }
);

const EditForm = dynamic(
  () => import('@/components/opportunities/AddEditForm/EditForm'),
  { ssr: false }
);

// Utility function for conditional class names
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

const Opportunities: NextPage = () => {
  // State for data - separate states for grid view and data grid
  const [opportunityGridData, setOpportunityGridData] = useState<OpportunityGridViewModel[]>([]);
  const [opportunityListData, setOpportunityListData] = useState<OpportunityData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [dynamicColumns, setDynamicColumns] = useState<{ field: string, headerName: string, attributeType: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const pageNumber = useRef(0); // start from 0
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Get Project ID from sharedStorage
  const projectId = getProjectId() || 0;

  // Get entity-specific headings using our custom hooks
  const { getSingularName, getPluralName } = useEntityNames();
  const pageHeading = getPluralName('Opportunities');
  const singularHeading = getSingularName('Opportunities');

  // Access notistack's enqueueSnackbar function for notifications
  const { enqueueSnackbar } = useSnackbar();

  // Function to handle exporting opportunities
  const exportOpportunities = async () => {
    // Set loading state to show loader
    setExporting(true);

    try {
      // Set viewMode based on current view (1 for table, 2 for grid)
      const exportViewMode = viewMode === 'table' ? 1 : 2;

      // Prepare request body for the export API
      const requestBody = {
        "advanceSearch": null,
        "isFirstAdvSearch": false
      };

      // Call the API to export opportunities
      const response = await opportunityService.exportOpportunities(projectId, exportViewMode, requestBody);

      // Check if the response has the expected format
      if (response && response.statusCode === 200 && response.responseData) {
        // Show success message in notification
        enqueueSnackbar(response.responseData, {
          variant: 'success',
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          autoHideDuration: 3000
        });
      } else {
        // Handle unexpected response format
        console.warn('Unexpected response format:', response);
        enqueueSnackbar('Report generated successfully', {
          variant: 'success',
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          autoHideDuration: 3000
        });
      }
    } catch (error) {
      console.error('Error exporting opportunities:', error);
      // Show error notification
      enqueueSnackbar('Failed to export opportunities', {
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 3000
      });
    } finally {
      // Hide loader once operation is complete and toast is shown
      setExporting(false);
    }
  };

  // Reference to the grid API
  const [gridApi, setGridApi] = useState<any>(null);

  // State for pagination and view selection
  const itemsPerPage = 10000;
  const [selectedView, setSelectedView] = useState<"self" | "team" | "all">("self");

  // State for view mode (grid or table)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  // Flag to track if real data has been loaded for grid view
  const [gridDataLoaded, setGridDataLoaded] = useState<boolean>(false);
  // Flag to track if we need to refresh list view
  const [needsListRefresh, setNeedsListRefresh] = useState<boolean>(true);

  // State for opportunity modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<number | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);

  // State for AddForm modal
  const [isAddFormModalOpen, setIsAddFormModalOpen] = useState(false);

  // Form submission and API loading states (for TwinModal footer buttons)
  const [isFormSubmitting, setIsFormSubmitting] = useState<boolean>(false);
  const [isApiLoading, setIsApiLoading] = useState<boolean>(false);
  const [isEditFormSubmitting, setIsEditFormSubmitting] = useState<boolean>(false);
  const [isEditApiLoading, setIsEditApiLoading] = useState<boolean>(false);

  // Preloading state (same pattern as Customers)
  const [isPreloadingFormData, setIsPreloadingFormData] = useState<boolean>(false);
  const [preloadedFormData, setPreloadedFormData] = useState<PreloadedOpportunityFormData | null>(null);
  const [editPreloadedFormData, setEditPreloadedFormData] = useState<PreloadedOpportunityFormData | null>(null);

  // Function to generate dynamic columns from the API custom fields data array
  const generateDynamicColumns = useCallback((customFieldsArray: any[]) => {
    if (!Array.isArray(customFieldsArray) || customFieldsArray.length === 0) return [];

    const columns = [];

    // Add serialNo as first static column
    columns.push({
      field: 'serialNo',
      headerName: 'Serial No',
      attributeType: CustomAttributeTypeEnum.TEXT_SINGLE_LINE,
      order: 1
    });

    // Generate dynamic columns from custom fields
    // Start with a higher order number to keep them after serial number
    let orderCounter = 10;
    customFieldsArray.forEach(item => {
      if (item.customFieldLabel) {
        // Use customFieldLabel as both the field name and header name
        // The field names will match the custom fields we spread into the transformed data
        columns.push({
          field: item.customFieldLabel,
          headerName: item.customFieldLabel,
          attributeType: item.customFieldType,
          order: orderCounter++
        });
      }
    });

    // Add owner column before actions (will be last but one)
    columns.push({
      field: 'owner',
      headerName: 'Owner',
      attributeType: CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN,
      order: 998,
    });

    // Sort by order and return just field, headerName, and attributeType
    return columns
      .sort((a, b) => a.order - b.order)
      .map(({ field, headerName, attributeType }) => ({ field, headerName, attributeType }));
  }, []);

  // Add effect to handle page refresh/close behavior for modal
  useEffect(() => {
    // Only refresh when view parameters change, not when modals close
    pageNumber.current = 0;
    fetchOpportunities();
  }, [selectedView, viewMode]); // Dependencies that should trigger a data refresh

  // Function to fetch opportunities from API
  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true);

      let viewTypeValue = 1; // Default to 'self'
      if (selectedView === 'team') viewTypeValue = 2;
      if (selectedView === 'all') viewTypeValue = 3;

      if (viewMode === 'grid') {
        // Fetch data for grid view
        const response = await opportunityService.getOpportunityGridViewData(projectId, viewTypeValue);

        if (response && response.responseData) {
          // We have data - set the grid data flag
          setGridDataLoaded(true);
          setOpportunityGridData(response.responseData);
        } else {
          throw new Error('Invalid grid view response format');
        }
      } else {
        await fetchFilteredOpportunities();
      }

    } catch (err: any) {
      console.error('Error fetching opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedView, projectId, viewMode, itemsPerPage, generateDynamicColumns]);


  // Apply search filter when search term changes
  useEffect(() => {
    if (gridApi) {
      // Small delay to avoid too many filter operations during typing
      const timeoutId = setTimeout(() => {
        gridApi.setQuickFilter(searchTerm);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, gridApi]);

  // For handling Enter key press - immediate search
  const handleSearch = () => {
    if (gridApi) {
      gridApi.setQuickFilter(searchTerm);
    }
  };


  async function fetchFilteredOpportunities(isLoadMore = false) {
    try {
      if (!projectId) {
        setLoading(false);
        return;
      }

      setIsLoadingMore(isLoadMore);
      const viewType = selectedView === 'self' ? 1 : selectedView === 'team' ? 2 : 3;

      const response = await opportunityService.getOpportunitiesFilter(
        projectId,
        viewType,
        pageNumber.current,
        itemsPerPage
      );

      if (
        response &&
        response.responseData &&
        Array.isArray(response.responseData.data)
      ) {
        const rawData = response.responseData.data;

        if (pageNumber.current === 0 && response.responseData.totalCount) {
          setTotalCount(response.responseData.totalCount);
        }

        if (rawData.length > 0 && rawData[0].data) {
          const columns = generateDynamicColumns(rawData[0].data);
          setDynamicColumns(columns);
        }

        const transformed = rawData.map((item, index) => {
          const customFields = {};
          if (item.data) {
            item.data.forEach(field => {
              if (field.customFieldLabel) {
                customFields[field.customFieldLabel] = field.customFieldValue;
              }
            });
          }
          return {
            id: item.opportunityId || '',
            serialNo: item.serialNo || '',
            owner: item.owner || '',
            status: item.status,
            ...customFields
          };
        });

        setOpportunityListData(prev =>
          isLoadMore ? [...prev, ...transformed] : transformed
        );
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      setOpportunityListData([]);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
      setNeedsListRefresh(false);
    }
  };


  // Opportunity action handlers
  const handleViewOpportunity = (opportunityId: number) => {
    // Implement view logic here
  };

  const handleEditOpportunity = (opportunity: any) => {
    handleOpenEditModal(opportunity.id);
  };

  const handleOpenEditModal = async (opportunityId: number) => {
    setIsAddFormModalOpen(false);
    setPreloadedFormData(null);

    setEditingOpportunity(opportunityId);
    setIsPreloadingFormData(true);

    try {
      const projectId = JSON.parse(localStorage.getItem('selectedProject') || '{}');
      const source = selectedView === 'self' ? 1 : selectedView === 'team' ? 2 : 3;
      const preloaded = await preloadOpportunityEditFormData(projectId, opportunityId, source);
      setEditPreloadedFormData(preloaded);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error preloading edit form data:', error);
      enqueueSnackbar('Error loading opportunity data', { variant: 'error' });
    } finally {
      setIsPreloadingFormData(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingOpportunity(undefined);
    setEditPreloadedFormData(null);
    // No data refresh here - only on success callback
  };

  const handleCloseAddFormModal = () => {
    setIsAddFormModalOpen(false);
    setPreloadedFormData(null);
    // No data refresh here - only on success callback
  };

  const handleOpenAddModal = async () => {
    setIsModalOpen(false);
    setEditingOpportunity(undefined);
    setEditPreloadedFormData(null);

    setIsPreloadingFormData(true);
    try {
      const projectId = JSON.parse(localStorage.getItem('selectedProject') || '{}');
      const source = selectedView === 'self' ? 1 : selectedView === 'team' ? 2 : 3;
      const preloaded = await preloadOpportunityFormData(projectId, source);
      setPreloadedFormData(preloaded);
      setIsAddFormModalOpen(true);
    } catch (error) {
      console.error('Error preloading add form data:', error);
      enqueueSnackbar('Error loading form data', { variant: 'error' });
    } finally {
      setIsPreloadingFormData(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>{pageHeading} Management | 1Channel</title>
      </Head>

      <OpportunitiesProvider value={{
        pageHeading,
        searchTerm,
        setSearchTerm,
        handleSearch,
        viewMode,
        setViewMode,
        setLoading,
        setNeedsListRefresh,
        gridDataLoaded,
        exporting,
        exportOpportunities,
        selectedView,
        setSelectedView,
        handleOpenAddModal: handleOpenAddModal,
      }}>
        <TailwindPageLayout
          header={<OpportunitiesHeader />}
        >
          <div className="h-full w-full overflow-auto">
            {loading ? (
              <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : viewMode === 'table' ? (
              opportunityListData.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-gray-500 mb-4">No {pageHeading} found</div>
                  <p className="text-gray-400">Try changing your filter settings or add a new {pageHeading}</p>
                </div>
              ) : (
                <OpportunityDataGrid
                  opportunities={opportunityListData}
                  loading={loading}
                  onOpportunityView={handleViewOpportunity}
                  onOpportunityEdit={handleEditOpportunity}
                  dynamicColumns={dynamicColumns}
                  searchText={searchTerm}
                  onLoadMore={() => {
                    pageNumber.current += 1;
                    fetchFilteredOpportunities(true);
                  }}
                  isLoadingMore={isLoadingMore}
                  totalCount={totalCount}
                  currentCount={opportunityListData.length}
                />
              )
            ) : opportunityGridData.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-500 mb-4">No {pageHeading} found</div>
                <p className="text-gray-400">Try changing your filter settings or add a new {pageHeading}</p>
              </div>
            ) : (
              <OpportunityGridView
                opportunities={opportunityGridData}
                loading={loading}
                onOpportunityView={handleViewOpportunity}
                onOpportunityEdit={handleEditOpportunity}
                dynamicColumns={dynamicColumns}
              />
            )}
          </div>
        </TailwindPageLayout>
      </OpportunitiesProvider>

      {/* Full-screen spinner overlay while preloading */}
      {isPreloadingFormData && (
        <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center pointer-events-auto">
          <Spinner size="medium" customLoadingName="Loading data..." />
        </div>
      )}

      {/* Add Opportunity Modal */}
      {isAddFormModalOpen && (
        <TwinModal
          open={isAddFormModalOpen}
          onClose={handleCloseAddFormModal}
          modalClassName="max-w-4xl"
          allowBorder={true}
          closeOnOutsideClick={false}
          header={`Add New ${singularHeading}`}
          footer={
            <div className="flex justify-end space-x-3">
              <button
                className={`bg-gray-200 text-black rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm ${(isFormSubmitting || isApiLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`}
                onClick={handleCloseAddFormModal}
                type="button"
                disabled={isFormSubmitting || isApiLoading}
              >
                Cancel
              </button>
              <button
                className={`bg-blue-500 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm min-w-[80px] ${(isFormSubmitting || isApiLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                onClick={() => {
                  const form = document.getElementById('add-opportunity-form');
                  form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }}
                type="button"
                disabled={isFormSubmitting || isApiLoading}
              >
                {isFormSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          }
        >
          {isApiLoading && (
            <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center pointer-events-auto">
              <Spinner size="medium" customLoadingName="Loading data..." />
            </div>
          )}
          <AddForm
            onCancel={handleCloseAddFormModal}
            onSuccess={() => {
              handleCloseAddFormModal();
              setNeedsListRefresh(true);
              fetchFilteredOpportunities();
            }}
            onSubmittingChange={setIsFormSubmitting}
            onApiLoadingChange={setIsApiLoading}
            source={selectedView}
            preloadedData={preloadedFormData || undefined}
            hideInternalActions
            hideHeading
          />
        </TwinModal>
      )}

      {/* Edit Opportunity Modal */}
      {isModalOpen && editingOpportunity && (
        <TwinModal
          open={isModalOpen}
          onClose={handleCloseModal}
          modalClassName="max-w-4xl"
          allowBorder={true}
          closeOnOutsideClick={false}
          header={`Edit ${singularHeading}`}
          footer={
            <div className="flex justify-end space-x-3">
              <button
                className={`bg-gray-200 text-black rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm ${(isEditFormSubmitting || isEditApiLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`}
                onClick={handleCloseModal}
                type="button"
                disabled={isEditFormSubmitting || isEditApiLoading}
              >
                Cancel
              </button>
              <button
                className={`bg-blue-500 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm min-w-[80px] ${(isEditFormSubmitting || isEditApiLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                onClick={() => {
                  const form = document.getElementById('edit-opportunity-form');
                  form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }}
                type="button"
                disabled={isEditFormSubmitting || isEditApiLoading}
              >
                {isEditFormSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          }
        >
          {isEditApiLoading && (
            <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center pointer-events-auto">
              <Spinner size="medium" customLoadingName="Loading data..." />
            </div>
          )}
          <EditForm
            opportunityId={editingOpportunity}
            onCancel={handleCloseModal}
            onSuccess={() => {
              handleCloseModal();
              setNeedsListRefresh(true);
              fetchFilteredOpportunities();
            }}
            onSubmittingChange={setIsEditFormSubmitting}
            onApiLoadingChange={setIsEditApiLoading}
            source={selectedView}
            preloadedData={editPreloadedFormData || undefined}
            hideInternalActions
            hideHeading
          />
        </TwinModal>
      )}
    </Layout>
  );
};

export default Opportunities;
