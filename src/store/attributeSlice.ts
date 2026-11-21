import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AttributeGridData } from '@/lib/api/attributeApi';

// Attribute Type Option
export interface AttributeTypeOption {
  value: number | string;
  label: string;
}

// Attribute Settings - which form fields should be visible based on selected attribute type
export interface AttributeFormSettings {
  showOptions: boolean;
  showOptionsCheckboxes: boolean;
  showDateFields: boolean;
  showTextFields: boolean;
  showMultiLineTextFields: boolean;
  showNumericFields: boolean;
  showImageFields: boolean;
  showDocumentFields: boolean;
  showVideoFields: boolean;
  showReferenceDocFields: boolean;
  showDataListFields: boolean;
  showOTPFields: boolean;
  showCalculatedFields: boolean;
  showMandatory: boolean;
  showUniqueValue: boolean;
  isHeaderText: boolean;
}

// Date Lookup Option
export interface DateLookupOption {
  value: string;
  label: string;
}

// Module Name Option (moduleType as ID, singularName as value)
export interface ModuleNameOption {
  value: number;
  label: string;
}

// Raw Attribute Type (full object from API)
export interface RawAttributeType {
  id: number;
  typeName: string;
  isActive: number;
  displayOrder: number;
}

// Attribute State Interface
interface AttributeState {
  // Attribute List
  attributes: AttributeGridData[];
  isLoadingAttributes: boolean;

  // Attribute Types
  attributeTypes: AttributeTypeOption[];
  rawAttributeTypes: RawAttributeType[]; // Raw attribute types for payload building
  isLoadingTypes: boolean;

  // Date Lookup Values (for Date/DateTime fields)
  dateLookupValues: DateLookupOption[];
  isLoadingDateLookup: boolean;

  // Visibility Map
  attributeVisibilityMap: Record<number, string>;

  // Modal State
  isAddEditModalOpen: boolean;
  editingAttributeId: number | null;

  // Search
  searchTerm: string;

  // Display Order
  displayOrderChanged: boolean;

  // Module & Project Context
  currentProjectId: number | null;
  currentModuleType: number | null;

  // Attribute Form Settings
  attributeFormSettings: AttributeFormSettings;
  selectedAttributeTypeId: string | number;

  // Module Names (moduleType as ID, singularName as name)
  moduleNames: ModuleNameOption[];
}

const initialAttributeFormSettings: AttributeFormSettings = {
  showOptions: false,
  showOptionsCheckboxes: false,
  showDateFields: false,
  showTextFields: false,
  showMultiLineTextFields: false,
  showNumericFields: false,
  showImageFields: false,
  showDocumentFields: false,
  showVideoFields: false,
  showReferenceDocFields: false,
  showDataListFields: false,
  showOTPFields: false,
  showCalculatedFields: false,
  showMandatory: true,
  showUniqueValue: false,
  isHeaderText: false,
};

const initialState: AttributeState = {
  attributes: [],
  isLoadingAttributes: false,

  attributeTypes: [],
  rawAttributeTypes: [],
  isLoadingTypes: false,

  dateLookupValues: [],
  isLoadingDateLookup: false,

  attributeVisibilityMap: {},

  isAddEditModalOpen: false,
  editingAttributeId: null,

  searchTerm: '',

  displayOrderChanged: false,

  currentProjectId: null,
  currentModuleType: null,

  attributeFormSettings: initialAttributeFormSettings,
  selectedAttributeTypeId: '',

  moduleNames: [],
};

// Field Type IDs
const FIELD_TYPES = {
  SINGLE_SELECT: '1',
  MULTI_SELECT: '2',
  DATE: '3',
  IMAGE: '4',
  RADIO: '5',
  TEXT_SINGLE_LINE: '6',
  NUMERIC: '7',
  TEXT_MULTI_LINE: '8',
  EMAIL: '9',
  HEADER_TEXT: '10',
  NORMAL_TEXT: '11',
  PAGE_SEPARATOR: '12',
  LINK_FROM_OTHER_ENTITIES: '13',
  CALCULATED_FIELD: '14',
  DOCUMENT_UPLOAD: '15',
  AUDIO_VIDEO: '16',
  REFERENCE_DOCUMENTS: '17',
  DATA_LIST: '18',
  OTP_VALIDATION: '19',
  QR_CODE_SCANNER: '20',
  DATE_TIME: '21',
  TIME_DURATION: '22',
};

