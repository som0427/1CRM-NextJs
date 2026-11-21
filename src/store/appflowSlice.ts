import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Field {
  id: string;
  fieldName: string;
  fieldId: string;
  fieldValue: string;
  dataListId?: string;
}

interface Section {
  id: string;
  sectionId: number | null;
  name: string;
  status: string;
  fields: Field[];
}

interface FlowDesigner {
  flowName: string;
  selectedRole: string;
  status: string;
  sections: Section[];
  selectedSection: string;
  isFlowCreated: boolean;
  hasUnsavedChanges: boolean;
  initialState: {
    flowName: string;
    selectedRole: string;
    sections: Section[];
  } | null;
}

interface AppFlowState {
  searchTerm: string;
  flowDesigner: FlowDesigner;
}

const initialState: AppFlowState = {
  searchTerm: '',
  flowDesigner: {
    flowName: '',
    selectedRole: '',
    status: '1',
    sections: [
      {
        id: 'section-1',
        sectionId: null,
        name: 'Basic Info',
        status: '1',
        fields: [
          {
            id: 'section-1-field-1',
            fieldName: 'Field 1',
            fieldId: '',
            fieldValue: '',
          }
        ]
      }
    ],
    selectedSection: 'section-1',
    isFlowCreated: false,
    hasUnsavedChanges: false,
    initialState: null
  }
};

// Helper function to check if state has changed from initial
const checkForChanges = (state: FlowDesigner): boolean => {
  if (!state.initialState) return false;

  // Check flow name change
  if (state.flowName !== state.initialState.flowName) return true;

  // Check role change
  if (state.selectedRole !== state.initialState.selectedRole) return true;

  // Check sections changes
  const currentSections = state.sections;
  const initialSections = state.initialState.sections;

  // Check if number of sections changed
  if (currentSections.length !== initialSections.length) return true;

  // Check each section
  for (let i = 0; i < currentSections.length; i++) {
    const current = currentSections[i];
    const initial = initialSections.find(s => s.id === current.id);

    // If section doesn't exist in initial state, it's new
    if (!initial) return true;

    // Check section name change
    if (current.name !== initial.name) return true;

    // Check fields count
    if (current.fields.length !== initial.fields.length) return true;

    // Check each field
    for (let j = 0; j < current.fields.length; j++) {
      const currentField = current.fields[j];
      const initialField = initial.fields.find(f => f.id === currentField.id);

      // If field doesn't exist in initial state, it's new
      if (!initialField) return true;

      // Check field value change
      if (currentField.fieldId !== initialField.fieldId) return true;
    }
  }

  return false;
};

const appflowSlice = createSlice({
  name: 'appflow',
  initialState,
  reducers: {
    setSearchTerm(state, action: PayloadAction<string>) {
      state.searchTerm = action.payload;
    },
    
    // Initialize the initial state for dirty check comparison
    initializeInitialState(state) {
      state.flowDesigner.initialState = {
        flowName: state.flowDesigner.flowName,
        selectedRole: state.flowDesigner.selectedRole,
        sections: JSON.parse(JSON.stringify(state.flowDesigner.sections)) // Deep copy
      };
      state.flowDesigner.hasUnsavedChanges = false;
    },

    // Flow Designer actions
    setFlowName(state, action: PayloadAction<string>) {
      state.flowDesigner.flowName = action.payload;
      state.flowDesigner.hasUnsavedChanges = checkForChanges(state.flowDesigner);
    },

    setSelectedRole(state, action: PayloadAction<string>) {
      state.flowDesigner.selectedRole = action.payload;
      state.flowDesigner.hasUnsavedChanges = checkForChanges(state.flowDesigner);
    },

    setFlowStatus(state, action: PayloadAction<string>) {
      state.flowDesigner.status = action.payload;
      state.flowDesigner.hasUnsavedChanges = checkForChanges(state.flowDesigner);
    },

    addSection(state, action: PayloadAction<Section>) {
      state.flowDesigner.sections.push(action.payload);
      state.flowDesigner.selectedSection = action.payload.id;
      state.flowDesigner.hasUnsavedChanges = checkForChanges(state.flowDesigner);
    },

    updateSection(state, action: PayloadAction<{ id: string; updates: Partial<Section> }>) {
      const sectionIndex = state.flowDesigner.sections.findIndex(s => s.id === action.payload.id);
      if (sectionIndex !== -1) {
        state.flowDesigner.sections[sectionIndex] = {
          ...state.flowDesigner.sections[sectionIndex],
          ...action.payload.updates
        };
        state.flowDesigner.hasUnsavedChanges = checkForChanges(state.flowDesigner);
      }
    },

    deleteSection(state, action: PayloadAction<string>) {
      state.flowDesigner.sections = state.flowDesigner.sections.filter(s => s.id !== action.payload);
      if (state.flowDesigner.selectedSection === action.payload && state.flowDesigner.sections.length > 0) {
        state.flowDesigner.selectedSection = state.flowDesigner.sections[0].id;
      }
      state.flowDesigner.hasUnsavedChanges = checkForChanges(state.flowDesigner);
    },

    setSelectedSection(state, action: PayloadAction<string>) {
      state.flowDesigner.selectedSection = action.payload;
    },

    addFieldToSection(state, action: PayloadAction<{ sectionId: string; field: Field }>) {
      const section = state.flowDesigner.sections.find(s => s.id === action.payload.sectionId);
      if (section) {
        section.fields.push(action.payload.field);
        state.flowDesigner.hasUnsavedChanges = checkForChanges(state.flowDesigner);
      }
    },

    updateFieldInSection(state, action: PayloadAction<{ sectionId: string; fieldId: string; updates: Partial<Field> }>) {
      const section = state.flowDesigner.sections.find(s => s.id === action.payload.sectionId);
      if (section) {
        const fieldIndex = section.fields.findIndex(f => f.id === action.payload.fieldId);
        if (fieldIndex !== -1) {
          section.fields[fieldIndex] = {
            ...section.fields[fieldIndex],
            ...action.payload.updates
          };
          state.flowDesigner.hasUnsavedChanges = checkForChanges(state.flowDesigner);
        }
      }
    },

    deleteFieldFromSection(state, action: PayloadAction<{ sectionId: string; fieldId: string }>) {
      const section = state.flowDesigner.sections.find(s => s.id === action.payload.sectionId);
      if (section) {
        section.fields = section.fields.filter(f => f.id !== action.payload.fieldId);
        state.flowDesigner.hasUnsavedChanges = checkForChanges(state.flowDesigner);
      }
    },
    
    setIsFlowCreated(state, action: PayloadAction<boolean>) {
      state.flowDesigner.isFlowCreated = action.payload;
    },
    
    setHasUnsavedChanges(state, action: PayloadAction<boolean>) {
      state.flowDesigner.hasUnsavedChanges = action.payload;
    },
    
    resetFlowDesigner(state) {
      state.flowDesigner = { ...initialState.flowDesigner, initialState: null };
    },
    
    loadFlowDesigner(state, action: PayloadAction<FlowDesigner>) {
      state.flowDesigner = action.payload;
    }
  },
});

export const {
  setSearchTerm,
  initializeInitialState,
  setFlowName,
  setSelectedRole,
  setFlowStatus,
  addSection,
  updateSection,
  deleteSection,
  setSelectedSection,
  addFieldToSection,
  updateFieldInSection,
  deleteFieldFromSection,
  setIsFlowCreated,
  setHasUnsavedChanges,
  resetFlowDesigner,
  loadFlowDesigner
} = appflowSlice.actions;

export default appflowSlice.reducer;