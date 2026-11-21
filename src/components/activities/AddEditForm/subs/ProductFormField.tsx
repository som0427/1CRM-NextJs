import React, { FC, useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { Control, useFieldArray, useWatch, useFormState, FieldErrors } from 'react-hook-form';
import Select from '../../../common/input-fields/Select';
import MultiSelect from '../../../common/input-fields/MultiSelect';
import TextInput from '../../../common/input-fields/TextInput';
import TextArea from '../../../common/input-fields/TextArea';
import DateInput from '../../../common/input-fields/DateInput';
import DateTimeInput from '../../../common/input-fields/DateTimeInput';
import TimeInput from '../../../common/input-fields/TimeInput';
import RadioInput from '../../../common/input-fields/RadioInput';
import UploadInput from '../../../common/input-fields/UploadInput';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import { CustomAttributePreDefLookupEnum } from '@/lib/constants/CustomAttributePreDefLookupEnum';

// Interface for product form row data from API response
interface ProductFormRowData {
  formMasterId: number;
  serialNumber: string;
  value: Array<{ id: number; name: string }>;
}

interface ProductFormFieldProps {
  name: string;
  control: Control<any>;
  field: any;
  productList: any[];
  productFormConfig: any;
  productFormFieldsList?: any[]; // Product form fields from formDataPreloader
  attributeId?: number; // The attribute ID of the product form field
  combinedAttributeName?: string; // The combined attribute name
  onRowChange?: (rowIndex: number, rowData: any) => void;
  disabled?: boolean;
  setValue?: (name: string, value: any) => void;
  getValues?: (name?: string) => any;
  moduleType?: number; // Module type for file upload
  projectId?: number; // Project ID for file upload
  onUploadingChange?: (isUploading: boolean) => void; // Callback when file upload state changes
  onDiscountChange?: (discountAmount: number, discountPercent: number) => void; // Callback when discount values change
  parentMandatoryFlag?: boolean; // If parent field is non-mandatory, product form fields should also be non-mandatory
  initialProductFormData?: ProductFormRowData[]; // Initial product form data for edit mode
  initialDiscountData?: any; // Initial discount data for edit mode (API may return different property names)
}

// Interface for numeric data tracking (similar to Angular)
interface NumericFieldData {
  attributeId: number;
  attributeName: string;
  combinedAttributeName: string;
  value: number | null;
}

const ProductFormField: FC<ProductFormFieldProps> = ({
  name,
  control,
  field,
  productList,
  productFormConfig,
  productFormFieldsList = [],
  attributeId,
  combinedAttributeName,
  onRowChange,
  disabled = false,
  setValue,
  getValues,
  moduleType,
  projectId,
  onUploadingChange,
  onDiscountChange,
  parentMandatoryFlag = true, // Default to true (mandatory) if not provided
  initialProductFormData,
  initialDiscountData,
}) => {
  const { fields: rows, append, remove, replace } = useFieldArray({
    control,
    name,
  });

  // Get form errors for validation display
  const { errors } = useFormState({ control });

  // State for summary calculations
  const [summaryValues, setSummaryValues] = useState({
    subTotal: 0,
    discountAmount: 0,
    discountPercent: 0,
  });

  // Track numeric data for each row (similar to Angular's numericData)
  const numericDataRef = useRef<{ [rowIndex: number]: { [attributeId: number]: NumericFieldData } }>({});
  const enteredNumericFieldsRef = useRef<{ [rowIndex: number]: number }>({});
  
  // Use refs to track discount values to avoid infinite loop in calculateSummaryFields
  const discountAmountRef = useRef(0);
  const discountPercentRef = useRef(0);
  
  // Track if summary values have been initialized in edit mode to prevent reset
  const summaryInitializedRef = useRef(false);
  const initialSubTotalRef = useRef(0);

  // Watch all rows for changes
  const watchedRowsRaw = useWatch({
    control,
    name,
  });
  // Ensure watchedRows is always an array
  const watchedRows = Array.isArray(watchedRowsRaw) ? watchedRowsRaw : [];

  // Use full product list (no filtering) - disabled flag on Select options handles selectability
  const filteredProductList = useMemo(() => productList, [productList]);

  // For productFormView=1 (auto-add rows), only add rows for products in productIdList
  const allowedProductList = useMemo(() => {
    const productIdList = productFormConfig?.productIdList;
    if (!productIdList || !Array.isArray(productIdList)) {
      return productList;
    }
    return productList.filter((product: any) => {
      const productId = product.productId || product.id;
      return productIdList.includes(productId) || productIdList.includes(Number(productId));
    });
  }, [productList, productFormConfig?.productIdList]);

  // Get field definitions from the product form - use productFormFieldsList from parent (formDataPreloader)
  // Falls back to field.childAttributeList for backward compatibility
  const productFormFields = useMemo(() => {
    const fieldsList = productFormFieldsList.length > 0 ? productFormFieldsList : (field.childAttributeList || []);
    return fieldsList
      .filter((f: any) => f.isActive === 1)
      .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }, [productFormFieldsList, field.childAttributeList]);

  // Find specific field by system attribute ID
  const findFieldBySystemAttr = useCallback((systemAttrId: number) => {
    return productFormFields.find((f: any) => f.systemAttribute?.id === systemAttrId);
  }, [productFormFields]);

  // Get special fields for product form
  const listPriceField = useMemo(() => findFieldBySystemAttr(SystemAttributeEnum.PRODUCT_FORM_LIST_PRICE), [findFieldBySystemAttr]);

  // Find the summary/total field based on config's summaryTotalField
  // Only use if summaryTotalField is a valid attribute ID (not null, not -1)
  const summaryField = useMemo(() => {
    const summaryTotalFieldId = productFormConfig?.summaryTotalField;
    
    // Check if summaryTotalField is valid (not null, not undefined, not -1)
    if (summaryTotalFieldId === null || summaryTotalFieldId === undefined || summaryTotalFieldId === -1) {
      return null;
    }
    
    // Find the field by the configured attribute ID
    const configuredField = productFormFields.find((f: any) => f.id === summaryTotalFieldId);
    if (configuredField) {
      return configuredField;
    }
        return null;
  }, [productFormFields, productFormConfig]);

  // Build a map of field IDs to their dependent calculated fields
  // This extracts field IDs from calculatedExpression like "{56939}*{56940}" 
  // and maps each field ID to the calculated fields that depend on it
  const calculatedFieldDependencyMap = useMemo(() => {
    const dependencyMap = new Map<number, any[]>(); // fieldId -> array of calculated fields that depend on it
    
    const calculatedFields = productFormFields.filter((pf: any) => 
      pf.attributeType?.id === CustomAttributeTypeEnum.CALCULATED_FIELD
    );

    calculatedFields.forEach((calcField: any) => {
      const expression = calcField.calculationExpression;
      if (expression) {
        // Extract field IDs from expression like "{56939}*{56940}"
        const fieldIdMatches = expression.match(/\{(\d+)\}/g);
        if (fieldIdMatches) {
          fieldIdMatches.forEach((match: string) => {
            const fieldId = parseInt(match.replace(/[{}]/g, ''));
            if (!dependencyMap.has(fieldId)) {
              dependencyMap.set(fieldId, []);
            }
            // Add this calculated field to the list of fields that depend on fieldId
            const existingCalcFields = dependencyMap.get(fieldId)!;
            if (!existingCalcFields.find(cf => cf.id === calcField.id)) {
              existingCalcFields.push(calcField);
            }
          });
        }
      }
    });

    return dependencyMap;
  }, [productFormFields]);

  // Set of field IDs that are part of any calculated expression
  // Only these fields need onChange handler for calculations
  const fieldsInCalculatedExpressions = useMemo(() => {
    const fieldIds = new Set<number>();
    calculatedFieldDependencyMap.forEach((_, fieldId) => {
      fieldIds.add(fieldId);
    });
    return fieldIds;
  }, [calculatedFieldDependencyMap]);

  // Check if a field is part of any calculated expression
  const isFieldInCalculatedExpression = useCallback((fieldId: number) => {
    return fieldsInCalculatedExpressions.has(fieldId);
  }, [fieldsInCalculatedExpressions]);


  // Get field key for form field name
  const getFieldKey = useCallback((pf: any) => {
    return pf.combinedAttributeName || pf.attributeName?.replace(/[^a-zA-Z0-9]/g, '') || `field_${pf.id}`;
  }, []);

  // Check if field is List Price field (systemAttribute=50) - auto-populated from product, non-editable
  const isListPriceField = useCallback((pf: any) => {
    return pf.systemAttribute?.id === SystemAttributeEnum.PRODUCT_FORM_LIST_PRICE;
  }, []);

  // Date format utility (matching AddForm)
  const formatDate = useCallback((date: Date | string | null): string => {
    if (!date) return '';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Process date field to get min/max dates and validation rules (matching AddForm's processDateField)
  const processDateField = useCallback((field: any) => {
    const validationRules: any = {};
    const now = new Date();
    let minDate: string | null = null;
    let maxDate: string | null = null;

    if (field.dateAttributes) {
      const attr = field.dateAttributes;
      const stdLookup = attr.stdLookupAttribute?.id;

      if (stdLookup != null) {
        // Predefined lookups
        if ([CustomAttributePreDefLookupEnum.TODAY, CustomAttributePreDefLookupEnum.TODAY_DT].includes(stdLookup)) {
          minDate = formatDate(now);
          maxDate = formatDate(now);
        } else if ([CustomAttributePreDefLookupEnum.YESTERDAY, CustomAttributePreDefLookupEnum.YESTERDAY_DT].includes(stdLookup)) {
          const yest = new Date(now);
          yest.setDate(yest.getDate() - 1);
          minDate = formatDate(yest);
          maxDate = formatDate(yest);
        } else if ([CustomAttributePreDefLookupEnum.CURRENT_WEEK, CustomAttributePreDefLookupEnum.CURRENT_WEEK_DT].includes(stdLookup)) {
          const firstDay = new Date(now);
          firstDay.setDate(now.getDate() - now.getDay());
          const lastDay = new Date(now);
          lastDay.setDate(now.getDate() - now.getDay() + 6);
          minDate = formatDate(firstDay);
          maxDate = formatDate(lastDay);
        } else if ([CustomAttributePreDefLookupEnum.CURRENT_MONTH_TILL_DATE, CustomAttributePreDefLookupEnum.CURRENT_MONTH_TILL_DATE_DT].includes(stdLookup)) {
          minDate = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
          maxDate = formatDate(now);
        } else if ([CustomAttributePreDefLookupEnum.CURRENT_MONTH, CustomAttributePreDefLookupEnum.CURRENT_MONTH_DT].includes(stdLookup)) {
          minDate = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
          maxDate = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        } else if ([CustomAttributePreDefLookupEnum.CURRENT_YEAR_TILL_DATE, CustomAttributePreDefLookupEnum.CURRENT_YEAR_TILL_DATE_DT].includes(stdLookup)) {
          minDate = formatDate(new Date(now.getFullYear(), 0, 1));
          maxDate = formatDate(now);
        } else if ([CustomAttributePreDefLookupEnum.CURRENT_YEAR, CustomAttributePreDefLookupEnum.CURRENT_YEAR_DT].includes(stdLookup)) {
          minDate = formatDate(new Date(now.getFullYear(), 0, 1));
          maxDate = formatDate(new Date(now.getFullYear(), 11, 31));
        }
      } else {
        // Custom allowed range
        if (attr.previousDateAllowed == null && attr.futureDateAllowed == null) {
          minDate = null;
          maxDate = null;
        } else {
          if (attr.previousDateAllowed != null) {
            const min = new Date(now);
            min.setDate(now.getDate() - attr.previousDateAllowed);
            minDate = formatDate(min);
          }
          if (attr.futureDateAllowed != null) {
            const max = new Date(now);
            max.setDate(now.getDate() + attr.futureDateAllowed);
            maxDate = formatDate(max);
          }
        }
      }

      // For DATE_TIME fields, append "T00:00:00"
      if (field.attributeType?.id === CustomAttributeTypeEnum.DATE_TIME) {
        if (minDate) minDate = `${minDate}T00:00:00`;
        if (maxDate) maxDate = `${maxDate}T00:00:00`;
      }
    }

    // Validation for min/max
    if (minDate) {
      validationRules.validate = {
        ...validationRules.validate,
        minDate: (value: any) =>
          !value ||
          value >= minDate ||
          `Date must be after ${minDate.split('T')[0]}`,
      };
    }
    if (maxDate) {
      validationRules.validate = {
        ...validationRules.validate,
        maxDate: (value: any) =>
          !value ||
          value <= maxDate ||
          `Date must be before ${maxDate.split('T')[0]}`,
      };
    }

    return {
      validationRules,
      minDate,
      maxDate,
    };
  }, [formatDate]);

  // Build validation rules for a field based on mandatoryFlag and field type (matching AddForm logic)
  const getValidationRules = useCallback((pf: any) => {
    const rules: any = {};
    const attributeTypeId = pf.attributeType?.id;
    
    // Skip validation for calculated fields, list price (auto-populated), and non-editable fields
    if (attributeTypeId === CustomAttributeTypeEnum.CALCULATED_FIELD ||
        pf.systemAttribute?.id === SystemAttributeEnum.PRODUCT_FORM_LIST_PRICE) {
      return rules;
    }
    
    // Required validation based on mandatoryFlag
    // If parent field is non-mandatory (parentMandatoryFlag === false), product form fields should also be non-mandatory
    if (pf.mandatoryFlag === 1 && parentMandatoryFlag) {
      // Use custom validate function to properly handle arrays and different value types
      rules.validate = {
        ...rules.validate,
        required: (value: any) => {
          // Handle arrays (for file uploads, multi-select, etc.)
          if (Array.isArray(value)) {
            return value.length > 0 || (pf.requiredErrorMsg || 'This field is required');
          }
          // Handle null/undefined/empty string
          if (value === null || value === undefined || value === '') {
            return pf.requiredErrorMsg || 'This field is required';
          }
          return true;
        }
      };
    }
    
    // Numeric field validations (matching AddForm's getNumericValidationRules)
    if (attributeTypeId === CustomAttributeTypeEnum.NUMERIC) {
      const systemAttribLength = pf.systemAttribute ? Object.keys(pf.systemAttribute).length : 0;
      const isSystemAttrib = systemAttribLength > 0;
      const numericPattern = /^[0-9]+$/;
      const decimalPattern = /^\d+(\.\d+)?$/;
      const systemAttribNumericPattern = /^[0-9]+$/;
      const systemAttribDecimalPattern = /^\d+(\.\d+)?$/;

      const pattern = pf.decimalFlag
        ? (isSystemAttrib ? systemAttribDecimalPattern : decimalPattern)
        : (isSystemAttrib ? systemAttribNumericPattern : numericPattern);

      rules.pattern = {
        value: pattern,
        message: pf.patternErrorMsg || (pf.decimalFlag ? 'Please enter a valid decimal number' : 'Please enter a valid number')
      };

      // Min/Max number validation
      if (pf.minNumber !== undefined && pf.minNumber !== null) {
        rules.min = {
          value: pf.minNumber,
          message: `Minimum value allowed is ${pf.minNumber}`
        };
      }
      if (pf.maxNumber !== undefined && pf.maxNumber !== null) {
        rules.max = {
          value: pf.maxNumber,
          message: `Maximum value allowed is ${pf.maxNumber}`
        };
      }

      // Min/Max digits validation
      if (pf.minDigits !== undefined && pf.minDigits !== null) {
        rules.minLength = {
          value: pf.minDigits,
          message: `Minimum ${pf.minDigits} digits required`
        };
      }
      if (pf.maxDigits !== undefined && pf.maxDigits !== null) {
        rules.maxLength = {
          value: pf.maxDigits,
          message: `Maximum ${pf.maxDigits} digits allowed`
        };
      }

      // Custom regex validation (overrides default pattern)
      if (!pf.decimalFlag && pf.addValidation && pf.regexExpression) {
        rules.pattern = {
          value: new RegExp(pf.regexExpression),
          message: pf.errorMessage || 'Invalid format'
        };
      }
    }
    
    // Text field validations (matching AddForm's getTextValidationRules)
    if (attributeTypeId === CustomAttributeTypeEnum.TEXT_SINGLE_LINE ||
        attributeTypeId === CustomAttributeTypeEnum.TEXT_MULTI_LINE) {
      // Min/Max character validations
      if (pf.minCharacters) {
        rules.minLength = {
          value: pf.minCharacters,
          message: `Minimum ${pf.minCharacters} characters required`
        };
      }
      if (pf.maxCharacters) {
        rules.maxLength = {
          value: pf.maxCharacters,
          message: `Maximum ${pf.maxCharacters} characters allowed`
        };
      }

      // Character type pattern validation
      if (pf.characterType == 3) {
        rules.pattern = {
          value: /^[a-zA-Z ]*$/,
          message: "Only Alphabets are allowed"
        };
      } else if (pf.characterType == 2) {
        rules.pattern = {
          value: /^[a-zA-Z0-9 ]*$/,
          message: "Only Alpha-Numeric characters are allowed"
        };
      } else if (pf.pattern) {
        rules.pattern = {
          value: new RegExp(pf.pattern),
          message: pf.patternErrorMsg || 'Invalid format'
        };
      }

      // Custom regex validation
      if (pf.addValidation && pf.regexExpression) {
        rules.pattern = {
          value: new RegExp(pf.regexExpression),
          message: pf.errorMessage || 'Invalid format'
        };
      }
    }

    // Email field validation
    if (attributeTypeId === CustomAttributeTypeEnum.EMAIL) {
      rules.pattern = {
        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Please enter a valid email address'
      };
    }

    // Multi-select validation (min/max selections)
    if (attributeTypeId === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
      if (pf.minSelection) {
        rules.validate = {
          ...rules.validate,
          minSelection: (value: any) => !value || value.length >= pf.minSelection ||
            `Select at least ${pf.minSelection} options`
        };
      }
      if (pf.maxSelection) {
        rules.validate = {
          ...rules.validate,
          maxSelection: (value: any) => !value || value.length <= pf.maxSelection ||
            `Select at most ${pf.maxSelection} options`
        };
      }
    }

    // Date field validation using processDateField (matching AddForm)
    if (attributeTypeId === CustomAttributeTypeEnum.DATE ||
        attributeTypeId === CustomAttributeTypeEnum.DATE_TIME) {
      const dateResult = processDateField(pf);
      Object.assign(rules, dateResult.validationRules);
    }
    
    return rules;
  }, [processDateField, parentMandatoryFlag]);

  // Collect user entered numeric data for a row (similar to Angular's collectUserEnteredNumericData)
  const collectUserEnteredNumericData = useCallback((rowIndex: number): NumericFieldData[] => {
    const rowNumericData = numericDataRef.current[rowIndex] || {};
    return Object.values(rowNumericData).filter(data => data.value !== null && data.value !== undefined);
  }, []);

  // Calculate a specific calculated field for a row based on its formula
  const calculateFieldTotal = useCallback((rowIndex: number, calcField: any) => {
    if (!setValue) return;

    const numericData = collectUserEnteredNumericData(rowIndex);
    const expression = calcField.calculationExpression;
    let total = 0;
    if (expression) {
      try {
        let evalFormula = expression;
        
        // Replace {fieldId} with actual values from numericData
        const fieldIdMatches = expression.match(/\{(\d+)\}/g);
        
        if (fieldIdMatches) {
          fieldIdMatches.forEach((match: string) => {
            const fieldId = parseInt(match.replace(/[{}]/g, ''));
            
            // Find the field value from numericData by attributeId
            const fieldData = numericData.find(d => d.attributeId === fieldId);
            const value = fieldData?.value || 0;
            
            evalFormula = evalFormula.replace(match, String(value));
          });
        }

        // Evaluate the formula (simple math operations)
        if (evalFormula && evalFormula.trim() !== '') {
          // eslint-disable-next-line no-eval
          total = eval(evalFormula) || 0;
        }
      } catch (e) {
        console.error('Error evaluating expression:', expression, e);
        total = 0;
      }
    }

    // Set the calculated field value
    const calcFieldKey = getFieldKey(calcField);
    setValue(`${name}.${rowIndex}.${calcFieldKey}`, total.toFixed(2));
  }, [setValue, name, collectUserEnteredNumericData, getFieldKey]);

  // Calculate all calculated fields that depend on a specific field ID
  const calculateDependentFields = useCallback((rowIndex: number, changedFieldId: number) => {
    // Get all calculated fields that depend on this field
    const dependentCalcFields = calculatedFieldDependencyMap.get(changedFieldId);
    
    if (!dependentCalcFields || dependentCalcFields.length === 0) {
      return;
    }

    // Calculate each dependent calculated field
    dependentCalcFields.forEach((calcField: any) => {
      calculateFieldTotal(rowIndex, calcField);
    });
  }, [calculatedFieldDependencyMap, calculateFieldTotal]);

  // Legacy function for backward compatibility - calculates all calculated fields for a row
  const calculateRowTotal = useCallback((rowIndex: number) => {
    if (!setValue) return;

    // Find all calculated fields in the product form
    const calculatedFields = productFormFields.filter((pf: any) => 
      pf.attributeType?.id === CustomAttributeTypeEnum.CALCULATED_FIELD
    );

    // Calculate each one
    calculatedFields.forEach((calcField: any) => {
      calculateFieldTotal(rowIndex, calcField);
    });
  }, [setValue, productFormFields, calculateFieldTotal]);

  // Calculate summary fields (subtotal) - similar to Angular's calculateSummeryFields
  const calculateSummaryFields = useCallback(() => {
    if (!summaryField) return;
    
    // Skip calculation if watchedRows is empty - preserve existing values
    // This prevents resetting values when rows are temporarily empty during re-renders
    if (!watchedRows || !Array.isArray(watchedRows) || watchedRows.length === 0) {
      // If already initialized in edit mode, use the stored initial subtotal
      if (summaryInitializedRef.current && initialSubTotalRef.current > 0) {
        return; // Don't reset - keep the initialized values
      }
      return;
    }

    const summaryFieldKey = getFieldKey(summaryField);
    let subTotal = 0;

    watchedRows.forEach((row: any) => {
      const value = parseFloat(row?.[summaryFieldKey]) || 0;
      subTotal += value;
    });

    // If subTotal is 0 but we have initialized values, use those instead
    if (subTotal === 0 && summaryInitializedRef.current && initialSubTotalRef.current > 0) {
      subTotal = initialSubTotalRef.current;
    }
    
    // Update the initial subtotal ref when we have a valid calculated subtotal
    if (subTotal > 0) {
      initialSubTotalRef.current = subTotal;
    }

    // Determine which discount type is enabled from productFormConfig
    // discountType: 0 = Discount Amount, 1 = Discount %
    const discountTypes = productFormConfig?.discountType || [];
    const isDiscountPercentEnabled = discountTypes.includes(1) || discountTypes.includes('1');

    // Apply discount - use refs to avoid infinite loop
    // Priority: If Discount % is enabled and has value, use it to calculate discount amount
    let finalTotal = subTotal;
    let newDiscountAmount = discountAmountRef.current;
    
    if (isDiscountPercentEnabled && discountPercentRef.current > 0) {
      // Recalculate discount amount based on percent and new subtotal
      newDiscountAmount = parseFloat((subTotal * discountPercentRef.current / 100).toFixed(2));
      finalTotal = subTotal - newDiscountAmount;
      
      // Update ref and notify parent of updated discount values
      discountAmountRef.current = newDiscountAmount;
      onDiscountChange?.(newDiscountAmount, discountPercentRef.current);
    } else if (discountAmountRef.current > 0) {
      // Use discount amount directly
      finalTotal = subTotal - discountAmountRef.current;
    }

    setSummaryValues(prev => {
      // Only update if values actually changed to prevent unnecessary re-renders
      if (prev.subTotal === finalTotal && prev.discountAmount === newDiscountAmount) {
        return prev;
      }
      return {
        ...prev,
        subTotal: finalTotal,
        discountAmount: newDiscountAmount,
      };
    });
  }, [summaryField, watchedRows, getFieldKey, onDiscountChange, productFormConfig?.discountType]);

  // Handle numeric field value change - track and recalculate
  const handleNumericFieldChange = useCallback((rowIndex: number, pf: any, value: string) => {
    const numericValue = parseFloat(value) || 0;
    const fieldKey = getFieldKey(pf);

    // Initialize row data if not exists
    if (!numericDataRef.current[rowIndex]) {
      numericDataRef.current[rowIndex] = {};
      enteredNumericFieldsRef.current[rowIndex] = 0;
    }

    // Track if this is a new entry or update
    const previousData = numericDataRef.current[rowIndex][pf.id];
    if (!previousData && numericValue > 0) {
      enteredNumericFieldsRef.current[rowIndex] += 1;
    } else if (previousData && numericValue === 0) {
      enteredNumericFieldsRef.current[rowIndex] -= 1;
    }

    // Store the numeric data
    numericDataRef.current[rowIndex][pf.id] = {
      attributeId: pf.id,
      attributeName: pf.attributeName,
      combinedAttributeName: fieldKey,
      value: numericValue,
    };

    // Only recalculate if this field is part of a calculated expression
    calculateDependentFields(rowIndex, pf.id);
  }, [getFieldKey, calculateDependentFields]);

  // Add new row with empty values for all fields
  const addRow = useCallback(() => {
    const newRow: any = {};
    productFormFields.forEach((pf: any) => {
      const fieldKey = getFieldKey(pf);
      newRow[fieldKey] = '';
    });
    append(newRow);
    
    // Initialize numeric data for new row
    const newRowIndex = rows.length;
    numericDataRef.current[newRowIndex] = {};
    enteredNumericFieldsRef.current[newRowIndex] = 0;
  }, [productFormFields, append, getFieldKey, rows.length]);

  // Remove row
  const removeRow = useCallback((index: number) => {
    if (rows.length > 1) {
      remove(index);
      
      // Clean up numeric data for removed row
      delete numericDataRef.current[index];
      delete enteredNumericFieldsRef.current[index];
      
      // Recalculate summary after row removal
      setTimeout(() => calculateSummaryFields(), 0);
    }
  }, [rows.length, remove, calculateSummaryFields]);

  // Get productFormView from config (1 = auto-add rows for each product, 2 = manual add rows)
  const productFormView = productFormConfig?.productFormView || 2;

  // Initialize rows based on productFormView or initialProductFormData (edit mode)
  // productFormView=1: Auto-add rows for each product in productList (product field disabled)
  // productFormView=2: Start with one empty row (user manually adds rows and selects products)
  // Edit mode: Populate rows from initialProductFormData
  useEffect(() => {
    // Only initialize if no rows exist and fields are configured
    if (rows.length > 0 || productFormFields.length === 0) return;

    // EDIT MODE: If initialProductFormData is provided, populate rows from it
    if (initialProductFormData && initialProductFormData.length > 0) {
      // Build all rows first, then use replace to set them all at once
      const allRows: any[] = [];
      
      initialProductFormData.forEach((rowData: ProductFormRowData, index: number) => {
        const newRow: any = {
          formMasterId: rowData.formMasterId, // Store formMasterId for update
          serialNumber: rowData.serialNumber,
        };
        
        // Map each field value from the API response
        productFormFields.forEach((pf: any) => {
          const fieldKey = getFieldKey(pf);
          // Find the value for this field in the row data
          const fieldValue = rowData.value.find((v: any) => v.id === pf.id);
          
          if (fieldValue) {
            const attributeTypeId = pf.attributeType?.id;
            
            // Handle different field types
            if (pf.systemAttribute?.id === SystemAttributeEnum.PRODUCT_FORM_PRODUCT) {
              // Product field - store as string ID
              newRow[fieldKey] = fieldValue.name;
            } else if (attributeTypeId === CustomAttributeTypeEnum.IMAGE || 
                       attributeTypeId === CustomAttributeTypeEnum.DOCUMENT_UPLOAD || 
                       attributeTypeId === CustomAttributeTypeEnum.AUDIO_VIDEO) {
              // File fields - convert comma-separated paths to array of file objects
              if (fieldValue.name) {
                const baseUrl = process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL || '';
                const filePaths = fieldValue.name.split(',').filter((p: string) => p.trim());
                newRow[fieldKey] = filePaths.map((serverPath: string) => {
                  const fileName = serverPath.split('/').pop() || serverPath;
                  return {
                    name: fileName,
                    serverUrl: serverPath,
                    url: `${baseUrl}${serverPath}`,
                    size: 0,
                    type: '',
                    isUploading: false
                  };
                });
              } else {
                newRow[fieldKey] = [];
              }
            } else if (attributeTypeId === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
              // Multi-select - parse JSON array if it's a string like '["22293","22294"]'
              if (fieldValue.name) {
                try {
                  // Try to parse as JSON array first
                  const parsed = JSON.parse(fieldValue.name);
                  newRow[fieldKey] = Array.isArray(parsed) ? parsed : fieldValue.name.split(',');
                } catch {
                  // If not JSON, split by comma
                  newRow[fieldKey] = fieldValue.name.split(',');
                }
              } else {
                newRow[fieldKey] = [];
              }
            } else if (attributeTypeId === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN) {
              // Single select - store as string (not number) for consistency
              newRow[fieldKey] = fieldValue.name || '';
            } else {
              // Other fields - store as-is
              newRow[fieldKey] = fieldValue.name || '';
            }
          } else {
            newRow[fieldKey] = '';
          }
        });
        
        allRows.push(newRow);
        
        // Initialize numeric data for this row
        numericDataRef.current[index] = {};
        enteredNumericFieldsRef.current[index] = 0;
        
        // Update numeric data refs for numeric fields
        productFormFields.forEach((pf: any) => {
          const fieldKey = getFieldKey(pf);
          const attributeTypeId = pf.attributeType?.id;
          
          if (attributeTypeId === CustomAttributeTypeEnum.NUMERIC || 
              pf.systemAttribute?.id === SystemAttributeEnum.PRODUCT_FORM_LIST_PRICE) {
            const fieldValue = rowData.value.find((v: any) => v.id === pf.id);
            if (fieldValue && fieldValue.name) {
              const numValue = parseFloat(fieldValue.name) || 0;
              numericDataRef.current[index][pf.id] = {
                attributeId: pf.id,
                attributeName: pf.attributeName,
                combinedAttributeName: fieldKey,
                value: numValue,
              };
              if (numValue > 0) {
                enteredNumericFieldsRef.current[index] = (enteredNumericFieldsRef.current[index] || 0) + 1;
              }
            }
          }
        });
      });
      
      // Use replace to set all rows at once (more reliable than multiple append calls)
      // This ensures all form values are properly registered with React Hook Form
      if (allRows.length > 0) {
        replace(allRows);
      }
      
      // Calculate subtotal from productFormData rows first
      let subTotal = 0;
      if (summaryField) {
        initialProductFormData.forEach((rowData: ProductFormRowData) => {
          const fieldValue = rowData.value.find((v: any) => v.id === summaryField.id);
          if (fieldValue && fieldValue.name) {
            subTotal += parseFloat(fieldValue.name) || 0;
          }
        });
      }
      
      // Store initial subtotal in ref to preserve it
      initialSubTotalRef.current = subTotal;
      
      // Determine which discount type is enabled from productFormConfig
      // discountType: 0 = Discount Amount, 1 = Discount %
      const discountTypes = productFormConfig?.discountType || [];
      const isDiscountPercentEnabled = discountTypes.includes(1) || discountTypes.includes('1');
      const isDiscountAmountEnabled = discountTypes.includes(0) || discountTypes.includes('0');
      
      // Set initial discount values if provided from productFormSummaryDiscountData
      // API returns: { percent: 0.02, value: 1040.29 } where value is discount amount
      let discountValue = 0;
      let discountPercent = 0;
      
      if (initialDiscountData) {
        // API returns percent as decimal (0.02 = 2%), convert to percentage for display
        const rawPercent = initialDiscountData.percent ?? 0;
        discountPercent = rawPercent < 1 && rawPercent > 0 ? rawPercent * 100 : rawPercent;
        
        // Priority: If Discount % is enabled, use percent to calculate discount amount
        // Otherwise, use the discount amount directly from API
        if (isDiscountPercentEnabled && discountPercent > 0) {
          // Calculate discount amount from percent
          discountValue = parseFloat((subTotal * discountPercent / 100).toFixed(2));
        } else if (isDiscountAmountEnabled) {
          // Use discount amount directly from API
          discountValue = initialDiscountData.value ?? 0;
        }
      }
      
      // Update refs
      discountAmountRef.current = discountValue;
      discountPercentRef.current = discountPercent;
      
      // Calculate final total (subtotal - discount)
      const finalTotal = subTotal - discountValue;
      
      // Mark as initialized to prevent reset by calculateSummaryFields
      summaryInitializedRef.current = true;
      
      // Set all summary values together
      setSummaryValues({
        subTotal: finalTotal,
        discountAmount: discountValue,
        discountPercent: discountPercent,
      });
      
      return;
    }

    // ADD MODE: Initialize based on productFormView
    if (productFormView === 1 && allowedProductList.length > 0) {
      // Auto-add a row for each allowed product (from productListId)
      const productField = productFormFields.find((pf: any) => 
        pf.systemAttribute?.id === SystemAttributeEnum.PRODUCT_FORM_PRODUCT
      );
      const productFieldKey = productField ? getFieldKey(productField) : '';
      
      allowedProductList.forEach((product: any, index: number) => {
        const newRow: any = {};
        productFormFields.forEach((pf: any) => {
          const fieldKey = getFieldKey(pf);
          // Pre-select the product for this row
          if (pf.systemAttribute?.id === SystemAttributeEnum.PRODUCT_FORM_PRODUCT) {
            newRow[fieldKey] = product.productId?.toString() || product.id?.toString() || '';
          } else {
            newRow[fieldKey] = '';
          }
        });
        append(newRow);
        
        // Initialize numeric data for new row
        numericDataRef.current[index] = {};
        enteredNumericFieldsRef.current[index] = 0;
        
        // Populate list price from product data
        if (productFieldKey && listPriceField && setValue) {
          const listPriceKey = getFieldKey(listPriceField);
          const price = product.price || product.listPrice || 0;
          
          // Set list price after a small delay to ensure row is added
          setTimeout(() => {
            setValue(`${name}.${index}.${listPriceKey}`, price);
            
            // Update numeric data for list price
            numericDataRef.current[index] = numericDataRef.current[index] || {};
            numericDataRef.current[index][listPriceField.id] = {
              attributeId: listPriceField.id,
              attributeName: listPriceField.attributeName,
              combinedAttributeName: listPriceKey,
              value: price,
            };
            enteredNumericFieldsRef.current[index] = (enteredNumericFieldsRef.current[index] || 0) + 1;
          }, 100 * (index + 1));
        }
      });
    } else if (productFormView === 2) {
      // productFormView=2: Add one empty row
      addRow();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productFormFields.length, allowedProductList.length, initialProductFormData]);

  // Calculate summary values when rows change
  useEffect(() => {
    calculateSummaryFields();
  }, [watchedRows, calculateSummaryFields]);

  // Handle product selection - update list price from product data
  const handleProductChange = useCallback((rowIndex: number, productId: string) => {
    if (!productId || !listPriceField || !setValue) return;
    
    const selectedProduct = filteredProductList.find(
      (p: any) => (p.productId?.toString() || p.id?.toString()) === productId
    );
    
    if (selectedProduct) {
      const listPriceKey = getFieldKey(listPriceField);
      const price = selectedProduct.price || selectedProduct.listPrice || 0;
      setValue(`${name}.${rowIndex}.${listPriceKey}`, price);

      // Update numeric data for list price
      if (!numericDataRef.current[rowIndex]) {
        numericDataRef.current[rowIndex] = {};
        enteredNumericFieldsRef.current[rowIndex] = 0;
      }

      const previousData = numericDataRef.current[rowIndex][listPriceField.id];
      if (!previousData && price > 0) {
        enteredNumericFieldsRef.current[rowIndex] += 1;
      }

      numericDataRef.current[rowIndex][listPriceField.id] = {
        attributeId: listPriceField.id,
        attributeName: listPriceField.attributeName,
        combinedAttributeName: listPriceKey,
        value: price,
      };

      // Recalculate row total
      calculateRowTotal(rowIndex);
    }
  }, [filteredProductList, listPriceField, name, setValue, getFieldKey, calculateRowTotal]);

  // Handle discount amount change
  const handleDiscountAmountChange = useCallback((value: string) => {
    const discountAmount = parseFloat(value) || 0;
    
    // Calculate discount percent from amount
    const currentSubTotal = watchedRows?.reduce((acc: number, row: any) => {
      if (!summaryField) return acc;
      const fieldKey = getFieldKey(summaryField);
      return acc + (parseFloat(row?.[fieldKey]) || 0);
    }, 0) || 0;

    const discountPercent = currentSubTotal > 0 ? (discountAmount / currentSubTotal) * 100 : 0;

    // Update refs to keep them in sync
    discountAmountRef.current = discountAmount;
    discountPercentRef.current = parseFloat(discountPercent.toFixed(2));

    setSummaryValues(prev => ({
      ...prev,
      discountAmount,
      discountPercent: parseFloat(discountPercent.toFixed(2)),
      subTotal: currentSubTotal - discountAmount,
    }));
    
    // Notify parent of discount change
    onDiscountChange?.(discountAmount, parseFloat(discountPercent.toFixed(2)));
  }, [watchedRows, summaryField, getFieldKey, onDiscountChange]);

  // Handle discount percent change
  const handleDiscountPercentChange = useCallback((value: string) => {
    const discountPercent = parseFloat(value) || 0;
    
    // Calculate discount amount from percent
    const currentSubTotal = watchedRows?.reduce((acc: number, row: any) => {
      if (!summaryField) return acc;
      const fieldKey = getFieldKey(summaryField);
      return acc + (parseFloat(row?.[fieldKey]) || 0);
    }, 0) || 0;

    const discountAmount = (currentSubTotal * discountPercent) / 100;

    // Update refs to keep them in sync
    discountAmountRef.current = parseFloat(discountAmount.toFixed(2));
    discountPercentRef.current = discountPercent;

    setSummaryValues(prev => ({
      ...prev,
      discountPercent,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      subTotal: currentSubTotal - discountAmount,
    }));
    
    // Notify parent of discount change
    onDiscountChange?.(parseFloat(discountAmount.toFixed(2)), discountPercent);
  }, [watchedRows, summaryField, getFieldKey, onDiscountChange]);

  // Render a single field cell based on field type using CustomAttributeTypeEnum directly
  const renderFieldCell = useCallback((pf: any, rowIndex: number) => {
    const fieldKey = getFieldKey(pf);
    const fieldName = `${name}.${rowIndex}.${fieldKey}`;
    const attributeTypeId = pf.attributeType?.id;
    const systemAttributeId = pf.systemAttribute?.id;

    // Product dropdown field (systemAttribute=48) - use lookupValues from lookup map
    if (systemAttributeId === SystemAttributeEnum.PRODUCT_FORM_PRODUCT) {
      // Get productIdList from productFormSetting to determine which products are selectable
      const productIdList = productFormConfig?.productIdList;
      const hasProductIdFilter = productIdList && Array.isArray(productIdList);
      
      // Check if product is in productIdList (selectable) or not (greyed out)
      // If productIdList is an empty array, NO products are allowed (all disabled)
      const isProductAllowed = (productId: any) => {
        if (!hasProductIdFilter) return true;
        return productIdList.includes(productId) || productIdList.includes(Number(productId));
      };
      
      // Show all products but mark ones not in productListId as disabled (greyed out)
      const options = (pf.lookupValues || [])
        .map((lv: any) => ({
          value: lv.id?.toString(),
          label: lv.lookupValue || lv.name,
          disabled: !isProductAllowed(lv.id),
        }));
      
      // All options for search - also with disabled flag
      const allOptions = (pf.allLookupValues || [])
        .map((lv: any) => ({
          value: lv.id?.toString(),
          label: lv.lookupValue || lv.name,
          disabled: !isProductAllowed(lv.id),
        }));
      
      // Convert lookupMap to Select-compatible format with disabled flag
      let selectLookupMap: Map<string, { value: string; label: string; disabled?: boolean }[]> | undefined;
      if (pf.lookupMap) {
        selectLookupMap = new Map();
        pf.lookupMap.forEach((items: any[], key: string) => {
          selectLookupMap!.set(key, items
            .map((lv: any) => ({
              value: lv.id?.toString(),
              label: lv.lookupValue || lv.name,
              disabled: !isProductAllowed(lv.id),
            })));
        });
      }

      // For productFormView=1, disable the product field as it's pre-selected
      const isProductFieldDisabled = disabled || productFormView === 1;

      return (
        <Select
          name={fieldName}
          control={control}
          options={options}
          allOptions={allOptions}
          lookupMap={selectLookupMap}
          placeholder="Select..."
          disabled={isProductFieldDisabled}
          validationRules={getValidationRules(pf)}
          maxWidth="w-28"
          onChange={(value) => handleProductChange(rowIndex, value)}
        />
      );
    }

    // List Price field (systemAttribute=50) - auto-populated from product, non-editable
    if (isListPriceField(pf)) {
      return (
        <TextInput
          name={fieldName}
          control={control}
          type="text"
          placeholder=""
          disabled={true}
          validationRules={getValidationRules(pf)}
          maxWidth="w-20"
        />
      );
    }

    // Handle fields based on attributeType using CustomAttributeTypeEnum directly
    switch (attributeTypeId) {
      // Image field - use UploadInput component with horizontal scroll wrapper for ProductForm
      // Upload icon on LEFT, images scroll horizontally, fixed 40x40px size
      case CustomAttributeTypeEnum.IMAGE:
        return (
          <div className="min-w-[40px] max-w-[140px] pt-1 overflow-x-auto overflow-y-visible [&>div>div]:flex-nowrap [&>div>div]:gap-2 [&_img]:min-w-[40px] [&_img]:min-h-[40px] [&_img]:w-10 [&_img]:h-10 [&_img]:flex-shrink-0 [&>div>div>div]:flex-shrink-0 [&>div>div>div]:w-10 [&>div>div>div]:h-10 [&>div>div>div]:min-w-[40px] [&>div>div>div]:min-h-[40px]">
            <UploadInput
              name={fieldName}
              control={control}
              attributeTypeId={CustomAttributeTypeEnum.IMAGE}
              multiple={true}
              moduleType={moduleType}
              projectId={projectId}
              onUploadingChange={onUploadingChange}
              maxFiles={pf.maxImagesAllowed || undefined}
              validationRules={getValidationRules(pf)}
              disabled={disabled}
              uploadButtonPosition="left"
              iconSize="sm"
            />
          </div>
        );

      // Document Upload field - with horizontal scroll wrapper for ProductForm
      case CustomAttributeTypeEnum.DOCUMENT_UPLOAD:
        return (
          <div className="min-w-[48px] max-w-[140px] pt-1 overflow-x-auto overflow-y-visible [&>div>div]:flex-nowrap [&>div>div]:gap-2 [&_img]:min-w-[40px] [&_img]:min-h-[40px] [&_img]:w-10 [&_img]:h-10 [&_img]:flex-shrink-0 [&>div>div>div]:flex-shrink-0">
            <UploadInput
              name={fieldName}
              control={control}
              attributeTypeId={CustomAttributeTypeEnum.DOCUMENT_UPLOAD}
              multiple={true}
              moduleType={moduleType}
              projectId={projectId}
              onUploadingChange={onUploadingChange}
              maxFiles={pf.maxImagesAllowed || undefined}
              validationRules={getValidationRules(pf)}
              disabled={disabled}
              uploadButtonPosition="left"
            />
          </div>
        );

      // Audio/Video field - with horizontal scroll wrapper for ProductForm
      case CustomAttributeTypeEnum.AUDIO_VIDEO:
        return (
          <div className="min-w-[48px] max-w-[140px] pt-1 overflow-x-auto overflow-y-visible [&>div>div]:flex-nowrap [&>div>div]:gap-2 [&_img]:min-w-[40px] [&_img]:min-h-[40px] [&_img]:w-10 [&_img]:h-10 [&_img]:flex-shrink-0 [&>div>div>div]:flex-shrink-0">
            <UploadInput
              name={fieldName}
              control={control}
              attributeTypeId={CustomAttributeTypeEnum.AUDIO_VIDEO}
              multiple={true}
              moduleType={moduleType}
              projectId={projectId}
              onUploadingChange={onUploadingChange}
              maxFiles={pf.maxImagesAllowed || undefined}
              validationRules={getValidationRules(pf)}
              disabled={disabled}
              uploadButtonPosition="left"
            />
          </div>
        );

      // Single Select Dropdown - use Select common component
      case CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN:
        return (
          <Select
            name={fieldName}
            control={control}
            options={(pf.lookupValues || []).map((lv: any) => ({
              value: lv.id?.toString(),
              label: lv.lookupValue || lv.name,
            }))}
            placeholder="Select..."
            disabled={disabled}
            validationRules={getValidationRules(pf)}
            maxWidth="w-28"
          />
        );

      // Multi Select Dropdown - use MultiSelect common component
      case CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN:
        return (
          <MultiSelect
            name={fieldName}
            control={control}
            options={(pf.lookupValues || []).map((lv: any) => ({
              value: lv.id?.toString(),
              label: lv.lookupValue || lv.name,
            }))}
            placeholder="Select..."
            disabled={disabled}
            validationRules={getValidationRules(pf)}
          />
        );

      // Calculated field (attributeType=14) - formula-based, non-editable
      case CustomAttributeTypeEnum.CALCULATED_FIELD:
        return (
          <TextInput
            name={fieldName}
            control={control}
            type="text"
            placeholder=""
            disabled={true}
            validationRules={getValidationRules(pf)}
            maxWidth="w-full"
          />
        );

      // Numeric field - with real-time onChange handler for calculations (only if field is in a calculated expression)
      case CustomAttributeTypeEnum.NUMERIC:
        return (
          <TextInput
            name={fieldName}
            control={control}
            type="text"
            placeholder=""
            disabled={disabled}
            validationRules={getValidationRules(pf)}
            pattern={pf.decimalFlag ? /^\d*\.?\d*$/ : /^\d*$/}
            blockInvalidInput={true}
            maxWidth="w-full"
            onChange={isFieldInCalculatedExpression(pf.id) ? (value) => handleNumericFieldChange(rowIndex, pf, value) : undefined}
          />
        );

      // Text single line
      case CustomAttributeTypeEnum.TEXT_SINGLE_LINE:
        return (
          <TextInput
            name={fieldName}
            control={control}
            type="text"
            placeholder=""
            disabled={disabled}
            validationRules={getValidationRules(pf)}
            maxWidth="w-full"
          />
        );

      // Text multi line (TextArea)
      case CustomAttributeTypeEnum.TEXT_MULTI_LINE:
        return (
          <TextArea
            name={fieldName}
            control={control}
            placeholder=""
            disabled={disabled}
            validationRules={getValidationRules(pf)}
            rows={2}
          />
        );

      // Email field
      case CustomAttributeTypeEnum.EMAIL:
        return (
          <TextInput
            name={fieldName}
            control={control}
            type="email"
            placeholder=""
            disabled={disabled}
            validationRules={{
              ...getValidationRules(pf),
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Please enter a valid email address'
              }
            }}
            maxWidth="w-full"
          />
        );

      // Date field - use processDateField for min/max dates
      case CustomAttributeTypeEnum.DATE: {
        const dateResult = processDateField(pf);
        return (
          <DateInput
            name={fieldName}
            control={control}
            disabled={disabled}
            validationRules={getValidationRules(pf)}
            minDate={dateResult.minDate?.split('T')[0]}
            maxDate={dateResult.maxDate?.split('T')[0]}
          />
        );
      }

      // DateTime field - validation handled by getValidationRules using processDateField
      case CustomAttributeTypeEnum.DATE_TIME:
        return (
          <DateTimeInput
            name={fieldName}
            control={control}
            disabled={disabled}
            validationRules={getValidationRules(pf)}
          />
        );

      // Time Duration field
      case CustomAttributeTypeEnum.TIME_DURATION:
        return (
          <TimeInput
            name={fieldName}
            control={control}
            disabled={disabled}
            validationRules={getValidationRules(pf)}
          />
        );

      // Radio field
      case CustomAttributeTypeEnum.RADIO:
        return (
          <RadioInput
            name={fieldName}
            control={control}
            options={(pf.lookupValues || []).map((lv: any) => ({
              value: lv.id?.toString(),
              label: lv.lookupValue || lv.name,
            }))}
            disabled={disabled}
            validationRules={getValidationRules(pf)}
          />
        );

      // Default: Text input for any other type
      default:
        return (
          <TextInput
            name={fieldName}
            control={control}
            type="text"
            placeholder=""
            disabled={disabled}
            validationRules={getValidationRules(pf)}
            maxWidth="w-full"
          />
        );
    }
  }, [name, control, disabled, getFieldKey, isListPriceField, handleProductChange, handleNumericFieldChange, setValue, getValidationRules, isFieldInCalculatedExpression, moduleType, projectId, onUploadingChange]);

  // If no fields, show message
  if (productFormFields.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        No product form fields configured.
      </div>
    );
  }

  // Check if discounts are enabled from config
  // discountType: 0 = Discount Amount, 1 = Discount %
  const allowDiscounts = productFormConfig?.allowDiscounts === 1;
  const discountTypes = productFormConfig?.discountType || [];
  const showDiscountAmount = discountTypes.includes(0) || discountTypes.includes('0') || discountTypes.length === 0;
  const showDiscountPercent = discountTypes.includes(1) || discountTypes.includes('1') || discountTypes.length === 0;

  // Calculate raw subtotal (before discounts) for display
  // Use watchedRows if available, otherwise fall back to initialSubTotalRef for edit mode
  const calculatedSubTotal = watchedRows?.reduce((acc: number, row: any) => {
    if (!summaryField) return acc;
    const fieldKey = getFieldKey(summaryField);
    return acc + (parseFloat(row?.[fieldKey]) || 0);
  }, 0) || 0;
  
  // Use initialSubTotalRef as fallback when calculatedSubTotal is 0 (edit mode initial load)
  const rawSubTotal = calculatedSubTotal > 0 ? calculatedSubTotal : initialSubTotalRef.current;

  // Calculate final total after discounts
  const finalTotal = rawSubTotal - summaryValues.discountAmount;

  const getColumnMinWidthClass = useCallback((pf: any) => {
    const attributeTypeId = pf?.attributeType?.id;
    if (
      attributeTypeId === CustomAttributeTypeEnum.IMAGE ||
      attributeTypeId === CustomAttributeTypeEnum.DOCUMENT_UPLOAD ||
      attributeTypeId === CustomAttributeTypeEnum.AUDIO_VIDEO
    ) {
      return 'min-w-[100px]';
    }
    return 'min-w-[120px]';
  }, []);

  return (
    <div className="w-full border border-gray-300 rounded-md overflow-hidden">
      <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="bg-white">
            {/* Render header for each field */}
            {productFormFields.map((pf: any, idx: number) => (
              <th key={idx} className={`border border-gray-300 px-1.5 py-1 text-left text-s font-medium text-gray-700 ${getColumnMinWidthClass(pf)}`}>
                {pf.attributeName}
                {pf.mandatoryFlag === 1 && parentMandatoryFlag && <span className="text-[#F64E60] ml-1">*</span>}
              </th>
            ))}
            {/* Action column header - only show for productFormView=2 */}
            {productFormView !== 1 && (
              <th className="border border-gray-300 px-1.5 py-1 text-center text-xs font-medium text-gray-700 min-w-[120px]">
                Action
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id} className="bg-white">
              {/* Render cell for each field */}
              {productFormFields.map((pf: any, idx: number) => (
                <td key={idx} className={`border border-gray-300 px-1.5 py-0.5 pb-3 ${getColumnMinWidthClass(pf)}`}>
                  {renderFieldCell(pf, rowIndex)}
                </td>
              ))}
              
              {/* Actions column - only show for productFormView=2 */}
              {productFormView !== 1 && (
                <td className="border border-gray-300 px-1.5 py-1 min-w-[120px]">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={addRow}
                      className="w-6 h-6 flex items-center justify-center text-white bg-blue-500 hover:bg-blue-600 rounded"
                      disabled={disabled}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(rowIndex)}
                      className="w-6 h-6 flex items-center justify-center text-white bg-gray-400 hover:bg-gray-500 rounded"
                      disabled={disabled || rows.length <= 1}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                      </svg>
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {/* Summary section - Sub-total, Discount Amount, Discount %, Total */}
      <div className="bg-white px-3 py-2">
        {/* Sub-total row - only show when discounts are allowed */}
        {allowDiscounts ? (
          <div className="flex justify-end items-center py-1">
            <span className="text-[13px] font-semibold text-gray-700 w-32 text-right pr-3 flex-shrink-0">Sub-total</span>
            <input
              type="text"
              className="w-32 px-1.5 py-0.5 text-[13px] border-b border-transparent text-left bg-transparent focus:outline-none cursor-default"
              value={rawSubTotal.toFixed(2)}
              readOnly
              title={rawSubTotal.toFixed(2)}
            />
          </div>
        ) : null}
        
        {/* Discount Amount row - only show when discounts are allowed AND discountType includes 1 */}
        {allowDiscounts && showDiscountAmount ? (
          <div className="flex justify-end items-center py-1">
            <span className="text-[13px] font-semibold text-gray-700 w-32 text-right pr-3 flex-shrink-0">Discount Amount</span>
            <input
              type="text"
              className="w-32 px-1.5 py-0.5 text-[13px] border-b border-gray-300 text-left bg-transparent focus:outline-none focus:border-blue-500"
              value={summaryValues.discountAmount || 0}
              onChange={(e) => handleDiscountAmountChange(e.target.value)}
              disabled={disabled}
            />
          </div>
        ) : null}
        
        {/* Discount % row - only show when discounts are allowed AND discountType includes 2 */}
        {allowDiscounts && showDiscountPercent ? (
          <div className="flex justify-end items-center py-1">
            <span className="text-[13px] font-semibold text-gray-700 w-32 text-right pr-3 flex-shrink-0">Discount %</span>
            <input
              type="text"
              className="w-32 px-1.5 py-0.5 text-[13px] border-b border-gray-300 text-left bg-transparent focus:outline-none focus:border-blue-500"
              value={summaryValues.discountPercent || 0}
              onChange={(e) => handleDiscountPercentChange(e.target.value)}
              disabled={disabled}
            />
          </div>
        ) : null}

        {/* Total row - always show */}
        <div className="flex justify-end items-center py-1">
          <span className="text-[13px] font-semibold text-gray-700 w-32 text-right pr-3 flex-shrink-0">Total</span>
          <input
            type="text"
            className="w-32 px-1.5 py-0.5 text-[13px] font-semibold border-b border-transparent text-left bg-transparent focus:outline-none cursor-default"
            value={finalTotal.toFixed(2)}
            readOnly
            title={finalTotal.toFixed(2)}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductFormField;