// Helper function to calculate attribute form settings based on selected attribute type
const calculateAttributeFormSettings = (attributeTypeId: string | number): AttributeFormSettings => {
  // If no attribute type is selected, return initial form settings
  if (!attributeTypeId || attributeTypeId === '') {
    return initialAttributeFormSettings;
  }

  // Ensure attributeTypeId is a string for comparison
  const typeId = String(attributeTypeId);

  const showOptions = [FIELD_TYPES.SINGLE_SELECT, FIELD_TYPES.MULTI_SELECT].includes(typeId);
  const showOptionsCheckboxes = [FIELD_TYPES.SINGLE_SELECT, FIELD_TYPES.MULTI_SELECT].includes(typeId);
  const showDateFields = [FIELD_TYPES.DATE, FIELD_TYPES.DATE_TIME].includes(typeId);
  const showTextFields = FIELD_TYPES.TEXT_SINGLE_LINE === typeId;
  const showMultiLineTextFields = FIELD_TYPES.TEXT_MULTI_LINE === typeId;
  const showNumericFields = FIELD_TYPES.NUMERIC === typeId;
  const showImageFields = FIELD_TYPES.IMAGE === typeId;
  const showDocumentFields = FIELD_TYPES.DOCUMENT_UPLOAD === typeId;
  const showVideoFields = FIELD_TYPES.AUDIO_VIDEO === typeId;
  const showReferenceDocFields = FIELD_TYPES.REFERENCE_DOCUMENTS === typeId;
  const showDataListFields = FIELD_TYPES.DATA_LIST === typeId;
  const showOTPFields = FIELD_TYPES.OTP_VALIDATION === typeId;
  const showCalculatedFields = FIELD_TYPES.CALCULATED_FIELD === typeId;
  const showMandatory = ![FIELD_TYPES.HEADER_TEXT, FIELD_TYPES.NORMAL_TEXT, FIELD_TYPES.PAGE_SEPARATOR].includes(typeId);
  const showUniqueValue = [FIELD_TYPES.TEXT_SINGLE_LINE, FIELD_TYPES.EMAIL, FIELD_TYPES.NUMERIC].includes(typeId);
  const isHeaderText = FIELD_TYPES.HEADER_TEXT === typeId;

  return {
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
    isHeaderText,
  };
};

// Slice
const attributeSlice = createSlice({
  name: 'attribute',
  initialState,
  reducers: {
    // Attributes
    setAttributes: (state, action: PayloadAction<AttributeGridData[]>) => {
      state.attributes = action.payload;
    },
    setLoadingAttributes: (state, action: PayloadAction<boolean>) => {
      state.isLoadingAttributes = action.payload;
    },

    // Attribute Types
    setAttributeTypes: (state, action: PayloadAction<AttributeTypeOption[]>) => {
      state.attributeTypes = action.payload;
    },
    setLoadingTypes: (state, action: PayloadAction<boolean>) => {
      state.isLoadingTypes = action.payload;
    },

    // Date Lookup Values
    setDateLookupValues: (state, action: PayloadAction<DateLookupOption[]>) => {
      state.dateLookupValues = action.payload;
    },
    setLoadingDateLookup: (state, action: PayloadAction<boolean>) => {
      state.isLoadingDateLookup = action.payload;
    },

    // Visibility Map
    setVisibilityMap: (state, action: PayloadAction<Record<number, string>>) => {
      state.attributeVisibilityMap = action.payload;
    },

    // Modal Actions
    openAddEditModal: (state, action: PayloadAction<number | null>) => {
      state.isAddEditModalOpen = true;
      state.editingAttributeId = action.payload;
    },
    closeAddEditModal: (state) => {
      state.isAddEditModalOpen = false;
      state.editingAttributeId = null;
    },

    // Search
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
    },

    // Display Order
    setDisplayOrderChanged: (state, action: PayloadAction<boolean>) => {
      state.displayOrderChanged = action.payload;
    },

    // Context
    setContext: (state, action: PayloadAction<{ projectId: number; moduleType: number }>) => {
      state.currentProjectId = action.payload.projectId;
      state.currentModuleType = action.payload.moduleType;
    },

    // Module Names
    setModuleNames: (state, action: PayloadAction<ModuleNameOption[]>) => {
      state.moduleNames = action.payload;
    },

    // Attribute Type Selection
    setSelectedAttributeType: (state, action: PayloadAction<string | number>) => {
      state.selectedAttributeTypeId = action.payload;
      const newSettings = calculateAttributeFormSettings(action.payload);
      state.attributeFormSettings = newSettings;
    },

    // Reset attribute form settings to initial state
    resetAttributeFormSettings: (state) => {
      state.selectedAttributeTypeId = '';
      state.attributeFormSettings = initialAttributeFormSettings;
    },

    // Reset
    resetAttributeState: () => initialState,
  },
});

// Export Actions
export const {
  setAttributes,
  setLoadingAttributes,
  setAttributeTypes,
  setLoadingTypes,
  setDateLookupValues,
  setLoadingDateLookup,
  setVisibilityMap,
  openAddEditModal,
  closeAddEditModal,
  setSearchTerm,
  setDisplayOrderChanged,
  setContext,
  setModuleNames,
  setSelectedAttributeType,
  resetAttributeFormSettings,
  resetAttributeState,
} = attributeSlice.actions;

// Export Reducer
export default attributeSlice.reducer;
