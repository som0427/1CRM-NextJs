import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm, useWatch, useFieldArray } from 'react-hook-form';
import { useSnackbar } from 'notistack';
import TwinModal from '@/components/common/TwinModal';
import CancelButton from '@/components/common/buttons/CancelButton';
import SaveButton from '@/components/common/buttons/SaveButton';
import Select from '@/components/common/input-fields/Select';
import MultiSelect from '@/components/common/input-fields/MultiSelect';
import DateInput from '@/components/common/input-fields/DateInput';
import TextInput from '@/components/common/input-fields/TextInput';
import NumericInput from '@/components/common/input-fields/wrapper/NumericInput';
import FormField from '@/components/common/input-fields/FormField';
import Form from '@/components/common/Form';
import AlertDialog from '@/components/common/AlertDialog';
import DisplayText from '../common/input-fields/DisplayText';

// Hard-coded customer options
const CUSTOMER_OPTIONS = [
  { value: 'cust_001', label: 'ABC Auto Body Shop' },
  { value: 'cust_002', label: 'XYZ Paint Works' },
  { value: 'cust_003', label: 'Premier Auto Refinishing' },
  { value: 'cust_004', label: 'Quality Car Care' },
  { value: 'cust_005', label: 'Elite Auto Services' },
];

// Hard-coded product categories
const PRODUCT_CATEGORY_OPTIONS = [
  { value: 'putty', label: 'Putty' },
  { value: 'primer', label: 'Primer' },
  { value: 'thinner', label: 'Thinner' },
  { value: 'clearcoat', label: 'Clear Coat' },
  { value: 'basecoat', label: 'Base Coat' },
];

// Activity status options (1 = Active, 0 = Inactive)
const ACTIVITY_STATUS_OPTIONS = [
  { value: 1, label: 'Active' },
  { value: 0, label: 'Inactive' },
];

// Hard-coded products by category
const PRODUCTS_BY_CATEGORY: Record<string, Array<{
  skuCode: string;
  productDescription: string;
  popularCode: string;
  packSize: number;
}>> = {
  putty: [
    { skuCode: '32410000220', productDescription: 'P551-1050 GP stopper 2KG', popularCode: 'P551-1050', packSize: 2 },
    { skuCode: '32610000120', productDescription: '1K CHECK PUTTY 200ML', popularCode: '1K CHECK PUTTY 200ML', packSize: 0.2 },
    { skuCode: '41410000120', productDescription: '2K FILLER 200GMS', popularCode: '2K FILLER 200GMS', packSize: 0.2 },
  ],
  primer: [
    { skuCode: '32390000140', productDescription: 'P565-9086 1K Rub thru Primer 400ML', popularCode: 'P565-9086', packSize: 0.4 },
    { skuCode: '32670000140', productDescription: '2K 565-9081 400 ML', popularCode: 'P565-9081', packSize: 0.4 },
    { skuCode: '32690000210', productDescription: '2K P565-895 1 LT', popularCode: 'P565-895', packSize: 1 },
    { skuCode: '41041931210', productDescription: 'P565-5415 2K HIGH BUILD FAST PRIMER 1L', popularCode: 'P565-5415', packSize: 1 },
    { skuCode: '4173W621210', productDescription: 'P565-5601 SELF LEVELLING PRIMER-SG1 1LT', popularCode: 'P565-5601', packSize: 1 },
    { skuCode: '4174W622230', productDescription: 'P565-5605 SELF LEVELLING PRIMER-SG5 3LT', popularCode: 'P565-5605', packSize: 3 },
    { skuCode: '4175W623210', productDescription: 'P565-5607 SELF LEVELLING PRIMER-SG7 1LT', popularCode: 'P565-5607', packSize: 1 },
    { skuCode: '41810607210', productDescription: 'P565-510 HSPRM F GREY 1 LT', popularCode: 'P565-510', packSize: 1 },
    { skuCode: '4182W582210', productDescription: 'P565-888Fast HB Surfacer 1LT', popularCode: 'P565-888', packSize: 1 },
    { skuCode: '62130000210', productDescription: 'P565-511 HS PRIMER FILLER WHITE 1 LT', popularCode: 'P565-511', packSize: 1 },
    { skuCode: '62330607210', productDescription: 'P086-123 1K FAST DRY PRIMER 1 LT', popularCode: 'P086-123', packSize: 1 },
  ],
  thinner: [
    { skuCode: 'TH001', productDescription: 'Standard Thinner 1L', popularCode: 'STD-TH-1L', packSize: 1 },
    { skuCode: 'TH002', productDescription: 'Premium Thinner 2L', popularCode: 'PRM-TH-2L', packSize: 2 },
  ],
  clearcoat: [
    { skuCode: 'CC001', productDescription: 'High Gloss Clear Coat 1L', popularCode: 'HG-CC-1L', packSize: 1 },
    { skuCode: 'CC002', productDescription: 'Matte Clear Coat 500ML', popularCode: 'MT-CC-500', packSize: 0.5 },
  ],
  basecoat: [
    { skuCode: 'BC001', productDescription: 'Metallic Base Coat Red 1L', popularCode: 'MT-BC-RED', packSize: 1 },
    { skuCode: 'BC002', productDescription: 'Solid Base Coat White 1L', popularCode: 'SL-BC-WHT', packSize: 1 },
  ],
};

