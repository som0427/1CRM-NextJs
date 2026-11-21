import React, { useState, useCallback } from 'react';
import Head from 'next/head';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import TailwindPageLayout from '@/components/layout/TailwindPageLayout';
import Spinner from '@/components/common/Spinner';
import UploadCreativeHeader from '@/components/upload-creative/UploadCreativeHeader';
import UploadCreativeDataGrid from '@/components/upload-creative/UploadCreativeDataGrid';
import AddEditUploadCreativeModal from '@/components/upload-creative/sub-components/AddEditUploadCreative';
import { useUploadCreativeList, useInvalidateUploadCreativeList } from '@/hooks/useUploadCreativeList';
import uploadCreativeService, { UploadCreativeDetail } from '@/lib/services/uploadCreativeService';
import settingsService from '@/lib/services/settingsService';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import { getProjectId } from '@/lib/storage/sharedStorage';

const UploadCreativePage: React.FC = () => {
  const pageHeading = 'Upload Creative';

  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editCreativeId, setEditCreativeId] = useState<string | number | undefined>(undefined);
  const [preloadedData, setPreloadedData] = useState<UploadCreativeDetail | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const queryClient = useQueryClient();
  const { data: creativeList, isLoading, isError } = useUploadCreativeList();
  const invalidateList = useInvalidateUploadCreativeList();

  const handleOpenAddModal = () => {
    setEditCreativeId(undefined);
    setPreloadedData(null);
    setIsAddEditModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAddEditModalOpen(false);
    setEditCreativeId(undefined);
    setPreloadedData(null);
  };

  const handleModalSuccess = () => {
    handleModalClose();
    invalidateList();
  };

  const handleEdit = useCallback(async (id: number) => {
    setIsPreloading(true);
    try {
      const response = await uploadCreativeService.getUploadCreativeById(id);
      if (response.responseData) {
        const detail = response.responseData;
        const visibleTo = detail.visibleTo;

        // If visibleTo is Customer(2), Contact(1), or Opportunity(3),
        // prefetch form fields before opening the modal
        if (visibleTo === 1 || visibleTo === 2 || visibleTo === 3) {
          const pid = getProjectId();
          const projectId = pid ? Number(pid) : null;
          if (projectId) {
            const moduleTypeMap: Record<number, number> = {
              2: SystemAttributeEnum.COMPANY_MODULE,
              1: SystemAttributeEnum.CONTACT_MODULE,
              3: SystemAttributeEnum.OPPORTUNITY_MODULE,
            };
            const moduleType = moduleTypeMap[visibleTo];
            // The data-list module supplies the child fields of any DATA_LIST attribute,
            // so it is part of the filter's field list and is prefetched alongside.
            await Promise.all([
              queryClient.prefetchQuery({
                queryKey: ['formFields', projectId, moduleType],
                queryFn: () => settingsService.getFormFields(projectId, moduleType),
              }),
              queryClient.prefetchQuery({
                queryKey: ['dataListFields', projectId],
                queryFn: async () => {
                  const response = await settingsService.getFieldDetails(projectId, SystemAttributeEnum.DATA_LIST_MODULE);
                  return response?.responseData ?? [];
                },
              }),
            ]);
          }
        }

        setEditCreativeId(id);
        setPreloadedData(detail);
        setIsAddEditModalOpen(true);
      }
    } catch (error) {
      console.error('Error loading creative detail:', error);
    } finally {
      setIsPreloading(false);
    }
  }, []);

  return (
    <>
      <Layout>
        <Head>
          <title>{pageHeading} | 1Channel</title>
        </Head>
        <TailwindPageLayout
          header={
            <UploadCreativeHeader
              pageHeading={pageHeading}
              handleOpenAddModal={handleOpenAddModal}
              searchText={searchText}
              setSearchText={setSearchText}
            />
          }
        >
          <div className="h-full w-full overflow-auto">
            {isLoading ? (
              <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : isError || !creativeList || creativeList.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-500 mb-4">No {pageHeading} found</div>
              </div>
            ) : (
              <UploadCreativeDataGrid
                data={creativeList}
                searchText={searchText}
                onEdit={handleEdit}
              />
            )}
          </div>
        </TailwindPageLayout>
      </Layout>

      {/* Full-screen preloading spinner */}
      {isPreloading && (
        <Spinner version="fixed" blur={true} size="medium" zIndex={100} />
      )}

      <AddEditUploadCreativeModal
        open={isAddEditModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        creativeId={editCreativeId}
        preloadedData={preloadedData}
      />
    </>
  );
};

export default UploadCreativePage;
