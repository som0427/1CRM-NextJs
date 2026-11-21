import React, { useState, useRef } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import { useSnackbar } from 'notistack';
import { UserLocalizationService } from '@/lib/services/userLocalizationService';

import ActivitiesHeader from '@/components/activities/ActivitiesHeader';
import PerformedActivitiesList from '@/components/activities/PerformedActivitiesList';
import PlannedOverdueActivitiesList from '@/components/activities/PlannedOverdueActivitiesList';
import ActivitySelectionModal from '@/components/activities/ActivitySelectionModal';
import { ActivitiesProvider } from '@/contexts/ActivitiesContext';
import Spinner from '@/components/common/Spinner';
import { ManageActivitiesModel } from '@/lib/models/activities/manage-activities.model';
import TwinModal from '@/components/common/TwinModal';
import dynamic from 'next/dynamic';
import { preloadFormData, preloadEditFormData, PreloadedFormData } from '@/components/activities/AddEditForm/subs/formDataPreloader';

// Dynamically import AddForm and EditForm to avoid SSR issues
const AddForm = dynamic(
  () => import('@/components/activities/AddEditForm/AddForm'),
  { ssr: false }
);

const EditForm = dynamic(
  () => import('@/components/activities/AddEditForm/EditForm'),
  { ssr: false }
);

