import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CustomerAttributeFilter {
  _trackingId: string;
  id: string | null;
  fieldId: string;
  fieldValue: string[];
}

interface CarouselItem {
  _trackingId: string;
  id: string | null;
  imageUrl: string;
  url: string;
}

interface BannerItem {
  _trackingId: string;
  id: string | null;
  fileUrl: string;
}

interface UploadCreativeState {
  visibleTo: string;
  selectedRole: string;
  customerAttributeFilters: CustomerAttributeFilter[];
  status: string;
  /**
   * The selected tab doubles as the creative type: a creative configures either a
   * carousel or a banner, and only the active tab's section is saved.
   */
  activeTab: 'carousel' | 'banner';
  carouselItems: CarouselItem[];
  bannerItems: BannerItem[];
  visibilityBehaviour: string;
  /**
   * Visibility window at the picker's minute precision, "YYYY-MM-DD HH:mm"; '' means
   * unbounded on that end. Seconds are added when building the API payload.
   */
  startDateTime: string;
  endDateTime: string;
  hasUnsavedChanges: boolean;
  initialState: {
    visibleTo: string;
    selectedRole: string;
    customerAttributeFilters: CustomerAttributeFilter[];
    status: string;
    activeTab: 'carousel' | 'banner';
    carouselItems: CarouselItem[];
    bannerItems: BannerItem[];
    visibilityBehaviour: string;
    startDateTime: string;
    endDateTime: string;
  } | null;
}

const createDefaultCarouselItems = (): CarouselItem[] => [
  { _trackingId: `carousel-${Date.now()}`, id: null, imageUrl: '', url: '' },
];

const createDefaultBannerItems = (): BannerItem[] => [
  { _trackingId: `banner-${Date.now()}`, id: null, fileUrl: '' },
];

const initialState: UploadCreativeState = {
  visibleTo: '',
  selectedRole: '',
  customerAttributeFilters: [],
  status: '1',
  activeTab: 'carousel',
  carouselItems: createDefaultCarouselItems(),
  bannerItems: createDefaultBannerItems(),
  visibilityBehaviour: '',
  startDateTime: '',
  endDateTime: '',
  hasUnsavedChanges: false,
  initialState: null,
};

// Helper to compare arrays
const arraysEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
};

// Helper function to check if state has changed from initial
const checkForChanges = (state: UploadCreativeState): boolean => {
  if (!state.initialState) return false;

  if (state.visibleTo !== state.initialState.visibleTo) return true;
  if (state.selectedRole !== state.initialState.selectedRole) return true;
  if (state.status !== state.initialState.status) return true;
  // The active tab selects the creative type, so switching it is a real change
  if (state.activeTab !== state.initialState.activeTab) return true;
  if (state.visibilityBehaviour !== state.initialState.visibilityBehaviour) return true;
  if (state.startDateTime !== state.initialState.startDateTime) return true;
  if (state.endDateTime !== state.initialState.endDateTime) return true;

  // Check customer attribute filters
  if (state.customerAttributeFilters.length !== state.initialState.customerAttributeFilters.length) return true;
  for (let i = 0; i < state.customerAttributeFilters.length; i++) {
    const current = state.customerAttributeFilters[i];
    const initial = state.initialState.customerAttributeFilters.find(f => f._trackingId === current._trackingId);
    if (!initial) return true;
    if (current.fieldId !== initial.fieldId) return true;
    if (!arraysEqual(current.fieldValue, initial.fieldValue)) return true;
  }

  // Check carousel items
  if (state.carouselItems.length !== state.initialState.carouselItems.length) return true;
  for (let i = 0; i < state.carouselItems.length; i++) {
    const current = state.carouselItems[i];
    const initial = state.initialState.carouselItems[i];
    if (!initial) return true;
    if (current._trackingId !== initial._trackingId || current.imageUrl !== initial.imageUrl || current.url !== initial.url) return true;
  }

  // Check banner items
  if (state.bannerItems.length !== state.initialState.bannerItems.length) return true;
  for (let i = 0; i < state.bannerItems.length; i++) {
    const current = state.bannerItems[i];
    const initial = state.initialState.bannerItems[i];
    if (!initial) return true;
    if (current._trackingId !== initial._trackingId || current.fileUrl !== initial.fileUrl) return true;
  }

  return false;
};

