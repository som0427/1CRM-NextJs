import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSnackbar } from 'notistack';
import { NextPage } from 'next';
import Head from 'next/head';

import { useRouter } from 'next/router';

import Layout from '../../components/layout/Layout';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';

import productFormService from '../../lib/services/productFormService';
import { ProductFormData } from '../../lib/models/productFormModels';

import ProductFormDataGrid from '../../components/productForms/ProductFormDataGrid';
import ProductFormHeader from '@/components/productForms/ProductFormHeader';
import ProductFormAddModal from '@/components/productForms/ProductFormAddModal';

import { ProductFormProvider } from '@/contexts/ProductFormContext';

import { getProjectId } from '../../lib/storage/sharedStorage';
import { useEntityHeading } from '../../hooks/useEntityHeading';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';

import AttributeHeader from '@/components/attributes/AttributeHeader';
import AttributesListDataGrid, { AttributesListDataGridHandle } from '@/components/attributes/AttributesListDataGrid';
import AddEditProductFormAttribute from '@/components/productForms/AddEditProductFormAttribute';
import ManageFieldAccess from '@/components/attributes/sub-components/ManageFieldAccess';
import ProductFormSettings from '@/components/productForms/ProductFormSettings';
import settingsService from '@/lib/services/settingsService';

/* ---------------------------------------------
 Page Component
--------------------------------------------- */
const ProductForm: NextPage = () => {
  const router = useRouter();
  
  // Get selected product form from URL query
  const selectedFormId = router.query.formId ? Number(router.query.formId) : null;
  
  /* ---------------------------------------------
   Core State
  --------------------------------------------- */
  const [productForms, setProductForms] = useState<ProductFormData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [dynamicColumns, setDynamicColumns] = useState<
    { field: string; headerName: string; attributeType: number }[]
  >([]);
  const [isSavingDisplayOrder, setIsSavingDisplayOrder] = useState(false);
  const [hasOrderChanges, setHasOrderChanges] = useState(false);

  /* ---------------------------------------------
   Pagination
  --------------------------------------------- */
  const pageNumber = useRef(0);
  const pageSize = 10000;
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const columnsGenerated = useRef(false);

  /* ---------------------------------------------
   View & Metadata
  --------------------------------------------- */
  const projectId = getProjectId() || 0;
  const pageHeading = useEntityHeading('Product Forms');
  // Selected product form for detail view - derived from URL
  const selectedProductForm = useMemo(() => {
    if (!selectedFormId) return null;
    const form = productForms.find(f => (f.productFormId ?? f.id) === selectedFormId);
    return form ? { id: selectedFormId, name: form.name || 'Product Form' } : null;
  }, [selectedFormId, productForms]);

  // Detail view state (when a product form is selected)
  const [detailActiveTab, setDetailActiveTab] = useState<'fields' | 'setting' | 'logs'>('fields');
  const [detailSearchTerm, setDetailSearchTerm] = useState<string>('');
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [manageFieldAccessOpen, setManageFieldAccessOpen] = useState(false);
  const [selectedAttributeId, setSelectedAttributeId] = useState<number | null>(null);
  const [editingAttributeId, setEditingAttributeId] = useState<number | null>(null);
  const gridHandlersRef = useRef<AttributesListDataGridHandle | null>(null);
  const [isSavingFieldOrder, setIsSavingFieldOrder] = useState(false);

  /* ---------------------------------------------
   Modals
  --------------------------------------------- */
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingFormId, setDeletingFormId] = useState<number | null>(null);

  const { enqueueSnackbar } = useSnackbar();

  /* ---------------------------------------------
   Dynamic Columns
  --------------------------------------------- */
  const generateDynamicColumns = useCallback((fields: any[] = []) => {
    const cols: any[] = [
      {
        field: 'name',
        headerName: 'Name',
        attributeType: CustomAttributeTypeEnum.TEXT_SINGLE_LINE,
        order: 1
      }
    ];

    let order = 10;
    fields.forEach(f => {
      if (f?.customFieldLabel) {
        cols.push({
          field: f.customFieldLabel,
          headerName: f.customFieldLabel,
          attributeType: f.customFieldType,
          order: order++
        });
      }
    });

    return cols
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(({ field, headerName, attributeType }) => ({
        field,
        headerName,
        attributeType
      }));
  }, []);

  /* ---------------------------------------------
   Fetch Product Forms
  --------------------------------------------- */
  const fetchProductForms = useCallback(
    async (isLoadMore = false) => {
      if (isLoadMore) setIsLoadingMore(true);
      else {
        setLoading(true);
        pageNumber.current = 0;
      }

      try {
        const view = 3;

        const response = await productFormService.getProductFormsFilter(
          projectId,
          view,
          pageNumber.current,
          pageSize,
          false,
          null
        );

        if (response?.statusCode === 200) {
          const rawData = response.responseData.data || [];

          if (!columnsGenerated.current) {
            setDynamicColumns(generateDynamicColumns(rawData[0]?.data || []));
            columnsGenerated.current = true;
          }

          const transformed = rawData.map((item: any) => {
            const customFields: Record<string, any> = {};
            item.data?.forEach((field: any) => {
              if (field.customFieldLabel) {
                customFields[field.customFieldLabel] = field.customFieldValue;
              }
            });

            const rawProductFormId = item.productFormId ?? item.id;
            const numericProductFormId =
              typeof rawProductFormId === 'number'
                ? rawProductFormId
                : Number.parseInt(String(rawProductFormId ?? 0), 10);

            const isActiveFlag =
              typeof item.isActive === 'number'
                ? item.isActive !== 0
                : item.status?.toLowerCase() !== 'inactive';

            return {
              id: item.productFormId ?? item.id ?? '',
              productFormId: Number.isFinite(numericProductFormId)
                ? numericProductFormId
                : undefined,
              name: item.name || '(Product Form Name)',
              status: isActiveFlag ? 'Active' : 'Inactive',
              anyTransactionPerformed: item.anyTransactionPerformed ?? true,
              ...customFields
            };
          });

          setProductForms(prev =>
            isLoadMore ? [...prev, ...transformed] : transformed
          );
          if (!isLoadMore) {
            setHasOrderChanges(false);
          }

          if (pageNumber.current === 0) {
            setTotalCount(
              response.responseData?.totalCountForAdvSearch ??
                response.responseData?.totalCount ??
                null
            );
          }
        }
      } catch {
        enqueueSnackbar('Failed to load product forms', { variant: 'error' });
        if (!isLoadMore) setProductForms([]);
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    },
    [projectId, enqueueSnackbar, generateDynamicColumns]
  );

  useEffect(() => {
    fetchProductForms();
  }, [fetchProductForms]);

  /* ---------------------------------------------
   Export
  --------------------------------------------- */
  const exportProductForms = async () => {
    setExporting(true);
    try {
      const response = await productFormService.exportProductForms(projectId, 1, {
        advanceSearch: null,
        isFirstAdvSearch: false
      });

      enqueueSnackbar(response?.responseData || 'Export started', {
        variant: 'success'
      });
    } catch {
      enqueueSnackbar('Export failed', { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  /* ---------------------------------------------
   Handlers
  --------------------------------------------- */
  const handleEdit = (id: number) => {
    router.push({ pathname: router.pathname, query: { ...router.query, formId: id } }, undefined, { shallow: true });
    setDetailActiveTab('fields');
    setDetailSearchTerm('');
  };

  const handleBackToList = useCallback(() => {
    const { formId, ...restQuery } = router.query;
    router.push({ pathname: router.pathname, query: restQuery }, undefined, { shallow: true });
    setDetailActiveTab('fields');
    setDetailSearchTerm('');
    setEditingAttributeId(null);
  }, [router]);

  // Detail view handlers
  const handleOpenAddFieldModal = useCallback(() => {
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

  const handleDetailSearch = useCallback(() => {
    // Search is handled via the searchTerm prop in the grid component
  }, []);

  const handleDetailTabChange = useCallback((tab: 'fields' | 'setting' | 'logs') => {
    setDetailSearchTerm('');
    setDetailActiveTab(tab);
  }, []);

  const handleSaveFieldDisplayOrder = useCallback(async () => {
    if (isSavingFieldOrder) return;
    const payload = gridHandlersRef.current?.getDisplayOrderPayload?.() || [];
    if (payload.length === 0) {
      enqueueSnackbar('No attributes to reorder', { variant: 'info' });
      return;
    }
    setIsSavingFieldOrder(true);
    try {
      await settingsService.sequenceFields(payload);
      enqueueSnackbar('Display order updated', { variant: 'success' });
      await gridHandlersRef.current?.reload();
    } catch (error) {
      console.error('Unable to save changes. Please try again.', error);
      enqueueSnackbar('Unable to save changes. Please try again.', { variant: 'error' });
    } finally {
      setIsSavingFieldOrder(false);
    }
  }, [enqueueSnackbar, isSavingFieldOrder]);

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

  const handleDelete = useCallback(
    async (id: number) => {
      if (!id) {
        enqueueSnackbar('Invalid product form selected for deletion', {
          variant: 'error'
        });
        return;
      }

      if (deletingFormId !== null) {
        return;
      }

      setDeletingFormId(id);

      try {
        const response = await productFormService.deleteProductForm(projectId, id);
        if (response.statusCode === 200) {
          const successMessage =
            response.responseData?.message ||
            response.message ||
            'Product form deleted successfully.';
          enqueueSnackbar(successMessage, { variant: 'success' });
          await fetchProductForms();
        } else {
          const errorMessage = response.message || 'Failed to delete product form';
          enqueueSnackbar(errorMessage, { variant: 'error' });
        }
      } catch (error: any) {
        const fallbackMessage =
          error?.message || 'Failed to delete product form. Please try again.';
        enqueueSnackbar(fallbackMessage, { variant: 'error' });
      } finally {
        setDeletingFormId(null);
      }
    },
    [deletingFormId, enqueueSnackbar, fetchProductForms, projectId]
  );

  const handleCloseAddModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  const handleCreateProductForm = useCallback(
    async ({ name, key }: { name: string; key: string }) => {
      try {
        const payload = {
          name: name.trim(),
          serialKey: key.trim(),
          projectId,
          productFormView: 2,
          summaryFieldsForApp: [-1],
          summaryTotalField: 1,
          allowDiscounts: 0,
          discountType: [],
          allowDiscountAt: [],
          isActive: 1,
          displayOrder: Math.max(1, productForms.length + 1)
        };

        const response = await productFormService.addUpdateProductForm(payload);

        if (response.statusCode === 200) {
          const successMessage =
            response.responseData?.message ||
            response.message ||
            'Product form created successfully.';
          enqueueSnackbar(successMessage, { variant: 'success' });
          handleCloseAddModal();
          await fetchProductForms();
        } else {
          const errorMessage =
            response.message || 'Failed to create product form.';
          enqueueSnackbar(errorMessage, { variant: 'error' });
        }
      } catch (error: any) {
        const fallbackMessage =
          error?.message || 'Failed to create product form. Please try again.';
        enqueueSnackbar(fallbackMessage, { variant: 'error' });
      }
    },
    [enqueueSnackbar, fetchProductForms, handleCloseAddModal, productForms.length, projectId]
  );

  const filteredProductForms = useMemo(() => productForms, [productForms]);
  const handleSearch = () => {};

  const handleRowReorder = useCallback((updatedRows: ProductFormData[]) => {
    setProductForms([...updatedRows]);
    setHasOrderChanges(true);
  }, []);

  const handleSaveDisplayOrder = useCallback(async () => {
    if (!hasOrderChanges) {
      enqueueSnackbar('No display order changes to save', { variant: 'info' });
      return;
    }

    setIsSavingDisplayOrder(true);
    try {
      const payload = productForms
        .map((form, index) => {
          const idValue = form.productFormId ?? form.id;
          const numericId =
            typeof idValue === 'number' ? idValue : Number.parseInt(String(idValue ?? 0), 10);

          return {
            id: numericId,
            name: form.name || '',
            displayOrder: index + 1
          };
        })
        .filter(item => Number.isFinite(item.id) && item.id > 0);

      if (payload.length === 0) {
        enqueueSnackbar('No product forms available to save', { variant: 'info' });
        return;
      }

      await productFormService.updateDisplayOrder(projectId, payload);
      enqueueSnackbar('Display order updated', { variant: 'success' });
      setHasOrderChanges(false);
    } catch {
      enqueueSnackbar('Failed to save display order', { variant: 'error' });
    } finally {
      setIsSavingDisplayOrder(false);
    }
  }, [hasOrderChanges, productForms, enqueueSnackbar, projectId]);

  /* ---------------------------------------------
   Render
  --------------------------------------------- */
  // Detail view when a product form is selected
  if (selectedProductForm) {
    return (
      <Layout>
        <Head>
          <title>{selectedProductForm.name} | 1Channel</title>
        </Head>

        <TailwindPageLayout
          header={
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <AttributeHeader
                  pageHeading={selectedProductForm.name}
                  handleOpenAddModal={handleOpenAddFieldModal}
                  searchTerm={detailSearchTerm}
                  setSearchTerm={setDetailSearchTerm}
                  handleSearch={handleDetailSearch}
                  activeTab={detailActiveTab}
                  setActiveTab={handleDetailTabChange}
                  onSaveDisplayOrder={handleSaveFieldDisplayOrder}
                  isSavingDisplayOrder={isSavingFieldOrder}
                  hasSetting={true}
                  hasLogs={false}
                />
              </div>
            </div>
          }
        >
          {detailActiveTab === 'fields' && (
            <AttributesListDataGrid
              projectId={projectId}
              moduleType={selectedProductForm.id}
              searchTerm={detailSearchTerm}
              onHandlersChange={handleHandlersChange}
              onViewFieldAccess={handleViewFieldAccess}
              onEditAttribute={handleEditAttribute}
            />
          )}
          {detailActiveTab === 'setting' && (
            <ProductFormSettings
              productFormId={selectedProductForm.id}
              projectId={projectId}
              onCancel={() => setDetailActiveTab('fields')}
              onSaveSuccess={() => {
                // Stay on settings tab after save (ProductFormSettings shows its own success message)
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
          moduleType={selectedProductForm.id}
          isEditMode={!!editingAttributeId}
          attributeId={editingAttributeId || undefined}
          onSave={handleAddAttributeSuccess}
        />

        <ManageFieldAccess
          open={manageFieldAccessOpen}
          onClose={() => setManageFieldAccessOpen(false)}
          attributeId={selectedAttributeId}
          projectId={projectId}
          moduleType={selectedProductForm.id}
          onSuccess={handleFieldAccessSuccess}
        />
      </Layout>
    );
  }

  // List view (default)
  return (
    <Layout>
      <Head>
        <title>{pageHeading} Management | 1Channel</title>
      </Head>

      <ProductFormProvider
        value={{
          pageHeading,
          searchTerm,
          setSearchTerm,
          handleSearch,
          viewMode,
          setViewMode,
          exporting,
          exportEntities: exportProductForms,
          handleOpenAddModal: () => setIsAddModalOpen(true),
          handleLoadMore: () => {
            pageNumber.current += 1;
            fetchProductForms(true);
          },
          isLoadingMore,
          totalCount,
          currentCount: filteredProductForms.length,
          handleSaveDisplayOrder,
          isSavingDisplayOrder
        }}
      >
        <TailwindPageLayout header={<ProductFormHeader />}>
          {loading ? (
            <div className="flex flex-col justify-center items-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
              <p className="mt-2 text-gray-500 text-sm">Loading...</p>
            </div>
          ) : filteredProductForms.length === 0 ? (
            <div className="text-center text-gray-500 p-10">
              No {pageHeading} found
            </div>
          ) : (
            <ProductFormDataGrid
              data={filteredProductForms}
              dynamicColumns={dynamicColumns}
              searchText={searchTerm}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReorder={handleRowReorder}
              deleteLoadingId={deletingFormId}
            />
          )}
        </TailwindPageLayout>

        <ProductFormAddModal
          open={isAddModalOpen}
          onClose={handleCloseAddModal}
          onSave={handleCreateProductForm}
        />
      </ProductFormProvider>
    </Layout>
  );
};

export default ProductForm;
