import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import contactService from '@/lib/services/contactService';
import { ContactData } from '../../lib/models/contact/contactModels';
import ContactDataGrid from '../../components/contacts/ContactDataGrid';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import { getProjectId } from '@/lib/storage/sharedStorage';
import { useEntityNames } from '@/hooks/useDynamicNames';
import { useEntityHeading } from '@/hooks/useEntityHeading';
import ContactHeader from '../../components/contacts/ContactHeader';
import { ContactProvider } from '../../contexts/ContactContext';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import TwinModal from '@/components/common/TwinModal';
import Spinner from '@/components/common/Spinner';
import dynamic from 'next/dynamic';
import {
  preloadContactEditFormData,
  preloadContactFormData,
  PreloadedContactFormData,
} from '@/components/contacts/AddEditForm/subs/formDataPreloader';

// Utility function for conditional class names
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

const Contacts: NextPage = () => {
  // State for API data
  const [contactsListData, setContactsListData] = useState<ContactData[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [gridDataLoaded, setGridDataLoaded] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [needsListRefresh, setNeedsListRefresh] = useState<boolean>(false);
  const [dynamicColumns, setDynamicColumns] = useState<{field: string, headerName: string, attributeType: number}[]>([]);
  const [selectedView, setSelectedView] = useState<"self" | "team" | "all">("self");

  // Preloading state (same pattern as Customers)
  const [isPreloadingFormData, setIsPreloadingFormData] = useState<boolean>(false);
  const [preloadedFormData, setPreloadedFormData] = useState<PreloadedContactFormData | null>(null);
  const [editPreloadedFormData, setEditPreloadedFormData] = useState<PreloadedContactFormData | null>(null);

  // State for AddForm modal
  const [isAddFormModalOpen, setIsAddFormModalOpen] = useState(false);
  
  // Form submission states (for TwinModal footer buttons)
  const [isFormSubmitting, setIsFormSubmitting] = useState<boolean>(false);
  const [isEditFormSubmitting, setIsEditFormSubmitting] = useState<boolean>(false);
  
  // State for contact modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<number | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);

  const generateDynamicColumns = useCallback((customFieldsArray: any[]) => {
        if (!Array.isArray(customFieldsArray) || customFieldsArray.length === 0) return [];
        
        const columns = [];
        
        // Add serialNo as first static column
        columns.push({
          field: 'serialNo',
          headerName: 'Serial No',
          order: 1,
          attributeType: CustomAttributeTypeEnum.TEXT_SINGLE_LINE // TEXT_SINGLE_LINE
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
          order: 998
        });
        
        // Sort by order and return just field, headerName, and attributeType
        return columns
          .sort((a, b) => a.order - b.order)
          .map(({ field, headerName, attributeType }) => ({ field, headerName, attributeType }));
      }, []);
  
  // Get Project ID from sharedStorage
  const projectId = getProjectId() || 0;
  
  // Get entity-specific headings
  const { getSingularName, getPluralName } = useEntityNames();
  const pageHeading = getPluralName('contacts');
  const singularHeading = getSingularName('contacts');

  // Reference to the grid API
  const [gridApi, setGridApi] = useState<any>(null);
  
  // Function to export contacts data
  const exportContacts = async () => {
    try {
      setExporting(true);
      
      if (!gridApi) {
        console.error('Grid API not available');
        return;
      }
      
      // Use AG Grid's export functionality with custom filename
      const params = {
        fileName: `contacts_export_${new Date().toISOString().split('T')[0]}.csv`,
      };
      gridApi.exportDataAsCsv(params);
    } catch (err) {
      console.error('Error exporting contacts:', err);
    } finally {
      setExporting(false);
    }
  };

  // Function to fetch contacts from API
  async function fetchContactsData() {
    try {
      setLoading(true);
      
      if (!projectId) {
        setLoading(false);
        return;
      }

      const viewType = selectedView === 'self' ? 1 : selectedView === 'team' ? 2 : 3;

      const response = await contactService.getContacts(projectId, viewType);

      if (
        response &&
        response.responseData &&
        Array.isArray(response.responseData)
      ) {
        const rawData = response.responseData;
  
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
            id: item.contactId || '',
            serialNo: item.serialNo || '',
            owner: item.owner || '',
            status: item.status,
            ...customFields
          };
        });

        setContactsListData(transformed);
        setGridDataLoaded(true);
  
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      setContactsListData([]);
      setGridDataLoaded(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContactsData();
  }, [selectedView]);
  
  // For handling Enter key press - immediate search
  const handleSearch = () => {
    if (gridApi) {
      gridApi.setQuickFilter(searchTerm);
    }
  };

  const handleEditContact = (contact: any) => {
    // Preload before opening modal (same as Customers)
    handleOpenEditModal(contact.id);
  };

  const handleOpenEditModal = async (contactId: number) => {
    setEditingContact(contactId);
    setIsEditing(true);
    setIsPreloadingFormData(true);

    try {
      const projectId = JSON.parse(localStorage.getItem('selectedProject') || '{}');
      const source = selectedView === 'self' ? 1 : selectedView === 'team' ? 2 : 3;
      const preloaded = await preloadContactEditFormData(projectId, contactId, source);
      setEditPreloadedFormData(preloaded);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Error preloading edit form data:', error);
    } finally {
      setIsPreloadingFormData(false);
    }
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setEditingContact(undefined);
    setEditPreloadedFormData(null);
    // No data refresh here - only on success callback
  };
  
  const handleCloseAddFormModal = () => {
    setIsAddFormModalOpen(false);
    setPreloadedFormData(null);
    // No data refresh here - only on success callback
  };

  const handleOpenAddModal = async () => {
    setIsPreloadingFormData(true);
    try {
      const projectId = JSON.parse(localStorage.getItem('selectedProject') || '{}');
      const source = selectedView === 'self' ? 1 : selectedView === 'team' ? 2 : 3;
      const preloaded = await preloadContactFormData(projectId, source);
      setPreloadedFormData(preloaded);
      setIsAddFormModalOpen(true);
    } catch (error) {
      console.error('Error preloading add form data:', error);
    } finally {
      setIsPreloadingFormData(false);
    }
  };

  // Dynamically import forms to avoid SSR issues
  const AddForm = dynamic(() => import('@/components/contacts/AddEditForm/AddForm').then(mod => mod.default), { ssr: false });
  const EditForm = dynamic(() => import('@/components/contacts/AddEditForm/EditForm').then(mod => mod.default), { ssr: false });
  
  
  return (
    <Layout>
      <Head>
        <title>Contact Management | 1Channel</title>
      </Head>

      <ContactProvider value={{
              pageHeading,
              searchTerm,
              setSearchTerm,
              handleSearch,
              setLoading,
              setNeedsListRefresh,
              gridDataLoaded,
              exporting,
              exportContacts, 
              selectedView,
              setSelectedView,
              handleOpenAddModal: handleOpenAddModal,
            }}>
        <TailwindPageLayout
          header={<ContactHeader />}
      >
        <div className="h-full w-full overflow-auto">
          {/* Loading state - matches settings assistant page */}
          {loading ? (
            <div className="flex justify-center items-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : contactsListData.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500 mb-4">No {pageHeading} found</div>
              <p className="text-gray-400">Try changing your filter settings or add a new {pageHeading}</p>
            </div>
          ) : (
            <ContactDataGrid
              contacts={contactsListData}
              loading={loading}
              onContactEdit={handleEditContact}
              dynamicColumns={dynamicColumns}
              searchText={searchTerm}
              onGridReady={() => console.log('Contact grid ready')}
            />
          )}
        </div>
      </TailwindPageLayout>
    </ContactProvider>

      {/* Full-screen spinner overlay while preloading */}
      {isPreloadingFormData && (
        <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center pointer-events-auto">
          <Spinner size="medium" customLoadingName="Loading data..." />
        </div>
      )}

      {/* Add Contact Modal */}
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
                className={`bg-gray-200 text-black rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm ${isFormSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`}
                onClick={handleCloseAddFormModal}
                type="button"
                disabled={isFormSubmitting}
              >
                Cancel
              </button>
              <button
                className={`bg-blue-500 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm min-w-[80px] ${isFormSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                onClick={() => {
                  const form = document.getElementById('add-contact-form');
                  form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }}
                type="button"
                disabled={isFormSubmitting}
              >
                {isFormSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          }
        >
          <AddForm
            onCancel={handleCloseAddFormModal}
            onSuccess={() => {
              handleCloseAddFormModal();
              fetchContactsData();
            }}
            onSubmittingChange={setIsFormSubmitting}
            source={selectedView}
            preloadedData={preloadedFormData || undefined}
            hideInternalActions
            hideHeading
          />
        </TwinModal>
      )}

      {/* Edit Contact Modal */}
      {isModalOpen && isEditing && editingContact && (
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
                className={`bg-gray-200 text-black rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm ${isEditFormSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`}
                onClick={handleCloseModal}
                type="button"
                disabled={isEditFormSubmitting}
              >
                Cancel
              </button>
              <button
                className={`bg-blue-500 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm min-w-[80px] ${isEditFormSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
                onClick={() => {
                  const form = document.getElementById('edit-contact-form');
                  form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }}
                type="button"
                disabled={isEditFormSubmitting}
              >
                {isEditFormSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          }
        >
          <EditForm
            onCancel={handleCloseModal}
            onSuccess={() => {
              handleCloseModal();
              fetchContactsData();
            }}
            onSubmittingChange={setIsEditFormSubmitting}
            contactId={editingContact}
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

export default Contacts;
