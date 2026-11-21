import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Layout from '@/components/layout/Layout';
import TailwindPageLayout from '@/components/layout/TailwindPageLayout';
import Spinner from '@/components/common/Spinner';
import NoRecordsFound from '@/components/common/NoRecordsFound';
import { useSnackbar } from 'notistack';
import { AppFlowData } from '@/lib/api/appflowApi';
import AppFlowHeader from '@/components/app-flows/AppFlowHeader';
import AppFlowDataGrid from '@/components/app-flows/AppFlowDataGrid';
import AddEditAppFlowModal from '@/components/app-flows/sub-components/AddEditComponent.tsx/AddEditAppFlow';
import { getProjectId } from '@/lib/storage/sharedStorage';


const AppFlowPage: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();
  const pageHeading = 'App Flows';
  const projectId = getProjectId() || 0;
  
  // State management
  const [flows, setFlows] = useState<AppFlowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingFlowId, setEditingFlowId] = useState<number | undefined>(undefined);
  
  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
        const { fetchAppFlows } = await import("@/lib/api/appflowApi");
        const data = await fetchAppFlows(projectId);

        const transformedData = data.map((appflow: any) => ({
          ...appflow,
          roleName: appflow.roleName || 'N/A',
          status: appflow.active == 1 ? "Active" : "Inactive",
          createdBy: appflow.createdByName || 'System',
        }));
      
      setFlows(transformedData);
    } catch (error) {
      console.error('Error loading app flows:', error);
      enqueueSnackbar('Failed to load app flows', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle modal actions
  const handleOpenAddModal = () => {
    setEditingFlowId(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (flowId?: number) => {
    setEditingFlowId(flowId);
    setIsAddEditModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAddEditModalOpen(false);
    setEditingFlowId(null);
  };

  const handleModalSuccess = () => {
    loadData(); // Reload data after successful save
  };

  const handleCopyFlow = async (flowId: number) => {
    try {
      // // Find the flow to copy
      // const flowToCopy = flows.find(f => f.id === flowId);
      // if (flowToCopy) {
      //   // Create a new flow with copied data
      //   const newFlow = {
      //     ...flowToCopy,
      //     id: Math.max(...flows.map(f => f.id)) + 1,
      //     flowName: `${flowToCopy.flowName} (Copy)`,
      //     createdOn: new Date().toISOString().split('T')[0],
      //   };
        
      //   // Add to the flows list
      //   setFlows([...flows, newFlow]);
       
      // }
      enqueueSnackbar('Copy flow functionality coming soon', { variant: 'info' });
    } catch (error) {
      console.error('Error copying flow:', error);
      enqueueSnackbar('Failed to copy app flow', { variant: 'error' });
    }
  };


  return (
    <>
      <Layout>
        <Head>
          <title>{pageHeading} Management | 1Channel</title>
        </Head>
        <TailwindPageLayout
          header={
            <AppFlowHeader
              pageHeading={pageHeading}
              handleOpenAddModal={handleOpenAddModal}
            />
          }
        >
          <div className="h-full w-full overflow-auto">
            {loading ? (
              <Spinner />
            ) : flows.length === 0 ? (
              <NoRecordsFound heading={pageHeading} />
            ) : (
              <AppFlowDataGrid 
                data={flows} 
                loading={loading}
                onEditFlow={handleOpenEditModal}
                onCopyFlow={handleCopyFlow}
              />
            )}
          </div>

        </TailwindPageLayout>
      </Layout>

      {/* Add/Edit App Flow Modal */}
      <AddEditAppFlowModal
        open={isAddEditModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        flowId={editingFlowId}
      />
    </>
  );
};

export default AppFlowPage;