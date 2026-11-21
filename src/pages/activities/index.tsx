import React, { useCallback, useRef, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import { getProjectId } from '@/lib/storage/sharedStorage';
import ManageActivityHeader from '@/components/activity-settings/ManageActivityHeader';
import ManageActivityDataGrid, { ManageActivityDataGridHandle } from '@/components/activity-settings/ManageActivityDataGrid';
import { useSnackbar } from 'notistack';
import activitiesService from '@/lib/services/activitiesService';
import ConfirmationDialog from '@/components/common/ConfirmationDialog';
import AddActivity from '@/components/activity-settings/sub-components/AddActivity';

const Activities: NextPage = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const gridHandlersRef = useRef<ManageActivityDataGridHandle | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const projectId = getProjectId() || 0;
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [addActivityModalOpen, setAddActivityModalOpen] = useState(false);

  const handleOpenAddModal = useCallback(() => {
    setAddActivityModalOpen(true);
  }, []);

  const handleEditActivity = useCallback((activityId: number) => {
    router.push(`/activity-list/${activityId}`);
  }, [router]);

  const handleSearch = useCallback(() => {
    // Search is handled via the searchText prop in the grid components
  }, []);

  const handleSaveDisplayOrder = useCallback(async () => {
    if (isSavingOrder) return;
    const payload = gridHandlersRef.current?.getDisplayOrderPayload?.() || [];
    if (payload.length === 0) {
      enqueueSnackbar('No activities to reorder', { variant: 'info' });
      return;
    }
    setIsSavingOrder(true);
    try {
      await activitiesService.updateSequence(payload);
      enqueueSnackbar('Display order updated', { variant: 'success' });
      await gridHandlersRef.current?.reload();
    } catch (error) {
      console.error('Unable to save changes. Please try again.', error);
      enqueueSnackbar('Unable to save changes. Please try again.', { variant: 'error' });
    } finally {
      setIsSavingOrder(false);
    }
  }, [enqueueSnackbar, isSavingOrder]);

  const handleHandlersChange = useCallback((handlers: ManageActivityDataGridHandle | null) => {
    gridHandlersRef.current = handlers;
  }, []);

  const handleDeleteActivity = useCallback((activityId: number) => {
    setActivityToDelete(activityId);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!activityToDelete) return;

    setIsDeleting(true);
    try {
      await activitiesService.deleteActivity(projectId, activityToDelete);

      // Close modal first, then show success message
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setActivityToDelete(null);

      enqueueSnackbar('Activity deleted successfully', { variant: 'success' });
      await gridHandlersRef.current?.reload();
    } catch (error) {
      console.error('Failed to delete activity:', error);
      enqueueSnackbar('Failed to delete activity. Please try again.', { variant: 'error' });
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setActivityToDelete(null);
    }
  }, [activityToDelete, enqueueSnackbar, projectId]);

  const handleCloseDeleteDialog = useCallback(() => {
    if (!isDeleting) {
      setDeleteDialogOpen(false);
      setActivityToDelete(null);
    }
  }, [isDeleting]);

  return (
    <Layout>
      <Head>
        <title>Activities | 1Channel</title>
      </Head>

      <TailwindPageLayout
        header={
          <ManageActivityHeader
            pageHeading="Activities"
            handleOpenAddModal={handleOpenAddModal}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            handleSearch={handleSearch}
            onSaveDisplayOrder={handleSaveDisplayOrder}
            isSavingDisplayOrder={isSavingOrder}
          />
        }
      >
        <ManageActivityDataGrid
          projectId={projectId}
          searchTerm={searchTerm}
          onHandlersChange={handleHandlersChange}
          onEditActivity={handleEditActivity}
          // onDeleteActivity={handleDeleteActivity} // Temporarily hidden
        />
      </TailwindPageLayout>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        title="Delete Activity"
        message="Are you sure you want to delete this activity? This action cannot be undone."
        confirmText="Yes"
        cancelText="No"
        icon="danger"
        loading={isDeleting}
      />

      <AddActivity
        open={addActivityModalOpen}
        onClose={() => setAddActivityModalOpen(false)}
        projectId={projectId}
        onSave={async () => {
          setAddActivityModalOpen(false);
          await gridHandlersRef.current?.reload();
        }}
      />
    </Layout>
  );
};

export default Activities;
