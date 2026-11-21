import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';

import Layout from '@/components/layout/Layout';
import { TailwindPageLayout } from '@/components/layout/TailwindPageLayout';
import AttributeHeader from '@/components/attributes/AttributeHeader';
import AttributesListDataGrid, { AttributesListDataGridHandle } from '@/components/attributes/AttributesListDataGrid';
import { getProjectId } from '@/lib/storage/sharedStorage';
import AddEditProductFormAttribute from '@/components/productForms/AddEditProductFormAttribute';
import ManageFieldAccess from '@/components/attributes/sub-components/ManageFieldAccess';
import ProductFormSettings from '@/components/productForms/ProductFormSettings';
import settingsService from '@/lib/services/settingsService';
import productFormService from '@/lib/services/productFormService';

const ProductFormFieldsPage: NextPage = () => {
  const router = useRouter();
  const { productFormId } = router.query;
  const moduleType = productFormId ? Number(productFormId) : 0;
  const [productFormName, setProductFormName] = useState<string>('Product Form');
  const projectId = getProjectId() || 0;

  // Fetch product form name from API
  useEffect(() => {
    const fetchProductFormName = async () => {
      if (!moduleType || moduleType === 0) return;
      try {
        const response = await productFormService.getProductFormSetting(moduleType);
        if (response?.statusCode === 200 && response?.responseData?.name) {
          setProductFormName(response.responseData.name);
        }
      } catch (error) {
        console.error('Error fetching product form name:', error);
        setProductFormName('Product Form');
      }
    };
    fetchProductFormName();
  }, [moduleType]);

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
    // Search is handled via the searchTerm prop in the grid component
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
        <title>{productFormName} | 1Channel</title>
      </Head>

      <TailwindPageLayout
        header={
          <AttributeHeader
            pageHeading={productFormName}
            handleOpenAddModal={handleOpenAddModal}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            handleSearch={handleSearch}
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            onSaveDisplayOrder={handleSaveDisplayOrder}
            isSavingDisplayOrder={isSavingOrder}
            hasSetting={true}
            hasLogs={false}
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
        {activeTab === 'setting' && (
          <ProductFormSettings
            productFormId={moduleType}
            projectId={projectId}
            onCancel={() => setActiveTab('fields')}
            onSaveSuccess={() => {
              setActiveTab('fields');
              gridHandlersRef.current?.reload();
            }}
          />
        )}
      </TailwindPageLayout>

      <AddEditProductFormAttribute
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

export default ProductFormFieldsPage;
