import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from 'react-redux';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import TwinModal from '@/components/common/TwinModal';
import { Button } from '@/components/ui/tailwind';
import TextInput from '@/components/common/input-fields/TextInput';
import Select from '@/components/common/input-fields/Select';
import RadioInput from '@/components/common/input-fields/RadioInput';
import CheckboxInput from '@/components/common/input-fields/CheckboxInput';
import Spinner from '@/components/common/Spinner';
import { SystemModules } from '@/lib/models/entity-logs';
import { RootState, AppDispatch } from '@/store';
import { setAttributeTypes, setLoadingTypes, setSelectedAttributeType, resetAttributeFormSettings, setDateLookupValues, setLoadingDateLookup, setModuleNames } from '@/store/attributeSlice';
import settingsService from '@/lib/services/settingsService';
import productFormService from '@/lib/services/productFormService';
import {
  BEHAVIOUR_OPTIONS,
  STATUS_OPTIONS,
  NUMERIC_VALIDATION_TYPE_OPTIONS,
  TEXT_VALIDATION_TYPE_OPTIONS,
  MULTILINE_TEXT_VALIDATION_TYPE_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  DATE_VALUE_TYPE_OPTIONS,
} from '@/lib/models/attributes/attribute-options.model';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import UploadInput from '@/components/common/input-fields/UploadInput';
import MultiSelect from '@/components/common/input-fields/MultiSelect';
import RemoveActionButton from '@/components/common/buttons/action-button/RemoveActionButton';
import AddActionButton from '@/components/common/buttons/action-button/AddActionButton';
import ValidateCalculationLogicDialog from '@/components/common/ValidateCalculationLogicDialog';

// System attributes that should hide options and disable multi-select behaviour
// Product forms don't have module-specific system attributes
const SYSTEM_ATTRIBUTES_HIDE_OPTIONS: { moduleType: number; systemAttributeId: number }[] = [];

// Helper function to check if options should be hidden and multi-select should be disabled
const shouldHideOptionsCheck = (moduleType: number, systemAttributeId: number): boolean => {
  return SYSTEM_ATTRIBUTES_HIDE_OPTIONS.some(
    item => item.moduleType !== null && item.moduleType === moduleType && item.systemAttributeId === systemAttributeId
  );
};

// System attribute IDs that make the entire form non-editable (read-only mode)
const NON_EDITABLE_SYSTEM_ATTRIBUTES: number[] = [
  SystemAttributeEnum.VENDOR,
  SystemAttributeEnum.REDEMPTION_TYPE,
  SystemAttributeEnum.USER_AADHAR_VERIFICATION,
  SystemAttributeEnum.USER_PAN_VERIFICATION,
  SystemAttributeEnum.USER_BANK_VERIFICATION,
  SystemAttributeEnum.USER_GST_VERIFICATION,
  SystemAttributeEnum.OPPORTUNITY_AADHAR_VERIFICATION,
  SystemAttributeEnum.OPPORTUNITY_PAN_VERIFICATION,
  SystemAttributeEnum.OPPORTUNITY_BANK_VERIFICATION,
  SystemAttributeEnum.OPPORTUNITY_GST_VERIFICATION,
  SystemAttributeEnum.COMPANY_AADHAR_VERIFICATION,
  SystemAttributeEnum.COMPANY_PAN_VERIFICATION,
  SystemAttributeEnum.COMPANY_BANK_VERIFICATION,
  SystemAttributeEnum.COMPANY_GST_VERIFICATION,
];

export type AttributePayload = any;

interface Props {
  open: boolean;
  onClose: () => void;
  moduleType: number;
  projectId: number;
  onSave?: (payload: AttributePayload) => void;
  isEditMode?: boolean;
  attributeId?: number;
}

type FormValues = {
  attributeTypeId: string;
  attributeName: string;
  logicalFieldName: string;
  instructions: string;
  behaviourType: string;
  mandatoryFlag: boolean;
  uniqueFlag: boolean;
  status: string;
  // Options fields
  showOptionsAlphabetically: boolean;
  showFirstOptionSelected: boolean;
  // Date/DateTime fields
  dateValueType: string;
  standardDateValue: string;
  pastDatesAllowed: string;
  futureDatesAllowed: string;
  // Text fields
  validationType: string;
  minCharacters: string;
  maxCharacters: string;
  // Numeric fields
  allowDecimals: boolean;
  otpValidation: boolean;
  numericValidationType: string;
  minDigits: string;
  maxDigits: string;
  minNumber: string;
  maxNumber: string;
  regexExpression: string;
  regexErrorMessage: string;
  // Image/Document/Video fields
  allowBrowsing: boolean;
  maxImagesAllowed: string;
  documentType: string[]; // Multi-select for document types
  maxDocumentsAllowed: string;
  maxVideosAllowed: string;
  // Reference Document
  uploadFile: any;
  // Data List fields
  listName: string;
  selectParentFieldsValues: string[];
  selectValues: string[];
  addDependentFields: boolean;
  dependentFieldList: Array<{ dataListId?: number | null; attributeId?: number | null }> | null;
  // OTP Validation / Link from Other Entities
  entity: string;
  linkedAttributeId: string;
  // Options for Single/Multi Select
  optionValue: string;
  // Calculated Field
  calculationLogic: string;
};

const defaultValues: FormValues = {
  attributeTypeId: '',
  attributeName: '',
  logicalFieldName: '',
  instructions: '',
  behaviourType: '1',
  mandatoryFlag: false,
  uniqueFlag: false,
  status: '1',
  showOptionsAlphabetically: false,
  showFirstOptionSelected: false,
  dateValueType: '',
  standardDateValue: '',
  pastDatesAllowed: '',
  futureDatesAllowed: '',
  validationType: '1',
  minCharacters: '',
  maxCharacters: '',
  allowDecimals: false,
  otpValidation: false,
  numericValidationType: '',
  minDigits: '',
  maxDigits: '',
  minNumber: '',
  maxNumber: '',
  regexExpression: '',
  regexErrorMessage: '',
  allowBrowsing: false,
  maxImagesAllowed: '',
  documentType: [],
  maxDocumentsAllowed: '',
  maxVideosAllowed: '',
  uploadFile: null,
  listName: '',
  selectParentFieldsValues: [],
  selectValues: [],
  addDependentFields: false,
  dependentFieldList: null,
  entity: '',
  linkedAttributeId: '',
  optionValue: '',
  calculationLogic: '',
};

const validationRules = {
  attributeTypeId: { required: 'Field Type is required' },
  attributeName: {
    required: 'Field Name is required',
    pattern: {
      value: /^[a-zA-Z0-9\s]*$/,
      message: 'Field name can only contain letters, numbers, and spaces'
    }
  },
  logicalFieldName: {},
  instructions: {},
  behaviourType: {},
  mandatoryFlag: {},
  uniqueFlag: {},
  status: {},
  showOptionsAlphabetically: {},
  showFirstOptionSelected: {},
  dateValueType: {},
  standardDateValue: {},
  pastDatesAllowed: {},
  futureDatesAllowed: {},
  validationType: {},
  minCharacters: {},
  maxCharacters: {},
  allowDecimals: {},
  otpValidation: {},
  numericValidationType: {},
  minDigits: {
    validate: (value: string) => !value || value !== '-' || 'Please enter a valid number'
  },
  maxDigits: {
    validate: (value: string) => !value || value !== '-' || 'Please enter a valid number'
  },
  minNumber: {
    validate: (value: string) => !value || value !== '-' || 'Please enter a valid number'
  },
  maxNumber: {
    validate: (value: string) => !value || value !== '-' || 'Please enter a valid number'
  },
  regexExpression: {},
  regexErrorMessage: {},
  allowBrowsing: {},
  maxImagesAllowed: {},
  documentType: {},
  maxDocumentsAllowed: {},
  maxVideosAllowed: {},
  uploadFile: {},
  listName: {},
  selectParentFieldsValues: {},
  selectValues: {},
  addDependentFields: {},
  dependentFieldList: {},
  entity: {},
  linkedAttributeId: {},
  optionValue: {},
  calculationLogic: {},
};

// Product forms don't use logical field modules
const LOGICAL_FIELD_MODULES: number[] = [];

const helperHint = (
  <div>
    Instructions/ <span className="text-red-500">Error</span>
  </div>
);



// Option row interface for managing multiple options
interface OptionRow {
  key: string;        // Unique key for React list rendering and ordering
  id: string | null;  // Lookup ID from API (null for new options)
  value: string;
}

// Data List field interface from getFieldsInSetting API
interface DataListField {
  id: number;
  attributeName: string;
  parentId: number;
  hasChildAttribute: boolean;
  childAttributeList?: DataListField[] | null;
}

// Lookup value interface from getDataListLookupValues API
interface LookupValue {
  id: number;
  lookupValue: string;
  dataListId?: number;
  dataListValueId?: number;
  isActive: number;
}

// Parent-Child relation interface from getDataListLookupValues API
interface ParentRelation {
  id: number;
  parentAttribId: number;
  parentLookupValueId: number;
  childAttribId: number;
  childLookupValueId: number;
  isActive: number;
}