interface ProductRow {
  productCategory: string;
  skuCode: string;
  productDescription: string;
  popularCode: string;
  packSize: number;
  openingStockMaterialWt: string;
  openingStockSealedPack: string;
  unitsPurchased: string;
  closingStockMaterialWt: string;
  closingStockSealedPack: string;
}

interface FormValues {
  customerId: string;
  activityStatus: number; // 1 = Active, 2 = Inactive
  auditMonth: string;
  // Filter fields - arrays for multi-select (visibility only, not saved)
  filterCategories: string[];
  filterProducts: string[];
  filterPackSizes: string[];
  products: ProductRow[];
  jobsPerMonth: string;
  metallicShadesJobs: string;
  totalPanelPerMonth: string;
  panelsPerMonth: string;
}

interface EditingActivityData {
  id: number;
  serialNumber: string;
  customerName: string;
  customerId: string;
  activityStatus: number; // 1 = Active, 2 = Inactive
  auditMonth: string;
  productCategories: string[];
  productCategoryValues: string[];
  totalProducts: number;
  products: ProductRow[];
  jobDetails: {
    jobsPerMonth: number;
    metallicShadesJobs: number;
    totalPanelPerMonth: number;
    panelsPerMonth: number;
  };
  createdAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onSaveAndAddNew: (data: any) => void;
  existingActivitiesCount: number;
  isEditMode?: boolean;
  editingActivity?: EditingActivityData | null;
}

// Closing Stock Input with validation
interface ClosingStockInputProps {
  control: any;
  index: number;
}

