import React, { useState, useCallback, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import TargetManagementHeader from '../../components/target-management/TargetManagementHeader';
import TargetManagementDataGrid from '../../components/target-management/TargetManagementDataGrid';
import AddEditTarget from '@/components/target-management/subs/addEditTarget/addEditTarget';
import UploadTargetModal from '@/components/target-management/subs/upload-target/UploadTargetModal';
import { getProjectId } from '../../lib/storage/sharedStorage';
import targetService from '@/lib/services/targetService';
import { TargetModel } from '@/lib/models/targets/target.model';

type ToastState = {
  show: boolean;
  message: string;
  type: 'success' | 'error';
};

const Targets: NextPage = () => {
  const [gridApi, setGridApi] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [targets, setTargets] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isAddTargetModalOpen, setIsAddTargetModalOpen] = useState<boolean>(false);
  const [isUploadTargetModalOpen, setIsUploadTargetModalOpen] = useState<boolean>(false);
  const [activeTargetId, setActiveTargetId] = useState<number | null>(null);
  const [uploadTargetId, setUploadTargetId] = useState<number | null>(null);
  const [defaultTargetName, setDefaultTargetName] = useState<string>('');
  const [projectId, setProjectId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const storedProjectId = getProjectId();
    setProjectId(typeof storedProjectId === 'number' && storedProjectId > 0 ? storedProjectId : null);
  }, []);

  // Function to fetch all targets
  const fetchAllTargets = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await targetService.getAllTargets(projectId);

      const payload = response?.responseData;
      const rawData: TargetModel[] = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as any)?.data)
          ? (payload as any).data
          : [];

      if (response && response.statusCode === 200 && rawData.length > 0) {
        const transformedTargets = rawData.map((item: TargetModel) => ({
          id: item.id,
          targetName: item.targetName || '',
          targetPeriod: item.targetPeriod || '',
          targetFor: item.targetEntityName || '',
          status: item.status,
          startDate: item.startDate || '',
          endDate: item.endDate || '',
        }));

        setTargets(transformedTargets);
        const apiTotal = (payload as any)?.totalCount;
        setTotalCount(typeof apiTotal === 'number' ? apiTotal : transformedTargets.length);
      } else {
        setTargets([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('Error fetching targets:', error);
      setTargets([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Initial fetch on component mount
  useEffect(() => {
    if (projectId) {
      fetchAllTargets();
    }
  }, [projectId, fetchAllTargets]);

  // Handle search
  const handleSearch = useCallback(() => {
    if (gridApi) {
      gridApi.setQuickFilter(searchTerm);
    }
  }, [gridApi, searchTerm]);

  // Handle open add modal
  const handleOpenAddModal = useCallback(() => {
    setActiveTargetId(null);
    setDefaultTargetName('');
    setIsAddTargetModalOpen(true);
  }, []);

  // Handle close add modal
  const handleCloseAddModal = useCallback(() => {
    setIsAddTargetModalOpen(false);
    setActiveTargetId(null);
    setDefaultTargetName('');
  }, []);

  // Handle grid ready
  const handleGridReady = useCallback((api: any) => {
    setGridApi(api);
  }, []);

  // Handle load more
  const handleLoadMore = () => {
    if (projectId) {
      fetchAllTargets();
    }
  };

  // Handle target edit
  const handleTargetEdit = useCallback(
    (targetId: number) => {
      if (!targetId) {
        return;
      }
      const targetRecord = targets.find(target => target.id === targetId);
      setActiveTargetId(targetId);
      setDefaultTargetName(targetRecord?.targetName ?? '');
      setIsAddTargetModalOpen(true);
    },
    [targets]
  );

  // Handle target upload
  const handleTargetUpload = (targetId: number) => {
    if (!targetId) {
      return;
    }
    setUploadTargetId(targetId);
    setIsUploadTargetModalOpen(true);
  };

  const handleCloseUploadModal = () => {
    setIsUploadTargetModalOpen(false);
    setUploadTargetId(null);
  };

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  }, []);

  const handleTargetSaved = useCallback((targetName: string) => {
    fetchAllTargets();
    setIsAddTargetModalOpen(false);
    const wasEdit = Boolean(activeTargetId);
    setActiveTargetId(null);
    setDefaultTargetName('');
    showToast(
      wasEdit ? `Target Updated.` : `Target Added.`,
      'success'
    );
  }, [fetchAllTargets, activeTargetId, showToast]);

  return (
    <Layout>
      <Head>
        <title>Targets | 1Channel</title>
      </Head>

      <TailwindPageLayout
        header={
          <TargetManagementHeader
            pageHeading="Targets"
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            handleSearch={handleSearch}
            handleOpenAddModal={handleOpenAddModal}
          />
        }
      >
        <div className="h-full w-full overflow-auto">
          {loading && targets.length === 0 ? (
            <div className="flex justify-center items-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <TargetManagementDataGrid
              targets={targets}
              loading={loading}
              onLoadMore={handleLoadMore}
              isLoadingMore={isLoadingMore}
              totalCount={totalCount}
              currentCount={targets.length}
              onGridReady={handleGridReady}
              onTargetEdit={handleTargetEdit}
              onTargetUpload={handleTargetUpload}
              searchText={searchTerm}
            />
          )}
        </div>
      </TailwindPageLayout>

      <AddEditTarget
        isOpen={isAddTargetModalOpen}
        onClose={handleCloseAddModal}
        onSave={handleTargetSaved}
        defaultTargetName={defaultTargetName}
        targetId={activeTargetId}
      />
      <UploadTargetModal
        open={isUploadTargetModalOpen}
        onClose={handleCloseUploadModal}
        targetId={uploadTargetId}
      />

      {toast.show && (
        <div
          className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-lg shadow-lg text-white font-medium z-50 transition-all duration-300 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}
          style={{ minWidth: '300px', maxWidth: '500px' }}
        >
          <div className="flex items-center justify-between">
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(prev => ({ ...prev, show: false }))}
              className="ml-4 text-white hover:text-gray-200 focus:outline-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Targets;
