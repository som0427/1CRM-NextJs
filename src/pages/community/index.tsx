import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import CommunityService from '@/lib/services/communityService';
import { CommunityData } from '../../lib/models/community/community.model';
import CommunityDataGrid from '../../components/community/CommunityDataGrid';
import { Dialog, DialogContent } from '../../components/ui/tailwind/dialog';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import { getProjectId } from '../../lib/storage/sharedStorage';
import { useEntityHeading } from '../../hooks/useEntityHeading';
import CommunityHeader from '../../components/community/CommunityHeader';
import { CommunityProvider } from '@/contexts/CommunityContext';
import AddPostModal from '../../components/community/subs/AddPostModal';
// (Modals and extra utilities not used on initial listing)

const Community: NextPage = () => {
  // State for API data
  const [communityListData, setCommunityListData] = useState<CommunityData[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [gridDataLoaded, setGridDataLoaded] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [needsListRefresh, setNeedsListRefresh] = useState<boolean>(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Get Project ID from sharedStorage
  const projectId = getProjectId();
  
  // Get entity-specific page heading for Community
  const pageHeading = useEntityHeading('Community', 'Community');

  // Reference to the grid API
  const [gridApi, setGridApi] = useState<any>(null);
  
  // Refit columns when modals open/close (container width/scrollbar may change)
  useEffect(() => {
    if (!gridApi) return;
    const t = setTimeout(() => {
      try {
        gridApi.sizeColumnsToFit();
      } catch {}
    }, 100);
    return () => clearTimeout(t);
  }, [gridApi]);
  
  // Function to export Community data
  const exportCommunity = async () => {
    try {
      setExporting(true);
      
      if (!gridApi) {
        console.error('Grid API not available');
        return;
      }
      
      // Use AG Grid's export functionality with custom filename
      const params = {
        fileName: `Community_export_${new Date().toISOString().split('T')[0]}.csv`,
      };
      gridApi.exportDataAsCsv(params);
    } catch (err) {
      console.error('Error exporting Community:', err);
    } finally {
      setExporting(false);
    }
  };

  // Function to fetch Community from API
  async function fetchCommunityData() {
    try {
      setLoading(true);
      
      if (!projectId) {
        setLoading(false);
        return;
      }

      const response: any = await CommunityService.getCommunity(projectId);
      const rawData: any[] = response?.responseData || [];

      const transformed: CommunityData[] = rawData.map((item: any) => ({
        id: item.postId,
        postId: item.postId,
        communityName: item.communityName || '',
        title: item.title || '',
        tag: item.tag || '',
        postedBy: item.postedBy || '',
        description: item.description || '',
        postedTime: item.postedTime || '',
        reactions: item.reactions || '',
        createdOn: item.createdOn || '',
        thumbnail: item.thumbnail || '',
        attachment: item.attachment || ''
      }));

      setCommunityListData(transformed);
      setGridDataLoaded(true);
    } catch (err: any) {
      setCommunityListData([]);
      setGridDataLoaded(false);
    } finally {
      setLoading(false);
    }
  }
  // Load Community on mount - with empty dependency array to only run once
  useEffect(() => {
    // Initial data load
    fetchCommunityData();
  }, []); // Load once on mount
  
  // Monitor needsListRefresh state to trigger data refresh when needed
  useEffect(() => {
    if (needsListRefresh) {
      fetchCommunityData();
      setNeedsListRefresh(false);
    }
  }, [needsListRefresh]);
  
  // For handling Enter key press - immediate search
  const handleSearch = () => {
    if (gridApi) {
      gridApi.setQuickFilter(searchTerm);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Community Management | 1Channel</title>
      </Head>

      <CommunityProvider value={{
              pageHeading,
              searchTerm,
              setSearchTerm,
              handleSearch,
              setLoading,
              setNeedsListRefresh,
              gridDataLoaded,
              exporting,
              exportCommunity,
              handleOpenAddModal: () => setIsAddOpen(true)
            }}>
        <TailwindPageLayout
          header={<CommunityHeader />}
        >
          <div className="h-full w-full overflow-auto">
            {/* Loading state - matches settings assistant page */}
            {loading ? (
              <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : communityListData.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-500 mb-4">No {pageHeading} found</div>
                <p className="text-gray-400">Try changing your filter settings or add a new {pageHeading}</p>
              </div>
            ) : (
              <CommunityDataGrid
                community={communityListData}
                loading={loading}
                searchText={searchTerm}
                onGridReady={(api) => {
                  setGridApi(api);
                  console.log('Community grid ready');
                }}
              />
            )}
          </div>
        </TailwindPageLayout>
      </CommunityProvider>

      {/* Add Post Modal */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => setIsAddOpen(open)}
      >
        <DialogContent className="sm:max-w-3xl">
          <AddPostModal
            onCancel={() => setIsAddOpen(false)}
            onSuccess={() => {
              setIsAddOpen(false);
              setNeedsListRefresh(true);
            }}
          />
        </DialogContent>
      </Dialog>
      
      </Layout>
  );
};

export default Community;
