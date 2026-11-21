import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSnackbar } from 'notistack';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import customerService from '../../lib/services/customerService';
import { CustomerData } from '../../lib/models/customerModels';
import CustomerDataGrid from '../../components/customers/CustomerDataGrid';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';

import { getProjectId } from '@/lib/storage/sharedStorage';
import { useEntityNames } from '@/hooks/useDynamicNames';
import { useEntityHeading } from '../../hooks/useEntityHeading';

import { Button } from "../../components/ui/tailwind";
import CustomerHeader from '@/components/customers/CustomerHeader';
import { CustomerProvider } from '@/contexts/CustomerContext';
import TwinModal from '@/components/common/TwinModal';
import AdvanceFilter, { AdvanceFilterRef } from '@/components/customers/CustomerFilter';
import { FieldValuesProvider } from '@/contexts/FieldValuesContext';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import dynamic from 'next/dynamic';
import Spinner from '@/components/common/Spinner';
import { preloadCustomerFormData, preloadCustomerEditFormData, PreloadedCustomerFormData } from '@/components/customers/AddEditForm/subs/formDataPreloader';

// Dynamically import AddForm and EditForm to avoid SSR issues
const AddForm = dynamic(
  () => import('@/components/customers/AddEditForm/AddForm'),
  { ssr: false }
);

const EditForm = dynamic(
  () => import('@/components/customers/AddEditForm/EditForm'),
  { ssr: false }
);

// Utility function for conditional class names
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

