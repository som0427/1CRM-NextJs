import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserRoleData } from '@/lib/models/user-role.model';
import {
  CustomAttribute,
  FieldVisibilitySetting,
  FileArrayItem,
  OpenDivItem,
  Country,
  State,
  City,
} from '@/lib/models/attributes/field-visibility.model';

interface FieldAccessState {
  // Field and roles
  selectedField: CustomAttribute | null; // Currently selected field being managed
  allFields: CustomAttribute[];
  userRoles: UserRoleData[];

  // Loading states
  isLoading: boolean;
  isSaving: boolean;

  // Role-based data (using roleId-attributeId composite keys)
  customAttributesList: Record<string, CustomAttribute[]>; // "roleId-attributeId" -> attributes
  roleVisibility: Record<string, string>; // "roleId-attributeId" -> '1', '2', or '3'
  roleFieldValues: Record<number, any>; // roleId -> field value (simple structure for ManageFieldAccess)
  roleFieldValuesComplex: Record<string, Record<string, any>>; // "roleId-attributeId" -> field values (complex structure)
  oldRadioValue: Record<string, number>;

  // File uploads
  fileArray: Record<string, FileArrayItem>;

  // Dynamic field management
  openDivsObj: Record<string, OpenDivItem[]>;

  // Existing field visibility data from API
  existingData: FieldVisibilitySetting[];

  // Address data
  countriesList: Country[];
  stateLookupObj: Record<string, State[]>;
  cityLookupObj: Record<string, City[]>;

  // Project context
  projectId: number | null;
  moduleType: number | null;
}

// Initial field access state
const initialState: FieldAccessState = {
  selectedField: null,
  allFields: [],
  userRoles: [],

  isLoading: false,
  isSaving: false,

  customAttributesList: {},
  roleVisibility: {},
  roleFieldValues: {},
  roleFieldValuesComplex: {},
  oldRadioValue: {},

  fileArray: {},
  openDivsObj: {},

  existingData: [],

  countriesList: [],
  stateLookupObj: {},
  cityLookupObj: {},

  projectId: null,
  moduleType: null,
};

