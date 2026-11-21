import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../../components/layout/Layout';
import PointCategoryService from '@/lib/services/pointCategoryService';
import { PointCategoryData } from '../../../lib/models/point-category/point-category.model';
import PointCategoryDataGrid from '../../../components/point-category/PointCategoryDataGrid';
import { TailwindPageLayout } from '../../../components/layout/TailwindPageLayout';
import { getProjectId } from '../../../lib/storage/sharedStorage';
import { useEntityHeading } from '../../../hooks/useEntityHeading';
import PointCategoryHeader from '../../../components/point-category/PointCategoryHeader';
import { PointCategoryProvider } from '@/contexts/PointCategoryContext';
import AddPointCategory from '../../../components/point-category/AddPointCategory';
import EditPointCategory from '../../../components/point-category/EditPointCategory';

const PointCategory: NextPage = () => {
  // State for API data
  const [pointCategoryListData, setPointCategoryListData] = useState<PointCategoryData[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [gridDataLoaded, setGridDataLoaded] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [needsListRefresh, setNeedsListRefresh] = useState<boolean>(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPointCategory, setSelectedPointCategory] = useState<PointCategoryData | null>(null);

  // Get Project ID from sharedStorage
  const projectId = getProjectId();
  
  // Get entity-specific page heading for Point Category
  const pageHeading = useEntityHeading('Point Category', 'Points Category');

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
  
  // Function to export Point Category data
  const exportPointCategory = async () => {
    try {
      setExporting(true);
      
      if (!gridApi) {
        console.error('Grid API not available');
        return;
      }
      
      // Use AG Grid's export functionality with custom filename
      const params = {
        fileName: `PointCategory_export_${new Date().toISOString().split('T')[0]}.csv`,
      };
      gridApi.exportDataAsCsv(params);
    } catch (err) {
      console.error('Error exporting Point Category:', err);
    } finally {
      setExporting(false);
    }
  };

  // Function to fetch Point Categories from API
  async function fetchPointCategoryData() {
    try {
      setLoading(true);
      
      if (!projectId) {
        setLoading(false);
        return;
      }

      const response: any = await PointCategoryService.getPointCategories(projectId);
      const rawData: any[] = response?.responseData || [];

      const transformed: PointCategoryData[] = rawData.map((item: any) => ({
        id: item.pointCategoryId,
        pointCategoryId: item.pointCategoryId,
        name: item.name || '',
        pointCategoryType: item.pointCategoryType || '',
        description: item.description || '',
        status: item.status || 0
      }));

      setPointCategoryListData(transformed);
      setGridDataLoaded(true);
    } catch (err: any) {
      console.error('Error fetching point categories:', err);
      setPointCategoryListData([]);
      setGridDataLoaded(false);
    } finally {
      setLoading(false);
    }
  }

  // Load Point Categories on mount - with empty dependency array to only run once
  useEffect(() => {
    // Initial data load
    fetchPointCategoryData();
  }, []); // Load once on mount
  
  // Monitor needsListRefresh state to trigger data refresh when needed
  useEffect(() => {
    if (needsListRefresh) {
      fetchPointCategoryData();
      setNeedsListRefresh(false);
    }
  }, [needsListRefresh]);
  
  // For handling Enter key press - immediate search
  const handleSearch = () => {
    if (gridApi) {
      gridApi.setQuickFilter(searchTerm);
    }
  };

  // Handle edit point category
  const handlePointCategoryEdit = (pointCategory: PointCategoryData) => {
    setSelectedPointCategory(pointCategory);
    setIsEditOpen(true);
  };

  return (
    <Layout>
      <Head>
        <title>Point Category Configuration | 1Channel</title>
      </Head>

      <PointCategoryProvider value={{
              pageHeading,
              searchTerm,
              setSearchTerm,
              handleSearch,
              setLoading,
              setNeedsListRefresh,
              gridDataLoaded,
              exporting,
              exportPointCategory,
              handleOpenAddModal: () => setIsAddOpen(true)
            }}>
        <TailwindPageLayout
          header={<PointCategoryHeader />}
        >
          <div className="h-full w-full overflow-auto">
            {/* Loading state - matches settings assistant page */}
            {loading ? (
              <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : pointCategoryListData.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-500 mb-4">No {pageHeading} found</div>
                <p className="text-gray-400">Try changing your filter settings or add a new {pageHeading}</p>
              </div>
            ) : (
              <PointCategoryDataGrid
                pointCategories={pointCategoryListData}
                loading={loading}
                searchText={searchTerm}
                onPointCategoryEdit={handlePointCategoryEdit}
                onGridReady={(api) => {
                  setGridApi(api);
                  console.log('Point Category grid ready');
                }}
                onLoadMore={() => {}}
                isLoadingMore={false}
                totalCount={pointCategoryListData.length}
                currentCount={pointCategoryListData.length}
              />
            )}
          </div>
        </TailwindPageLayout>
      </PointCategoryProvider>

      {/* Add Point Category Modal */}
      <AddPointCategory
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={() => {
          setNeedsListRefresh(true);
        }}
      />

      {/* Edit Point Category Modal */}
      <EditPointCategory
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedPointCategory(null);
        }}
        onSave={() => {
          setNeedsListRefresh(true);
        }}
        pointCategoryData={selectedPointCategory}
      />
      
      </Layout>
  );
};

export default PointCategory;