const Customers: NextPage = () => {
  // State for data
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table'); // Default to table view, but support grid view type for context compatibility
  const [dynamicColumns, setDynamicColumns] = useState<{ field: string, headerName: string, attributeType: number }[]>([]);

  const pageNumber = useRef(0); // start from 0 for pagination
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [needsListRefresh, setNeedsListRefresh] = useState(false);
  const columnsGenerated = useRef(false);
  
  // State for filters and views
  const [selectedView, setSelectedView] = useState<"self" | "team" | "all">("self");

  // Get Project ID from sharedStorage
  const projectId = getProjectId() || 0;

  // Get entity-specific headings
  const { getSingularName, getPluralName } = useEntityNames();
  const pageHeading = getPluralName('Customers');
  const singularHeading = getSingularName('Customers');
  
  // State for customer modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isAddFormModalOpen, setIsAddFormModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);
  
  // Form submission and API loading states (for TwinModal header buttons)
  const [isFormSubmitting, setIsFormSubmitting] = useState<boolean>(false);
  const [isApiLoading, setIsApiLoading] = useState<boolean>(false);
  const [isEditFormSubmitting, setIsEditFormSubmitting] = useState<boolean>(false);
  const [isEditApiLoading, setIsEditApiLoading] = useState<boolean>(false);
  
  // Preloading state - show full-screen spinner while preloading form data
  const [isPreloadingFormData, setIsPreloadingFormData] = useState<boolean>(false);
  const [preloadedFormData, setPreloadedFormData] = useState<PreloadedCustomerFormData | null>(null);
  const [editPreloadedFormData, setEditPreloadedFormData] = useState<PreloadedCustomerFormData | null>(null);
  
  // State for filter modal
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [currentAdvanceSearchRequest, setCurrentAdvanceSearchRequest] = useState<any>(null);
  const [hasActiveFilters, setHasActiveFilters] = useState<boolean>(false);
  const customerFilterRef = useRef<AdvanceFilterRef>(null);
  
  const pageSize=10000;
  
  // Access notistack's enqueueSnackbar function for notifications
  const { enqueueSnackbar } = useSnackbar();
  
  // Function to fetch customers with filters
  const fetchFilteredCustomers = useCallback(async (isLoadMore = false, advanceSearchRequest = null) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
      // Reset pageNumber when it's a new search/filter
      pageNumber.current = 0;
    }

    try {
      // Call the API to get filtered customers
      const customerView = selectedView === 'self' ? 1 : selectedView === 'team' ? 2 : 3;

      // Use advance search request if provided, otherwise use stored one, otherwise null
      const searchData = advanceSearchRequest || currentAdvanceSearchRequest;
      
      const response = await customerService.getCustomersFilter(projectId, customerView, pageNumber.current, pageSize, false, searchData);
      
      const rawData = response.responseData.data;
      if (response && response.statusCode === 200) {
        if (rawData.length > 0 && rawData[0].data) {
          // Only generate columns if they haven't been generated yet
          if (!columnsGenerated.current) {
            const columns = generateDynamicColumns(rawData[0].data);
            setDynamicColumns(columns);
            columnsGenerated.current = true; // Set flag to true to avoid regenerating
          }
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
            id: item.companyId || '',
            serialNo: item.serialNo || '',
            owner: item.owner || '',
            status: item.status,
            ...customFields
          };
        });
        
        // Set the transformed data to customers state
        if (isLoadMore) {
          setCustomers(prevCustomers => [...prevCustomers, ...transformed]);
        } else {
          setCustomers(transformed);
        }
        
        // Set total count if available
        if (pageNumber.current === 0) {
          // If advance search is active, use totalCountForAdvSearch from response
          if (searchData && response.responseData.totalCountForAdvSearch) {
            setTotalCount(parseInt(response.responseData.totalCountForAdvSearch));
          } else {
            // Otherwise, call the separate count API for normal filtering
            const totalCountResponse = await customerService.getTotalCountOfCompany(projectId, customerView, false);
            setTotalCount(totalCountResponse.responseData.totalCount);
          }
        }
        
      } else {
        enqueueSnackbar('Failed to load customers', { 
          variant: 'error',
          anchorOrigin: { vertical: 'top', horizontal: 'right' }
        });
        if (!isLoadMore) {
          setCustomers([]);
        }
      }
    } catch (error) {
      enqueueSnackbar('Failed to load customers', { 
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'right' }
      });
      if (!isLoadMore) {
        setCustomers([]);
      }
    } finally {
      if (isLoadMore) {
        setIsLoadingMore(false);
      } else {
        setLoading(false);
      }
      // Reset the refresh flag
      if (needsListRefresh) {
        setNeedsListRefresh(false);
      }
    }
  }, [projectId, needsListRefresh, enqueueSnackbar]); // Removed searchTerm to prevent API calls on search
  
  // Initial fetch on component mount and when dependencies change
  useEffect(() => {
    fetchFilteredCustomers();
  }, [fetchFilteredCustomers]);

  const generateDynamicColumns = useCallback((customFieldsArray: any[]) => {
      if (!Array.isArray(customFieldsArray) || customFieldsArray.length === 0) return [];
  
      const columns = [];
  
      // Add serialNo as first static column
      columns.push({
        field: 'serialNo',
        headerName: 'Serial No',
        attributeType:CustomAttributeTypeEnum.TEXT_SINGLE_LINE,
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
        attributeType:CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN,
        order: 998
      });
  
      // Sort by order and return just field and headerName
      return columns
        .sort((a, b) => a.order - b.order)
        .map(({ field, headerName,attributeType }) => ({ field, headerName,attributeType }));
    }, []);
  
  // Function to export customers
  const exportCustomers = async () => {
    // Set loading state to show loader
    setExporting(true);

    try {
      // Prepare request body for the export API
      const requestBody = {
        "advanceSearch": null,
        "isFirstAdvSearch": false
      };

      // Call the API to export customers
      const response = await customerService.exportCustomers(projectId, 1, requestBody);

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
        enqueueSnackbar('Report generated successfully', {
          variant: 'success',
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          autoHideDuration: 3000
        });
      }
    } catch (error) {
      // Show error notification
      enqueueSnackbar('Failed to generate report', {
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 3000
      });
    } finally {
      // Reset exporting state
      setExporting(false);
    }
  };

  // Function to handle search input changes
  const handleSearch = () => {
    // Search is now handled client-side by AG Grid's quick filter
    // No need to make API calls - the searchTerm is passed to CustomerDataGrid
    // and AG Grid will filter the loaded data automatically
  };
  
  // Customer action handlers
  const handleViewCustomer = (customerId: number) => {
    console.log('View customer:', customerId);
    // In a real application, navigate to customer detail page
    // router.push(`/customers/${customerId}`);
  };
  
  const handleCustomerDashboard = (customerId: number) => {
    console.log('Dashboard for customer:', customerId);
    // In a real application, navigate to customer dashboard
    // router.push(`/customers/${customerId}/dashboard`);
  };

  const handleEditCustomer = async (customerId: number) => {
    console.log('Edit customer:', customerId);
    const editingCustomerData = customers.find(customer => customer.id === customerId);
    setEditingCustomer(editingCustomerData || null);
    setIsPreloadingFormData(true); // Show full-screen loading spinner
    
    try {
      const projectId = JSON.parse(localStorage.getItem('selectedProject') || '{}');
      const source = selectedView === "self" ? 1 : selectedView === "team" ? 2 : 3;
      
      // Preload all form data including customer details
      const preloaded = await preloadCustomerEditFormData(projectId, customerId, source);
      
      // Store preloaded data
      setEditPreloadedFormData(preloaded);
      
      // Now open the modal
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error preloading edit form data:', error);
      enqueueSnackbar('Error loading customer data', { variant: 'error' });
    } finally {
      setIsPreloadingFormData(false);
    }
  };
  

  
  // Modal action handlers
  const handleOpenAddModal = async () => {
    setIsPreloadingFormData(true); // Show full-screen loading spinner
    
    try {
      const projectId = JSON.parse(localStorage.getItem('selectedProject') || '{}');
      const source = selectedView === "self" ? 1 : selectedView === "team" ? 2 : 3;
      
      // Preload all form data
      const preloaded = await preloadCustomerFormData(projectId, source);
      
      // Store preloaded data
      setPreloadedFormData(preloaded);
      
      // Now open the modal
      setIsAddFormModalOpen(true);
    } catch (error) {
      console.error('Error preloading form data:', error);
      enqueueSnackbar('Error loading form data', { variant: 'error' });
    } finally {
      setIsPreloadingFormData(false);
    }
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setEditPreloadedFormData(null); // Clear preloaded data
  };

  const handleCloseAddFormModal = () => {
    setIsAddFormModalOpen(false);
    setPreloadedFormData(null); // Clear preloaded data
  };

  // Filter modal handlers
  const handleOpenFilterModal = () => {
    setIsFilterModalOpen(true);
  };

  const handleCloseFilterModal = () => {
    setIsFilterModalOpen(false);
  };

  const handleApplyFilters = (searchRequest: {
    advanceSearch: Array<{
      entityFieldId: number;
      attributeTypeId: number;
      operatorId: number;
      value: string;
      fromValue: string | null;
      toValue: string | null;
    }>;
    isFirstAdvSearch: boolean;
  }) => {
    setActiveFilters(searchRequest.advanceSearch);
    setHasActiveFilters(searchRequest.advanceSearch.length > 0);
    
    // Store the current advance search request for load more operations
    setCurrentAdvanceSearchRequest(searchRequest);
    
    // Call fetchFilteredCustomers with the search request
    fetchFilteredCustomers(false, searchRequest);
  };

  const handleClearFilters = () => {
    // Clear modal state as well
    customerFilterRef.current?.clear();
    setActiveFilters([]);
    setHasActiveFilters(false);
    setCurrentAdvanceSearchRequest(null);
    
    // Refresh customer data without filters
    fetchFilteredCustomers(false, null);
  };
  
  // Filter for customers based on the selected view
  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customers)) {
      return [];
    }
    
    // For now, we'll just return all customers as we're getting filtered data from API
    // In the future, we might want to add more client-side filtering here
    return customers;
  }, [customers]);

  // Extract unique customer types (this would be used for filters later)
  const customerTypes = useMemo(() => {
    if (!Array.isArray(customers) || customers.length === 0) {
      return [];
    }
    // Extract unique types from API data
    return Array.from(new Set(customers.map(c => c.type).filter(Boolean)));
  }, [customers]);


  return (
    <Layout>
      <Head>
        <title>{pageHeading} Management | 1Channel</title>
      </Head>
      <CustomerProvider value={{
        pageHeading,
        searchTerm,
        setSearchTerm,
        handleSearch,
        viewMode,
        setViewMode,
        setLoading,
        setNeedsListRefresh,
        gridDataLoaded: !loading,
        exporting,
        exportOpportunities: exportCustomers, // Use the customer export function
        selectedView,
        setSelectedView,
        handleOpenAddModal,
        // Load More functionality
        handleLoadMore: () => {
          pageNumber.current += 1;
          
          // If there's an active advance search request, modify it for pagination
          let loadMoreSearchRequest = null;
          if (currentAdvanceSearchRequest) {
            loadMoreSearchRequest = {
              ...currentAdvanceSearchRequest,
              isFirstAdvSearch: false // Set to false for load more operations
            };
          }
          
          fetchFilteredCustomers(true, loadMoreSearchRequest);
        },
        isLoadingMore,
        totalCount,
        currentCount: filteredCustomers.length,
        // Filter functionality
        handleOpenFilterModal,
        hasActiveFilters,
        activeFiltersCount: activeFilters.length,
        handleClearFilters,
      }}>
        <TailwindPageLayout
          header={<CustomerHeader />}
        >
          <div className="h-full w-full overflow-auto">
            {loading ? (
              <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-500 mb-4">No {pageHeading} found</div>
                <p className="text-gray-400">Try changing your filter settings or add a new {pageHeading}</p>
              </div>
            ) : (
              <CustomerDataGrid
                customers={filteredCustomers}
                loading={loading}
                onCustomerView={handleViewCustomer}
                onCustomerEdit={handleEditCustomer}
                onCustomerDashboard={handleCustomerDashboard}
                dynamicColumns={dynamicColumns}
                searchText={searchTerm}
                onGridReady={() => console.log('Customer grid ready')}
              />
            )}
          </div>
        </TailwindPageLayout>

        {/* Full-screen loading spinner while preloading form data */}
        {isPreloadingFormData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
            <Spinner size='medium' customLoadingName='Loading...'/>
          </div>
        )}

        {/* Add Customer Modal */}
        {isAddFormModalOpen && (
          <TwinModal
            open={isAddFormModalOpen}
            onClose={handleCloseAddFormModal}
            modalClassName="max-w-4xl"
            allowBorder={true}
            closeOnOutsideClick={false}
            header={
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#3F4254]">Add New {singularHeading}</h2>
              </div>
            }
            footer={
              <div className="flex justify-end space-x-3">
                <button
                  className={`bg-gray-200 text-black rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm ${(isFormSubmitting || isApiLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`}
                  onClick={handleCloseAddFormModal}
                  type="button"
                  aria-label="Cancel"
                  disabled={isFormSubmitting || isApiLoading}
                >
                  Cancel
                </button>
                <button
                  className={`bg-blue-500 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm min-w-[80px] ${(isFormSubmitting || isApiLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                  onClick={() => {
                    const form = document.getElementById('add-customer-form');
                    form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                  }}
                  type="button"
                  aria-label="Save"
                  disabled={isFormSubmitting || isApiLoading}
                >
                  {isFormSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            }
          >
            {/* Centered spinner overlay when API is loading */}
            {isApiLoading && (
              <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center pointer-events-auto">
                <Spinner size="medium" customLoadingName="Loading data..." />
              </div>
            )}
            <AddForm 
              onCancel={handleCloseAddFormModal}
              onSuccess={() => {
                setNeedsListRefresh(true);
                fetchFilteredCustomers();
                handleCloseAddFormModal();
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
        
        {/* Edit Customer Modal */}
        {isModalOpen && editingCustomer && (
          <TwinModal
            open={isModalOpen}
            onClose={handleCloseModal}
            modalClassName="max-w-4xl"
            allowBorder={true}
            closeOnOutsideClick={false}
            header={
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#3F4254]">Edit {singularHeading}</h2>
              </div>
            }
            footer={
              <div className="flex justify-end space-x-3">
                <button
                  className={`bg-gray-200 text-black rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm ${(isEditFormSubmitting || isEditApiLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`}
                  onClick={handleCloseModal}
                  type="button"
                  aria-label="Cancel"
                  disabled={isEditFormSubmitting || isEditApiLoading}
                >
                  Cancel
                </button>
                <button
                  className={`bg-blue-500 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm min-w-[80px] ${(isEditFormSubmitting || isEditApiLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                  onClick={() => {
                    const form = document.getElementById('edit-customer-form');
                    form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                  }}
                  type="button"
                  aria-label="Save"
                  disabled={isEditFormSubmitting || isEditApiLoading}
                >
                  {isEditFormSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            }
          >
            {/* Centered spinner overlay when API is loading */}
            {isEditApiLoading && (
              <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center pointer-events-auto">
                <Spinner size="medium" customLoadingName="Loading data..." />
              </div>
            )}
            <EditForm 
              onCancel={handleCloseModal}
              onSuccess={() => {
                setNeedsListRefresh(true);
                fetchFilteredCustomers();
                handleCloseModal();
              }}
              onSubmittingChange={setIsEditFormSubmitting}
              onApiLoadingChange={setIsEditApiLoading}
              companyId={editingCustomer?.id}
              source={selectedView}
              preloadedData={editPreloadedFormData || undefined}
              hideInternalActions
              hideHeading
            />
          </TwinModal>
        )}

        {/* Customer Filter Modal */}
        <FieldValuesProvider>
          <AdvanceFilter
            ref={customerFilterRef}
            isOpen={isFilterModalOpen}
            onClose={handleCloseFilterModal}
            onApply={handleApplyFilters}
            onClear={handleClearFilters}
          />
        </FieldValuesProvider>
      </CustomerProvider>
    </Layout>
  );
};

export default Customers;