const CrmActivities: NextPage = () => {
  const [activeTab, setActiveTab] = useState<'performed' | 'planned'>('performed');
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedView, setSelectedView] = useState<"self" | "team" | "all">("self");
  const [hasActiveFilters, setHasActiveFilters] = useState<boolean>(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState<number>(0);
  const [showActivitySelectionModal, setShowActivitySelectionModal] = useState<boolean>(false);
  const [selectedActivity, setSelectedActivity] = useState<ManageActivitiesModel | null>(null);
  const [showAddActivityModal, setShowAddActivityModal] = useState<boolean>(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState<boolean>(false);
  const [isApiLoading, setIsApiLoading] = useState<boolean>(false); // Track API loading state after modal opens
  const [apiError, setApiError] = useState<string | null>(null); // Track API error message
  const [isPreloadingFormData, setIsPreloadingFormData] = useState<boolean>(false);
  const [preloadedFormData, setPreloadedFormData] = useState<PreloadedFormData | null>(null);
  const refreshActivitiesRef = useRef<(() => void) | null>(null);
  
  // Edit modal state
  const [showEditActivityModal, setShowEditActivityModal] = useState<boolean>(false);
  const [editActivityId, setEditActivityId] = useState<number | null>(null);
  const [editActivityModuleType, setEditActivityModuleType] = useState<number | null>(null);
  const [editActivityModuleName, setEditActivityModuleName] = useState<string | null>(null);
  const [editActivityCreatedOn, setEditActivityCreatedOn] = useState<string | null>(null);
  const [isEditFormSubmitting, setIsEditFormSubmitting] = useState<boolean>(false);
  const [isEditApiLoading, setIsEditApiLoading] = useState<boolean>(false); // Track API loading state for edit modal
  const [editApiError, setEditApiError] = useState<string | null>(null); // Track API error for edit modal
  const [editPreloadedFormData, setEditPreloadedFormData] = useState<PreloadedFormData | null>(null);

  const { enqueueSnackbar } = useSnackbar();

  const pageHeading = "Activities";

  const handleSearch = () => {
  };

  const handleOpenAddModal = () => {
    setShowActivitySelectionModal(true);
  };

  const handleActivitySelect = async (activity: ManageActivitiesModel) => {
    setSelectedActivity(activity);
    setIsPreloadingFormData(true); // Show loading spinner
    
    try {
      const projectId = JSON.parse(localStorage.getItem('selectedProject') || '{}');
      const activityTypeId = activity.activityId;
      // Convert activityView to source: self = 1, team = 2, all = 3
      const source = selectedView === "self" ? 1 : selectedView === "team" ? 2 : 3;
      
      // Preload all form data including lookup values
      const preloaded = await preloadFormData(projectId, activityTypeId, source);
      
      // Store preloaded data
      setPreloadedFormData(preloaded);
      
      // Now open the modal
      setShowAddActivityModal(true);
    } catch (error) {
      console.error('Error preloading form data:', error);
      enqueueSnackbar('Error loading form data', { variant: 'error' });
    } finally {
      setIsPreloadingFormData(false);
    }
  };

  const handleCloseAddActivityModal = () => {
    setShowAddActivityModal(false);
    setSelectedActivity(null);
    setPreloadedFormData(null); // Clear preloaded data
  };

  const handleSaveActivity = () => {
    // Refresh the activities grid after successful save
    if (refreshActivitiesRef.current) {
      refreshActivitiesRef.current();
    }
  };

  const handleOpenFilterModal = () => {
    enqueueSnackbar('Filter functionality will be implemented', { 
      variant: 'info',
      anchorOrigin: { vertical: 'top', horizontal: 'right' }
    });

  };

  const handleClearFilters = () => {
    setHasActiveFilters(false);
    setActiveFiltersCount(0);
  };

  const handleViewActivity = (activityId: number) => {
    console.log('View activity:', activityId);
  };

  const handleEditActivity = async (activityId: number, activityModuleType: number, activityName?: string) => {
    setEditActivityId(activityId);
    setEditActivityModuleType(activityModuleType);
    setEditActivityModuleName(activityName || null); // Set activity name from manageActivities data
    setIsPreloadingFormData(true);
    
    try {
      const projectId = JSON.parse(localStorage.getItem('selectedProject') || '{}');
      // Convert activityView to source: self/team = 2, all = 3
       const source = selectedView === "self" ? 1 : selectedView === "team" ? 2 : 3;      

      
      // Preload form data for edit using activityModuleType as the activityTypeId and activityId for activity detail
      const preloaded = await preloadEditFormData(projectId, activityModuleType, activityId, source);
      
      // Extract createdOn from activity detail response
      const activityData = preloaded?.activityDetailResponse?.responseData?.[0];
      if (activityData) {
        setEditActivityCreatedOn(activityData.createdOn || null);
      }
      
      setEditPreloadedFormData(preloaded);
      setShowEditActivityModal(true);
    } catch (error) {
      console.error('Error preloading edit form data:', error);
      enqueueSnackbar('Error loading activity data', { variant: 'error' });
    } finally {
      setIsPreloadingFormData(false);
    }
  };

  const handleCloseEditActivityModal = () => {
    setShowEditActivityModal(false);
    setEditActivityId(null);
    setEditActivityModuleType(null);
    setEditActivityModuleName(null);
    setEditActivityCreatedOn(null);
    setEditPreloadedFormData(null);
  };

  // Format date using same logic as ActivityDateTime column in grid
  const formatCreatedOnDate = (dateString: string | null): string => {
    if (!dateString) return '';
    return UserLocalizationService.formatToAmPm(dateString);
  };

  const handleUpdateActivity = () => {
    // Refresh the activities grid after successful update
    if (refreshActivitiesRef.current) {
      refreshActivitiesRef.current();
    }
    handleCloseEditActivityModal();
  };


  return (
    <Layout>
      <Head>
        <title>CRM Activities | 1Channel</title>
      </Head>
      
      <ActivitiesProvider
        value={{
          pageHeading,
          searchTerm,
          setSearchTerm,
          handleSearch,
          setLoading,
          setNeedsListRefresh: () => {},
          gridDataLoaded: !loading,
          activeTab,
          selectedView,
          setSelectedView,
          handleOpenAddModal,
          handleOpenFilterModal,
          hasActiveFilters,
          activeFiltersCount,
          handleClearFilters,
          defaultColDef: {} as any, // Will be overridden by context
        }}
        refreshActivitiesRef={refreshActivitiesRef}
      >
        <TailwindPageLayout
          header={<ActivitiesHeader activeTab={activeTab} setActiveTab={setActiveTab} />}
        >
          <div className="h-full w-full flex flex-col">
            {loading ? (
              <div className="flex-1 p-4">
                <Spinner />
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-4">
                {activeTab === 'performed' ? (
                  <PerformedActivitiesList
                    searchText={searchTerm}
                    onActivityView={handleViewActivity}
                    onActivityEdit={handleEditActivity}
                  />
                ) : (
                  <PlannedOverdueActivitiesList
                    searchText={searchTerm}
                    onActivityView={handleViewActivity}
                    onActivityEdit={handleEditActivity}
                  />
                )}
              </div>
            )}
          </div>
        </TailwindPageLayout>
        
        {/* Activity Selection Modal positioned relative to the add button */}
        {showActivitySelectionModal && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowActivitySelectionModal(false)}
          >
            <div className="absolute top-[120px] right-[50px]" onClick={(e) => e.stopPropagation()}>
              <ActivitySelectionModal
                open={showActivitySelectionModal}
                onClose={() => setShowActivitySelectionModal(false)}
                onActivitySelect={handleActivitySelect}
              />
            </div>
          </div>
        )}
        
        {/* Full-screen loading spinner while preloading form data */}
        {isPreloadingFormData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
            <Spinner size='medium' customLoadingName='Loading...'/>
          </div>
        )}

        {/* Add Activity Modal */}
        {showAddActivityModal && (
          <TwinModal
            open={showAddActivityModal}
            onClose={handleCloseAddActivityModal}
            modalClassName="max-w-4xl"
            allowBorder={true}
            closeOnOutsideClick={false}
            header={
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#3F4254]">
                  {`Add New ${selectedActivity?.activityName ?? 'Activity'}`}
                </h2>
              </div>
            }
            footer={
              <div className="flex justify-end space-x-3">
                {apiError && (
                  <span className="text-red-500 text-sm self-center mr-2">{apiError}</span>
                )}
                <button
                  className={`bg-gray-200 text-black rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm ${(isFormSubmitting || isApiLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`}
                  onClick={handleCloseAddActivityModal}
                  type="button"
                  aria-label="Cancel"
                  disabled={isFormSubmitting || isApiLoading}
                >
                  Cancel
                </button>
                <button
                  className={`bg-blue-500 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm min-w-[80px] ${(isFormSubmitting || isApiLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                  onClick={() => {
                    const form = document.getElementById('add-activity-form');
                    form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                  }}
                  type="button"
                  aria-label="Save"
                  disabled={isFormSubmitting || isApiLoading}
                >
                  Save
                </button>
              </div>
            }
          >
            {/* Centered spinner overlay when API is loading - uses fixed positioning to stay visible while scrolling */}
            {isApiLoading && (
              <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center pointer-events-auto">
                <Spinner size="medium" customLoadingName="Loading data..." />
              </div>
            )}
            <AddForm 
              onCancel={handleCloseAddActivityModal}
              onSuccess={handleSaveActivity}
              onSubmittingChange={setIsFormSubmitting}
              onApiLoadingChange={setIsApiLoading}
              onApiError={setApiError}
              activityView={selectedView}
              moduleType={101}
              activityName={selectedActivity?.activityName}
              activityTypeId={selectedActivity?.activityId}
              preloadedData={preloadedFormData}
              hideInternalActions
              hideHeading
            />
          </TwinModal>
        )}

        {/* Edit Activity Modal */}
        {showEditActivityModal && editActivityId && (
          <TwinModal
            open={showEditActivityModal}
            onClose={handleCloseEditActivityModal}
            modalClassName="max-w-4xl"
            allowBorder={true}
            closeOnOutsideClick={false}
            header={
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#3F4254]">
                  {editActivityModuleName || 'Activity'}
                  {editActivityCreatedOn && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      : {formatCreatedOnDate(editActivityCreatedOn)}
                    </span>
                  )}
                </h2>
              </div>
            }
            footer={
              <div className="flex justify-end space-x-3">
                {editApiError && (
                  <span className="text-red-500 text-sm self-center mr-2">{editApiError}</span>
                )}
                <button
                  className={`bg-gray-200 text-black rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm ${(isEditFormSubmitting || isEditApiLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`}
                  onClick={handleCloseEditActivityModal}
                  type="button"
                  aria-label="Cancel"
                  disabled={isEditFormSubmitting || isEditApiLoading}
                >
                  Cancel
                </button>
                <button
                  className={`bg-blue-500 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm min-w-[80px] ${(isEditFormSubmitting || isEditApiLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                  onClick={() => {
                    const form = document.getElementById('edit-activity-form');
                    form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                  }}
                  type="button"
                  aria-label="Save"
                  disabled={isEditFormSubmitting || isEditApiLoading}
                >
                  Save
                </button>
              </div>
            }
          >
            {/* Centered spinner overlay when API is loading - uses fixed positioning to stay visible while scrolling */}
            {isEditApiLoading && (
              <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center pointer-events-auto">
                <Spinner size="medium" customLoadingName="Loading data..." />
              </div>
            )}
            <EditForm 
              onCancel={handleCloseEditActivityModal}
              onSuccess={handleUpdateActivity}
              onSubmittingChange={setIsEditFormSubmitting}
              onApiLoadingChange={setIsEditApiLoading}
              onApiError={setEditApiError}
              activityView={selectedView}
              moduleType={101}
              activityTypeId={editActivityModuleType}
              activityId={editActivityId}
              preloadedData={editPreloadedFormData}
              hideInternalActions
              hideHeading
            />
          </TwinModal>
        )}
      </ActivitiesProvider>


    </Layout>
  );
};

export default CrmActivities;
