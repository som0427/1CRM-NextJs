import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useSnackbar } from 'notistack';
import Form from '@/components/common/Form';
import FormField from '@/components/common/input-fields/FormField';
import TextInput from '@/components/common/input-fields/TextInput';
import Select from '@/components/common/input-fields/Select';
import MultiSelect from '@/components/common/input-fields/MultiSelect';
import CheckboxInput from '@/components/common/input-fields/CheckboxInput';
import CancelButton from '../common/buttons/CancelButton';
import SaveButton from '../common/buttons/SaveButton';
import productFormService from '@/lib/services/productFormService';

interface ProductFormSettingsProps {
  productFormId: number;
  projectId: number;
  onCancel?: () => void;
  onSaveSuccess?: () => void;
}

interface EntityField {
  id: number;
  attributeName: string;
  attributeType: { id: number };
  systemAttribute?: { id: number } | null;
  status?: number;
}

interface ProductFormSettingsValues {
  name: string;
  productFormView: string;
  summaryFieldsForApp: string[];
  summaryTotalField: string;
  allowDiscount: boolean;
  discountType: string[];
  serialKey: string;
  status: string;
}

const PRODUCT_FORM_VIEW_OPTIONS = [
  { value: '1', label: 'Show All' },
  { value: '2', label: 'Add one at a time' },
];

const DISCOUNT_TYPE_OPTIONS = [
  { value: '0', label: 'Value' },
  { value: '1', label: 'Percentage' },
];

const STATUS_OPTIONS = [
  { value: '1', label: 'Active' },
  { value: '0', label: 'Inactive' },
];

const PRODUCT_FIELD_SYSTEM_ATTRIBUTE_ID = 48;