const fieldAccessSlice = createSlice({
  name: 'fieldAccess',
  initialState,
  reducers: {
    // Initialize field access
    initializeFieldAccess: (
      state,
      action: PayloadAction<{
        fieldDetail: CustomAttribute;
        allFields: CustomAttribute[];
        projectId: number;
        moduleType: number;
      }>
    ) => {
      state.allFields = action.payload.allFields;
      state.projectId = action.payload.projectId;
      state.moduleType = action.payload.moduleType;
    },


    // Set selected field
    setSelectedField: (state, action: PayloadAction<CustomAttribute>) => {
      state.selectedField = action.payload;
    },

    // Set user roles
    setUserRoles: (state, action: PayloadAction<UserRoleData[]>) => {
      state.userRoles = action.payload;
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Set saving state
    setSaving: (state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload;
    },

    // Set custom attributes list for a role
    setCustomAttributesListForRole: (
      state,
      action: PayloadAction<{ key: string; attributes: CustomAttribute[] }>
    ) => {
      state.customAttributesList[action.payload.key] = action.payload.attributes;
    },

    // Append child attributes after a parent in the list
    // This is used when loading multi-level hierarchies from API to prevent
    // stale closure issues - it reads the current state and appends children properly
    appendChildAttributesForRole: (
      state,
      action: PayloadAction<{ key: string; parentCombinedName: string; children: CustomAttribute[] }>
    ) => {
      const { key, parentCombinedName, children } = action.payload;
      const currentAttributes = state.customAttributesList[key] || [];

      // Find the parent in the current state
      const parentIndex = currentAttributes.findIndex(attr =>
        attr.combinedAttributeName === parentCombinedName
      );

      if (parentIndex !== -1) {
        // Filter out any existing children of this parent (they'll be replaced)
        // Children are identified by having combinedAttributeName starting with parent's name
        // but not being the parent itself
        const filteredAfterParent = currentAttributes.slice(parentIndex + 1).filter(attr =>
          !attr.combinedAttributeName.startsWith(parentCombinedName) ||
          attr.combinedAttributeName === parentCombinedName
        );

        // Insert children right after the parent, keeping everything else
        state.customAttributesList[key] = [
          ...currentAttributes.slice(0, parentIndex + 1),
          ...children,
          ...filteredAfterParent
        ];
      } else {
        // Parent not found - append children at end
        state.customAttributesList[key] = [...currentAttributes, ...children];
      }
    },

    // Set role visibility
    setRoleVisibility: (
      state,
      action: PayloadAction<{ key: string; visibility: string }>
    ) => {
      state.roleVisibility[action.payload.key] = action.payload.visibility;
    },

    // Set all role visibilities
    setAllRoleVisibilities: (state, action: PayloadAction<Record<string, string>>) => {
      state.roleVisibility = action.payload;
    },

    // Set field value for a role (simple structure: roleId -> value)
    setRoleFieldValue: (
      state,
      action: PayloadAction<{ roleId: number; value: any }>
    ) => {
      state.roleFieldValues[action.payload.roleId] = action.payload.value;
    },

    // Clear field value for a role
    clearRoleFieldValue: (state, action: PayloadAction<number>) => {
      delete state.roleFieldValues[action.payload];
    },

    // Clear all role field values
    clearAllRoleFieldValues: (state) => {
      state.roleFieldValues = {};
    },

    // Set field value for a role (complex structure: key -> fieldName -> value)
    // If value is undefined, delete the field from the state
    setRoleFieldValueComplex: (
      state,
      action: PayloadAction<{ key: string; fieldName: string; value: any }>
    ) => {
      if (!state.roleFieldValuesComplex[action.payload.key]) {
        state.roleFieldValuesComplex[action.payload.key] = {};
      }
      // If value is undefined, delete the key to fully clear it
      if (action.payload.value === undefined) {
        delete state.roleFieldValuesComplex[action.payload.key][action.payload.fieldName];
      } else {
        state.roleFieldValuesComplex[action.payload.key][action.payload.fieldName] = action.payload.value;
      }
    },

    // Set all field values for a role (complex)
    setRoleFieldValuesComplex: (
      state,
      action: PayloadAction<{ key: string; values: Record<string, any> }>
    ) => {
      state.roleFieldValuesComplex[action.payload.key] = action.payload.values;
    },

    // Clear field values for a role (complex)
    clearRoleFieldValuesComplex: (state, action: PayloadAction<string>) => {
      state.roleFieldValuesComplex[action.payload] = {};
    },

    // Set old radio value
    setOldRadioValue: (
      state,
      action: PayloadAction<{ roleName: string; value: number }>
    ) => {
      state.oldRadioValue[action.payload.roleName] = action.payload.value;
    },

    // Set file array item
    setFileArrayItem: (
      state,
      action: PayloadAction<{ key: string; item: FileArrayItem }>
    ) => {
      state.fileArray[action.payload.key] = action.payload.item;
    },

    // Update file array item
    updateFileArrayItem: (
      state,
      action: PayloadAction<{ key: string; updates: Partial<FileArrayItem> }>
    ) => {
      if (state.fileArray[action.payload.key]) {
        state.fileArray[action.payload.key] = {
          ...state.fileArray[action.payload.key],
          ...action.payload.updates,
        };
      }
    },

    // Set open divs for a role
    setOpenDivsForRole: (
      state,
      action: PayloadAction<{ roleName: string; divs: OpenDivItem[] }>
    ) => {
      state.openDivsObj[action.payload.roleName] = action.payload.divs;
    },

    // Set existing data
    setExistingData: (state, action: PayloadAction<FieldVisibilitySetting[]>) => {
      state.existingData = action.payload;
    },

    // Set countries list
    setCountriesList: (state, action: PayloadAction<Country[]>) => {
      state.countriesList = action.payload;
    },

    // Set states for a role
    setStatesForRole: (
      state,
      action: PayloadAction<{ roleName: string; states: State[] }>
    ) => {
      state.stateLookupObj[action.payload.roleName] = action.payload.states;
    },

    // Set cities for a role
    setCitiesForRole: (
      state,
      action: PayloadAction<{ roleName: string; cities: City[] }>
    ) => {
      state.cityLookupObj[action.payload.roleName] = action.payload.cities;
    },

    // Reset field access state - resets all interaction state
    resetFieldAccessState: (state) => {
      Object.assign(state, initialState);
    },
  },
});

export const {
  initializeFieldAccess,
  setSelectedField,
  setUserRoles,
  setLoading,
  setSaving,
  setCustomAttributesListForRole,
  appendChildAttributesForRole,
  setRoleVisibility,
  setAllRoleVisibilities,
  setRoleFieldValue,
  clearRoleFieldValue,
  clearAllRoleFieldValues,
  setRoleFieldValueComplex,
  setRoleFieldValuesComplex,
  clearRoleFieldValuesComplex,
  setOldRadioValue,
  setFileArrayItem,
  updateFileArrayItem,
  setOpenDivsForRole,
  setExistingData,
  setCountriesList,
  setStatesForRole,
  setCitiesForRole,
  resetFieldAccessState,
} = fieldAccessSlice.actions;

export default fieldAccessSlice.reducer;