const uploadCreativeSlice = createSlice({
  name: 'uploadCreative',
  initialState,
  reducers: {
    initializeCreativeState(state) {
      state.initialState = {
        visibleTo: state.visibleTo,
        selectedRole: state.selectedRole,
        customerAttributeFilters: JSON.parse(JSON.stringify(state.customerAttributeFilters)),
        status: state.status,
        activeTab: state.activeTab,
        carouselItems: JSON.parse(JSON.stringify(state.carouselItems)),
        bannerItems: JSON.parse(JSON.stringify(state.bannerItems)),
        visibilityBehaviour: state.visibilityBehaviour,
        startDateTime: state.startDateTime,
        endDateTime: state.endDateTime,
      };
      state.hasUnsavedChanges = false;
    },

    setVisibleTo(state, action: PayloadAction<string>) {
      state.visibleTo = action.payload;
      // Clear role when switching away from roles
      if (action.payload !== '4') {
        state.selectedRole = '';
      }
      // Always clear filters when visibleTo changes (fields belong to different modules)
      state.customerAttributeFilters = [];
      // Auto-add one default filter row when switching to entity type that shows filters
      if (action.payload === '2' || action.payload === '1' || action.payload === '3') {
        state.customerAttributeFilters.push({ _trackingId: `filter-${Date.now()}`, id: null, fieldId: '', fieldValue: [] });
      }
      state.hasUnsavedChanges = checkForChanges(state);
    },

    setSelectedRole(state, action: PayloadAction<string>) {
      state.selectedRole = action.payload;
      state.hasUnsavedChanges = checkForChanges(state);
    },

    setCreativeStatus(state, action: PayloadAction<string>) {
      state.status = action.payload;
      state.hasUnsavedChanges = checkForChanges(state);
    },

    /**
     * Picks the creative type as well as the visible tab. Both sections stay editable
     * while the modal is open — the unselected one is dropped at save time, not here —
     * so switching tabs to compare never destroys work in progress.
     */
    setActiveTab(state, action: PayloadAction<'carousel' | 'banner'>) {
      state.activeTab = action.payload;
      state.hasUnsavedChanges = checkForChanges(state);
    },

    // Customer Attribute Filters
    addFilter(state) {
      state.customerAttributeFilters.push({ _trackingId: `filter-${Date.now()}`, id: null, fieldId: '', fieldValue: [] });
      state.hasUnsavedChanges = checkForChanges(state);
    },

    updateFilter(state, action: PayloadAction<{ _trackingId: string; updates: Partial<CustomerAttributeFilter> }>) {
      const index = state.customerAttributeFilters.findIndex(f => f._trackingId === action.payload._trackingId);
      if (index !== -1) {
        state.customerAttributeFilters[index] = {
          ...state.customerAttributeFilters[index],
          ...action.payload.updates,
        };
        state.hasUnsavedChanges = checkForChanges(state);
      }
    },

    removeFilter(state, action: PayloadAction<string>) {
      state.customerAttributeFilters = state.customerAttributeFilters.filter(f => f._trackingId !== action.payload);
      state.hasUnsavedChanges = checkForChanges(state);
    },

    // Carousel Items
    addCarouselItem(state) {
      if (state.carouselItems.length >= 5) return;
      state.carouselItems.push({ _trackingId: `carousel-${Date.now()}`, id: null, imageUrl: '', url: '' });
      state.hasUnsavedChanges = checkForChanges(state);
    },

    updateCarouselItem(state, action: PayloadAction<{ _trackingId: string; updates: Partial<CarouselItem> }>) {
      const index = state.carouselItems.findIndex(c => c._trackingId === action.payload._trackingId);
      if (index !== -1) {
        state.carouselItems[index] = {
          ...state.carouselItems[index],
          ...action.payload.updates,
        };
        state.hasUnsavedChanges = checkForChanges(state);
      }
    },

    removeCarouselItem(state, action: PayloadAction<string>) {
      if (state.carouselItems.length <= 1) return;
      state.carouselItems = state.carouselItems.filter(c => c._trackingId !== action.payload);
      state.hasUnsavedChanges = checkForChanges(state);
    },

    reorderCarouselItems(state, action: PayloadAction<{ sourceIndex: number; destinationIndex: number }>) {
      const { sourceIndex, destinationIndex } = action.payload;
      const newItems = Array.from(state.carouselItems);
      const [removed] = newItems.splice(sourceIndex, 1);
      newItems.splice(destinationIndex, 0, removed);
      state.carouselItems = newItems;
      state.hasUnsavedChanges = checkForChanges(state);
    },

    // Banner Items
    addBannerItem(state) {
      if (state.bannerItems.length >= 5) return;
      state.bannerItems.push({ _trackingId: `banner-${Date.now()}`, id: null, fileUrl: '' });
      state.hasUnsavedChanges = checkForChanges(state);
    },

    updateBannerItem(state, action: PayloadAction<{ _trackingId: string; updates: Partial<BannerItem> }>) {
      const index = state.bannerItems.findIndex(b => b._trackingId === action.payload._trackingId);
      if (index !== -1) {
        state.bannerItems[index] = {
          ...state.bannerItems[index],
          ...action.payload.updates,
        };
        state.hasUnsavedChanges = checkForChanges(state);
      }
    },

    removeBannerItem(state, action: PayloadAction<string>) {
      if (state.bannerItems.length <= 1) return;
      state.bannerItems = state.bannerItems.filter(b => b._trackingId !== action.payload);
      state.hasUnsavedChanges = checkForChanges(state);
    },

    reorderBannerItems(state, action: PayloadAction<{ sourceIndex: number; destinationIndex: number }>) {
      const { sourceIndex, destinationIndex } = action.payload;
      const newItems = Array.from(state.bannerItems);
      const [removed] = newItems.splice(sourceIndex, 1);
      newItems.splice(destinationIndex, 0, removed);
      state.bannerItems = newItems;
      state.hasUnsavedChanges = checkForChanges(state);
    },

    setVisibilityBehaviour(state, action: PayloadAction<string>) {
      state.visibilityBehaviour = action.payload;
      state.hasUnsavedChanges = checkForChanges(state);
    },

    /**
     * Schedules when the creative is visible. Both ends are optional: '' start means
     * visible immediately, '' end means visible indefinitely.
     */
    setVisibilityPeriod(state, action: PayloadAction<{ start: string; end: string }>) {
      state.startDateTime = action.payload.start;
      state.endDateTime = action.payload.end;
      state.hasUnsavedChanges = checkForChanges(state);
    },

    setHasUnsavedChanges(state, action: PayloadAction<boolean>) {
      state.hasUnsavedChanges = action.payload;
    },

    loadCreativeForEdit(state, action: PayloadAction<{
      visibleTo: string;
      selectedRole: string;
      status: string;
      activeTab: 'carousel' | 'banner';
      visibilityBehaviour: string;
      startDateTime: string;
      endDateTime: string;
      customerAttributeFilters: CustomerAttributeFilter[];
      carouselItems: CarouselItem[];
      bannerItems: BannerItem[];
    }>) {
      const data = action.payload;
      state.visibleTo = data.visibleTo;
      state.selectedRole = data.selectedRole;
      state.status = data.status;
      state.activeTab = data.activeTab;
      state.visibilityBehaviour = data.visibilityBehaviour;
      state.startDateTime = data.startDateTime;
      state.endDateTime = data.endDateTime;
      state.customerAttributeFilters = data.customerAttributeFilters;
      state.carouselItems = data.carouselItems.length > 0 ? data.carouselItems : createDefaultCarouselItems();
      state.bannerItems = data.bannerItems.length > 0 ? data.bannerItems : createDefaultBannerItems();
      state.hasUnsavedChanges = false;
      state.initialState = null;
    },

    resetCreative(state) {
      Object.assign(state, {
        ...initialState,
        carouselItems: createDefaultCarouselItems(),
        bannerItems: createDefaultBannerItems(),
        initialState: null,
      });
    },
  },
});

export const {
  initializeCreativeState,
  setVisibleTo,
  setSelectedRole,
  setCreativeStatus,
  setActiveTab,
  addFilter,
  updateFilter,
  removeFilter,
  addCarouselItem,
  updateCarouselItem,
  removeCarouselItem,
  reorderCarouselItems,
  addBannerItem,
  updateBannerItem,
  removeBannerItem,
  reorderBannerItems,
  setVisibilityBehaviour,
  setVisibilityPeriod,
  setHasUnsavedChanges,
  loadCreativeForEdit,
  resetCreative,
} = uploadCreativeSlice.actions;

export default uploadCreativeSlice.reducer;
