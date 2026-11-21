import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import { getProjectId } from '../../lib/storage/sharedStorage';
import { useEntityHeading } from '../../hooks/useEntityHeading';
import UploadLogHeader from '../../components/upload-log/UploadLogHeader';
import UploadLogDataGrid from '../../components/upload-log/UploadLogDataGrid';
import uploadLogService from '../../lib/services/uploadLogService';
import { UploadLogItem } from '../../lib/models/upload-log.model';

const UploadLogPage: NextPage = () => {
  // State management
  const [uploadLogsData, setUploadLogsData] = useState<UploadLogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [gridDataLoaded, setGridDataLoaded] = useState<boolean>(false);

  // Get Project ID from sharedStorage
  const projectId = getProjectId() || 618;
  
  // Get entity-specific page heading for Upload Log
  const pageHeading = useEntityHeading('Upload log', 'Upload log');

  // Reference to the grid API
  const [gridApi, setGridApi] = useState<any>(null);

  // Function to fetch upload logs from API
  const fetchUploadLogsData = async () => {
    try {
      setLoading(true);
      
      if (!projectId) {
        setLoading(false);
        return;
      }

      const data = await uploadLogService.getUploadLogs(projectId);
      console.log('Upload Logs Data:', data);

      setUploadLogsData(data);
      setGridDataLoaded(true);
    } catch (error) {
      console.error('Error fetching upload logs:', error);
      setUploadLogsData([]);
      setGridDataLoaded(false);
    } finally {
      setLoading(false);
    }
  };

  // Load upload logs on mount
  useEffect(() => {
    fetchUploadLogsData();
  }, [projectId]);

  // Handle search functionality
  const handleSearch = () => {
    if (gridApi) {
      gridApi.setQuickFilter(searchTerm);
    }
  };

  // Handle grid ready
  const handleGridReady = (api: any) => {
    setGridApi(api);
  };

  return (
    <Layout>
      <Head>
        <title>Upload Log | 1Channel</title>
      </Head>

      <TailwindPageLayout
        header={
          <UploadLogHeader
            pageHeading={pageHeading}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            handleSearch={handleSearch}
          />
        }
      >
        <div className="h-full w-full overflow-auto">
          {/* Loading state */}
          {loading ? (
            <div className="flex justify-center items-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : uploadLogsData.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500 mb-4">No {pageHeading} found</div>
              <p className="text-gray-400">Try adjusting your search or check back later</p>
            </div>
          ) : (
            <UploadLogDataGrid
              data={uploadLogsData}
              loading={loading}
              searchText={searchTerm}
              onGridReady={handleGridReady}
            />
          )}
        </div>
      </TailwindPageLayout>
    </Layout>
  );
};

export default UploadLogPage;