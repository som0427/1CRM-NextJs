import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import { getProjectId } from '../../lib/storage/sharedStorage';
import { useEntityHeading } from '../../hooks/useEntityHeading';
import ExportsHeader from '../../components/exports/ExportsHeader';
import ExportsDataGrid from '../../components/exports/ExportsDataGrid';
import exportsService from '../../lib/services/exportsService';
import { ExportItem } from '../../lib/models/exports.model';

const ExportsPage: NextPage = () => {
  // State management
  const [exportsData, setExportsData] = useState<ExportItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [gridDataLoaded, setGridDataLoaded] = useState<boolean>(false);

  // Project ID
  const projectId = getProjectId() || 618;

  // Page heading
  const pageHeading = useEntityHeading('Exports', 'Exports');

  // Grid API ref
  const [gridApi, setGridApi] = useState<any>(null);

  // Fetch exports
  const fetchExportsData = async () => {
    try {
      setLoading(true);
      if (!projectId) {
        setLoading(false);
        return;
      }
      const data = await exportsService.getExports(projectId);
      setExportsData(data);
      setGridDataLoaded(true);
    } catch (error) {
      console.error('Error fetching exports:', error);
      setExportsData([]);
      setGridDataLoaded(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExportsData();
  }, [projectId]);

  // Search handler
  const handleSearch = () => {
    if (gridApi) {
      gridApi.setQuickFilter(searchTerm);
    }
  };

  // Grid ready
  const handleGridReady = (api: any) => {
    setGridApi(api);
  };

  return (
    <Layout>
      <Head>
        <title>Exports | 1Channel</title>
      </Head>

      <TailwindPageLayout
        header={
          <ExportsHeader
            pageHeading={pageHeading}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            handleSearch={handleSearch}
          />
        }
      >
        <div className="h-full w-full overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : exportsData.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500 mb-4">No {pageHeading} found</div>
              <p className="text-gray-400">Try adjusting your search or check back later</p>
            </div>
          ) : (
            <ExportsDataGrid
              data={exportsData}
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

export default ExportsPage;
