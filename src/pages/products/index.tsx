import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import productService from '@/lib/services/productService';
import { ProductData } from '../../lib/models/product.model';
import ProductDataGrid from '../../components/products/ProductDataGrid';
import { Dialog, DialogContent } from "../../components/ui/tailwind/dialog";
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import { getProjectId } from '../../lib/storage/sharedStorage';
import { useEntityHeading } from '../../hooks/useEntityHeading';
import ProductHeader from '../../components/products/ProductHeader';
import { ProductProvider } from '../../contexts/ProductContext';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import AddForm from '../../components/products/AddEditForm/AddForm';
import EditForm from '../../components/products/AddEditForm/EditForm';
import ProductFilter, { ProductFilterRef } from '../../components/products/ProductFilter';

// Utility function for conditional class names
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

const Products: NextPage = () => {
  // State for API data
  const [productsListData, setProductsListData] = useState<ProductData[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [gridDataLoaded, setGridDataLoaded] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [needsListRefresh, setNeedsListRefresh] = useState<boolean>(false);
  const [selectedView, setSelectedView] = useState<"self" | "team" | "all">("self");

  // State for AddForm modal
  const [isAddFormModalOpen, setIsAddFormModalOpen] = useState(false);
  
  // State for product modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductData | undefined>(undefined);
  const [editingProductSerialNumber, setEditingProductSerialNumber] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  // Filter states
  const [hasActiveFilters, setHasActiveFilters] = useState<boolean>(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState<number>(0);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const productFilterRef = useRef<ProductFilterRef>(null);

  
  // Get Project ID from sharedStorage
  const projectId = getProjectId() || 0;
  
  // Get entity-specific page heading for Products
  const pageHeading = useEntityHeading('Products', 'Products');

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
  }, [isAddFormModalOpen, isModalOpen, isFilterModalOpen, gridApi]);
  
  // Function to export products data
  const exportProducts = async () => {
    try {
      setExporting(true);
      
      if (!gridApi) {
        console.error('Grid API not available');
        return;
      }
      
      // Use AG Grid's export functionality with custom filename
      const params = {
        fileName: `products_export_${new Date().toISOString().split('T')[0]}.csv`,
      };
      gridApi.exportDataAsCsv(params);
    } catch (err) {
      console.error('Error exporting products:', err);
    } finally {
      setExporting(false);
    }
  };

  // Function to fetch products from API
  async function fetchProductsData() {
    try {
      setLoading(true);
      
      if (!projectId) {
        setLoading(false);
        return;
      }

      const response = activeFilters.length > 0 
        ? await productService.getProductswithFilters(projectId, activeFilters)
        : await productService.getProducts(projectId);
      console.log('API Response:', response);

      if (
        response &&
        response.responseData &&
        Array.isArray(response.responseData)
      ) {
        const rawData = response.responseData;
        console.log('Raw Product Data:', rawData);
  
        const transformed = rawData.map((item, index) => {
          return {
            id: item.productId || '',
            productId: item.productId,
            projectId: item.projectId,
            serialNo: item.serialNo || '', // Use index + 1 if serialNo is null
            productName: item.productName || '',
            price: item.price || 0,
            status: item.status
          };
        });

        console.log('Transformed Product Data:', transformed);
        setProductsListData(transformed);
        setGridDataLoaded(true);
  
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      setProductsListData([]);
      setGridDataLoaded(false);
    } finally {
      setLoading(false);
    }
  }
  // Load products on mount - with empty dependency array to only run once
  useEffect(() => {
    // Initial data load
    fetchProductsData();
  }, []); // Load once on mount
  
  // Monitor needsListRefresh state to trigger data refresh when needed
  useEffect(() => {
    if (needsListRefresh) {
      fetchProductsData();
      setNeedsListRefresh(false);
    }
  }, [needsListRefresh]);
  
  // For handling Enter key press - immediate search
  const handleSearch = () => {
    if (gridApi) {
      gridApi.setQuickFilter(searchTerm);
    }
  };

  // Function to clear all filters
  const handleClearFilters = () => {
    productFilterRef.current?.clear();
    setSearchTerm('');
    setSelectedView('self');
    setHasActiveFilters(false);
    setActiveFiltersCount(0);
    setActiveFilters([]);
    if (gridApi) {
      gridApi.setQuickFilter('');
    }
    // Trigger a refresh to call getProducts API without filters
    setNeedsListRefresh(true);
  };

  // Filter modal handlers
  const handleOpenFilterModal = () => {
    setIsFilterModalOpen(true);
  };

  const handleCloseFilterModal = () => {
    setIsFilterModalOpen(false);
  };

  const handleApplyFilters = (filterRequestBody: any[]) => {
    console.log('Applying filters:', filterRequestBody);
    setActiveFilters(filterRequestBody);
    setHasActiveFilters(filterRequestBody.length > 0);
    setActiveFiltersCount(filterRequestBody.length);
    setIsFilterModalOpen(false);
    
    // Trigger a refresh of the product list with filters
    setNeedsListRefresh(true);
  };

  const handleEditProduct = (product: any) => {
    console.log('Edit product:', product.id);
    setEditingProduct(product.id);
    setEditingProductSerialNumber(product.serialNo || '');
    setIsEditing(true);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    // No data refresh here - only on success callback
  };
  
  const handleCloseAddFormModal = () => {
    setIsAddFormModalOpen(false);
    // No data refresh here - only on success callback
  };
  
  
  return (
    <Layout>
      <Head>
        <title>Product Management | 1Channel</title>
      </Head>

      <ProductProvider value={{
              pageHeading,
              searchTerm,
              setSearchTerm,
              handleSearch,
              setLoading,
              setNeedsListRefresh,
              gridDataLoaded,
              exporting,
              exportProducts, 
              handleOpenAddModal: () => setIsAddFormModalOpen(true),
              handleOpenFilterModal,
              hasActiveFilters,
              activeFiltersCount,
              handleClearFilters,
            }}>
        <TailwindPageLayout
          header={<ProductHeader />}
      >
        <div className="h-full w-full overflow-auto">
          {/* Loading state - matches settings assistant page */}
          {loading ? (
            <div className="flex justify-center items-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : productsListData.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500 mb-4">No {pageHeading} found</div>
              <p className="text-gray-400">Try changing your filter settings or add a new {pageHeading}</p>
            </div>
          ) : (
            <ProductDataGrid
              products={productsListData}
              loading={loading}
              onProductEdit={handleEditProduct}
              searchText={searchTerm}
              onGridReady={(api) => {
                setGridApi(api);
                console.log('Product grid ready');
              }}
            />
          )}
        </div>
      </TailwindPageLayout>
    </ProductProvider>
      {/* AddForm Modal */}
      <Dialog 
        open={isAddFormModalOpen} 
        onOpenChange={setIsAddFormModalOpen}
      >
        <DialogContent className="sm:max-w-4xl">
          <AddForm
            onCancel={handleCloseAddFormModal}
            onSuccess={() => {
              setNeedsListRefresh(true);
              handleCloseAddFormModal();
            }}
            isLoading={loading}
          />
        </DialogContent>
      </Dialog>
      
      {/* EditForm Modal */}
      <Dialog
        open={isModalOpen && isEditing}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) setIsEditing(false);
        }}
      >
        <DialogContent className="sm:max-w-4xl">
          <EditForm
            productId={editingProduct}
            serialNumber={editingProductSerialNumber}
            onCancel={handleCloseModal}
            onSuccess={() => {
              setNeedsListRefresh(true);
              handleCloseModal();
            }}
            isLoading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Product Filter Modal */}
      <ProductFilter
        ref={productFilterRef}
        isOpen={isFilterModalOpen}
        onClose={handleCloseFilterModal}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />
      
    </Layout>
  );
};

export default Products;