const AddEditProductFormAttribute: React.FC<Props> = ({ open, onClose, moduleType, projectId, onSave, isEditMode = false, attributeId }) => {
  // Product forms always use 200 for attribute type fetching
  const effectiveAttributeTypeModuleType = 200;
  const dispatch = useDispatch<AppDispatch>();
  const { enqueueSnackbar } = useSnackbar();

  const [isOptionsPanelOpen, setIsOptionsPanelOpen] = useState(false);
  const [, forceUpdate] = useState({});
  const [optionRows, setOptionRows] = useState<OptionRow[]>([{ key: '1', id: null, value: '' }]);
  const [isTestAreaOpen, setIsTestAreaOpen] = useState(false);
  const [testFieldValues, setTestFieldValues] = useState<Record<number, string>>({});
  const [calcApiValidationLoading, setCalcApiValidationLoading] = useState(false);
  const [calcApiValidationResult, setCalcApiValidationResult] = useState<{
    validated: boolean;
    parsedExpression?: string;
    parsedExpressionForDisplay?: string;
    calculatedTotal?: number;
  } | null>(null);
  const [isCalcExpressionValidated, setIsCalcExpressionValidated] = useState(false);
  const [lastValidatedCalcExpression, setLastValidatedCalcExpression] = useState('');
  const [showValidateCalcDialog, setShowValidateCalcDialog] = useState(false);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [calcNumericFields, setCalcNumericFields] = useState<Array<{ attributeId: number; attributeName: string }>>([]);
  const [isLoadingCalcFields, setIsLoadingCalcFields] = useState(false);
  const [entityFieldsList, setEntityFieldsList] = useState<{ value: string; label: string }[]>([]);
  const [isLoadingEntityFields, setIsLoadingEntityFields] = useState(false);

  // Data List states
  const [dataListFields, setDataListFields] = useState<DataListField[]>([]);
  const [dataListOptions, setDataListOptions] = useState<{ value: string; label: string }[]>([]);
  const [isLoadingDataListFields, setIsLoadingDataListFields] = useState(false);
  const [parentLookupValues, setParentLookupValues] = useState<{ value: string; label: string }[]>([]);
  const [dataListLookupValues, setDataListLookupValues] = useState<{ value: string; label: string }[]>([]);
  const [allDataListLookupValues, setAllDataListLookupValues] = useState<{ value: string; label: string }[]>([]); // Full unfiltered list
  const [parentRelationList, setParentRelationList] = useState<ParentRelation[]>([]); // Parent-child relations
  const [isLoadingLookupValues, setIsLoadingLookupValues] = useState(false);
  const [selectedDataListHasParent, setSelectedDataListHasParent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingEditData, setIsLoadingEditData] = useState(false);
  const [systemAttributeId, setSystemAttributeId] = useState<number | null>(null); // Track system attribute ID for conditional logic
  const [fieldSpec, setFieldSpec] = useState<number | null>(null); // Track fieldSpec for mandatory checkbox logic
  const [dateAttributeId, setDateAttributeId] = useState<number | null>(null); // Track date attribute ID for edit mode
  const [rawAttributeTypes, setRawAttributeTypes] = useState<any[]>([]); // Store raw attribute types data for payload
  const [optionsError, setOptionsError] = useState<string | null>(null); // Validation error for options (general)
  const [duplicateOptionIndices, setDuplicateOptionIndices] = useState<Set<number>>(new Set()); // Track which options are duplicates
  const pendingLinkedAttributeIdRef = useRef<string | null>(null); // Store linkedAttributeId for edit mode (using ref to avoid re-renders)
  const activeRequestsRef = useRef<AbortController[]>([]);
  const editDataLoadedRef = useRef(false); // Track if edit data has been loaded
  const calcLogicKeyCaptureRef = useRef<HTMLDivElement | null>(null);
  const calcFormulaConvertedRef = useRef(false); // Track if calculation formula has been converted from comma format

  const registerRequest = () => {
    const controller = new AbortController();
    activeRequestsRef.current.push(controller);
    return controller;
  };

  const completeRequest = (controller: AbortController) => {
    activeRequestsRef.current = activeRequestsRef.current.filter(ctrl => ctrl !== controller);
  };

  const cancelAllRequests = () => {
    activeRequestsRef.current.forEach(ctrl => ctrl.abort('Abort Request: Modal closed'));
    activeRequestsRef.current = [];
    setIsSaving(false);
  };
  const { control, handleSubmit, reset, watch, setValue, getValues } = useForm<FormValues>({
    defaultValues,
    mode: 'onChange',
  });

  // Redux state
  const attributeTypeList = useSelector((state: RootState) => state?.attribute?.attributeTypes);
  const isLoadingTypes = useSelector((state: RootState) => state?.attribute?.isLoadingTypes);
  const attributeFormSettings = useSelector((state: RootState) => state?.attribute?.attributeFormSettings);
  const selectedAttributeType = useSelector((state: RootState) => state?.attribute?.selectedAttributeTypeId);
  const dateLookupValues = useSelector((state: RootState) => state?.attribute?.dateLookupValues);
  const isLoadingDateLookup = useSelector((state: RootState) => state?.attribute?.isLoadingDateLookup);
  const moduleNames = useSelector((state: RootState) => state?.attribute?.moduleNames);
  const attributesList = useSelector((state: RootState) => state?.attribute?.attributes); // Raw attribute data from grid

  // For OTP Validation (type 19), use all module names (product forms don't filter by entity type)
  const otpEntityList = moduleNames;

  // Loading state for data fetching (shows loader in dropdowns)
  const isDataLoading = isLoadingTypes || isLoadingDateLookup || isLoadingDataListFields;
  // Combined loading state for disabling buttons (includes file upload and data list loading)
  const isFormBusy = isDataLoading || isFileUploading || isLoadingDataListFields || isLoadingLookupValues || isSaving || isLoadingEditData;

  const currentAttributeTypeId = watch('attributeTypeId');
  const attributeName = watch('attributeName');
  const numericValidationType = watch('numericValidationType');
  const validationType = watch('validationType');
  const calculationLogic = watch('calculationLogic');
  const dateValueType = watch('dateValueType');
  const selectedEntity = watch('entity');
  const selectedListName = watch('listName');
  const selectedParentFieldsValues = watch('selectParentFieldsValues');
  const allowDecimals = watch('allowDecimals');
  const showLogicalField = LOGICAL_FIELD_MODULES.includes(moduleType) || moduleType > 100;

  // Computed attribute type list that shows "CheckBox" for Set Password Checkbox field (systemAttributeId 59)
  const displayAttributeTypeList = useMemo(() => {
    // If editing the Set Password Checkbox field, modify the label to show "CheckBox"
    if (isEditMode && systemAttributeId === SystemAttributeEnum.USER_SET_PASSWORD_CHECKBOX_FIELD_ID) {
      return attributeTypeList.map((item: { value: string | number; label: string }) => {
        // The Set Password Checkbox uses Single Select (type 1) internally, but should display as "CheckBox"
        if (String(item.value) === currentAttributeTypeId) {
          return { ...item, label: 'CheckBox' };
        }
        return item;
      });
    }
    return attributeTypeList;
  }, [attributeTypeList, isEditMode, systemAttributeId, currentAttributeTypeId]);

  // Destructure attribute form settings from Redux
  const {
    showOptions,
    showOptionsCheckboxes,
    showDateFields,
    showTextFields,
    showMultiLineTextFields,
    showNumericFields,
    showImageFields,
    showDocumentFields,
    showVideoFields,
    showReferenceDocFields,
    showDataListFields,
    showOTPFields,
    showCalculatedFields,
    showMandatory,
    showUniqueValue,
  } = attributeFormSettings;

  // Check if options fields should be hidden and multi-select disabled for this system attribute in edit mode
  // Only specific module type + system attribute combinations
  const shouldHideOptionsForSystemAttribute = isEditMode && systemAttributeId !== null && shouldHideOptionsCheck(moduleType, systemAttributeId);


  // Check status disable.
  const isStatusDisable = fieldSpec === 0 || fieldSpec === 5;

  // Check if the entire form should be non-editable (specific system attributes like verification fields)
  const isNonEditableSystemField =  isEditMode && systemAttributeId !== null && NON_EDITABLE_SYSTEM_ATTRIBUTES.includes(systemAttributeId);

  // Mandatory checkbox disable logic - simplified for product forms
  const shouldDisableMandatory = false;

  // Check if Regex validation is selected for any field type
  // Numeric: '3' is Regex, Text (Single Line): '4' is Regex, Text (Multi Line): '4' is Regex
  const isRegexValidationSelected =
    (showNumericFields && numericValidationType === '3') ||
    (showTextFields && validationType === '4') ||
    (showMultiLineTextFields && validationType === '4');

  // Product forms don't have User module specific restrictions
  const shouldDisableUniqueValue = false;
  const shouldDisableFieldName = false;

  // Note: Abort is triggered when modal is closed (Cancel button, clicking outside, or pressing escape)
  // All close actions go through handelClose -> cancelAllRequests()


  // Update Redux when attribute type changes and reset type-specific fields
  useEffect(() => {
    if (currentAttributeTypeId) {
      dispatch(setSelectedAttributeType(currentAttributeTypeId));

      // Skip resetting fields when loading edit data - the edit useEffect will populate the values
      if (isEditMode && (isLoadingEditData || editDataLoadedRef.current)) {
        return;
      }

      // Reset mandatory flag (OTP Validation type 19 requires mandatory)
      if (String(currentAttributeTypeId) === '19') {
        setValue('mandatoryFlag', true);
      } else {
        setValue('mandatoryFlag', false);
      }

      // Reset all type-specific fields when attribute type changes
      // Keep attributeTypeId, attributeName, logicalFieldName, and status

      // Reset common flags
      setValue('uniqueFlag', false);
      setValue('otpValidation', false);

      // Reset Single/Multi Select fields
      setValue('behaviourType', '1');
      setValue('showOptionsAlphabetically', false);
      setValue('showFirstOptionSelected', false);
      setOptionRows([{ key: '1', id: null, value: '' }]);

      // Reset Date/DateTime fields
      setValue('dateValueType', '');
      setValue('standardDateValue', '');
      setValue('pastDatesAllowed', '');
      setValue('futureDatesAllowed', '');

      // Reset Text fields
      setValue('validationType', '1');
      setValue('minCharacters', '');
      setValue('maxCharacters', '');

      // Reset Numeric fields
      setValue('allowDecimals', false);
      setValue('numericValidationType', '');
      setValue('minDigits', '');
      setValue('maxDigits', '');
      setValue('minNumber', '');
      setValue('maxNumber', '');

      // Reset Regex fields
      setValue('regexExpression', '');
      setValue('regexErrorMessage', '');

      // Reset Image fields
      setValue('allowBrowsing', false);
      setValue('maxImagesAllowed', '');

      // Reset Document fields
      setValue('documentType', []);
      setValue('maxDocumentsAllowed', '');

      // Reset Video fields
      setValue('maxVideosAllowed', '');

      // Reset Reference Document fields
      setValue('uploadFile', null);

      // Reset Data List fields
      setValue('listName', '');
      setValue('selectParentFieldsValues', []);
      setValue('selectValues', []);
      setValue('addDependentFields', false);
      setValue('dependentFieldList', null);

      // Reset OTP Validation fields
      setValue('entity', '');
      setValue('linkedAttributeId', '');
    }
  }, [currentAttributeTypeId, dispatch, setValue, isEditMode, isLoadingEditData]);


  // Debug: Log attribute form settings changes
  useEffect(() => {
    // Force re-render when settings change
    forceUpdate({});
  }, [attributeFormSettings]);

  // Auto-clear options error after 1.5 seconds
  useEffect(() => {
    if (optionsError) {
      const timer = setTimeout(() => {
        setOptionsError(null);
        setDuplicateOptionIndices(new Set()); // Also clear duplicate indicators
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [optionsError]);

  // Reset OTP Validation when Allow Decimals is enabled
  useEffect(() => {
    if (allowDecimals) {
      setValue('otpValidation', false);
    }
  }, [allowDecimals, setValue]);

  // Auto-update logical field name based on attribute name (only in add mode, not edit mode)
  useEffect(() => {
    // Skip auto-update in edit mode - preserve the existing logical field name from API
    if (isEditMode) {
      return;
    }

    // Only update if field type is selected and logical field should be shown
    if (showLogicalField && selectedAttributeType) {
      // Calculate base prefix for logical field name using moduleNames from Redux
      let basePrefix = '';

      // Find the module name from Redux moduleNames array
      const moduleNameEntry = moduleNames.find(m => m.value === moduleType);
      if (moduleNameEntry) {
        basePrefix = moduleNameEntry.label;
      }

      // Convert base prefix to lowercase with underscores and add dot separator
      const normalizedPrefix = basePrefix
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^\w_]/g, '');

      // If attribute name exists, append it; otherwise just show prefix with dot
      if (attributeName) {
        // Convert attribute name to lowercase with underscores
        const normalizedAttributeName = attributeName
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^\w_]/g, '');

        // Combine: prefix + "." + attribute name
        const logicalName = normalizedPrefix ? `${normalizedPrefix}.${normalizedAttributeName}` : normalizedAttributeName;
        reset({ ...watch(), logicalFieldName: logicalName }, { keepDirty: true });
      } else {
        // Just show prefix with dot when no attribute name
        const logicalName = normalizedPrefix ? `${normalizedPrefix}.` : '';
        reset({ ...watch(), logicalFieldName: logicalName }, { keepDirty: true });
      }
    }
  }, [attributeName, showLogicalField, moduleType, selectedAttributeType, moduleNames, isEditMode]);

  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setIsOptionsPanelOpen(false);
      setOptionRows([{ key: '1', id: null, value: '' }]); // Reset option rows
      setIsCalcExpressionValidated(false);
      setLastValidatedCalcExpression('');
      // Reset attribute form settings to initial state when modal opens (only in add mode)
      // In edit mode, the edit useEffect will set the attribute type from Redux data
      if (!isEditMode) {
        dispatch(resetAttributeFormSettings());
      }
      dispatch(setDateLookupValues([])); // Clear date lookup values on modal open
      dispatch(setLoadingTypes(true));
      const initialLoadController = registerRequest();
      (async () => {
        try {
          // Fetch attribute types, dynamic field names, and module names in parallel
          const { fetchAttributeTypeList } = await import('@/lib/api/attributeApi');
          const [data, dynamicFieldNamesData] = await Promise.all([
            fetchAttributeTypeList(effectiveAttributeTypeModuleType, initialLoadController.signal),
            settingsService.getdynamicFieldNames(projectId, initialLoadController.signal)
          ]);

          // Process attribute types
          let mapped = Array.isArray(data)
            ? data.map((item: any) => ({
              value: item.id,
              label: item.typeName,
            })).filter((opt) => opt.value !== null && opt.value !== '')
            : [];

          // Filter attribute types based on effectiveAttributeTypeModuleType
          if (effectiveAttributeTypeModuleType !== 200) {
            mapped = mapped.filter((opt) => String(opt.value) !== String(14));
          }

          if (effectiveAttributeTypeModuleType <= 200) {
            mapped = mapped.filter((opt) => String(opt.value) !== String(13));
          }

          if (mapped.length === 0) {
            enqueueSnackbar('Attribute types not available', { variant: 'error' });
          }
          dispatch(setAttributeTypes(mapped));
          // Store raw attribute types data for payload (filter active and add displayOrder based on position)
          const rawTypesProcessed = Array.isArray(data)
            ? data
                .map((item: any, index: number) => ({
                  ...item,
                  isActive: 1,
                  displayOrder: index + 1
                }))
            : [];
          setRawAttributeTypes(rawTypesProcessed);

          // Store dynamic field names
          if ((dynamicFieldNamesData as any)?.statusCode === 200 && (dynamicFieldNamesData as any)?.responseData) {
            const moduleNamesMapped = (dynamicFieldNamesData as any).responseData.map((item: any) => ({
              value: item.moduleId,
              label: item.singularName
            }));
            moduleNamesMapped.push({ value: 4, label: "Product" });
            moduleNamesMapped.push({ value: 5, label: "User" });
            dispatch(setModuleNames(moduleNamesMapped));
          }
        } catch (error) {
          const errorMessage = (error instanceof Error) ? error.message : String(error);
          if ((error as DOMException)?.name === 'AbortError' ||
              errorMessage.includes('Abort Request:')) {
            return;
          }
          console.error('Failed to load attribute types or dynamic field names', error);
          enqueueSnackbar('Failed to load attribute types', { variant: 'error' });
          dispatch(setAttributeTypes([]));
        } finally {
          dispatch(setLoadingTypes(false));
          completeRequest(initialLoadController);
        }
      })();

      return () => {
        initialLoadController.abort('Abort Request: Initial load cleanup');
        completeRequest(initialLoadController);
      };
    }
  }, [open, reset, moduleType, projectId, enqueueSnackbar, dispatch, isEditMode]);

  // Populate attribute data when in edit mode using Redux data
  useEffect(() => {
    const populateEditData = async () => {
      if (open && isEditMode && attributeId && attributeTypeList.length > 0 && attributesList.length > 0 && !editDataLoadedRef.current) {
        setIsLoadingEditData(true);

        // Find the attribute in Redux store
        const attributeData = attributesList.find((attr: any) => attr.id === attributeId);

        if (attributeData) {
          editDataLoadedRef.current = true;
          console.log('Edit attribute data from Redux:', attributeData);

          // Check if this is a system attribute (has systemAttribute field with id)
          const sysAttrId = attributeData.systemAttribute?.id || null;
          setSystemAttributeId(sysAttrId);

          // Track fieldSpec for mandatory checkbox logic
          const fieldSpecValue = typeof attributeData.fieldSpec === 'number' ? attributeData.fieldSpec : (attributeData.fieldSpec ? Number(attributeData.fieldSpec) : null);
          setFieldSpec(fieldSpecValue);

          // Set the attribute type first (this will trigger form settings calculation)
          // Use the numeric value to match the options, but keep a string version for conditional checks
          const attrTypeIdNum = attributeData.attributeType?.id;
          const attrTypeId = String(attrTypeIdNum || '');
          setValue('attributeTypeId', attrTypeId); // Set as number to match Select options
          dispatch(setSelectedAttributeType(attrTypeId));

          // Wait a tick for form settings to be calculated
          await new Promise(resolve => setTimeout(resolve, 100));

          // Populate basic fields
          setValue('attributeName', attributeData.attributeName || '');
          setValue('logicalFieldName', attributeData.attributeIdentifierName || '');
          setValue('instructions', attributeData.instructions || '');
          setValue('behaviourType', String(attributeData.behaviourType || '1'));
          setValue('mandatoryFlag', attributeData.mandatoryFlag === 1);
          setValue('uniqueFlag', attributeData.hasUniqueValues === 1);
          setValue('status', String(attributeData.isActive ?? 1));

          // Options fields (Single/Multi Select)
          setValue('showOptionsAlphabetically', attributeData.isOptionsAlphabetically === 1);
          setValue('showFirstOptionSelected', attributeData.showOptionPreselected === 1);

          // Fetch lookup values for Single/Multi Select dropdowns (still need API call for this)
          if (['1', '2', '5'].includes(attrTypeId)) {
            try {
              const lookupResponse = await settingsService.getAttribLookup(attributeId);
              if (lookupResponse.statusCode === 200 && lookupResponse.responseData) {
                const options = lookupResponse.responseData
                  .filter((item: any) => item.isActive === 1)
                  .map((item: any, index: number) => ({
                    key: `existing_${index + 1}`,  // Unique key for React list
                    id: String(item.id),           // Lookup ID from API
                    value: item.lookupValue || '',
                                      }));
                if (options.length > 0) {
                  setOptionRows(options);
                }
              }
            } catch (error) {
              console.error('Failed to fetch lookup values:', error);
            }
          }

          // Text fields (Single Line - type 6)
          if (attrTypeId === '6') {
            setValue('validationType', String(attributeData.characterType || '1'));
            setValue('minCharacters', attributeData.minCharacters !== null && attributeData.minCharacters !== undefined ? String(attributeData.minCharacters) : '');
            setValue('maxCharacters', attributeData.maxCharacters !== null && attributeData.maxCharacters !== undefined ? String(attributeData.maxCharacters) : '');
          }

          // Text fields (Multi Line - type 8)
          if (attrTypeId === '8') {
            setValue('validationType', String(attributeData.characterType || '1'));
            setValue('minCharacters', attributeData.minCharacters !== null && attributeData.minCharacters !== undefined ? String(attributeData.minCharacters) : '');
            setValue('maxCharacters', attributeData.maxCharacters !== null && attributeData.maxCharacters !== undefined ? String(attributeData.maxCharacters) : '');
          }

          // Numeric fields (type 7)
          if (attrTypeId === '7') {
            setValue('allowDecimals', attributeData.decimalFlag === 1);
            setValue('otpValidation', attributeData.otpValidation === 1);
            setValue('numericValidationType', attributeData.numericValidationType ? String(attributeData.numericValidationType) : '');
            setValue('minDigits', attributeData.minDigits !== null && attributeData.minDigits !== undefined ? String(attributeData.minDigits) : '');
            setValue('maxDigits', attributeData.maxDigits !== null && attributeData.maxDigits !== undefined ? String(attributeData.maxDigits) : '');
            setValue('minNumber', attributeData.minNumber !== null && attributeData.minNumber !== undefined ? String(attributeData.minNumber) : '');
            setValue('maxNumber', attributeData.maxNumber !== null && attributeData.maxNumber !== undefined ? String(attributeData.maxNumber) : '');
          }

          // Image fields (type 4)
          if (attrTypeId === '4') {
            setValue('allowBrowsing', attributeData.allowBrowsing === 1);
            setValue('maxImagesAllowed', attributeData.maxImagesAllowed !== null && attributeData.maxImagesAllowed !== undefined ? String(attributeData.maxImagesAllowed) : '');
          }

          // Document fields (type 15)
          if (attrTypeId === '15') {
            // Handle documentType - can be array, single value, or comma-separated string
            // e.g., ['1', '2', '3'] or '1,2,3' or '1' -> ['1', '2', '3']
            const docType = attributeData.documentType;
            let parsedDocTypes: string[] = [];
            if (Array.isArray(docType)) {
              parsedDocTypes = docType.map((v: any) => String(v).trim()).filter((v: string) => v !== '');
            } else if (typeof docType === 'string' && docType) {
              parsedDocTypes = docType.split(',').map(v => v.trim()).filter(v => v !== '');
            } else if (docType) {
              parsedDocTypes = [String(docType)];
            }
            setValue('documentType', parsedDocTypes);
            // API uses maxImagesAllowed for documents as well
            setValue('maxDocumentsAllowed', attributeData.maxImagesAllowed !== null ? String(attributeData.maxImagesAllowed) : '');
          }

          // Video fields (type 16)
          if (attrTypeId === '16') {
            // API uses maxImagesAllowed for videos as well
            setValue('maxVideosAllowed', attributeData.maxImagesAllowed !== null ? String(attributeData.maxImagesAllowed) : '');
          }

          // Reference Document fields (type 17) - handle uploaded files
          if (attrTypeId === '17' && attributeData.referenceDocumentUrl) {
            const urls = attributeData.referenceDocumentUrl.filter((url: string) => url && url.trim() !== '');
            if (urls.length > 0) {
              const existingFiles = urls.map((url: string, index: number) => ({
                name: url.split('/').pop() || `file_${index + 1}`,
                serverUrl: url,
                isExisting: true
              }));
              setValue('uploadFile', existingFiles);
            }
          }

          // Date/DateTime fields (type 3, 21) - still need API call for custom date attributes
          if (['3', '21'].includes(attrTypeId)) {
            try {
              const dateAttrResponse = await settingsService.getCustomDateAttribute(attributeId);
              if (dateAttrResponse.statusCode === 200 && dateAttrResponse.responseData) {
                const dateData = dateAttrResponse.responseData;
                // Store date attribute ID for edit mode (required when saving)
                if (dateData.id) {
                  setDateAttributeId(dateData.id);
                }
                // Check if stdLookupAttribute has a value (Standard) or is null (Custom)
                // stdLookupAttribute is an object with id property when Standard
                if (dateData.stdLookupAttribute !== null && dateData.stdLookupAttribute !== undefined) {
                  // Standard date type - stdLookupAttribute.id contains the date lookup id
                  setValue('dateValueType', 'Standard');
                  setValue('standardDateValue', String(dateData.stdLookupAttribute.id || dateData.stdLookupAttribute));
                } else {
                  // Custom date type - has previousDateAllowed/futureDateAllowed values
                  setValue('dateValueType', 'Custom');
                  setValue('pastDatesAllowed', dateData.previousDateAllowed !== null && dateData.previousDateAllowed !== undefined ? String(dateData.previousDateAllowed) : '');
                  setValue('futureDatesAllowed', dateData.futureDateAllowed !== null && dateData.futureDateAllowed !== undefined ? String(dateData.futureDateAllowed) : '');
                }
              }
            } catch (error) {
              console.error('Failed to fetch custom date attributes:', error);
            }
          }

          // Data List fields (type 18)
          if (attrTypeId === '18') {
            if (attributeData.parentDataListId) {
              setValue('listName', String(attributeData.parentDataListId));
            }
            setValue('addDependentFields', attributeData.addDataListDependentFields === 1);

            // Fetch lookup values for the current attribute being edited
            // This returns selectedParentFiledValues and lookupValues
            try {
              const dataListLookupResponse = await settingsService.getDataListLookupValues(attributeId);
              if (dataListLookupResponse.statusCode === 200 && dataListLookupResponse.responseData) {
                const responseData = dataListLookupResponse.responseData;

                // Populate parent field values (API uses "selectedParentFiledValues" with typo)
                if (responseData.selectedParentFiledValues && responseData.selectedParentFiledValues.length > 0) {
                  const parentFieldValueIds = responseData.selectedParentFiledValues
                    .filter((pv: any) => pv.isActive === 1)
                    .map((pv: any) => String(pv.dataListValueId));
                  setValue('selectParentFieldsValues', parentFieldValueIds);
                }

                // Populate child lookup values (selectValues) from lookupValues
                // API behavior:
                // - When values ARE selected: lookupValues items do NOT have 'attributeId' field
                // - When NO values are selected (all available): lookupValues items HAVE 'attributeId' field
                if (responseData.lookupValues && responseData.lookupValues.length > 0) {
                  // Check if first item has 'attributeId' - if yes, no values are selected
                  const hasAttributeId = responseData.lookupValues[0].hasOwnProperty('attributeId');

                  if (!hasAttributeId) {
                    // Values ARE selected - populate the selectValues field
                    const childValueIds = responseData.lookupValues
                      .filter((lv: any) => lv.isActive === 1)
                      .map((lv: any) => String(lv.dataListValueId || lv.id));
                    setValue('selectValues', childValueIds);
                  }
                  // If hasAttributeId is true, no values were selected - leave selectValues empty
                }
              }
            } catch (error) {
              console.error('Failed to fetch data list lookup values for edit:', error);
            }
          }

          // OTP Validation fields (type 19)
          if (attrTypeId === '19') {
            // IMPORTANT: Set pendingLinkedAttributeIdRef BEFORE setting entity
            // This ensures the value is available when the entity fields useEffect runs
            if (attributeData.linkedAttributeId) {
              pendingLinkedAttributeIdRef.current = String(attributeData.linkedAttributeId);
            }
            if (attributeData.linkedAttributeModuleId) {
              setValue('entity', String(attributeData.linkedAttributeModuleId));
            }
          }

          // Regex validation fields
          if (attributeData.addValidation === 1) {
            setValue('regexExpression', attributeData.regexExpression || '');
            setValue('regexErrorMessage', attributeData.errorMessage || '');
          }

          // Calculated Field (type 14)
          // calculationFormula can be stored as:
          // - legacy comma-separated tokens: "{66158},+,{66159}"
          // - new no-comma token stream: "{66158}+{66159}"
          if (attrTypeId === '14') {
            const formula = attributeData.calculationFormula || '';
            // Store raw formula; it will be converted to display format once calcNumericFields are loaded.
            // Normalize commas to spaces so edit behaves like add (space-separated tokens)
            setValue('calculationLogic', formula.replace(/,/g, ' ').trim());
          }

          setIsLoadingEditData(false);
        } else {
          enqueueSnackbar('Attribute not found in store', { variant: 'error' });
          setIsLoadingEditData(false);
          handelClose();
        }
      }
    };

    populateEditData();
  }, [open, isEditMode, attributeId, attributeTypeList, attributesList, setValue, dispatch, enqueueSnackbar]);

  // Convert stored calculationFormula (with {id} tokens) to display format (field names + spaced operators)
  useEffect(() => {
    if (!showCalculatedFields || !open) return;
    if (!calcNumericFields || calcNumericFields.length === 0) return;
    if (calcFormulaConvertedRef.current) return;

    const raw = (getValues('calculationLogic') || '').trim();
    if (!raw) return;

    // Only convert if it looks like persisted formula with {id} tokens.
    if (!/[{][0-9]+[}]/.test(raw)) {
      calcFormulaConvertedRef.current = true;
      return;
    }

    const normalized = raw.replace(/,/g, '');
    const tokens = normalized.match(/\{\d+\}|[+\-*/()]|\d+(?:\.\d+)?/g) || [];

    const toDisplay = tokens
      .map((token) => {
        const match = token.match(/^\{(\d+)\}$/);
        if (match) {
          const id = Number(match[1]);
          const field = calcNumericFields.find((f) => Number(f.attributeId) === id);
          return field?.attributeName || token;
        }
        return token;
      })
      .join(' ');

    setValue('calculationLogic', toDisplay);
    calcFormulaConvertedRef.current = true;
  }, [showCalculatedFields, open, calcNumericFields, getValues, setValue]);

  // Reset edit data loaded flag and pending values when modal closes
  useEffect(() => {
    if (!open) {
      editDataLoadedRef.current = false;
      pendingLinkedAttributeIdRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!showCalculatedFields) return;
    const normalized = (calculationLogic || '').replace(/\s+/g, ' ').trim();
    const normalizedLast = (lastValidatedCalcExpression || '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      setIsCalcExpressionValidated(false);
      setLastValidatedCalcExpression('');
      return;
    }
    if (normalizedLast && normalized !== normalizedLast) {
      setIsCalcExpressionValidated(false);
    }
  }, [calculationLogic, lastValidatedCalcExpression, showCalculatedFields]);

  // Fetch date lookup values when Date or DateTime attribute type is selected
  useEffect(() => {
    if (showDateFields && currentAttributeTypeId) {
      const selectedType = attributeTypeList.find(type => String(type.value) === String(currentAttributeTypeId));
      if (selectedType) {
        const dateLookupController = registerRequest();
        dispatch(setLoadingDateLookup(true));
        settingsService.getStdLookupForAttributeTypes(
          Number(currentAttributeTypeId),
          selectedType.label,
          dateLookupController.signal
        ).then((response) => {
          // Sort by ID ascending and map to dropdown options
          const sortedResponse = [...(response || [])].sort((a: { id: number }, b: { id: number }) => a.id - b.id);
          const mappedValues = sortedResponse.map((item: { id: number; value: string }) => ({
            value: String(item.id),
            label: item.value
          }));
          dispatch(setDateLookupValues(mappedValues));

        }).catch((error) => {
          if ((error as DOMException)?.name === 'AbortError') {
            return;
          }
          console.error('Failed to fetch date lookup values:', error);
          dispatch(setDateLookupValues([]));
        }).finally(() => {
          dispatch(setLoadingDateLookup(false));
          completeRequest(dateLookupController);
        });

        return () => {
          dateLookupController.abort('Abort Request: Date lookup cleanup');
          completeRequest(dateLookupController);
        };
      }
    } else {
      dispatch(setDateLookupValues([]));
    }
  }, [showDateFields, currentAttributeTypeId, attributeTypeList, dispatch]);

  // Fetch entity fields when entity is selected for OTP Validation (type 19)
  useEffect(() => {
    if (showOTPFields && selectedEntity) {
      const entityFieldsController = registerRequest();
      setIsLoadingEntityFields(true);
      // Only reset linked attribute if there's no pending value from edit mode
      if (!pendingLinkedAttributeIdRef.current) {
        setValue('linkedAttributeId', '');
      }

      settingsService.getFieldDetails(projectId, Number(selectedEntity), entityFieldsController.signal)
        .then((response) => {
          if (response.statusCode === 200 && response.responseData) {
            // For OTP Validation (type 19), filter to only show Numeric fields (attributeType.id == 7)
            const filteredFields = response.responseData
              .filter((field: any) => {
                // For OTP Validation, only show Numeric fields
                if (String(currentAttributeTypeId) === '19') {
                  return field.attributeType?.id === 7;
                }
                return true;
              })
              .map((field: any) => ({
                value: String(field.id),
                label: field.attributeName
              }));
            setEntityFieldsList(filteredFields);

            // If there's a pending linkedAttributeId from edit mode, set it now
            if (pendingLinkedAttributeIdRef.current) {
              setValue('linkedAttributeId', String(pendingLinkedAttributeIdRef.current));
              pendingLinkedAttributeIdRef.current = null; // Clear pending after setting
            }
          } else {
            setEntityFieldsList([]);
          }
        })
        .catch((error) => {
          if ((error as DOMException)?.name === 'AbortError') {
            return;
          }
          console.error('Failed to fetch entity fields:', error);
          setEntityFieldsList([]);
        })
        .finally(() => {
          setIsLoadingEntityFields(false);
          completeRequest(entityFieldsController);
        });

      return () => {
        entityFieldsController.abort('Abort Request: Entity fields cleanup');
        completeRequest(entityFieldsController);
      };
    } else {
      setEntityFieldsList([]);
    }
  }, [showOTPFields, selectedEntity, currentAttributeTypeId, projectId, setValue]);

  // Fetch data list fields when Data List type (18) is selected
  useEffect(() => {
    if (showDataListFields) {
      const dataListFieldsController = registerRequest();
      setIsLoadingDataListFields(true);
      // Reset data list related states
      setDataListFields([]);
      setDataListOptions([]);
      setParentLookupValues([]);
      setDataListLookupValues([]);
      setSelectedDataListHasParent(false);

      settingsService.getFieldDetails(projectId, SystemAttributeEnum.DATA_LIST_MODULE, dataListFieldsController.signal) // moduleType 6 = Data List
        .then((response) => {
          if (response.statusCode === 200 && response.responseData) {
            // Filter for items with hasChildAttribute === true (data lists that can be selected)
            const filteredFields = response.responseData.filter(
              (field: any) => field.hasChildAttribute === true
            );
            setDataListFields(filteredFields);
            // Map to dropdown options format
            const options = filteredFields.map((field: DataListField) => ({
              value: String(field.id),
              label: field.attributeName
            }));
            setDataListOptions(options);
          } else {
            setDataListFields([]);
            setDataListOptions([]);
          }
        })
        .catch((error) => {
          if ((error as DOMException)?.name === 'AbortError') {
            return;
          }
          console.error('Failed to fetch data list fields:', error);
          setDataListFields([]);
          setDataListOptions([]);
        })
        .finally(() => {
          setIsLoadingDataListFields(false);
          completeRequest(dataListFieldsController);
        });

      return () => {
        dataListFieldsController.abort('Abort Request: Data list fields cleanup');
        completeRequest(dataListFieldsController);
      };
    } else {
      // Clear data list states when not showing data list fields
      setDataListFields([]);
      setDataListOptions([]);
      setParentLookupValues([]);
      setDataListLookupValues([]);
      setSelectedDataListHasParent(false);
    }
  }, [showDataListFields, projectId]);

  // Fetch numeric fields when Calculated Field type (14) is selected
  useEffect(() => {
    if (showCalculatedFields && moduleType) {
      setIsLoadingCalcFields(true);
      setCalcNumericFields([]);
      
      productFormService.getNumericFieldsForCalculation(projectId, String(moduleType))
        .then((response) => {
          if (response.statusCode === 200 && response.responseData) {
            setCalcNumericFields(response.responseData);
          } else {
            setCalcNumericFields([]);
          }
        })
        .catch((error) => {
          console.error('Failed to fetch numeric fields for calculation:', error);
          setCalcNumericFields([]);
        })
        .finally(() => {
          setIsLoadingCalcFields(false);
        });
    } else {
      setCalcNumericFields([]);
    }
  }, [showCalculatedFields, projectId, moduleType]);

  // Fetch lookup values when List Name is selected
  useEffect(() => {
    if (showDataListFields && selectedListName) {
      const dataListLookupController = registerRequest();
      setIsLoadingLookupValues(true);
      // Reset lookup values (but keep form values in edit mode - they will be populated after fetch)
      setParentLookupValues([]);
      setDataListLookupValues([]);
      setAllDataListLookupValues([]);
      setParentRelationList([]);
      // Only reset form values if not in edit mode (in edit mode, values are set from populateEditData)
      if (!isEditMode) {
        setValue('selectParentFieldsValues', []);
        setValue('selectValues', []);
      }

      // Find the selected data list field to check if it has parent
      const selectedField = dataListFields.find(
        (field) => String(field.id) === String(selectedListName)
      );

      if (selectedField) {
        const hasParent = selectedField.parentId > 0;
        setSelectedDataListHasParent(hasParent);

        // Fetch lookup values for the selected data list
        settingsService.getDataListLookupValues(Number(selectedListName), dataListLookupController.signal)
          .then((response) => {
            if (response.statusCode === 200 && response.responseData) {
              // Map all available lookup values for dropdown options
              // Use dataListLookupValues for all available options (not lookupValues which contains selected values)
              const allValues = (response.responseData.dataListLookupValues || response.responseData.lookupValues || []).map((item: any) => ({
                value: String(item.dataListValueId || item.id),
                label: item.lookupValue
              }));
              // Store both filtered and full list
              setDataListLookupValues(allValues);
              setAllDataListLookupValues(allValues);

              // Store parent relation list for filtering
              if (response.responseData.parentRelationList) {
                setParentRelationList(response.responseData.parentRelationList);
              }

              // If has parent, also get parent lookup values
              if (hasParent && response.responseData.parentLookupValues) {
                const parentValues = response.responseData.parentLookupValues.map((item: any) => ({
                  value: String(item.id),
                  label: item.lookupValue
                }));
                setParentLookupValues(parentValues);
              }
            }
          })
          .catch((error) => {
            if ((error as DOMException)?.name === 'AbortError') {
              return;
            }
            console.error('Failed to fetch data list lookup values:', error);
            setParentLookupValues([]);
            setDataListLookupValues([]);
            setAllDataListLookupValues([]);
            setParentRelationList([]);
          })
          .finally(() => {
            setIsLoadingLookupValues(false);
            completeRequest(dataListLookupController);
          });
      } else {
        setSelectedDataListHasParent(false);
        setIsLoadingLookupValues(false);
        completeRequest(dataListLookupController);
      }

      return () => {
        dataListLookupController.abort('Abort Request: Data list lookup cleanup');
        completeRequest(dataListLookupController);
      };
    } else {
      // Clear lookup values when no list is selected
      setParentLookupValues([]);
      setDataListLookupValues([]);
      setAllDataListLookupValues([]);
      setParentRelationList([]);
      setSelectedDataListHasParent(false);
    }
  }, [showDataListFields, selectedListName, dataListFields]);

  // Filter child lookup values based on selected parent field values
  useEffect(() => {
    if (selectedDataListHasParent && parentRelationList.length > 0) {
      if (selectedParentFieldsValues && selectedParentFieldsValues.length > 0) {
        // Get child lookup value IDs that are related to selected parent values
        const childLookupValueIds = parentRelationList
          .filter(relation => selectedParentFieldsValues.includes(String(relation.parentLookupValueId)))
          .map(relation => relation.childLookupValueId);

        // Filter the lookup values to only show related children
        const filteredValues = allDataListLookupValues.filter(
          item => childLookupValueIds.includes(Number(item.value))
        );
        setDataListLookupValues(filteredValues);

        // Clear selected values that are no longer in the filtered list
        const currentSelectValues = watch('selectValues') || [];
        const validSelectValues = currentSelectValues.filter(
          (val: string) => childLookupValueIds.includes(Number(val))
        );
        if (validSelectValues.length !== currentSelectValues.length) {
          setValue('selectValues', validSelectValues);
        }
      } else {
        // No parent values selected - show all lookup values
        setDataListLookupValues(allDataListLookupValues);
      }
    }
  }, [selectedParentFieldsValues, parentRelationList, allDataListLookupValues, selectedDataListHasParent, setValue, watch]);

  const handleCancel = () => {
    handelClose();
  };

  // Handle drag end for reordering options
  const handleOptionsDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) {
      return;
    }

    setOptionRows((prevRows) => {
      const newRows = Array.from(prevRows);
      const [removed] = newRows.splice(sourceIndex, 1);
      newRows.splice(destinationIndex, 0, removed);
      return newRows;
    });
  }, []);

  const handelClose = () => {
    cancelAllRequests();
    reset(defaultValues);
    setIsOptionsPanelOpen(false);
    setOptionRows([{ key: '1', id: null, value: '' }]);
    setSystemAttributeId(null); // Reset system attribute ID
    setFieldSpec(null); // Reset fieldSpec
    setDateAttributeId(null); // Reset date attribute ID
    setOptionsError(null); // Reset options validation error
    setDuplicateOptionIndices(new Set()); // Reset duplicate option indices
    setIsTestAreaOpen(false); // Reset test area modal
    setTestFieldValues({}); // Reset test field values
    setCalcApiValidationLoading(false);
    setCalcApiValidationResult(null);
    calcFormulaConvertedRef.current = false; // Reset calculation formula conversion flag
    onClose();
  }

  useEffect(() => {
    if (!isTestAreaOpen) {
      setCalcApiValidationLoading(false);
      setCalcApiValidationResult(null);
      return;
    }

    setCalcApiValidationResult(null);
  }, [isTestAreaOpen]);

  const onSubmit = async (values: FormValues) => {

    // Validate options for Single/Multi Select - check for blank and duplicate options
    // Only validate if options section is visible (showOptions) AND not hidden for system attributes
    if (showOptions && !shouldHideOptionsForSystemAttribute) {
      const hasBlankOption = optionRows.some(row => row.value.trim() === '');
      if (hasBlankOption) {
        setOptionsError('Please fill in all options. Options cannot be blank!');
        setDuplicateOptionIndices(new Set());
        return;
      }
      // Also ensure at least one option exists
      if (optionRows.length === 0 || optionRows.every(row => row.value.trim() === '')) {
        setOptionsError('Options cannot be blank!');
        setDuplicateOptionIndices(new Set());
        return;
      }
      // Check for duplicate options (case-insensitive) and find which indices are duplicates
      const optionValues = optionRows.map(row => row.value.trim().toLowerCase());
      const valueCount: Record<string, number[]> = {};
      optionValues.forEach((value, index) => {
        if (!valueCount[value]) {
          valueCount[value] = [];
        }
        valueCount[value].push(index);
      });

      // Find all indices that have duplicates
      const duplicateIndices = new Set<number>();
      Object.values(valueCount).forEach(indices => {
        if (indices.length > 1) {
          indices.forEach(idx => duplicateIndices.add(idx));
        }
      });

      if (duplicateIndices.size > 0) {
        setDuplicateOptionIndices(duplicateIndices);
        setOptionsError('Duplicate options are not allowed. Please enter unique values.');
        return;
      }
      // Clear error if validation passes
      setOptionsError(null);
      setDuplicateOptionIndices(new Set());
    }

    // Require Test Area validation for Calculated Field before saving
    if (showCalculatedFields) {
      const expression = values.calculationLogic || '';
      if (!expression.trim()) {
        enqueueSnackbar('Calculation logic cannot be blank', { variant: 'error' });
        return;
      }

      const normalized = (expression || '').replace(/\s+/g, ' ').trim();
      const normalizedLast = (lastValidatedCalcExpression || '').replace(/\s+/g, ' ').trim();
      const isSameAsValidated = normalizedLast && normalized === normalizedLast;

      if (!isCalcExpressionValidated || !isSameAsValidated) {
        setShowValidateCalcDialog(true);
        return;
      }
    }

    // Get attribute type info from raw data (contains full object with id, typeName, isActive, displayOrder)
    const selectedAttrType = rawAttributeTypes.find(type => String(type.id) === String(values.attributeTypeId));
    // Build dateAttributes object for Date/DateTime fields
    // Structure: { id, stdLookupAttribute, previousDateAllowed, futureDateAllowed }
    let dateAttributes: any = null;
    if (values.dateValueType) {
      if (values.dateValueType === 'Standard') {
        // Standard date type - stdLookupAttribute contains the lookup id as object { id: X }
        dateAttributes = {
          id: isEditMode ? dateAttributeId : null,
          stdLookupAttribute: values.standardDateValue ? { id: parseInt(values.standardDateValue) } : null,
          previousDateAllowed: null,
          futureDateAllowed: null,
        };
      } else if (values.dateValueType === 'Custom') {
        // Custom date type - previousDateAllowed/futureDateAllowed contain the values
        dateAttributes = {
          id: isEditMode ? dateAttributeId : null,
          stdLookupAttribute: null,
          previousDateAllowed: values.pastDatesAllowed ? String(values.pastDatesAllowed) : null,
          futureDateAllowed: values.futureDatesAllowed ? String(values.futureDatesAllowed) : null,
        };
      }
    }

    // Get the selected data list field to find parent attribute ID
    const selectedDataListField = dataListFields.find(
      (field) => String(field.id) === String(values.listName)
    );
    const parentAttributeId = selectedDataListField?.parentId || null;

    // Transform parent field values from multi-select array (for Data List)
    // dataListId should be the parent attribute's ID, not the selected list
    const parentFieldValues = values.selectParentFieldsValues?.length > 0
      ? values.selectParentFieldsValues
        .map((valueId: string) => {
          return {
            dataListValueId: Number(valueId),
            dataListId: parentAttributeId,
            isActive: 1,
          };
        })
      : null;

    // Transform selected values from multi-select array (for Data List lookupValues)
    const dataListSelectedValues = values.selectValues?.length > 0
      ? values.selectValues
        .map((valueId: string, index: number) => {
          const option = dataListLookupValues.find(opt => opt.value === valueId);
          return {
            dataListId: values.listName ? Number(values.listName) : null,
            dataListValueId: Number(valueId),
            id: null,
            isActive: 1,
            lookupValue: option?.label || '',
            statusDisplayOrder: index + 1
          };
        })
        .filter(item => !Number.isNaN(item.dataListValueId))
      : null;

    // Transform form values to API payload format (matching saveAttributeData structure)
    const payload: any = {
      id: attributeId || null,
      // Basic fields
      attributeName: values.attributeName?.trim(),
      projectId: projectId,
      parentAttribId: values.linkedAttributeId ? parseInt(values.linkedAttributeId) : null,
      parentFormId: null, // TODO: selectionType from addAttributeData
      instructions: values.instructions?.trim() || '',
      mandatoryFlag: values.mandatoryFlag ? 1 : 0,
      moduleType: moduleType,
      behaviourType: parseInt(values.behaviourType),
      fieldSpec: isEditMode ? fieldSpec : 2,
      displayOrder: 9999,
      hasUniqueValues: values.uniqueFlag ? 1 : 0,

      // Attribute type
      attributeType: {
        typeName: selectedAttrType?.typeName || '',
        displayOrder: selectedAttrType?.displayOrder,
        isActive: selectedAttrType?.isActive,
        id: parseInt(values.attributeTypeId)
      },

      // Text field validations
      characterType: values.validationType ? parseInt(values.validationType) : null,
      // validationType 4 = Regex - min/max characters not applicable for regex validation
      minCharacters: values.validationType && values.validationType === '4' // Regex
        ? null
        : (values.minCharacters ? parseInt(values.minCharacters) : null),
      maxCharacters: values.validationType && values.validationType === '4' // Regex
        ? null
        : (values.maxCharacters ? parseInt(values.maxCharacters) : null),

      // Image fields
      allowBrowsing: values.allowBrowsing ? 1 : 0,
      // maxImagesAllowed is used for images, hand, and videos in the API
      maxImagesAllowed: values.maxImagesAllowed || values.maxDocumentsAllowed || values.maxVideosAllowed
        ? parseInt(values.maxImagesAllowed || values.maxDocumentsAllowed || values.maxVideosAllowed)
        : null,

      // Numeric field validations
      numericValidationType: values.numericValidationType ? parseInt(values.numericValidationType) : 0,
      minDigits: values.numericValidationType && values.numericValidationType === '1' && values.minDigits ? parseInt(values.minDigits) : null,
      maxDigits: values.numericValidationType && values.numericValidationType === '1' && values.maxDigits ? parseInt(values.maxDigits) : null,
      minNumber: values.numericValidationType && values.numericValidationType === '2' && values.minNumber ? parseInt(values.minNumber) : null,
      maxNumber: values.numericValidationType && values.numericValidationType === '2' && values.maxNumber ? parseInt(values.maxNumber) : null,

      // Document fields - convert array to comma-separated string for API
      documentType: Array.isArray(values.documentType) ? values.documentType.join(',') : (values.documentType || ''),
      // Extract server URLs from uploaded files for referenceDocumentUrl
      // Strip base URL if present to store only relative path
      referenceDocumentUrl: values.uploadFile
        ? (Array.isArray(values.uploadFile)
          ? values.uploadFile.map((file: any) => {
              if (!file.serverUrl) return null;
              const baseUrl = process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL || '';
              // Remove base URL if present (with or without trailing slash)
              if (baseUrl && file.serverUrl.startsWith(baseUrl)) {
                return file.serverUrl.substring(baseUrl.length);
              }
              // Also handle case where URL starts with https:// but contains the base domain
              const baseUrlDomain = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
              if (baseUrlDomain && file.serverUrl.includes(baseUrlDomain)) {
                const domainIndex = file.serverUrl.indexOf(baseUrlDomain);
                return file.serverUrl.substring(domainIndex + baseUrlDomain.length + 1); // +1 for trailing slash
              }
              return file.serverUrl;
            }).filter(Boolean)
          : values.uploadFile.serverUrl ? (() => {
              const serverUrl = values.uploadFile.serverUrl;
              const baseUrl = process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL || '';
              if (baseUrl && serverUrl.startsWith(baseUrl)) {
                return [serverUrl.substring(baseUrl.length)];
              }
              const baseUrlDomain = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
              if (baseUrlDomain && serverUrl.includes(baseUrlDomain)) {
                const domainIndex = serverUrl.indexOf(baseUrlDomain);
                return [serverUrl.substring(domainIndex + baseUrlDomain.length + 1)];
              }
              return [serverUrl];
            })() : null)
        : null,

      // Options fields
      isOptionsAlphabetically: values.showOptionsAlphabetically ? 1 : 0,
      // Calculated Field (type 14): send formula in {id}*{id} format; do not send calculationExpression
      calculationFormula: showCalculatedFields ? (() => {
        // Convert expression to token stream with IDs in curly braces (NO commas)
        // Format: {100}*{101}
        let formula = values.calculationLogic || '';

        // First, replace field names with placeholder tokens to avoid conflicts
        const fieldPlaceholders: { placeholder: string; id: number }[] = [];
        calcNumericFields.forEach((field, index) => {
          const placeholder = `__FIELD_${index}__`;
          const regex = new RegExp(`\\b${field.attributeName}\\b`, 'g');
          if (regex.test(formula)) {
            fieldPlaceholders.push({ placeholder, id: field.attributeId });
            formula = formula.replace(new RegExp(`\\b${field.attributeName}\\b`, 'g'), placeholder);
          }
        });

        // Remove all spaces
        formula = formula.replace(/\s+/g, '');

        // Tokenize the expression: split by operators while keeping them
        const tokens: string[] = [];
        let currentToken = '';
        for (let i = 0; i < formula.length; i++) {
          const char = formula[i];
          if (['+', '-', '*', '/', '(', ')'].includes(char)) {
            if (currentToken) {
              tokens.push(currentToken);
              currentToken = '';
            }
            tokens.push(char);
          } else {
            currentToken += char;
          }
        }
        if (currentToken) {
          tokens.push(currentToken);
        }

        // Convert placeholders back to {id} format
        const finalTokens = tokens.map((token) => {
          const fieldMatch = fieldPlaceholders.find((f) => f.placeholder === token);
          if (fieldMatch) {
            return `{${fieldMatch.id}}`;
          }
          return token;
        });

        return finalTokens.join('');
      })() : null,
      // For Data List type, use dataListSelectedValues; for Single/Multi Select, use optionRows
      lookupValues: showDataListFields
        ? (dataListSelectedValues || [])
        : optionRows
          .filter(row => row.value.trim() !== '')
          .map(row => ({
            id: row.id && !isNaN(Number(row.id)) ? Number(row.id) : null,
            lookupValue: row.value.trim(),
            isActive: 1,
            stageId: null,
          })),

      // Date fields
      dateAttributes: dateAttributes,

      // Data List fields
      parentDataListId: values.listName ? Number(values.listName) : null,
      addDataListDependentFields: values.addDependentFields ? 1 : 0,
      dependentFilelds: values.dependentFieldList || null,
      parentFieldValues: parentFieldValues,
      showAllDataListValues: showDataListFields && values.selectValues?.length === 0 ? 1 : null,

      // Status and identifiers
      status: parseInt(values.status),
      attributeIdentifierName: values.logicalFieldName || '',

      // Flags
      otpValidation: values.otpValidation ? 1 : 0,
      decimalFlag: values.allowDecimals ? 1 : 0,
      isAllowQuantityTransfer: 0,
      productQuantityTransferDetail: null,

      // Validation
      addValidation: values.regexExpression ? 1 : 0,
      regexExpression: values.regexExpression || null,
      errorMessage: values.regexErrorMessage || null,

      // Pre-selection
      showOptionPreselected: values.showFirstOptionSelected ? 1 : 0,
    };

    console.log('Transformed payload:', payload);

    setIsSaving(true);
    try {
      if (!isEditMode) {
        const response = await settingsService.addCustomAttribute(payload);
        if (response.statusCode === 201 || response.statusCode === 200) {
          enqueueSnackbar('Attribute added successfully', { variant: 'success' });
          onSave?.(payload);
          handelClose();
        } else {
          // Prioritize responseData for error message (it contains the actual error)
          const errorMsg = response.responseData || response.message || 'Failed to add attribute';
          enqueueSnackbar(errorMsg, { variant: 'error' });
        }
      } else {
        const response = await settingsService.editCustomAttribute(payload);
        if (response.statusCode === 201 || response.statusCode === 200) {
          enqueueSnackbar('Attribute Updated successfully', { variant: 'success' });
          onSave?.(payload);
          handelClose();
        } else {
          // Prioritize responseData for error message (it contains the actual error)
          const errorMsg = response.responseData || response.message || 'Failed to update attribute';
          enqueueSnackbar(errorMsg, { variant: 'error' });
        }
      }
    } catch (error: any) {
      // Try to extract error message - prioritize responseData as it contains the actual error
      const errorMessage =
        error?.data?.responseData ||
        error?.data?.message ||
        error?.data?.error ||
        error?.message ||
        error?.statusText ||
        'Error saving attribute';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TwinModal
      open={open}
      onClose={handelClose}
      secondaryOpen={isOptionsPanelOpen}
      secondaryHeader={<div className="flex items-center justify-between"><h2 className="text-base font-semibold text-[#3F4254]">Options</h2></div>}
      secondaryContent={<p className="text-sm text-gray-700">Options go here...</p>}
      secondaryFooter={
        <Button
          className="mr-4 bg-[#E4E6EF] hover:bg-gray-300 text-[#3F4254] rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm"
          onClick={() => setIsOptionsPanelOpen(false)}
        >
          Close
        </Button>
      }
      header={<div className="flex items-center justify-between"><h2 className="text-base font-semibold text-[#3F4254]">{isEditMode ? 'Edit Field' : 'Add New Field'}</h2></div>}
      footer={
        <>
          <Button
            className="bg-[#E4E6EF] hover:bg-gray-300 text-[#3F4254] rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Cancel"
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#3699FF] hover:bg-blue-600 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
            aria-label="Save"
            type="submit"
            onClick={handleSubmit(onSubmit)}
            disabled={isFormBusy || !selectedAttributeType}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              'Save'
            )}
          </Button>
        </>
      }
      modalClassName={`
        max-w-[800px]
        transition-all duration-300
        ${isOptionsPanelOpen ? 'translate-x-[-180px]' : 'translate-x-0'}
      `}
      mainHeightClassName={!selectedAttributeType ? 'h-auto top-0 max-h-[70vh]' : undefined}
      allowBorder
      allowBorderForSub
      closeOnOutsideClick={false}
    >
      <div className="bg-white">
        <ValidateCalculationLogicDialog
          open={showValidateCalcDialog}
          onClose={() => setShowValidateCalcDialog(false)}
        />
        <form className="space-y-4 pt-1" onSubmit={handleSubmit(onSubmit)}>
          {/* Field Type */}
          <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
            <div className="col-span-4 pt-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Field Type<span className="text-[#F64E60] ml-1">*</span>
              </label>
            </div>
            <div className="col-span-8">
              <Select
                name="attributeTypeId"
                control={control}
                options={displayAttributeTypeList}
                placeholder="--Select Attribute Type--"
                maxWidth="max-w-xl"
                validationRules={validationRules.attributeTypeId}
                loading={isDataLoading}
                disabled={isFormBusy || isEditMode}
                hint={<div className='text-[10px]'>
                  {isEditMode ? 'Field type cannot be changed in edit mode' : 'Select what type of data will be entered in this field'}
                </div>}
              />
            </div>
          </div>

          {!!selectedAttributeType && (
            <>
              {/* Field Name */}
              <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                <div className="col-span-4 pt-1.5">
                  <label className="block text-sm font-medium text-gray-700">Field Name<span className="text-[#F64E60] ml-1">*</span></label>
                </div>
                <div className="col-span-8">
                  <TextInput
                    name="attributeName"
                    control={control}
                    placeholder=""
                    maxLength={500}
                    showCharacterCount
                    pattern={/^[a-zA-Z0-9\s]*$/}
                    maxWidth="max-w-xl"
                    validationRules={validationRules.attributeName}
                    disabled={shouldDisableFieldName}
                    hint={<div className='text-[10px]'>
                      Field name can only contain letters, numbers, and spaces
                    </div>}
                  />
                </div>
              </div>

              {/* Logical Field Name */}
              {showLogicalField && (
                <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                  <div className="col-span-4 pt-1.5">
                    <label className="block text-sm font-medium text-gray-700">Logical Field Name</label>
                  </div>
                  <div className="col-span-8">
                    <TextInput
                      name="logicalFieldName"
                      control={control}
                      placeholder=""
                      showCharacterCount
                      pattern={/^.*$/}
                      maxWidth="max-w-xl"
                      disabled
                      validationRules={validationRules.logicalFieldName}
                    />
                  </div>
                </div>
              )}

              {/* Field Instructions - Not for Header Text, Normal Text, Page Separator */}
              {!['10', '11', '12'].includes(String(currentAttributeTypeId)) && (
                <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                  <div className="col-span-4 pt-1.5">
                    <label className="block text-sm font-medium text-gray-700">Field Instructions</label>
                  </div>
                  <div className="col-span-8">
                    <TextInput
                      name="instructions"
                      control={control}
                      placeholder="Enter Info"
                      maxLength={200}
                      showCharacterCount
                      pattern={/^.*$/}
                      maxWidth="max-w-xl"
                      hint={<div className='text-[10px]'>Enter the instructions to show for adding data in this field.</div>}
                      validationRules={validationRules.instructions}
                    />
                  </div>
                </div>
              )}

              {/* Options - Only for Single/Multi Select, hidden for specific system attributes in edit mode */}
              {showOptions && !shouldHideOptionsForSystemAttribute && (
                <div className="grid grid-cols-12 gap-6 items-start">
                  <div className="col-span-4 pt-1.5">
                    <label className="block text-sm font-medium text-gray-700">Options<span className="text-[#F64E60] ml-1">*</span></label>
                  </div>
                  <div className="col-span-8">
                    {/* Options with drag-drop - reordering always allowed, editing/removing only for non-system attributes */}
                    <DragDropContext onDragEnd={handleOptionsDragEnd}>
                      <Droppable
                        droppableId="options-list"
                        renderClone={(provided, snapshot, rubric) => {
                          const row = optionRows[rubric.source.index];
                          return (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="shadow-lg bg-white rounded-lg border border-gray-200 py-2 px-3"
                              style={{
                                ...provided.draggableProps.style,
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <div className="text-[#3699FF] flex-shrink-0">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="3" y1="6" x2="21" y2="6"></line>
                                    <line x1="3" y1="12" x2="21" y2="12"></line>
                                    <line x1="3" y1="18" x2="21" y2="18"></line>
                                  </svg>
                                </div>
                                <div className="flex-1 text-sm text-gray-700">
                                  {row.value || 'Enter Value'}
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      >
                        {(provided) => (
                          <div
                            className="max-w-xl"
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                          >
                            {optionRows.map((row, index) => (
                              <Draggable key={row.key} draggableId={row.key} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`mb-3 ${snapshot.isDragging ? 'bg-blue-50 rounded-lg border border-dashed border-blue-300 p-2' : ''}`}
                                    style={{
                                      ...provided.draggableProps.style,
                                    }}
                                  >
                                    <div className="flex items-center gap-2 pb-[4px]">
                                      {/* Drag Handle - always visible and functional */}
                                      <div
                                        {...provided.dragHandleProps}
                                        className="cursor-grab active:cursor-grabbing text-[#3699FF] hover:text-blue-700 flex-shrink-0"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <line x1="3" y1="6" x2="21" y2="6"></line>
                                          <line x1="3" y1="12" x2="21" y2="12"></line>
                                          <line x1="3" y1="18" x2="21" y2="18"></line>
                                        </svg>
                                      </div>
                                      {/* Option Input - read-only for system attributes in edit mode */}
                                      <div className="flex-1 relative">
                                        {isEditMode && isNonEditableSystemField ? (
                                          // Read-only input for system attributes - no focus state, not selectable
                                          <div className="w-full border-0 border-b-2 border-gray-300 pt-1.5 pb-1.5 text-sm bg-transparent text-gray-700 select-none">
                                            {row.value}
                                          </div>
                                        ) : (
                                          // Editable input for non-system attributes
                                          <>
                                            <input
                                              id={`option-input-${row.key}`}
                                              type="text"
                                              value={row.value}
                                              onChange={(e) => {
                                                const newRows = [...optionRows];
                                                newRows[index].value = e.target.value;
                                                setOptionRows(newRows);
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  // Add new option row
                                                  const newKey = `new_${Date.now()}`;
                                                  setOptionRows([...optionRows, { key: newKey, id: null, value: '' }]);
                                                  // Focus the new input after state updates
                                                  setTimeout(() => {
                                                    const newInput = document.getElementById(`option-input-${newKey}`);
                                                    newInput?.focus();
                                                  }, 0);
                                                }
                                              }}
                                              placeholder="Enter Value"
                                              maxLength={500}
                                              className={`w-full border-0 border-b-2 focus:outline-none pt-1.5 pb-1.5 pr-12 text-sm bg-transparent placeholder:text-gray-400 ${
                                                duplicateOptionIndices.has(index)
                                                  ? 'border-red-500 focus:border-red-500'
                                                  : 'border-gray-300 focus:border-blue-600'
                                              }`}
                                            />
                                            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                              {row.value.length}/500
                                            </span>
                                            {/* Individual duplicate error message */}
                                            {duplicateOptionIndices.has(index) && (
                                              <div className="text-xs text-red-500 mt-0.5">
                                                This value is duplicate
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                                                            {/* Remove Button - always visible, disabled when only 1 option or system attribute in edit mode */}
                                      <div className="flex-shrink-0 -mb-2.5 -mr-[8px]">
                                        {!(isEditMode && isNonEditableSystemField) && (
                                          <RemoveActionButton
                                            id={index}
                                            onRemove={() => {
                                              const newRows = optionRows.filter((_, i) => i !== index);
                                              setOptionRows(newRows);
                                            }}
                                            disabled={optionRows.length <= 1}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            {/* Hint row */}
                            <div className="flex -mt-[8px] items-start gap-2">
                              {/* Hint or Error - show error in place of hint, then auto-clear after 1.5s */}
                              <div className={`text-xs mt-1 ml-7 flex-1 ${optionsError ? 'text-red-500' : 'text-gray-500'}`}>
                                {optionsError
                                  ? optionsError
                                  : "Enter unique values only. Press 'Enter' to add new value. Drag to reorder."
                                }
                              </div>
                            </div>
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </div>
                </div>
              )}

              {/* Behaviour - Only for Single/Multi Select */}
              {showOptions && (
                <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                  <div className="col-span-4 pt-1.5">
                    <label className="block text-sm font-medium text-gray-700">Behaviour</label>
                  </div>
                  <div className="col-span-8 pt-1.5">
                    <RadioInput
                      name="behaviourType"
                      control={control}
                      options={BEHAVIOUR_OPTIONS}
                      validationRules={validationRules.behaviourType}
                    />
                  </div>
                </div>
              )}

              {/* Show Options Alphabetically - Only for Single/Multi Select, hidden for specific system attributes in edit mode */}
              {showOptionsCheckboxes && !shouldHideOptionsForSystemAttribute && (
                <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                  <div className="col-span-4">
                    <label className="block text-sm font-medium text-gray-700">Show Options Alphabetically</label>
                  </div>
                  <div className="col-span-8">
                    <CheckboxInput
                      name="showOptionsAlphabetically"
                      control={control}
                      label="Yes"
                      hint="Select to show options alphabetically"
                      hintSizeClass={'text-[10px]'}
                      validationRules={validationRules.showOptionsAlphabetically}
                    />
                  </div>
                </div>
              )}

              {/* Show First Dropdown Option as Selected - Only for Single/Multi Select, hidden for specific system attributes in edit mode */}
              {showOptionsCheckboxes && !shouldHideOptionsForSystemAttribute && (
                <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                  <div className="col-span-4">
                    <label className="block text-sm font-medium text-gray-700">Show First Dropdown Option as Selected</label>
                  </div>
                  <div className="col-span-8">
                    <CheckboxInput
                      name="showFirstOptionSelected"
                      control={control}
                      label="Yes"
                      hint="Select to show first option as selected"
                      hintSizeClass={'text-[10px]'}
                      validationRules={validationRules.showFirstOptionSelected}
                    />
                  </div>
                </div>
              )}

              {/* Date/DateTime Fields */}
              {showDateFields && (
                <>
                  <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                    <div className="col-span-4 pt-1.5">
                      <label className="block text-sm font-medium text-gray-700">Value Type<span className="text-[#F64E60] ml-1">*</span></label>
                    </div>
                    <div className="col-span-8 pt-1.5">
                      <RadioInput
                        name="dateValueType"
                        control={control}
                        options={DATE_VALUE_TYPE_OPTIONS}
                        validationRules={{ required: 'Value Type is required' }}
                      />
                    </div>
                  </div>

                  {/* Values dropdown - When Standard is selected */}
                  {dateValueType === 'Standard' && (
                    <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                      <div className="col-span-4 pt-1.5">
                        <label className="block text-sm font-medium text-gray-700">Values<span className="text-[#F64E60] ml-1">*</span></label>
                      </div>
                      <div className="col-span-8">
                        <Select
                          name="standardDateValue"
                          control={control}
                          options={dateLookupValues}
                          placeholder="--Select--"
                          maxWidth="max-w-xl"
                          validationRules={{ required: 'Values is required' }}
                          hint={<div className='text-[10px]'>Select from the list.</div>}
                        />
                      </div>
                    </div>
                  )}

                  {/* Past/Future Dates - When Custom is selected */}
                  {dateValueType === 'Custom' && (
                    <>
                      <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                        <div className="col-span-4 pt-1.5">
                          <label className="block text-sm font-medium text-gray-700">Past Dates Allowed</label>
                        </div>
                        <div className="col-span-8">
                          <TextInput
                            name="pastDatesAllowed"
                            control={control}
                            placeholder=""
                            maxWidth="max-w-xl"
                            hint={<div className='text-[10px]'>Only numeric values are allowed. Number of days before current date, blank defaults to no limit.</div>}
                            validationRules={validationRules.pastDatesAllowed}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                        <div className="col-span-4 pt-1.5">
                          <label className="block text-sm font-medium text-gray-700">Future Dates Allowed</label>
                        </div>
                        <div className="col-span-8">
                          <TextInput
                            name="futureDatesAllowed"
                            control={control}
                            placeholder=""
                            maxWidth="max-w-xl"
                            hint={<div className='text-[10px]'>Only numeric values are allowed. Number of days after current date, blank defaults to no limit.</div>}
                            validationRules={validationRules.futureDatesAllowed}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Text Fields (Single Line) */}
              {showTextFields && (
                <>
                  <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                    <div className="col-span-4 pt-1.5">
                      <label className="block text-sm font-medium text-gray-700">Validation Type</label>
                    </div>
                    <div className="col-span-8">
                      <Select
                        name="validationType"
                        control={control}
                        options={TEXT_VALIDATION_TYPE_OPTIONS}
                        placeholder="--Select--"
                        maxWidth="max-w-xl"
                        validationRules={validationRules.validationType}
                      />
                    </div>
                  </div>
                  {/* Hide Min/Max Characters when Regex is selected */}
                  {validationType !== '4' && (
                    <>
                      <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                        <div className="col-span-4 pt-1.5">
                          <label className="block text-sm font-medium text-gray-700">Min Characters</label>
                        </div>
                        <div className="col-span-8">
                          <TextInput
                            name="minCharacters"
                            control={control}
                            placeholder="Enter minimum characters"
                            maxWidth="max-w-xl"
                            blockInvalidInput={true}
                            pattern={/^[0-9]*$/}
                            hint={<div className='text-[10px]'>Only numeric values are allowed. Enter minimum no of characters, blank defaults to no limit</div>}
                            validationRules={validationRules.minCharacters}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                        <div className="col-span-4 pt-1.5">
                          <label className="block text-sm font-medium text-gray-700">Max Characters</label>
                        </div>
                        <div className="col-span-8">
                          <TextInput
                            name="maxCharacters"
                            control={control}
                            placeholder="Enter maximum characters"
                            maxWidth="max-w-xl"
                            blockInvalidInput={true}
                            pattern={/^[0-9]*$/}
                            hint={<div className='text-[10px]'>Only numeric values are allowed. Enter maximum no of characters, blank defaults to no limit</div>}
                            validationRules={validationRules.maxCharacters}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Text Fields (Multi Line) */}
              {showMultiLineTextFields && (
                <>
                  <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                    <div className="col-span-4 pt-1.5">
                      <label className="block text-sm font-medium text-gray-700">Validation Type</label>
                    </div>
                    <div className="col-span-8">
                      <Select
                        name="validationType"
                        control={control}
                        options={MULTILINE_TEXT_VALIDATION_TYPE_OPTIONS}
                        placeholder="--Select--"
                        maxWidth="max-w-xl"
                        validationRules={validationRules.validationType}
                      />
                    </div>
                  </div>
                  {/* Hide Min/Max Characters when Regex is selected */}
                  {validationType !== '4' && (
                    <>
                      <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                        <div className="col-span-4 pt-1.5">
                          <label className="block text-sm font-medium text-gray-700">Min Characters</label>
                        </div>
                        <div className="col-span-8">
                          <TextInput
                            name="minCharacters"
                            control={control}
                            placeholder="Enter minimum characters"
                            maxWidth="max-w-xl"
                            blockInvalidInput={true}
                            pattern={/^[0-9]*$/}
                            hint={<div className='text-[10px]'>Only numeric values are allowed. Enter minimum no of characters, blank defaults to no limit</div>}
                            validationRules={validationRules.minCharacters}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                        <div className="col-span-4 pt-1.5">
                          <label className="block text-sm font-medium text-gray-700">Max Characters</label>
                        </div>
                        <div className="col-span-8">
                          <TextInput
                            name="maxCharacters"
                            control={control}
                            placeholder="Enter maximum characters"
                            maxWidth="max-w-xl"
                            blockInvalidInput={true}
                            pattern={/^[0-9]*$/}
                            hint={<div className='text-[10px]'>Only numeric values are allowed. Enter maximum no of characters, blank defaults to no limit</div>}
                            validationRules={validationRules.maxCharacters}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Allow Decimals - Numeric Fields */}
              {showNumericFields && (
                <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                  <div className="col-span-4">
                    <label className="block text-sm font-medium text-gray-700">Allow Decimals</label>
                  </div>
                  <div className="col-span-8">
                    <CheckboxInput
                      name="allowDecimals"
                      control={control}
                      label="Yes"
                      hint="Select if this field should allow decimal values"
                      hintSizeClass={'text-[10px]'}
                      validationRules={validationRules.allowDecimals}
                    />
                  </div>
                </div>
              )}

              {/* OTP Validation - Hidden when Allow Decimals is enabled */}
              {showNumericFields && !allowDecimals && (
                <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                  <div className="col-span-4">
                    <label className="block text-sm font-medium text-gray-700">OTP Validation</label>
                  </div>
                  <div className="col-span-8">
                    <CheckboxInput
                      name="otpValidation"
                      control={control}
                      label="Yes"
                      hint="Select if value of this field should be verified through OTP"
                      hintSizeClass={'text-[10px]'}
                      validationRules={validationRules.otpValidation}
                    />
                  </div>
                </div>
              )}

              {/* Validation Type - Numeric Fields */}
              {showNumericFields && (
                <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                  <div className="col-span-4 pt-1.5">
                    <label className="block text-sm font-medium text-gray-700">Validation Type</label>
                  </div>
                  <div className="col-span-8">
                    <Select
                      name="numericValidationType"
                      control={control}
                      options={NUMERIC_VALIDATION_TYPE_OPTIONS}
                      placeholder="--Select--"
                      maxWidth="max-w-xl"
                      validationRules={validationRules.numericValidationType}
                      hint={<div className='text-[10px]'>Select what type of data will be entered in this field.</div>}
                    />
                  </div>
                </div>
              )}

              {/* Min/Max Digits - When Digits validation is selected */}
              {showNumericFields && numericValidationType === '1' && (
                <>
                  <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                    <div className="col-span-4 pt-1.5">
                      <label className="block text-sm font-medium text-gray-700">Min Digits</label>
                    </div>
                    <div className="col-span-8">
                      <TextInput
                        name="minDigits"
                        control={control}
                        placeholder="Enter minimum digits"
                        maxWidth="max-w-xl"
                        blockInvalidInput={true}
                        pattern={/^-?[0-9]*$/}
                        hint={<div className='text-[10px]'>Only numeric values are allowed. Enter minimum no of digits, blank defaults to no limit</div>}
                        validationRules={validationRules.minDigits}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                    <div className="col-span-4 pt-1.5">
                      <label className="block text-sm font-medium text-gray-700">Max Digits</label>
                    </div>
                    <div className="col-span-8">
                      <TextInput
                        name="maxDigits"
                        control={control}
                        placeholder="Enter maximum digits"
                        maxWidth="max-w-xl"
                        blockInvalidInput={true}
                        pattern={/^-?[0-9]*$/}
                        hint={<div className='text-[10px]'>Only numeric values are allowed. Enter maximum no of digits, blank defaults to no limit</div>}
                        validationRules={validationRules.maxDigits}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Min/Max Number - When Value validation is selected */}
              {showNumericFields && numericValidationType === '2' && (
                <>
                  <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                    <div className="col-span-4 pt-1.5">
                      <label className="block text-sm font-medium text-gray-700">Min Value</label>
                    </div>
                    <div className="col-span-8">
                      <TextInput
                        name="minNumber"
                        control={control}
                        placeholder="Enter minimum value"
                        maxWidth="max-w-xl"
                        blockInvalidInput={true}
                        pattern={/^-?[0-9]*$/}
                        hint={<div className='text-[10px]'>Only numeric values are allowed. Enter minimum value, blank defaults to no limit</div>}
                        validationRules={validationRules.minNumber}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                    <div className="col-span-4 pt-1.5">
                      <label className="block text-sm font-medium text-gray-700">Max Value</label>
                    </div>
                    <div className="col-span-8">
                      <TextInput
                        name="maxNumber"
                        control={control}
                        placeholder="Enter maximum value"
                        maxWidth="max-w-xl"
                        blockInvalidInput={true}
                        pattern={/^-?[0-9]*$/}
                        hint={<div className='text-[10px]'>Only numeric values are allowed. Enter maximum value, blank defaults to no limit</div>}
                        validationRules={validationRules.maxNumber}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Regex Expression/Error Message - When Regex validation is selected for any field type */}
              {isRegexValidationSelected && (
                <>
                  <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                    <div className="col-span-4 pt-1.5">
                      <label className="block text-sm font-medium text-gray-700">Regex Expression<span className="text-[#F64E60] ml-1">*</span></label>
                    </div>
                    <div className="col-span-8">
                      <TextInput
                        name="regexExpression"
                        control={control}
                        placeholder="Enter regex expression"
                        maxWidth="max-w-xl"
                        hint={<div className='text-[10px]'>Enter regular expression for validation</div>}
                        validationRules={{ required: 'Regex Expression is required' }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                    <div className="col-span-4 pt-1.5">
                      <label className="block text-sm font-medium text-gray-700">Error Message<span className="text-[#F64E60] ml-1">*</span></label>
                    </div>
                    <div className="col-span-8">
                      <TextInput
                        name="regexErrorMessage"
                        control={control}
                        placeholder="Enter error message"
                        maxWidth="max-w-xl"
                        hint={<div className='text-[10px]'>Enter error message to show when validation fails</div>}
                        validationRules={{ required: 'Error Message is required' }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Image Fields */}
              {showImageFields && (
                <>
                  <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                    <div className="col-span-4">
                      <label className="block text-sm font-medium text-gray-700">Allow Browsing</label>
                    </div>
                    <div className="col-span-8">
                      <CheckboxInput
                        name="allowBrowsing"
                        control={control}
                        label="Yes"
                        hint="Select to allow file browsing"
                        hintSizeClass={'text-[10px]'}
                        validationRules={validationRules.allowBrowsing}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                    <div className="col-span-4 pt-1.5">
                      <label className="block text-sm font-medium text-gray-700">Max Images Allowed</label>
                    </div>
                    <div className="col-span-8">
                      <TextInput
                        name="maxImagesAllowed"
                        control={control}
                        placeholder="Enter maximum images"
                        maxWidth="max-w-xl"
                        blockInvalidInput={true}
                        pattern={/^[0-9]*$/}
                        hint={<div className='text-[10px]'>
                          Only numeric values are allowed. Number of maximum images to be taken, blank defaults to no limit.
                        </div>}
                        validationRules={validationRules.maxImagesAllowed}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Document Fields */}
              {showDocumentFields && (
                <>
                  <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                    <div className="col-span-4 pt-1.5">
                      <label className="block text-sm font-medium text-gray-700">Document Type</label>
                    </div>
                    <div className="col-span-8">
                      <MultiSelect
                        name="documentType"
                        control={control}
                        options={DOCUMENT_TYPE_OPTIONS}
                        placeholder="--Select--"
                        maxWidth="max-w-xl"
                        validationRules={validationRules.documentType}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                    <div className="col-span-4 pt-1.5">
                      <label className="block text-sm font-medium text-gray-700">Max Documents Allowed</label>
                    </div>
                    <div className="col-span-8">
                      <TextInput
                        name="maxDocumentsAllowed"
                        control={control}
                        placeholder="Enter maximum documents"
                        maxWidth="max-w-xl"
                        blockInvalidInput={true}
                        pattern={/^[0-9]*$/}
                        hint={<div className='text-[10px]'>Only numeric values are allowed. Number of maximum documents to be taken, blank defaults to no limit.
                        </div>}
                        validationRules={validationRules.maxDocumentsAllowed}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Video Fields */}
              {showVideoFields && (
                <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                  <div className="col-span-4 pt-1.5">
                    <label className="block text-sm font-medium text-gray-700">Max Videos Allowed</label>
                  </div>
                  <div className="col-span-8">
                    <TextInput
                      name="maxVideosAllowed"
                      control={control}
                      placeholder="Enter maximum videos"
                      maxWidth="max-w-xl"
                      blockInvalidInput={true}
                      pattern={/^[0-9]*$/}
                      hint={<div className='text-[10px]'>Only numeric values are allowed. Number of maximum videos that can be uploaded, blank defaults to no limit.
                      </div>}
                      validationRules={validationRules.maxVideosAllowed}
                    />
                  </div>
                </div>
              )}

              {/* Reference Document Fields */}
              {showReferenceDocFields && (
                <div className="grid grid-cols-12 gap-6 items-start">
                  <div className="col-span-4 pt-1.5">
                    <label className="block text-sm font-medium text-gray-700">Upload File<span className="text-[#F64E60] ml-1">*</span></label>
                  </div>
                  <div className="col-span-8">
                    <UploadInput
                      name="uploadFile"
                      control={control}
                      attributeTypeId={CustomAttributeTypeEnum.REFERENCE_DOCUMENTS}
                      multiple={true}
                      moduleType={moduleType}
                      projectId={projectId}
                      onUploadingChange={setIsFileUploading}
                      validationRules={{ required: 'At least one file is required' }}
                      hint={<div className='text-[10px]'>Upload .jpeg, .png, .pdf, .xlsx, .docx, .pptx files only</div>}
                    />
                  </div>
                </div>
              )}

              {/* Data List Fields */}
              {showDataListFields && (
                <>
                  <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                    <div className="col-span-4 pt-1.5">
                      <label className="block text-sm font-medium text-gray-700">List Name<span className="text-[#F64E60] ml-1">*</span></label>
                    </div>
                    <div className="col-span-8">
                      <Select
                        name="listName"
                        control={control}
                        options={dataListOptions}
                        placeholder="--Select List--"
                        maxWidth="max-w-xl"
                        loading={isLoadingLookupValues}
                        validationRules={{ required: 'List Name is required' }}
                        hint={<div className='text-[10px]'>{isEditMode ? 'Select field of the entity that can be selected' : 'Select the data list to use'}</div>}
                        disabled={isEditMode}
                      />
                    </div>
                  </div>

                  {/* Select Parent Fields Values - Only show when selected list has parent and data is loaded */}
                  {selectedDataListHasParent && !isLoadingLookupValues && parentLookupValues.length > 0 && (
                    <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                      <div className="col-span-4 pt-1.5">
                        <label className="block text-sm font-medium text-gray-700">Select Parent Fields Values</label>
                      </div>
                      <div className="col-span-8">
                        <MultiSelect
                          name="selectParentFieldsValues"
                          control={control}
                          options={parentLookupValues}
                          placeholder="--Select Parent Values--"
                          maxWidth="max-w-xl"
                          hint="Select parent field values to filter the list"
                        />
                      </div>
                    </div>
                  )}

                  {/* Select Values - Only show when List Name is selected and data is loaded */}
                  {selectedListName && !isLoadingLookupValues && dataListLookupValues.length > 0 && (
                    <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                      <div className="col-span-4 pt-1.5">
                        <label className="block text-sm font-medium text-gray-700">Select Values</label>
                      </div>
                      <div className="col-span-8">
                        <MultiSelect
                          name="selectValues"
                          control={control}
                          options={dataListLookupValues}
                          placeholder="--Select Values--"
                          maxWidth="max-w-xl"
                          hint="Select field values you want to use. If left blank, all list values will be displayed"
                        />
                      </div>
                    </div>
                  )}

                  {selectedListName && (
                    <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                      <div className="col-span-4">
                        <label className="block text-sm font-medium text-gray-700">Add Dependent Fields</label>
                      </div>
                      <div className="col-span-8">
                        <CheckboxInput
                          name="addDependentFields"
                          control={control}
                          label="Yes"
                          hint="Select to add dependent fields"
                          hintSizeClass={'text-[10px]'}
                          validationRules={validationRules.addDependentFields}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* OTP Validation Fields */}
              {showOTPFields && (
                <>
                  <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                    <div className="col-span-4 pt-1.5">
                      <label className="block text-sm font-medium text-gray-700">Entity<span className="text-[#F64E60] ml-1">*</span></label>
                    </div>
                    <div className="col-span-8">
                      <Select
                        name="entity"
                        control={control}
                        options={otpEntityList}
                        placeholder="--Select--"
                        maxWidth="max-w-xl"
                        validationRules={{ required: 'Entity is required' }}
                      />
                    </div>
                  </div>

                  {/* Linked Attribute - Only show when entity is selected */}
                  {selectedEntity && (
                    <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                      <div className="col-span-4 pt-1.5">
                        <label className="block text-sm font-medium text-gray-700">Linked Attribute<span className="text-[#F64E60] ml-1">*</span></label>
                      </div>
                      <div className="col-span-8">
                        <Select
                          name="linkedAttributeId"
                          control={control}
                          options={entityFieldsList}
                          placeholder="--Select--"
                          maxWidth="max-w-xl"
                          loading={isLoadingEntityFields}
                          validationRules={{ required: 'Linked Attribute is required' }}
                          hint={<div className='text-[10px]'>Select a numeric field from the selected entity</div>}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Calculated Field */}
              {showCalculatedFields && (
                <div className="grid grid-cols-12 gap-6 items-start">
                  <div className="col-span-4 pt-1.5">
                    <label className="block text-sm font-medium text-gray-700">Calculation Logic</label>
                  </div>
                  <div className="col-span-8">
                    <div className="max-w-xl">
                      <div className="min-h-[40px] p-2 border-b-2 border-gray-300 bg-white text-sm flex items-center justify-between">
                        <div
                          className="flex-1 relative outline-none focus:outline-none"
                          ref={calcLogicKeyCaptureRef}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            const key = e.key;
                            const isNumberChar = /[0-9.]/.test(key);
                            const isOpChar = /[+\-*/()]/.test(key);
                            const isSpace = key === ' ';
                            const allowed = isNumberChar || isOpChar || isSpace || key === 'Backspace';
                            if (!allowed) return;

                            e.preventDefault();
                            e.stopPropagation();

                            const currentValue = watch('calculationLogic') || '';
                            if (key === 'Backspace') {
                              const trimmed = currentValue.replace(/\s+$/g, '');
                              if (!trimmed) {
                                setValue('calculationLogic', '');
                                return;
                              }
                              // Remove full field name if it appears at the end (same logic as Remove last button)
                              const fieldsByLength = [...calcNumericFields].sort(
                                (a, b) => (b.attributeName?.length || 0) - (a.attributeName?.length || 0)
                              );
                              const matchedField = fieldsByLength.find((f) =>
                                f.attributeName && trimmed.endsWith(f.attributeName)
                              );
                              if (matchedField?.attributeName) {
                                const next = trimmed
                                  .slice(0, trimmed.length - matchedField.attributeName.length)
                                  .replace(/\s+$/g, '');
                                setValue('calculationLogic', next);
                                return;
                              }
                              // Remove last space-separated token (operators, numbers, etc.)
                              const parts = trimmed.split(' ');
                              parts.pop();
                              setValue('calculationLogic', parts.join(' '));
                              return;
                            }

                            if (isSpace) {
                              // Avoid inserting repeated spaces
                              setValue('calculationLogic', `${currentValue}`.replace(/\s+$/g, '') + ' ');
                              return;
                            }

                            if (isOpChar) {
                              const base = `${currentValue}`.replace(/\s+$/g, '');
                              const next = base ? `${base} ${key} ` : `${key} `;
                              setValue('calculationLogic', next);
                              return;
                            }

                            // Number/decimal typing: add spacing when previous token is a field name or operator
                            // If there's already a trailing space (e.g., after operator), just append
                            const hasTrailingSpace = /\s$/.test(currentValue);
                            if (hasTrailingSpace) {
                              setValue('calculationLogic', `${currentValue}${key}`);
                              return;
                            }
                            // No trailing space: check if we need to add one before the number
                            const trimmedEnd = currentValue.replace(/\s+$/g, '');
                            const lastChar = trimmedEnd.slice(-1);
                            // Need space if last char is an operator (except open paren) or a letter (field name)
                            // Only append directly if last char is a number, dot, or open paren
                            const canAppendDirectly = /[0-9.(]/.test(lastChar);

                            const prefix = canAppendDirectly ? currentValue : `${trimmedEnd} `;
                            setValue('calculationLogic', `${prefix}${key}`);
                          }}
                        >
                          <span className={watch('calculationLogic') ? 'font-mono' : 'text-gray-400'}>
                            {(watch('calculationLogic') || '').replace(/\s+/g, ' ').trim() || '--Select Option--'}
                          </span>
                          <select
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            value=""
                            disabled={isLoadingCalcFields}
                            onChange={(e) => {
                              if (e.target.value) {
                                const token = e.target.value;
                                const currentValue = watch('calculationLogic') || '';
                                const base = currentValue.replace(/\s+$/g, '');
                                const isOperatorToken = /^[+\-*/()]$/.test(token);
                                const newValue = isOperatorToken
                                  ? (base ? `${base} ${token} ` : `${token} `)
                                  : (base ? `${base} ${token}` : token);
                                setValue('calculationLogic', newValue);
                                // Enable immediate numeric typing after inserting from options
                                setTimeout(() => calcLogicKeyCaptureRef.current?.focus(), 0);
                              }
                            }}
                          >
                            <option value="">{isLoadingCalcFields ? 'Loading fields...' : '--Select Option--'}</option>
                            {calcNumericFields.length > 0 && (
                              <optgroup label="Fields">
                                {calcNumericFields.map((field) => (
                                  <option key={field.attributeId} value={field.attributeName}>
                                    {field.attributeName}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="Operators">
                              <option value="+">+ (Add)</option>
                              <option value="-">- (Subtract)</option>
                              <option value="*">× (Multiply)</option>
                              <option value="/">÷ (Divide)</option>
                              <option value="(">(  (Open Bracket)</option>
                              <option value=")">)  (Close Bracket)</option>
                            </optgroup>
                          </select>
                        </div>
                        <div className="flex items-center gap-2 ml-2 relative z-10">
                          {watch('calculationLogic') && (
                            <>
                              <button
                                type="button"
                                className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                                title="Remove last"
                                onClick={() => {
                                  const currentValue = watch('calculationLogic') || '';
                                  const trimmed = currentValue.replace(/\s+$/g, '');

                                  if (!trimmed) {
                                    setValue('calculationLogic', '');
                                    return;
                                  }

                                  // Prefer removing a full field name (can contain spaces) if it appears at the end.
                                  const fieldsByLength = [...calcNumericFields].sort(
                                    (a, b) => (b.attributeName?.length || 0) - (a.attributeName?.length || 0)
                                  );

                                  const matchedField = fieldsByLength.find((f) =>
                                    f.attributeName && trimmed.endsWith(f.attributeName)
                                  );

                                  if (matchedField?.attributeName) {
                                    const next = trimmed
                                      .slice(0, trimmed.length - matchedField.attributeName.length)
                                      .replace(/\s+$/g, '');
                                    setValue('calculationLogic', next);
                                    return;
                                  }

                                  // Fallback: remove the last space-separated token (operators, numbers, etc.)
                                  const parts = trimmed.split(' ');
                                  parts.pop();
                                  setValue('calculationLogic', parts.join(' '));
                                }}
                              >
                                ⌫
                              </button>
                              <button
                                type="button"
                                className="px-2 py-1 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                title="Clear all"
                                onClick={() => {
                                  setValue('calculationLogic', '');
                                }}
                              >
                                Clear
                              </button>
                            </>
                          )}
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="text-[10px] text-gray-500">Use standard mathematical operations from + - / * ()
</div>
                      {watch('calculationLogic') && (
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          onClick={() => setIsTestAreaOpen(true)}
                        >
                          Test Data
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Test Area Modal for Calculated Field */}
              {isTestAreaOpen && (() => {
                // Get unique fields used in the expression
                const expression = watch('calculationLogic') || '';
                const fieldsInExpression = calcNumericFields.filter((field) => {
                  const regex = new RegExp(`\\b${field.attributeName}\\b`);
                  return regex.test(expression);
                });

                const validateCalculatedFieldOnce = () => {
                  const hasAllValues = fieldsInExpression.every(
                    (field) => testFieldValues[field.attributeId] !== undefined && testFieldValues[field.attributeId] !== ''
                  );

                  if (!expression.trim()) {
                    enqueueSnackbar('Calculation logic cannot be blank', { variant: 'error' });
                    return;
                  }

                  if (!hasAllValues) {
                    enqueueSnackbar('Please enter values for all fields in the Test Area', { variant: 'error' });
                    return;
                  }

                  (async () => {
                    try {
                      setCalcApiValidationLoading(true);
                      setCalcApiValidationResult(null);

                      const expressionForApi = expression || '';
                      const attributeList = fieldsInExpression.map((field) => {
                        const value = String(testFieldValues[field.attributeId] ?? '');
                        const combinedAttributeName = `${field.attributeName.replace(/\s+/g, '_')}${field.attributeId}`;
                        return {
                          attributeId: field.attributeId,
                          attributeName: field.attributeName,
                          combinedAttributeName,
                          value,
                        };
                      });

                      const resp = await productFormService.validateCalculatedField({
                        expression: expressionForApi,
                        attributeList,
                      });

                      if (resp?.statusCode === 200 && resp?.responseData) {
                        setCalcApiValidationResult(resp.responseData);
                        if (resp.responseData.validated) {
                          setIsCalcExpressionValidated(true);
                          setLastValidatedCalcExpression((expression || '').replace(/\s+/g, ' ').trim());
                          enqueueSnackbar('Calculated field validated successfully', { variant: 'success' });
                        } else {
                          setIsCalcExpressionValidated(false);
                          enqueueSnackbar('Calculated field validation failed', { variant: 'error' });
                        }
                      } else {
                        setIsCalcExpressionValidated(false);
                        enqueueSnackbar(resp?.message || 'Calculated field validation failed', { variant: 'error' });
                      }
                    } catch (e: any) {
                      setIsCalcExpressionValidated(false);
                      enqueueSnackbar(e?.data?.message || 'Calculated field validation failed', { variant: 'error' });
                    } finally {
                      setCalcApiValidationLoading(false);
                    }
                  })();
                };
                
                return (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Test Calculation</h3>
                        <button
                          type="button"
                          className="text-gray-400 hover:text-gray-600"
                          onClick={() => setIsTestAreaOpen(false)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="space-y-4">
                        {fieldsInExpression.map((field) => (
                          <div key={field.attributeId}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {field.attributeName} <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder={`Enter ${field.attributeName}`}
                              value={testFieldValues[field.attributeId] || ''}
                              onChange={(e) => setTestFieldValues(prev => ({
                                ...prev,
                                [field.attributeId]: e.target.value
                              }))}
                            />
                          </div>
                        ))}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
                          <input
                            type="text"
                            className="w-full p-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700 font-mono"
                            value={calcApiValidationResult?.calculatedTotal !== undefined && calcApiValidationResult?.calculatedTotal !== null
                              ? String(calcApiValidationResult.calculatedTotal)
                              : ''}
                            readOnly
                            placeholder="Result will appear here"
                          />
                        </div>
                      </div>
                      <div className="mt-6 flex justify-end gap-2">
                        <button
                          type="button"
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => {
                            const hasAllValues = fieldsInExpression.every(
                              (field) => testFieldValues[field.attributeId] !== undefined && testFieldValues[field.attributeId] !== ''
                            );

                            if (!expression.trim()) {
                              enqueueSnackbar('Calculation logic cannot be blank', { variant: 'error' });
                              return;
                            }

                            if (!hasAllValues) {
                              enqueueSnackbar('Please enter values for all fields in the Test Area', { variant: 'error' });
                              return;
                            }

                            validateCalculatedFieldOnce();
                          }}
                          disabled={calcApiValidationLoading}
                        >
                          {calcApiValidationLoading ? 'Validating...' : 'Validate'}
                        </button>
                        <button
                          type="button"
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                          onClick={() => {
                            setIsTestAreaOpen(false);
                            setTestFieldValues({});
                          }}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Mandatory - Not for Header Text */}
              {showMandatory && (
                <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                  <div className="col-span-4">
                    <label className="block text-sm font-medium text-gray-700">Mandatory</label>
                  </div>
                  <div className="col-span-8">
                    <CheckboxInput
                      name="mandatoryFlag"
                      control={control}
                      label="Yes"
                      hint={Number(selectedAttributeType) == CustomAttributeTypeEnum.AUDIO_VIDEO ? "Select to make this mandatory field, only .mp4, .mov file formats are allowed" : "Select to make this mandatory field"}
                      hintSizeClass={'text-[10px]'}
                      validationRules={validationRules.mandatoryFlag}
                      disabled={shouldDisableMandatory}
                    />
                  </div>
                </div>
              )}

              {/* Unique Value - Only for Text, Email, Numeric */}
              {showUniqueValue && (
                <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                  <div className="col-span-4">
                    <label className="block text-sm font-medium text-gray-700">Unique Values</label>
                  </div>
                  <div className="col-span-8">
                    <CheckboxInput
                      name="uniqueFlag"
                      control={control}
                      label="Yes"
                      hint="Select if this field should only allow unique values"
                      hintSizeClass={'text-[10px]'}
                      validationRules={validationRules.uniqueFlag}
                      disabled={shouldDisableUniqueValue}
                    />
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="grid grid-cols-12 gap-6 items-start h-[54px]">
                <div className="col-span-4">
                  <label className="block text-sm font-medium text-gray-700">Status{isEditMode && !isStatusDisable && <span className="text-[#F64E60] ml-1">*</span>}</label>
                </div>
                <div className="col-span-8">
                  <Select
                    name="status"
                    control={control}
                    options={STATUS_OPTIONS}
                    placeholder="--Select--"
                    maxWidth="w-[40%]"
                    validationRules={isEditMode && !isStatusDisable ? { required: 'Status is required' } : {}}
                    disabled={!isEditMode || isStatusDisable}
                  />
                </div>
              </div>
            </>
          )}
        </form>
      </div>
    </TwinModal>
  );
};

export default AddEditProductFormAttribute;
