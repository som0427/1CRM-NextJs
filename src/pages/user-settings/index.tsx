import React, { useCallback, useRef, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import { getProjectId } from '@/lib/storage/sharedStorage';
import AttributeHeader from '@/components/attributes/AttributeHeader';
import AttributesListDataGrid, { AttributesListDataGridHandle } from '@/components/attributes/AttributesListDataGrid';
import AttributeLogsDataGrid from '@/components/attributes/AttributeLogsDataGrid';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import { useSnackbar } from 'notistack';
import settingsService from '@/lib/services/settingsService';
import AddEditAttribute from '@/components/attributes/sub-components/AddEditAttribute';


const UserSettings: NextPage = () => {
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [editingAttributeId, setEditingAttributeId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'fields' | 'setting' | 'logs'>('fields');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const gridHandlersRef = useRef<AttributesListDataGridHandle | null>(null);
  const { enqueueSnackbar } = useSnackbar();
  const pageHeading = "Users";
  const projectId = getProjectId() || 0;
  const moduleType = SystemAttributeEnum.USER_MODULE; // 5 for User
  const [isSavingOrder, setIsSavingOrder] = useState(false);


  const handleOpenAddModal = useCallback(() => {
    setEditingAttributeId(null); // Clear any previous edit state
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
  }, [searchTerm]);

  const handleTabChange = useCallback((tab: 'fields' | 'setting' | 'logs') => {
    setSearchTerm('');
    setActiveTab(tab);
  }, [setSearchTerm, setActiveTab]);

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

  const handleHandlersChange = useCallback((handlers: AttributesListDataGridHandle | null) => {
    gridHandlersRef.current = handlers;
  }, []);

  return (
    <Layout>
      <Head>
        <title>{pageHeading} | 1Channel</title>
      </Head>

      <TailwindPageLayout
        header={
          <AttributeHeader pageHeading={pageHeading}
          handleOpenAddModal={handleOpenAddModal}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          handleSearch={handleSearch}
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          onSaveDisplayOrder={handleSaveDisplayOrder}
          isSavingDisplayOrder={isSavingOrder} />
        }
      >
        {activeTab === 'fields' ? (
          <>
          <AttributesListDataGrid
            projectId={projectId}
            moduleType={moduleType}
            searchTerm={searchTerm}
            onHandlersChange={handleHandlersChange}
            onEditAttribute={handleEditAttribute}
          />
          </>
        ) : (
          <AttributeLogsDataGrid
            searchTerm={searchTerm}
            projectId={projectId}
            moduleType={moduleType}
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

    </Layout>
  );
};

export default UserSettings;