const ProductFormSettings: React.FC<ProductFormSettingsProps> = ({
  productFormId,
  projectId,
  onCancel,
  onSaveSuccess
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [settingId, setSettingId] = useState<number | undefined>();
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [entityFieldList, setEntityFieldList] = useState<EntityField[]>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, errors }
  } = useForm<ProductFormSettingsValues>({
    defaultValues: {
      name: '',
      productFormView: '',
      summaryFieldsForApp: [],
      summaryTotalField: '-1',
      allowDiscount: false,
      discountType: [],
      serialKey: '',
      status: '1'
    }
  });

  const watchedSummaryFields = watch('summaryFieldsForApp');
  const watchedSummaryTotalField = watch('summaryTotalField');
  const watchedAllowDiscount = watch('allowDiscount');

  // Fetch entity fields for the product form
  const fetchEntityFields = useCallback(async () => {
    if (!productFormId) return;
    
    setIsLoadingFields(true);
    try {
      const response = await productFormService.getProductFormFields(projectId, String(productFormId));
      if (response?.statusCode === 200 && response?.responseData) {
        const fields = Array.isArray(response.responseData) 
          ? response.responseData 
          : (response.responseData?.data || []);
        
        // Filter only active fields (status === 1)
        const activeFields = fields.filter((f: any) => f.status === 1 || f.isActive === 1);
        
        const mappedFields: EntityField[] = activeFields.map((f: any) => ({
          id: f.attributeId ?? f.id,
          attributeName: f.attributeName ?? f.combinedAttributeName ?? '',
          attributeType: f.attributeType ?? { id: f.attributeTypeId },
          systemAttribute: f.systemAttribute ?? null,
          status: f.status ?? f.isActive ?? 1
        }));
        
        setEntityFieldList(mappedFields);
      }
    } catch (error) {
      console.error('Failed to fetch entity fields:', error);
    } finally {
      setIsLoadingFields(false);
    }
  }, [productFormId, projectId]);

  // Summary field options for multi-select (exclude product field with systemAttribute.id === 48)
  const summaryFieldOptions = useMemo(() => {
    return entityFieldList.map(field => ({
      value: String(field.id),
      label: field.attributeName,
      disabled: field.systemAttribute?.id === PRODUCT_FIELD_SYSTEM_ATTRIBUTE_ID
    }));
  }, [entityFieldList]);

  // Summary total field options - filtered from selected summary fields, only numeric (7) and calculated (14) types
  const summaryTotalFieldOptions = useMemo(() => {
    const selectedFieldIds = watchedSummaryFields.map(id => Number(id));
    const selectedFields = entityFieldList.filter(f => selectedFieldIds.includes(f.id));
    const numericOrCalculatedFields = selectedFields.filter(f => [7, 14].includes(f.attributeType?.id));
    
    return [
      { value: '-1', label: 'Select' },
      ...numericOrCalculatedFields.map(field => ({
        value: String(field.id),
        label: field.attributeName
      }))
    ];
  }, [entityFieldList, watchedSummaryFields]);

  // Disable allow discount if no summary total field is selected
  const isAllowDiscountDisabled = useMemo(() => {
    return !watchedSummaryTotalField || watchedSummaryTotalField === '-1' || watchedSummaryTotalField === '';
  }, [watchedSummaryTotalField]);

  // Reset allow discount when summary total field is cleared
  useEffect(() => {
    if (isAllowDiscountDisabled && watchedAllowDiscount) {
      setValue('allowDiscount', false);
      setValue('discountType', []);
    }
  }, [isAllowDiscountDisabled, watchedAllowDiscount, setValue]);

  // Reset summary total field if it's no longer in the available options
  useEffect(() => {
    if (watchedSummaryTotalField && watchedSummaryTotalField !== '-1') {
      const isStillValid = summaryTotalFieldOptions.some(opt => opt.value === watchedSummaryTotalField);
      if (!isStillValid) {
        setValue('summaryTotalField', '-1');
      }
    }
  }, [summaryTotalFieldOptions, watchedSummaryTotalField, setValue]);

  const fetchSettings = useCallback(async () => {
    if (!productFormId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await productFormService.getProductFormSetting(productFormId);
      if (response?.statusCode === 200 && response?.responseData) {
        const data = response.responseData;
        
        const summaryFieldsForApp = Array.isArray(data.summaryFieldsForApp) 
          ? data.summaryFieldsForApp.map(String) 
          : [];
        
        // Check if summaryTotalField exists in summaryFieldsForApp
        const summaryTotalFieldValue = summaryFieldsForApp.includes(String(data.summaryTotalField))
          ? String(data.summaryTotalField)
          : '-1';
        
        reset({
          name: data.name || '',
          productFormView: String(data.productFormView || ''),
          summaryFieldsForApp,
          summaryTotalField: summaryTotalFieldValue,
          allowDiscount: data.allowDiscounts === 1,
          discountType: Array.isArray(data.discountType) ? data.discountType.map(String) : [],
          serialKey: data.serialKey || '',
          status: String(data.isActive ?? 1)
        });

        setSettingId(data.id);
        setDisplayOrder(data.displayOrder || 1);
      }
    } catch {
      enqueueSnackbar('Failed to load settings', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [productFormId, reset, enqueueSnackbar]);

  useEffect(() => {
    fetchEntityFields();
  }, [fetchEntityFields]);

  useEffect(() => {
    if (!isLoadingFields && entityFieldList.length > 0) {
      fetchSettings();
    }
  }, [isLoadingFields, entityFieldList.length, fetchSettings]);

  // Handle summary fields selection - max 3 fields
  const handleSummaryFieldsChange = useCallback((newValues: string[]) => {
    if (newValues.length > 3) {
      // Find the product field if it exists in the selection
      const productFieldId = entityFieldList.find(f => f.systemAttribute?.id === PRODUCT_FIELD_SYSTEM_ATTRIBUTE_ID)?.id;
      const productFieldValue = productFieldId ? String(productFieldId) : null;
      
      // Reset to just the product field if it exists, otherwise empty
      setValue('summaryFieldsForApp', productFieldValue ? [productFieldValue] : []);
      enqueueSnackbar('You can select up to 3 fields only', { variant: 'warning' });
    }
  }, [entityFieldList, setValue, enqueueSnackbar]);

  const onSubmit = useCallback(
    async (values: ProductFormSettingsValues) => {
      try {
        const discountTypePayload = values.allowDiscount ? values.discountType.map(Number) : [];
        
        const payload = {
          id: settingId,
          name: values.name.trim(),
          serialKey: values.serialKey.trim(),
          projectId,
          productFormView: Number(values.productFormView) || 1,
          summaryFieldsForApp: values.summaryFieldsForApp.map(Number),
          summaryTotalField: values.summaryTotalField === '-1' ? null : Number(values.summaryTotalField),
          allowDiscounts: values.allowDiscount ? 1 : 0,
          discountType: discountTypePayload,
          isActive: Number(values.status),
          displayOrder
        };

        const response = await productFormService.saveProductFormSetting(payload);
        
        if (response?.statusCode === 200) {
          enqueueSnackbar('Settings saved successfully', { variant: 'success' });
          onSaveSuccess?.();
        } else {
          enqueueSnackbar(response?.message || 'Failed to save settings', { variant: 'error' });
        }
      } catch {
        enqueueSnackbar('Failed to save settings', { variant: 'error' });
      }
    },
    [settingId, projectId, displayOrder, enqueueSnackbar, onSaveSuccess]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm w-full">
        <div className="p-6">
          <Form onSubmit={handleSubmit(onSubmit)} spaceY={4}>
            {/* Form Name */}
            <FormField label="Form Name" required>
              <TextInput
                name="name"
                control={control}
                placeholder="Product Form"
                maxLength={500}
                showCharacterCount
                validationRules={{
                  required: 'Form Name is required',
                  validate: (value: string) => value?.trim().length > 0 || 'Form Name is required'
                }}
              />
            </FormField>

            {/* Product Form View */}
            <FormField label="Product Form View">
              <Select
                name="productFormView"
                control={control}
                options={PRODUCT_FORM_VIEW_OPTIONS}
                placeholder="Select form view"
                hint="Select form view for user"
              />
            </FormField>

            {/* Summary Fields For App - Multi-select with max 3 */}
            <FormField label="Summary Fields For App">
              <MultiSelect
                name="summaryFieldsForApp"
                control={control}
                options={summaryFieldOptions}
                placeholder="Select up to 3 fields"
                hint="Select up to 3 fields to be displayed as summary"
                showSelectAll={false}
                onChange={handleSummaryFieldsChange}
              />
            </FormField>

            {/* Summary Total Field */}
            <FormField label="Summary Total Field">
              <Select
                name="summaryTotalField"
                control={control}
                options={summaryTotalFieldOptions}
                placeholder="Select"
                hint="Select field for showing total value, blank defaults to no summary field"
              />
            </FormField>

            {/* Allow Discount At Summary Level */}
            <FormField label="Allow Discount at Summary Level">
              <div className="flex flex-col gap-1">
                <CheckboxInput
                  name="allowDiscount"
                  control={control}
                  label="Yes"
                  disabled={isAllowDiscountDisabled}
                />
                <span className="text-xs text-gray-500">
                  Tick this if you want to enable discount at summary level during addition
                </span>
              </div>
            </FormField>

            {/* Discount Type - Only shown when allowDiscount is true */}
            {watchedAllowDiscount && (
              <FormField label="Discount Type">
                <MultiSelect
                  name="discountType"
                  control={control}
                  options={DISCOUNT_TYPE_OPTIONS}
                  placeholder="Select discount type"
                  hint="Select applicable discount type"
                  validationRules={{
                    required: watchedAllowDiscount ? 'Discount Type is required' : false
                  }}
                />
              </FormField>
            )}

            {/* Key - Always disabled/locked */}
            <FormField label="Key" required>
              <TextInput
                name="serialKey"
                control={control}
                placeholder="Enter Key"
                maxLength={5}
                showCharacterCount
                disabled={true}
              />
            </FormField>

            {/* Status */}
            <FormField label="Status">
              <Select
                name="status"
                control={control}
                options={STATUS_OPTIONS}
                placeholder="Select status"
              />
            </FormField>
          </Form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <CancelButton onClick={onCancel} disabled={isSubmitting} />
          <SaveButton
            onClick={handleSubmit(onSubmit)}
            loading={isSubmitting}
            disabled={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductFormSettings;
