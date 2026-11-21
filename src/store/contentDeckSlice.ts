import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ContentDeckData } from '@/lib/models/content-decks/contentDeckModels';

// Use ContentDeckData interface for consistency with API
interface ContentDeck extends ContentDeckData {}

export interface Card {
  id: number;
  cardId: number | null;
  name: string;
  code: string;
  mediaType: '1' | '2';
  mediaUrl?: string;
  youtubeUrl?: string;
  question?: string | null; // Made optional, can be null
  options: Array<{
    id: any | null; // Use any to allow for null or string IDs
    text: string;
    isCorrect: boolean;
  }>;
  status: '1' | '0';
  sequence: number;
  questionType: '1' | '2'; // 1 = question, 2 = poll - per card
}

interface AttributeMapping {
  attributeId: string;
  lookupValues: string[];
  conditionOperator: 1 | 2;  // 1 for AND, 2 for OR
}

interface DeckForm {
  name: string;
  contentTopicId: string;
  dueByType: '1' | '2' | '3';
  dueDate: string;
  relativeDays: number;
  notifyOnEdit: boolean;
  thumbnailUrl: string;
  assignedTo: string[];
  status: '1' | '0';
  isUploadingThumbnail?: boolean;
  // Entity type fields
  entityType: '5' | '2' | '';  // '5' for User, '2' for Customer (Entity)
  attributeMappings: AttributeMapping[];  // Used when entityType is '2' (Customer)
  passScore: string;
  maxReattempt: string;
}

interface ModalState {
  isOpen: boolean;
  currentStep: 1 | 2;
  isEditMode: boolean;
  editingDeckId?: string | number;
  submitLoading: boolean;
  error: string | null;
  step1Valid: boolean;
  isDirty: boolean;
}

interface CardConfigState {
  cards: Card[];
  selectedCardId: number | null;
  nextCardCode: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fieldErrors: { [key: string]: string };
}