const ClosingStockInput: React.FC<ClosingStockInputProps> = ({ control, index }) => {
  const unitsPurchased = useWatch({ control, name: `products.${index}.unitsPurchased` });
  const openingStockSealedPack = useWatch({ control, name: `products.${index}.openingStockSealedPack` });
  const closingStockSealedPack = useWatch({ control, name: `products.${index}.closingStockSealedPack` });
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const errorRef = useRef<HTMLDivElement>(null);

  const maxAllowed = (parseInt(unitsPurchased) || 0) + (parseInt(openingStockSealedPack) || 0);
  const currentClosing = parseInt(closingStockSealedPack) || 0;
  const isInvalid = closingStockSealedPack !== '' && currentClosing > maxAllowed;

  const handleMouseEnter = () => {
    if (errorRef.current) {
      const rect = errorRef.current.getBoundingClientRect();
      setTooltipPos({ top: rect.top - 4, left: rect.left });
    }
    setShowTooltip(true);
  };

  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        {...control.register(`products.${index}.closingStockSealedPack`)}
        className={`w-full border-0 border-b bg-transparent px-1 py-1 text-xs focus:outline-none ${
          isInvalid
            ? 'border-red-500 focus:border-red-500 text-red-600'
            : 'border-gray-300 focus:border-blue-500'
        }`}
        placeholder="Enter value"
        onKeyDown={(e) => {
          if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
          }
        }}
      />
      {isInvalid && (
        <div
          ref={errorRef}
          className={`absolute left-0 right-0 text-[10px] text-red-500 truncate cursor-pointer ${showTooltip ? 'opacity-0' : ''}`}
          style={{ top: '100%' }}
          onMouseEnter={handleMouseEnter}
        >
          Closing Stock sealed pack...
        </div>
      )}
      {showTooltip && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed bg-white border border-gray-300 shadow-lg rounded px-3 py-2 text-xs text-red-500 whitespace-normal cursor-pointer"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: 'translateY(10%)',
            width: '15%',
            zIndex: 99999,
          }}
          onMouseLeave={() => setShowTooltip(false)}
        >
          Closing Stock sealed pack in units must not exceed the total of Opening Stock sealed pack in units and Unit Purchased
        </div>,
        document.body
      )}
    </div>
  );
};

