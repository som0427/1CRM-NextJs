import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSelector } from 'react-redux';
import Layout from '../../components/layout/Layout';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import { getProjectId } from '@/lib/storage/sharedStorage';
import AttributeHeader from '@/components/attributes/AttributeHeader';
import AttributesListDataGrid, { AttributesListDataGridHandle } from '@/components/attributes/AttributesListDataGrid';
import AttributeLogsDataGrid from '@/components/attributes/AttributeLogsDataGrid';
import { useSnackbar } from 'notistack';
import settingsService from '@/lib/services/settingsService';
import AddEditAttribute from '@/components/attributes/sub-components/AddEditAttribute';
import ManageFieldAccess from '@/components/attributes/sub-components/ManageFieldAccess';
import ActivityAdvancedSettingComponent from '@/components/activity-settings/sub-components/ActivityAdvancedSettingComponent';
import { RootState } from '@/store';

// Helper function to get activity name from cookies
const getActivityNameFromCookies = (activityId: number): string | null => {
  try {
    const cookieMatch = document.cookie.match(/activityNames=([^;]*)/);
    if (cookieMatch) {
      const activityList = JSON.parse(decodeURIComponent(cookieMatch[1]));
      const activity = activityList.find((a: { activityId: number; activityName: string }) => a.activityId === activityId);
      return activity?.activityName || null;
    }
  } catch (e) {
    console.error('Error reading activity cookies:', e);
  }
  return null;
};

const ActivitySettings: NextPage = () => {
  const router = useRouter();
  const { activityId } = router.query;
  const moduleType = activityId ? Number(activityId) : 0;
  const [activityName, setActivityName] = useState<string>('');
  const projectId = getProjectId() || 0;

  // Get activities from Redux store
  const activitiesFromStore = useSelector((state: RootState) => state.activitySettings.activities);

  // Get activity name: 1) cookies, 2) Redux store, 3) redirect
  useEffect(() => {
    if (!router.isReady) return;
    if (!moduleType || moduleType === 0) return;

    // 1. Check cookies first
    const nameFromCookies = getActivityNameFromCookies(moduleType);
    if (nameFromCookies) {
      setActivityName(nameFromCookies);
      return;
    }

    // 2. Check Redux store
    const activityFromStore = activitiesFromStore.find(a => a.activityId === moduleType);
    if (activityFromStore) {
      setActivityName(activityFromStore.activityName);
      return;
    }

    // 3. No data found - redirect to activities page
    router.replace('/activities');
  }, [moduleType, router.isReady, activitiesFromStore, router]);

  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [manageFieldAccessOpen, setManageFieldAccessOpen] = useState(false);
  const [selectedAttributeId, setSelectedAttributeId] = useState<number | null>(null);
  const [editingAttributeId, setEditingAttributeId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'fields' | 'setting' | 'logs'>('fields');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const gridHandlersRef = useRef<AttributesListDataGridHandle | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const handleOpenAddModal = useCallback(() => {
    setEditingAttributeId(null);
    setAddEditModalOpen(true);
  }, []);

  const handleEditAttribute = useCallback((id: number) => {
    setEditingAttributeId(id);
    setAddEditModalOpen(true);
  }, []);

  const handleAddAttributeSuccess = useCallback(async () => {
    setAddEditModalOpen(false);
    setEditingAttributeId(null);
    await gridHandlersRef.current?.reload?.();
  }, []);

  const handleSearch = useCallback(() => {
    // Search is handled via the searchText prop in the grid components
  }, []);

  const handleTabChange = useCallback((tab: 'fields' | 'setting' | 'logs') => {
    setSearchTerm('');
    setActiveTab(tab);
  }, []);

  const handleSaveDisplayOrder = useCallback(async () => {
    if (isSavingOrder) return;
    const payload = gridHandlersRef.current?.getDisplayOrderPayload?.() || [];
    if (payload.length === 0) {
      enqueueSnackbar('No attributes to reorder', { variant: 'info' });
      return;
    }
    setIsSavingOrder(true);
    try {
      await settingsService.sequenceFields(payload);
      enqueueSnackbar('Display order updated', { variant: 'success' });
      await gridHandlersRef.current?.reload();
    } catch (error) {
      console.error('Unable to save changes. Please try again.', error);
      enqueueSnackbar('Unable to save changes. Please try again.', { variant: 'error' });
    } finally {
      setIsSavingOrder(false);
    }
  }, [enqueueSnackbar, isSavingOrder]);

  const handleViewFieldAccess = useCallback((attributeId: number) => {
    setSelectedAttributeId(attributeId);
    setManageFieldAccessOpen(true);
  }, []);

  const handleFieldAccessSuccess = useCallback(async () => {
    setManageFieldAccessOpen(false);
    setSelectedAttributeId(null);
    await gridHandlersRef.current?.reload();
  }, []);

  const handleHandlersChange = useCallback((handlers: AttributesListDataGridHandle | null) => {
    gridHandlersRef.current = handlers;
  }, []);

  if (!moduleType) {
    return null;
  }

  return (
    <Layout>
      <Head>
        <title>{activityName} | 1Channel</title>
      </Head>

      <TailwindPageLayout
        header={
          <AttributeHeader
            pageHeading={activityName}
            handleOpenAddModal={handleOpenAddModal}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            handleSearch={handleSearch}
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            onSaveDisplayOrder={handleSaveDisplayOrder}
            isSavingDisplayOrder={isSavingOrder}
            hasSetting={true}
          />
        }
      >
        {activeTab === 'fields' && (
          <AttributesListDataGrid
            projectId={projectId}
            moduleType={moduleType}
            searchTerm={searchTerm}
            onHandlersChange={handleHandlersChange}
            onViewFieldAccess={handleViewFieldAccess}
            onEditAttribute={handleEditAttribute}
          />
        )}
        {activeTab === 'logs' && (
          <AttributeLogsDataGrid
            searchTerm={searchTerm}
            projectId={projectId}
            moduleType={moduleType}
          />
        )}
        {activeTab === 'setting' && (
          <ActivityAdvancedSettingComponent
            projectId={projectId}
            activityId={moduleType}
            onSave={() => {
              // Optionally refresh data or show confirmation
            }}
          />
        )}
      </TailwindPageLayout>

      <AddEditAttribute
        open={addEditModalOpen}
        onClose={() => {
          setAddEditModalOpen(false);
          setEditingAttributeId(null);
        }}
        projectId={projectId}
        moduleType={moduleType}
        isEditMode={!!editingAttributeId}
        attributeId={editingAttributeId || undefined}
        onSave={handleAddAttributeSuccess}
      />

      <ManageFieldAccess
        open={manageFieldAccessOpen}
        onClose={() => setManageFieldAccessOpen(false)}
        attributeId={selectedAttributeId}
        projectId={projectId}
        moduleType={moduleType}
        onSuccess={handleFieldAccessSuccess}
      />
    </Layout>
  );
};

export default ActivitySettings;