interface ContentDeckState {
  decks: ContentDeckData[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  modal: ModalState;
  deckForm: DeckForm;
  cardConfig: CardConfigState;
  cardValidationErrors: { [key: string]: string };
}

const initialDeckForm: DeckForm = {
  name: '',
  contentTopicId: '',
  dueByType: '1',
  dueDate: '',
  relativeDays: 0,
  notifyOnEdit: false,
  thumbnailUrl: '',
  assignedTo: [],
  status: '1',
  // Entity type fields
  entityType: '',
  attributeMappings: [{ attributeId: '', lookupValues: [], conditionOperator: 1 }],
  passScore: '70',
  maxReattempt: '3',
};

// Helper function to create a new card
// IMPORTANT: Always create with at least one option to prevent infinite loops
const createNewCard = (id: number, sequence: number, codeNumber: number, questionType: '1' | '2' = '1'): Card => ({
  id,
  cardId: null,
  name: `Card ${sequence}`, // Use sequence for display name instead of id
  code: `CDC${String(codeNumber).padStart(4, '0')}`,
  mediaType: '1',
  mediaUrl: '',
  youtubeUrl: '',
  question: '',
  options: [
    { id: null, text: '', isCorrect: false } // Always include at least one option
  ],
  status: '1',
  sequence,
  questionType // Default to '1' (question)
});

// Validation functions
const validateDeckForm = (deckForm: DeckForm): ValidationResult => {
  const errors: string[] = [];
  const fieldErrors: { [key: string]: string } = {};

  // Deck name validation
  if (!deckForm.name.trim()) {
    const error = 'Deck name cannot be blank.';
    errors.push(error);
    fieldErrors.name = error;
  } else if (deckForm.name.length > 100) {
    const error = 'Deck name must be 100 characters or less.';
    errors.push(error);
    fieldErrors.name = error;
  }

  // Entity type validation
  if (!deckForm.entityType) {
    const error = 'Entity type must be selected.';
    errors.push(error);
    fieldErrors.entityType = error;
  }

  // Assigned to validation - only required when entity type is 'User' ('5')
  if (deckForm.entityType === '5' && (!deckForm.assignedTo || deckForm.assignedTo.length === 0)) {
    const error = 'Assign To cannot be blank.';
    errors.push(error);
    fieldErrors.assignedTo = error;
  }

  // Due date validation
  if (deckForm.dueByType === '3' && !deckForm.dueDate) {
    const error = 'Due date cannot be blank when fixed date is selected.';
    errors.push(error);
    fieldErrors.dueDate = error;
  }
  
  if (deckForm.dueByType === '2' && deckForm.relativeDays <= 0) {
    const error = 'Relative days must be greater than 0.';
    errors.push(error);
    fieldErrors.relativeDays = error;
  }

  // Validate due date is not in the past
  if (deckForm.dueByType === '3' && deckForm.dueDate) {
    const dueDate = new Date(deckForm.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today) {
      const error = 'Due date cannot be in the past.';
      errors.push(error);
      fieldErrors.dueDate = error;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    fieldErrors
  };
};

const validateCards = (cards: Card[]): ValidationResult => {
  const errors: string[] = [];
  const fieldErrors: { [key: string]: string } = {};
  
  // console.log('Validating cards:', cards);
  
  if (cards.length === 0) {
    const error = 'At least one card is required.';
    errors.push(error);
    fieldErrors.cards = error;
  }
  
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const cardErrors: string[] = [];
    
    // console.log(`Validating card ${card.id}:`, card);
    
    // Validate question
    // if (!card.question || !card.question.trim()) {
    //   const error = `Question cannot be blank`;
    //   cardErrors.push(error);
    //   fieldErrors[`card-${card.id}-question`] = error;
    //   // console.log(`Card ${card.id} has empty question, adding error`);
    // }
    
    // Validate media type and media content
    if (!card.mediaType) {
      const error = `Media type is required`;
      cardErrors.push(error);
      fieldErrors[`card-${card.id}-mediaType`] = error;
    } else {
      // Validate media URL based on media type
      if (card.mediaType === '1' && !card.mediaUrl) {
        const error = `Image is required`;
        cardErrors.push(error);
        fieldErrors[`card-${card.id}-mediaUrl`] = error;
      } else if (card.mediaType === '2' && !card.youtubeUrl) {
        const error = `YouTube URL is required`;
        cardErrors.push(error);
        fieldErrors[`card-${card.id}-youtubeUrl`] = error;
      }
    }
    
    // Only validate options if there's a question
    if (card.question && card.question.trim()) {
      // Validate options and correct answers
      const correctOptions = card.options.filter(opt => opt.isCorrect && opt.text.trim());
      let hasOptionErrors = false;

      // Check each option individually
      for (let j = 0; j < card.options.length; j++) {
        const option = card.options[j];
        if (!option.text.trim()) {
          const error = `Option text is required`;
          fieldErrors[`card-${card.id}-option-${j}`] = error;
          hasOptionErrors = true;
          if (!cardErrors.includes('Options have errors')) {
            cardErrors.push('Options have errors');
          }
        }
      }

      // Only validate correct answers for questions (card.questionType === '1'), not for polls
      if (!hasOptionErrors && card.questionType === '1' && correctOptions.length === 0) {
        const error = `At least one correct answer must be selected`;
        cardErrors.push(error);
        fieldErrors[`card-${card.id}-options`] = error;
      }
    }
    
    // Validate status
    if (!card.status) {
      const error = `Status is required`;
      cardErrors.push(error);
      fieldErrors[`card-${card.id}-status`] = error;
    }
    
    // Add card errors to main errors array with card identifier
    if (cardErrors.length > 0) {
      errors.push(`Card ${i + 1}: ${cardErrors.join(', ')}`);
    }
  }
  
  
  return {
    isValid: errors.length === 0,
    errors,
    fieldErrors
  };
};

const initialState: ContentDeckState = {
  decks: [],
  loading: false,
  error: null,
  searchTerm: '',
  modal: {
    isOpen: false,
    currentStep: 1,
    isEditMode: false,
    submitLoading: false,
    error: null,
    step1Valid: false,
    isDirty: false,
  },
  deckForm: initialDeckForm,
  cardConfig: {
    cards: [createNewCard(1, 1, 1)],
    selectedCardId: 1,
    nextCardCode: 2,
  },
  cardValidationErrors: {},
};

const contentDeckSlice = createSlice({
  name: 'contentDeck',
  initialState,
  reducers: {
    // Modal Management
    openModal(state, action: PayloadAction<{ isEditMode?: boolean; deckId?: string | number }>) {
      state.modal.isOpen = true;
      state.modal.currentStep = 1;
      state.modal.isEditMode = action.payload.isEditMode || false;
      state.modal.editingDeckId = action.payload.deckId;
      state.modal.error = null;
      state.modal.submitLoading = false;
      
      // Reset form data when opening modal
      if (!action.payload.isEditMode) {
        state.deckForm = initialDeckForm;
        state.cardConfig = {
          cards: [createNewCard(1, 1, 1)],
          selectedCardId: 1,
          nextCardCode: 2,
        };
        state.cardValidationErrors = {};
      }
    },
    closeModal(state) {
      state.modal.isOpen = false;
      state.modal.currentStep = 1;
      state.modal.isEditMode = false;
      state.modal.editingDeckId = undefined;
      state.modal.submitLoading = false;
      state.modal.error = null;
      state.modal.step1Valid = false;
      state.modal.isDirty = false;
      
      // Reset form data when closing modal
      state.deckForm = { ...initialDeckForm };
      state.cardConfig = {
        cards: [createNewCard(1, 1, 1)],
        selectedCardId: 1,
        nextCardCode: 2,
      };
      state.cardValidationErrors = {};
    },
    setCurrentStep(state, action: PayloadAction<1 | 2>) {
      state.modal.currentStep = action.payload;
    },
    setModalError(state, action: PayloadAction<string | null>) {
      state.modal.error = action.payload;
    },
    setSubmitLoading(state, action: PayloadAction<boolean>) {
      state.modal.submitLoading = action.payload;
    },
    setStep1Valid(state, action: PayloadAction<boolean>) {
      state.modal.step1Valid = action.payload;
    },
    setModalDirty(state, action: PayloadAction<boolean>) {
      state.modal.isDirty = action.payload;
    },
    // Deck Form Management
    updateDeckForm(state, action: PayloadAction<Partial<DeckForm>>) {
      const payload = { ...action.payload };
      // Ensure assignedTo is always an array
      if (payload.assignedTo && !Array.isArray(payload.assignedTo)) {
        payload.assignedTo = [];
      }
      // Ensure attributeMappings has proper structure (flat array with conditionOperator per item)
      if (payload.attributeMappings !== undefined) {
        if (!Array.isArray(payload.attributeMappings) || payload.attributeMappings.length === 0) {
          payload.attributeMappings = [{ attributeId: '', lookupValues: [], conditionOperator: 1 }];
        }
      }
      state.deckForm = { ...state.deckForm, ...payload };
    },
    resetDeckForm(state) {
      state.deckForm = { ...initialDeckForm };
    },
    resetCardConfig(state) {
      state.cardConfig = {
        cards: [createNewCard(1, 1, 1)],
        selectedCardId: 1,
        nextCardCode: 2,
      };
      state.cardValidationErrors = {};
    },
    setCardsFromAPI(state, action: PayloadAction<any[]>) {
      // Sort cards by sequence first
      const sortedApiCards = [...action.payload].sort((a, b) => {
        const seqA = a.sequence || 999;
        const seqB = b.sequence || 999;
        return seqA - seqB;
      });
      
      // Transform API cards to match our internal structure
      const transformedCards = sortedApiCards.map((apiCard, index) => {
        // For cards from API, if cardId exists use it as id, otherwise use index + 1
        return {
          id: index + 1, 
          cardId: apiCard.cardId, // cardId should be same as id
          name: apiCard.name || `Card ${index + 1}`,
          code: apiCard.code || `CDC${String(index + 1).padStart(4, '0')}`,
          mediaType: apiCard.mediaType || '1',
          mediaUrl: apiCard.mediaUrl || '',
          youtubeUrl: apiCard.youtubeUrl || '',
          question: apiCard.question || '',
          options: apiCard.options?.map((opt: any) => ({
            id: opt.id || null, // Keep original ID or null for new options
            text: opt.text || '',
            isCorrect: opt.isCorrect || false
          })) || [{ id: null, text: '', isCorrect: false }], // Ensure at least one option
          status: apiCard.status || '1',
          sequence: apiCard.sequence || index + 1,
          questionType: apiCard.questionType || '1'
        };
      });
      
      state.cardConfig.cards = transformedCards.length > 0 ? transformedCards : [createNewCard(1, 1, 1)];
      state.cardConfig.selectedCardId = transformedCards.length > 0 ? transformedCards[0].id : 1;
      
      // Calculate next card code based on the highest existing card ID
      const maxCardId = transformedCards.length > 0 
        ? Math.max(...transformedCards.map(c => c.id))
        : 0;
      state.cardConfig.nextCardCode = maxCardId + 1;
      
      state.cardValidationErrors = {};
    },
    setCardValidationErrors(state, action: PayloadAction<{ [key: string]: string }>) {
      state.cardValidationErrors = action.payload;
    },
    clearCardValidationErrors(state) {
      state.cardValidationErrors = {};
    },
    clearCardFieldError(state, action: PayloadAction<string>) {
      // Clear a specific field error
      delete state.cardValidationErrors[action.payload];
    },
    // Card Configuration Management
    addCard(state) {
      // Get the next ID ensuring it's unique
      const existingIds = state.cardConfig.cards.map(c => c.id);
      const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
      const newSequence = state.cardConfig.cards.length + 1;
      
      // Create new card with at least one option to prevent infinite loops in the component
      const newCard: Card = createNewCard(newId, newSequence, state.cardConfig.nextCardCode);
      
      state.cardConfig.cards.push(newCard);
      state.cardConfig.selectedCardId = newCard.id;
      state.cardConfig.nextCardCode = newId + 1;
      
      // Clear any validation errors for the new card
      Object.keys(state.cardValidationErrors).forEach(key => {
        if (key.startsWith(`card-${newCard.id}-`)) {
          delete state.cardValidationErrors[key];
        }
      });
    },
    removeCard(state, action: PayloadAction<number>) {
      const cardIndex = state.cardConfig.cards.findIndex(c => c.id === action.payload);
      if (cardIndex !== -1 && state.cardConfig.cards.length > 1) {
        state.cardConfig.cards.splice(cardIndex, 1);
        // Update sequences
        state.cardConfig.cards.forEach((card, index) => {
          card.sequence = index + 1;
        });
        // Select the first card if the removed card was selected
        if (state.cardConfig.selectedCardId === action.payload) {
          state.cardConfig.selectedCardId = state.cardConfig.cards[0].id;
        }
        
        // Clear validation errors for the removed card
        Object.keys(state.cardValidationErrors).forEach(key => {
          if (key.startsWith(`card-${action.payload}-`)) {
            delete state.cardValidationErrors[key];
          }
        });
      }
    },
    reorderCards(state, action: PayloadAction<{ sourceIndex: number; destinationIndex: number }>) {
      const { sourceIndex, destinationIndex } = action.payload;
      const [removed] = state.cardConfig.cards.splice(sourceIndex, 1);
      state.cardConfig.cards.splice(destinationIndex, 0, removed);
      // Update sequences
      state.cardConfig.cards.forEach((card, index) => {
        card.sequence = index + 1;
      });
    },
    addOption(state, action: PayloadAction<number>) {
      const cardIndex = state.cardConfig.cards.findIndex(c => c.id === action.payload);
      if (cardIndex !== -1) {
        const card = state.cardConfig.cards[cardIndex];
        const newOptionId = `option-${card.id}-${Date.now()}`; // Use timestamp for unique ID
        const updatedOptions = [
          ...card.options.map(opt => ({ ...opt })), // Deep clone
          { id: newOptionId, text: '', isCorrect: false }
        ];
        state.cardConfig.cards[cardIndex] = {
          ...card,
          options: updatedOptions
        };
      }
    },
    removeOption(state, action: PayloadAction<{ cardId: number; optionId: string }>) {
      const cardIndex = state.cardConfig.cards.findIndex(c => c.id === action.payload.cardId);
      if (cardIndex !== -1) {
        const card = state.cardConfig.cards[cardIndex];
        if (card.options.length > 1) {
          const updatedOptions = card.options.filter(o => o.id !== action.payload.optionId);
    
          state.cardConfig.cards[cardIndex] = {
            ...card,
            options: updatedOptions
          };
        }
      }
    },
    selectCard(state, action: PayloadAction<number>) {
      // Only update if the card exists
      const cardExists = state.cardConfig.cards.some(c => c.id === action.payload);
      if (cardExists) {
        state.cardConfig.selectedCardId = action.payload;
      }
    },
    updateCard(state, action: PayloadAction<{ cardId: number; updates: Partial<Card> }>) {
      const cardIndex = state.cardConfig.cards.findIndex(c => c.id === action.payload.cardId);
      if (cardIndex !== -1) {
        // Ensure options always exist and have at least one item
        let updates = { ...action.payload.updates };
        if (updates.options !== undefined) {
          // Ensure options is an array and has at least one option
          if (!Array.isArray(updates.options) || updates.options.length === 0) {
            updates.options = [{ id: `option-${action.payload.cardId}-1`, text: '', isCorrect: false }];
          }
        }
        
        state.cardConfig.cards[cardIndex] = { 
          ...state.cardConfig.cards[cardIndex], 
          ...updates 
        };
      }
    },
    updateCardOption(state, action: PayloadAction<{ cardId: number; optionId: string; text: string }>) {
      const cardIndex = state.cardConfig.cards.findIndex(c => c.id === action.payload.cardId);
      if (cardIndex !== -1) {
        const card = state.cardConfig.cards[cardIndex];
        const updatedOptions = card.options.map(option =>
          option.id === action.payload.optionId
            ? { ...option, text: action.payload.text }
            : option
        );
    
        state.cardConfig.cards[cardIndex] = {
          ...card,
          options: updatedOptions
        };
      }
    },
    toggleCorrectOption(state, action: PayloadAction<{ cardId: number; optionId: string }>) {
      const cardIndex = state.cardConfig.cards.findIndex(c => c.id === action.payload.cardId);
      if (cardIndex !== -1) {
        const card = state.cardConfig.cards[cardIndex];
    
        const updatedOptions = card.options.map(option => ({
          ...option,
          isCorrect: option.id === action.payload.optionId
        }));
    
        state.cardConfig.cards[cardIndex] = {
          ...card,
          options: updatedOptions
        };
      }
    },
    setDecks(state, action: PayloadAction<ContentDeckData[]>) {
      state.decks = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setSearchTerm(state, action: PayloadAction<string>) {
      state.searchTerm = action.payload;
    },
    addDeck(state, action: PayloadAction<ContentDeckData>) {
      state.decks.push(action.payload);
    },
    removeDeck(state, action: PayloadAction<number>) {
      state.decks = state.decks.filter(deck => deck.id !== action.payload);
    },
    updateDeck(state, action: PayloadAction<ContentDeckData>) {
      const idx = state.decks.findIndex(d => d.id === action.payload.id);
      if (idx !== -1) state.decks[idx] = action.payload;
    },
  },
});

export const { 
  // Legacy actions
  setDecks, setLoading, setError, setSearchTerm, addDeck, removeDeck, updateDeck,
  // New modal actions
  openModal, closeModal, setCurrentStep, setModalError, setSubmitLoading, setStep1Valid, setModalDirty,
  // Deck form actions
  updateDeckForm, resetDeckForm,
  // Card config actions
  addCard, removeCard, reorderCards, addOption, removeOption, selectCard, updateCard, updateCardOption, toggleCorrectOption, resetCardConfig, setCardsFromAPI,
  // Card validation actions
  setCardValidationErrors, clearCardValidationErrors, clearCardFieldError
} = contentDeckSlice.actions;

// Export validation functions
export { validateDeckForm, validateCards };
export type { ValidationResult };

export default contentDeckSlice.reducer;