const DemoActivityModal: React.FC<Props> = ({
  open,
  onClose,
  onSave,
  onSaveAndAddNew,
  existingActivitiesCount,
  isEditMode = false,
  editingActivity = null,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [isSaving, setIsSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const isInitialLoadRef = useRef(true);

  const { control, handleSubmit, reset, watch, setValue, formState: { isDirty } } = useForm<FormValues>({
    defaultValues: {
      customerId: '',
      activityStatus: 1, // 1 = Active
      auditMonth: '',
      // Filter fields - empty array means "Select All" (show all)
      filterCategories: [],
      filterProducts: [],
      filterPackSizes: [],
      products: [],
      jobsPerMonth: '',
      metallicShadesJobs: '',
      totalPanelPerMonth: '',
      panelsPerMonth: '',
    },
    mode: 'onChange',
  });

  const { fields } = useFieldArray({
    control,
    name: 'products',
  });

  // Watch filter selections for visibility filtering
  const filterCategories = watch('filterCategories') || [];
  const filterProducts = watch('filterProducts') || [];
  const filterPackSizes = watch('filterPackSizes') || [];

  // Get all products flattened with their category
  const allProductsFlat = useMemo(() => {
    const result: Array<{
      categoryValue: string;
      categoryLabel: string;
      skuCode: string;
      productDescription: string;
      popularCode: string;
      packSize: number;
    }> = [];

    Object.entries(PRODUCTS_BY_CATEGORY).forEach(([categoryValue, products]) => {
      const categoryLabel = PRODUCT_CATEGORY_OPTIONS.find(c => c.value === categoryValue)?.label || categoryValue;
      products.forEach(p => {
        result.push({
          categoryValue,
          categoryLabel,
          ...p
        });
      });
    });
    return result;
  }, []);

  // Get all category options for multi-select (always show all categories)
  const allCategoryOptions = useMemo(() => {
    return PRODUCT_CATEGORY_OPTIONS;
  }, []);

  // Get product options filtered by selected categories (hierarchy: Category → Product)
  const filteredProductOptions = useMemo(() => {
    let filtered = allProductsFlat;

    // Filter by selected categories if any
    if (filterCategories.length > 0) {
      filtered = filtered.filter(p => filterCategories.includes(p.categoryValue));
    }

    // Get unique products by productDescription
    const uniqueProducts = filtered.reduce((acc: typeof filtered, product) => {
      if (!acc.find(p => p.productDescription === product.productDescription)) {
        acc.push(product);
      }
      return acc;
    }, []);

    return uniqueProducts.map(p => ({ value: p.skuCode, label: p.productDescription }));
  }, [allProductsFlat, filterCategories]);

  // Get pack size options filtered by selected categories AND products (hierarchy: Category → Product → Pack Size)
  const filteredPackSizeOptions = useMemo(() => {
    let filtered = allProductsFlat;

    // Filter by selected categories if any
    if (filterCategories.length > 0) {
      filtered = filtered.filter(p => filterCategories.includes(p.categoryValue));
    }

    // Filter by selected products if any
    if (filterProducts.length > 0) {
      filtered = filtered.filter(p => filterProducts.includes(p.skuCode));
    }

    // Get unique pack sizes
    const uniquePackSizes = Array.from(new Set(filtered.map(p => p.packSize))).sort((a, b) => a - b);
    return uniquePackSizes.map(size => ({ value: String(size), label: `${size}` }));
  }, [allProductsFlat, filterCategories, filterProducts]);

  // Clear invalid Product selections when Category filter changes
  // Keep only products that are still valid based on selected categories
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    if (filterProducts.length === 0) return; // Nothing to clear

    // Get valid product SKUs based on current category selection
    const validProductSkus = filteredProductOptions.map(p => p.value);

    // Filter out invalid selections
    const validSelectedProducts = filterProducts.filter(sku => validProductSkus.includes(sku));

    // Only update if there are invalid selections to remove
    if (validSelectedProducts.length !== filterProducts.length) {
      setValue('filterProducts', validSelectedProducts);
    }
  }, [filterCategories, filteredProductOptions, filterProducts, setValue]);

  // Clear invalid Pack Size selections when Category or Product filter changes
  // Keep only pack sizes that are still valid based on selected categories and products
  useEffect(() => {
    if (isInitialLoadRef.current) return;
    if (filterPackSizes.length === 0) return; // Nothing to clear

    // Get valid pack sizes based on current category and product selection
    const validPackSizes = filteredPackSizeOptions.map(p => p.value);

    // Filter out invalid selections
    const validSelectedPackSizes = filterPackSizes.filter(size => validPackSizes.includes(size));

    // Only update if there are invalid selections to remove
    if (validSelectedPackSizes.length !== filterPackSizes.length) {
      setValue('filterPackSizes', validSelectedPackSizes);
    }
  }, [filterCategories, filterProducts, filteredPackSizeOptions, filterPackSizes, setValue]);

  // Helper function to check if a product row has any data entered
  const productHasData = useCallback((product: ProductRow) => {
    return !!(
      product.openingStockMaterialWt ||
      product.openingStockSealedPack ||
      product.unitsPurchased ||
      product.closingStockMaterialWt ||
      product.closingStockSealedPack
    );
  }, []);

  // Filter visible product rows based on multi-select filters
  // Products with data are ALWAYS visible regardless of filter
  // Each filter works independently - if a filter has selections, product must match that filter
  // Empty filter = no restriction from that filter (show all for that criteria)
  const getVisibleFieldIndices = useMemo(() => {
    const currentProducts = watch('products') || [];

    return fields.map((field, index) => {
      const product = currentProducts[index];

      // Always show products that have data entered
      if (product && productHasData(product)) {
        return true;
      }

      // Check if each filter has selections (empty = show all for that criteria)
      const hasCategoryFilter = filterCategories.length > 0;
      const hasProductFilter = filterProducts.length > 0;
      const hasPackSizeFilter = filterPackSizes.length > 0;

      // If all filters are empty (Select All), show all products
      if (!hasCategoryFilter && !hasProductFilter && !hasPackSizeFilter) {
        return true;
      }

      // Check each filter - only apply if filter has selections
      const categoryValue = PRODUCT_CATEGORY_OPTIONS.find(c => c.label === field.productCategory)?.value;

      // Category filter: if filter is active, product must match; if empty, always passes
      const categoryMatch = !hasCategoryFilter || (categoryValue && filterCategories.includes(categoryValue));

      // Product filter: if filter is active, product must match; if empty, always passes
      const productMatch = !hasProductFilter || filterProducts.includes(field.skuCode);

      // Pack size filter: if filter is active, product must match; if empty, always passes
      const packSizeMatch = !hasPackSizeFilter || filterPackSizes.includes(String(field.packSize));

      // All ACTIVE filters must match (inactive filters don't block)
      return categoryMatch && productMatch && packSizeMatch;
    });
  }, [fields, filterCategories, filterProducts, filterPackSizes, watch, productHasData]);

  // Generate all products as initial rows for the form
  const allProductRows = useMemo((): ProductRow[] => {
    return allProductsFlat.map(p => ({
      productCategory: p.categoryLabel,
      skuCode: p.skuCode,
      productDescription: p.productDescription,
      popularCode: p.popularCode,
      packSize: p.packSize,
      openingStockMaterialWt: '',
      openingStockSealedPack: '',
      unitsPurchased: '',
      closingStockMaterialWt: '',
      closingStockSealedPack: '',
    }));
  }, [allProductsFlat]);

  // Load editing data when modal opens in edit mode, or pre-populate all products in add mode
  useEffect(() => {
    if (open && isEditMode && editingActivity) {
      isInitialLoadRef.current = true;
      reset({
        customerId: editingActivity.customerId || '',
        activityStatus: editingActivity.activityStatus ?? 1,
        auditMonth: editingActivity.auditMonth || '',
        // Filters default to empty (Select All)
        filterCategories: [],
        filterProducts: [],
        filterPackSizes: [],
        products: editingActivity.products || [],
        jobsPerMonth: String(editingActivity.jobDetails?.jobsPerMonth || ''),
        metallicShadesJobs: String(editingActivity.jobDetails?.metallicShadesJobs || ''),
        totalPanelPerMonth: String(editingActivity.jobDetails?.totalPanelPerMonth || ''),
        panelsPerMonth: String(editingActivity.jobDetails?.panelsPerMonth || ''),
      });
      // Mark initial load as complete after a short delay
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 100);
    } else if (open && !isEditMode) {
      // Add mode: pre-populate all products with empty data
      isInitialLoadRef.current = true;
      reset({
        customerId: '',
        activityStatus: 1,
        auditMonth: '',
        filterCategories: [],
        filterProducts: [],
        filterPackSizes: [],
        products: allProductRows,
        jobsPerMonth: '',
        metallicShadesJobs: '',
        totalPanelPerMonth: '',
        panelsPerMonth: '',
      });
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 100);
    }
  }, [open, isEditMode, editingActivity, reset, allProductRows]);

  const handleFormReset = useCallback(() => {
    reset({
      customerId: '',
      activityStatus: 1, // 1 = Active
      auditMonth: '',
      // Filters default to empty (Select All)
      filterCategories: [],
      filterProducts: [],
      filterPackSizes: [],
      products: allProductRows, // Pre-populate all products with empty data
      jobsPerMonth: '',
      metallicShadesJobs: '',
      totalPanelPerMonth: '',
      panelsPerMonth: '',
    });
  }, [reset, allProductRows]);

  // Generate serial number like DEMO001, DEMO002, etc.
  const generateSerialNumber = useCallback((count: number) => {
    const num = count + 1;
    return `DEMO${num.toString().padStart(3, '0')}`;
  }, []);

  const prepareActivityData = useCallback((data: FormValues) => {
    const customerName = CUSTOMER_OPTIONS.find(c => c.value === data.customerId)?.label || '';
    // Get unique categories from products
    const categoryValues = Array.from(new Set(data.products.map(p => p.productCategory)));
    const categoryLabels = categoryValues.map(
      cat => PRODUCT_CATEGORY_OPTIONS.find(c => c.label === cat)?.label || cat
    );

    // Keep existing serial number for edit mode, generate new one for add mode
    const serialNumber = isEditMode && editingActivity
      ? editingActivity.serialNumber
      : generateSerialNumber(existingActivitiesCount);

    return {
      id: isEditMode && editingActivity ? editingActivity.id : existingActivitiesCount + 1,
      serialNumber,
      customerName,
      customerId: data.customerId,
      activityStatus: data.activityStatus,
      auditMonth: data.auditMonth,
      productCategories: categoryLabels,
      productCategoryValues: categoryValues,
      totalProducts: data.products.length,
      products: data.products,
      jobDetails: {
        jobsPerMonth: parseInt(data.jobsPerMonth) || 0,
        metallicShadesJobs: parseInt(data.metallicShadesJobs) || 0,
        totalPanelPerMonth: parseInt(data.totalPanelPerMonth) || 0,
        panelsPerMonth: parseInt(data.panelsPerMonth) || 0,
      },
      createdAt: isEditMode && editingActivity ? editingActivity.createdAt : new Date().toLocaleString(),
    };
  }, [existingActivitiesCount, isEditMode, editingActivity, generateSerialNumber]);

  const handleSave = useCallback(async (data: FormValues) => {
    setIsSaving(true);
    try {
      const activityData = prepareActivityData(data);
      enqueueSnackbar(isEditMode ? 'Activity updated successfully' : 'Activity saved successfully', { variant: 'success' });
      onSave(activityData);
      handleFormReset();
    } catch (error) {
      enqueueSnackbar('Failed to save activity', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [prepareActivityData, onSave, enqueueSnackbar, handleFormReset, isEditMode]);

  const handleSaveAndAddNewClick = useCallback(async (data: FormValues) => {
    setIsSaving(true);
    try {
      const activityData = prepareActivityData(data);
      enqueueSnackbar('Activity saved successfully. You can add another.', { variant: 'success' });
      onSaveAndAddNew(activityData);
      handleFormReset();
    } catch (error) {
      enqueueSnackbar('Failed to save activity', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [prepareActivityData, onSaveAndAddNew, enqueueSnackbar, handleFormReset]);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      handleFormReset();
      onClose();
    }
  }, [isDirty, onClose, handleFormReset]);

  const handleConfirmCancel = useCallback(() => {
    setShowCancelConfirm(false);
    handleFormReset();
    onClose();
  }, [onClose, handleFormReset]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      handleFormReset();
      isInitialLoadRef.current = true;
    }
  }, [open, handleFormReset]);

  const modalTitle = isEditMode ? 'Edit Demo Activity' : 'Add New Demo Activity';

  return (
    <>
      <TwinModal
        open={open}
        onClose={() => { }} // Prevent closing on outside click
        closeOnOutsideClick={false}
        mainHeightClassName="h-auto max-h-[90vh]"
        allowBorder={true}
        modalClassName="max-w-[800px]"
        header={modalTitle}
        footer={
          <>
            <CancelButton onClick={handleCancel} disabled={isSaving} />
            <SaveButton
              onClick={handleSubmit(handleSave)}
              loading={isSaving}
              disabled={isSaving}
            />
            {!isEditMode && (
              <SaveButton
                onClick={handleSubmit(handleSaveAndAddNewClick)}
                loading={isSaving}
                disabled={isSaving}
                label="Save & Add New"
                loadingLabel="Saving..."
              />
            )}
          </>
        }
      >
        <Form onSubmit={handleSubmit(handleSave)} spaceY={4}>

          {/* Select Customer */}
          <FormField label="Select Customer" required>
            <Select
              name="customerId"
              control={control}
              options={CUSTOMER_OPTIONS}
              placeholder="Select"
              validationRules={{
                required: 'Customer is required',
              }}
            />
          </FormField>



          {/* Audit Month */}
          <FormField label="Audit Month">
            <DateInput
              name="auditMonth"
              control={control}
              placeholder="YYYY-MM-DD"
            />
          </FormField>

          {/* Stock Audit Section */}
          <div className="mt-4 flex flex-col">
            <div className='block text-sm font-medium text-gray-700 pb-[16px]'>Stock Audit</div>

            {/* Product Filters Row - Multi-select filters for visibility only (not saved) */}
            <div className="flex gap-4 mb-4">
              {/* Product Category Filter - Empty = Select All */}
              <div className="w-[33%]">
                <label className="block text-xs font-medium text-gray-600 mb-1">Product Category</label>
                <MultiSelect
                  name="filterCategories"
                  control={control}
                  options={allCategoryOptions}
                  placeholder="Select All"
                  showSelectAll={false}
                />
              </div>

              {/* Product Filter - Filtered by Category (hierarchy) */}
              <div className="w-[33%]">
                <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
                <MultiSelect
                  name="filterProducts"
                  control={control}
                  options={filteredProductOptions}
                  placeholder="Select All"
                  showSelectAll={false}
                />
              </div>

              {/* Pack Size Filter - Filtered by Category AND Product (hierarchy) */}
              <div className="w-[33%]">
                <label className="block text-xs font-medium text-gray-600 mb-1">Pack Size</label>
                <MultiSelect
                  name="filterPackSizes"
                  control={control}
                  options={filteredPackSizeOptions}
                  placeholder="Select All"
                  showSelectAll={false}
                />
              </div>
            </div>

            {/* Products Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Single scrollable container for both horizontal and vertical scroll */}
                <div
                  className="overflow-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:transition-colors"
                  style={{ maxHeight: '324px' }} /* Header (~54px) + 5 rows (5 * 54px = 270px) = 324px */
                >
                  <table className="table-fixed" style={{ width: '1500px' }}>
                    <colgroup>
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '150px' }} />
                      <col style={{ width: '150px' }} />
                    </colgroup>
                    <thead className="bg-white sticky top-0 z-10 border-b">
                      <tr>
                        <th className="p-2 text-left text-xs font-medium text-gray-600 align-middle bg-white border-b border-gray-200">
                          Product Category
                        </th>
                        <th className="p-2 text-left text-xs font-medium text-gray-600 align-middle bg-white border-b border-gray-200">
                          SKU Code
                        </th>
                        <th className="p-2 text-left text-xs font-medium text-gray-600 align-middle bg-white border-b border-gray-200">
                          Product Description
                        </th>
                        <th className="p-2 text-left text-xs font-medium text-gray-600 align-middle bg-white border-b border-gray-200">
                          Popular Code
                        </th>
                        <th className="p-2 text-left text-xs font-medium text-gray-600 align-middle bg-white border-b border-gray-200">
                          Pack Size
                        </th>
                        <th className="p-2 text-left text-xs font-medium text-gray-600 align-middle bg-white border-b border-gray-200">
                          Opening Stock (Material Wt. with Tin & Lid (in g))
                        </th>
                        <th className="p-2 text-left text-xs font-medium text-gray-600 align-middle bg-white border-b border-gray-200">
                          Opening Stock (Sealed pack in units)
                        </th>
                        <th className="p-2 text-left text-xs font-medium text-gray-600 align-middle bg-white border-b border-gray-200">
                          Units Purchased
                        </th>
                        <th className="p-2 text-left text-xs font-medium text-gray-600 align-middle bg-white border-b border-gray-200">
                          Closing Stock (Material Wt. with Tin & Lid (in g))
                        </th>
                        <th className="p-2 text-left text-xs font-medium text-gray-600 align-middle bg-white border-b border-gray-200">
                          Closing Stock (Sealed pack in units)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => (
                          getVisibleFieldIndices[index] && <tr
                            key={field.id}
                            className="border-b border-gray-100 last:border-b-0"
                          >
                            <td className="p-2 h-[54px] text-xs text-gray-700 truncate overflow-hidden" title={field.productCategory}>
                              {field.productCategory}
                            </td>
                            <td className="p-2 h-[54px] text-xs text-gray-700 truncate overflow-hidden" title={field.skuCode}>
                              {field.skuCode}
                            </td>
                            <td className="p-2 h-[54px] text-xs text-gray-700 truncate overflow-hidden" title={field.productDescription}>
                              {field.productDescription}
                            </td>
                            <td className="p-2 h-[54px] text-xs text-gray-700 truncate overflow-hidden" title={field.popularCode}>
                              {field.popularCode}
                            </td>
                            <td className="p-2 h-[54px] text-xs text-gray-700 truncate overflow-hidden" title={String(field.packSize)}>
                              {field.packSize}
                            </td>
                            <td className="p-2 h-[54px]">
                              <input
                                type="text"
                                inputMode="numeric"
                                {...control.register(`products.${index}.openingStockMaterialWt`)}
                                className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-1 text-xs focus:outline-none focus:border-blue-500"
                                placeholder="Enter value"
                                onKeyDown={(e) => {
                                  if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                              />
                            </td>
                            <td className="p-2 h-[54px]">
                              <input
                                type="text"
                                inputMode="numeric"
                                {...control.register(`products.${index}.openingStockSealedPack`)}
                                className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-1 text-xs focus:outline-none focus:border-blue-500"
                                placeholder="Enter value"
                                onKeyDown={(e) => {
                                  if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                              />
                            </td>
                            <td className="p-2 h-[54px]">
                              <input
                                type="text"
                                inputMode="numeric"
                                {...control.register(`products.${index}.unitsPurchased`)}
                                className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-1 text-xs focus:outline-none focus:border-blue-500"
                                placeholder="Enter value"
                                onKeyDown={(e) => {
                                  if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                              />
                            </td>
                            <td className="p-2 h-[54px]">
                              <input
                                type="text"
                                inputMode="numeric"
                                {...control.register(`products.${index}.closingStockMaterialWt`)}
                                className="w-full border-0 border-b border-gray-300 bg-transparent px-1 py-1 text-xs focus:outline-none focus:border-blue-500"
                                placeholder="Enter value"
                                onKeyDown={(e) => {
                                  if (!/[0-9.]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                              />
                            </td>
                            <td className="p-2 h-[54px]">
                              <ClosingStockInput
                                control={control}
                                index={index}
                              />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>


          {/* Job Details */}
          <FormField inputColSpan={12}>
            <DisplayText
              className='flex items-center h-[54px]'
              label='Job Details'
              variant="header"
            />
          </FormField>

          {/* No. of Jobs Per Month */}
          <FormField label="No. of Jobs Per Month">
            <NumericInput
              name="jobsPerMonth"
              control={control}
              placeholder="Type..."
              maxLength={10}
            />
          </FormField>

          {/* No. of Metallic Shades Jobs */}
          <FormField label="No. of Metallic Shades Jobs">
            <NumericInput
              name="metallicShadesJobs"
              control={control}
              placeholder="Type..."
              maxLength={10}
            />
          </FormField>

          {/* Total Panel Per Month */}
          <FormField label="Total Panel Per Month">
            <NumericInput
              name="totalPanelPerMonth"
              control={control}
              placeholder="Type..."
              maxLength={10}
            />
          </FormField>

          {/* No. Of Panel Per Month */}
          <FormField label="No. Of Panel Per Month">
            <NumericInput
              name="panelsPerMonth"
              control={control}
              placeholder="Type..."
              maxLength={10}
            />
          </FormField>

          {/* Activity Status */}
          <FormField label="Status" required>
            <Select
              name="activityStatus"
              control={control}
              options={ACTIVITY_STATUS_OPTIONS}
              placeholder="Select status"
              validationRules={{
                required: 'Activity status is required',
              }}
            />
          </FormField>
        </Form>
      </TwinModal>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog
        open={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        title="Unsaved Changes"
        titleIcon="warning"
        message="You have unsaved changes. Are you sure you want to discard them?"
        buttons={[
          {
            label: 'Stay',
            onClick: () => setShowCancelConfirm(false),
            variant: 'secondary',
          },
          {
            label: 'Discard',
            onClick: handleConfirmCancel,
            variant: 'danger',
          },
        ]}
        closeOnBackdropClick={false}
      />
    </>
  );
};

export default DemoActivityModal;
