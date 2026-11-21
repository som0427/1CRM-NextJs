import Modal from "@/components/common/Modal";
import { Button } from "../../../ui/tailwind/Button";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import DeckConfigurationStep from "./DeckConfigurationStep";
import CardConfigurationStep, { cardConfigRef } from "./CardConfigurationStep";
import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    openModal,
    closeModal,
    setCurrentStep,
    setModalError,
    setSubmitLoading,
    setStep1Valid,
    updateDeckForm,
    validateDeckForm,
    validateCards,
    setCardValidationErrors,
    clearCardValidationErrors,
    setCardsFromAPI
} from "@/store/contentDeckSlice";
import { getRoles, addTraingramDeck, fetchDeckData } from "@/lib/api/contentDeckApi";
import { useSnackbar } from 'notistack';
import Spinner from "@/components/common/Spinner";
import settingsService from "@/lib/services/settingsService";
import userService from "@/lib/services/userService";
import { SystemAttributeEnum } from "@/lib/constants/SystemAttributeEnum.constant";
import { fetchContentTopicList, ContentTopicItem } from "@/lib/services/contentTopicService";

// Types for dynamic names and form fields
interface DynamicFieldNames {
    customersLabel: string | null;
    opportunitiesLabel: string | null;
    opportunityEnabled: boolean;
}

interface FormFieldData {
    id: number;  // API returns 'id' not 'attributeId'
    attributeName: string;
    attributeType: { id: number };
    status: number;
    lookupValues?: Array<{
        id?: number;
        lookupValue?: string;
    }>;
}

enum Steps {
    ONE = 1,
    TWO = 2
}

interface AddEditContentDeckModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    deckId?: string | number; // ID for editing (if provided, it's edit mode; if not, it's add mode)
}

const AddEditContentDeckModal: React.FC<AddEditContentDeckModalProps> = ({
    open,
    onClose,
    onSuccess,
    deckId
}) => {
    const dispatch = useAppDispatch();
    const { modal, deckForm, cardConfig } = useAppSelector(state => state.contentDeck);
    const [roles, setRoles] = useState<any[]>([]);
    const [dynamicNames, setDynamicNames] = useState<DynamicFieldNames>({
        customersLabel: null,
        opportunitiesLabel: null,
        opportunityEnabled: false,
    });
    const [formFields, setFormFields] = useState<FormFieldData[]>([]);
    const [contentTopics, setContentTopics] = useState<ContentTopicItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const [initialFormState, setInitialFormState] = useState<any>(null);
    const [initialCardsState, setInitialCardsState] = useState<any>(null);
    const [originalCardsData, setOriginalCardsData] = useState<any[]>([]);
    const [originalDeckData, setOriginalDeckData] = useState<any>(null);
    const [forceFormDirty, setForceFormDirty] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    // console.log(cardConfig);
    // Determine if it's edit mode based on deckId presence
    const isEditMode = deckId !== undefined && deckId !== null;
    // Project Id
    const selectedProject = JSON.parse(localStorage.getItem('selectedProject') || '{}');


    // Set loading state immediately when modal opens
    useEffect(() => {
        if (open) {
            setIsLoading(true);
        }
    }, [open]);

    // Fetch data when modal opens
    useEffect(() => {
        if (open && selectedProject) {
            let dataFetched = 0;
            // Roles, Dynamic Names, Form Fields, Content Topics + (Deck data if edit mode)
            const totalToFetch = isEditMode ? 5 : 4;

            // Fetch content topics
            fetchContentTopicList(selectedProject)
                .then(topics => {
                    setContentTopics(topics || []);
                })
                .catch(error => {
                    console.error('Error fetching content topics:', error);
                    setContentTopics([]);
                })
                .finally(() => {
                    dataFetched++;
                    if (dataFetched >= totalToFetch) {
                        setIsLoading(false);
                    }
                });

            // Fetch roles
            getRoles(selectedProject)
                .then(response => {
                    setRoles(response || []);
                })
                .catch(error => {
                    console.error('Error fetching roles:', error);
                    setRoles([]);
                    dispatch(setModalError('Failed to load roles. Please check your connection.'));
                })
                .finally(() => {
                    dataFetched++;
                    if (dataFetched >= totalToFetch) {
                        setIsLoading(false);
                    }
                });

            // Fetch dynamic field names (Customer/Opportunity labels)
            settingsService.getdynamicFieldNames(selectedProject)
                .then(result => {
                    if (result.statusCode === 200 && result.responseData) {
                        const names: DynamicFieldNames = {
                            customersLabel: null,
                            opportunitiesLabel: null,
                            opportunityEnabled: false,
                        };
                        result.responseData.forEach((row: { moduleId: number; pluralName: string; opportunityEnabled?: boolean }) => {
                            if (row.moduleId === SystemAttributeEnum.COMPANY_MODULE) {
                                names.customersLabel = row.pluralName;
                            }
                            if (row.moduleId === SystemAttributeEnum.OPPORTUNITY_MODULE) {
                                names.opportunitiesLabel = row.pluralName;
                                names.opportunityEnabled = row.opportunityEnabled || false;
                            }
                        });
                        setDynamicNames(names);
                    }
                })
                .catch(error => {
                    console.error('Error fetching dynamic names:', error);
                })
                .finally(() => {
                    dataFetched++;
                    if (dataFetched >= totalToFetch) {
                        setIsLoading(false);
                    }
                });

            // Fetch form fields (attributes with lookup values) using getFormFields
            settingsService.getFormFields(selectedProject, SystemAttributeEnum.COMPANY_MODULE)
                .then(async (result) => {
                    if (result && Array.isArray(result)) {
                        // Filter single-select, multi-select, and text field attributes
                        const singleSelectFields = result.filter(
                            (field: any) => (field.attributeType?.id === 1 || field.attributeType?.id === 2 || field.attributeType?.id === 6) && field.status === 1
                        );

                        // TDS - For system attribute 34, fetch all active users as lookup
                        for (const field of singleSelectFields) {
                            if ((field as any).systemAttribute?.id === 34) {
                                try {
                                    const usersResponse = await userService.getActiveUsers(selectedProject);
                                    if (usersResponse.statusCode === 200 && usersResponse.responseData) {
                                        field.lookupValues = usersResponse.responseData.map((user: any) => ({
                                            id: user.id || user.userId,
                                            lookupValue: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.userName
                                        }));
                                    }
                                } catch (error) {
                                    console.error('Error fetching users for TDS field:', error);
                                }
                            }
                        }

                        setFormFields(singleSelectFields);
                    }
                })
                .catch(error => {
                    console.error('Error fetching form fields:', error);
                    setFormFields([]);
                })
                .finally(() => {
                    dataFetched++;
                    if (dataFetched >= totalToFetch) {
                        setIsLoading(false);
                    }
                });
            
            // Fetch deck data if in edit mode
            if (isEditMode && deckId) {
                fetchDeckData(Number(deckId), selectedProject)
                    .then(response => {
                        if (response) {
                            const data = Array.isArray(response) ? response[0] : response;
                            if (data) {
                                const formData = {
                                    name: data.name || '',
                                    contentTopicId: data.contentTopicId ? String(data.contentTopicId) : '',
                                    dueByType: String(data.dueBy || '1'),
                                    dueDate: data.dueDate || '',
                                    relativeDays: Number(data.relativeDueDate) || 0,
                                    notifyOnEdit: data.notifyOnEdit || false,
                                    thumbnailUrl: data.thumbnailUrl || '',
                                    assignedTo: data.assignedRoles || [],
                                    status: data.isActive ? '1' : '0',
                                    // Entity type fields
                                    entityType: data.entityType ? String(data.entityType) : '',
                                    passScore: data.passScore != null ? String(data.passScore) : '70',
                                    maxReattempt: data.maxReattempt != null ? String(data.maxReattempt) : '3',
                                    attributeMappings: data.attributeMapping && Array.isArray(data.attributeMapping) && data.attributeMapping.length > 0
                                        ? data.attributeMapping.map((mapping: any) => ({
                                            attributeId: String(mapping.attributeId || ''),
                                            lookupValues: Array.isArray(mapping.lookupValues)
                                                ? mapping.lookupValues.map((v: any) => String(v))
                                                : [],
                                            conditionOperator: mapping.conditionOperator || 1,
                                        }))
                                        : [{ attributeId: '', lookupValues: [], conditionOperator: 1 }],
                                };
                                
                                // Store original deck data before dispatching to Redux
                                setOriginalDeckData(formData);
                                dispatch(updateDeckForm(formData));
                                
                                if (data.cards && Array.isArray(data.cards)) {
                                    // Store original cards data before dispatching to Redux
                                    setOriginalCardsData(JSON.parse(JSON.stringify(data.cards)));
                                    dispatch(setCardsFromAPI(data.cards));
                                    setInitialCardsState(JSON.parse(JSON.stringify(data.cards)));
                                }
                                
                                setInitialFormState(formData);
                            }
                        }
                    })
                    .catch((error: any) => {
                        console.error('Error fetching deck data:', error);
                        const errorMessage = error?.response?.data?.message || 
                                           error?.message || 
                                           'Failed to load deck data. Please try again.';
                        dispatch(setModalError(errorMessage));
                    })
                    .finally(() => {
                        dataFetched++;
                        if (dataFetched >= totalToFetch) {
                            setIsLoading(false);
                        }
                    });
            }
        }
    }, [open, selectedProject, isEditMode, deckId, dispatch]);

    // Handle modal open/close synchronization with Redux
    useEffect(() => {
        if (open) {
            // Dispatch openModal action when modal opens
            dispatch(openModal({ isEditMode, deckId }));
        }
    }, [open, isEditMode, deckId, dispatch]);

    // Expose original data globally
    useEffect(() => {
        (window as any).getOriginalCardsData = () => originalCardsData;
        (window as any).getOriginalDeckData = () => originalDeckData;
        return () => {
            delete (window as any).getOriginalCardsData;
            delete (window as any).getOriginalDeckData;
        };
    }, [originalCardsData, originalDeckData]);

    // Store initial state when modal opens
    useEffect(() => {
        if (open && !isEditMode) {
            // For new deck, immediately capture the Redux state as initial state
            // This represents the "clean" state
            const defaultDeckData = {
                name: '',
                contentTopicId: '',
                thumbnailUrl: '',
                assignedTo: [],
                dueByType: '1',
                dueDate: '',
                relativeDays: 0,
                notifyOnEdit: false,
                status: '1',
                entityType: '',
                attributeMappings: [{ attributeId: '', lookupValues: [], conditionOperator: 1 }],
            };
            setInitialFormState(defaultDeckData);
            setOriginalDeckData(defaultDeckData);
            // Default card state from Redux
            const defaultCard = {
                id: 1,
                cardId: null,
                name: 'Card 1',
                code: 'CDC0001',
                mediaType: '1',
                mediaUrl: '',
                youtubeUrl: '',
                question: '',
                options: [{ id: null, text: '', isCorrect: false }],
                status: '1',
                sequence: 1,
                questionType: '1'
            };
            setInitialCardsState([defaultCard]);
            setOriginalCardsData([defaultCard]);
        }
    }, [open, isEditMode]);


    const handleNext = async () => {
        if (modal.currentStep === Steps.ONE) {
            // Mark form as dirty when moving to next step
            setForceFormDirty(true);
            
            // Sync form data to Redux before validation
            const syncDeckFormToRedux = (window as any).syncDeckFormToRedux;
            if (syncDeckFormToRedux) {
                syncDeckFormToRedux();
            }

            // Trigger React Hook Form validation to show individual field errors
            const deckFormValidation = (window as any).deckFormValidation;
            if (deckFormValidation) {
                const isValid = await deckFormValidation();
                if (!isValid) {
                    // React Hook Form validation failed - individual field errors are now shown
                    dispatch(setStep1Valid(false));
                    return;
                }
            } else {
                // Fallback validation if global function not available
                const requiredFields = ['name', 'assignedTo'];
                const hasErrors = requiredFields.some(field => {
                    const value = deckForm[field as keyof typeof deckForm];
                    if (field === 'name') {
                        return !value || (typeof value === 'string' && value.trim() === '');
                    }
                    if (field === 'assignedTo') {
                        return !value || (Array.isArray(value) && value.length === 0);
                    }
                    return false;
                });

                if (hasErrors) {
                    dispatch(setStep1Valid(false));
                    return;
                }
            }

            // Step 1 is valid - allow progression to Step 2
            dispatch(setStep1Valid(true));
            dispatch(setModalError(null));
            dispatch(setCurrentStep(Steps.TWO));
        }
    };

    // Helper function to reset everything to initial state
    const resetToInitialState = () => {
        // The closeModal action already resets everything according to your slice
        dispatch(closeModal());

        // Reset initial state tracking
        setInitialFormState(null);
        setInitialCardsState(null);
        setShowUnsavedDialog(false);
        setOriginalCardsData([]);
        setOriginalDeckData(null);
        setForceFormDirty(false);
    };

    const handleCancel = () => {
        // Check if the deck form is dirty or if user has moved to next step
        const deckFormDirty = (window as any).getDeckFormDirty?.() || false;
        const hasChanges = deckFormDirty || forceFormDirty;

        // Debug logging for dirty state
        console.log('handleCancel - Dirty check:', {
            isEditMode,
            deckFormDirty,
            forceFormDirty,
            hasChanges
        });

        if (hasChanges) {
            // Show custom confirmation dialog
            setShowUnsavedDialog(true);
        } else {
            // No changes, close immediately
            resetToInitialState();
            onClose();
        }
    };

    const handleConfirmCancel = () => {
        // User confirmed cancellation - close immediately
        setShowUnsavedDialog(false);
        resetToInitialState();
        onClose();
    };

    const handleCancelDialog = () => {
        // User chose to continue editing
        setShowUnsavedDialog(false);
    };

    const handleSubmit = async () => {
        dispatch(setSubmitLoading(true));
        dispatch(setModalError(null));

        try {
            // Sync current card form data to Redux before validation
            if (cardConfigRef.current) {
                cardConfigRef.current.syncFormToRedux();
                // Wait a bit for Redux to update
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Step 1: Validate deck form
            const deckValidation = validateDeckForm(deckForm);
            if (!deckValidation.isValid) {
                dispatch(setCurrentStep(Steps.ONE));
                // const errorMessage = deckValidation.errors.join(' ');
                // dispatch(setModalError(errorMessage));
                dispatch(setSubmitLoading(false));
                return;
            }

            // Step 2: Validate cards (cardConfig is already available from useAppSelector)
            const cardsValidation = validateCards(cardConfig.cards);
            // console.log('Cards validation result:', cardsValidation);
            if (!cardsValidation.isValid) {
                // Set field-level validation errors for cards
                dispatch(setCardValidationErrors(cardsValidation.fieldErrors));

                // Stay on current step (Step 2) to show card errors
                // const errorMessage = cardsValidation.errors.join(' ');
                // dispatch(setModalError(errorMessage));
                dispatch(setSubmitLoading(false));
                return;
            } else {
                // Clear validation errors if validation passes
                dispatch(clearCardValidationErrors());
            }

            // Step 3: All validations passed, proceed with submission
            // Transform cards to set question to null and options to empty array if question is empty
            const transformedCards = cardConfig.cards.map(card => {
                const transformedCard = { ...card };

                // If question is empty or undefined, set question to null and options to empty array
                if (!card.question || !card.question.trim()) {
                    transformedCard.question = null;
                    transformedCard.options = [];
                }

                return transformedCard;
            });

            // Filter out attribute mappings that don't have both attributeId AND lookupValues
            // Normalize lookupValues: text fields store a string, wrap in array for consistency
            let filteredAttributeMappings = (deckForm.attributeMappings || [])
                .map((mapping: { attributeId: string; lookupValues: any; conditionOperator: 1 | 2 }) => ({
                    ...mapping,
                    lookupValues: Array.isArray(mapping.lookupValues)
                        ? mapping.lookupValues
                        : mapping.lookupValues ? [mapping.lookupValues] : []
                }))
                .filter(
                    (mapping) => mapping.attributeId && mapping.lookupValues && mapping.lookupValues.length > 0
                );

            // The last attribute mapping should always have conditionOperator as AND (1)
            if (filteredAttributeMappings.length > 0) {
                filteredAttributeMappings = filteredAttributeMappings.map(
                    (mapping, index: number) => ({
                        ...mapping,
                        conditionOperator: index === filteredAttributeMappings.length - 1 ? 1 : mapping.conditionOperator
                    })
                );
            }

            const payload = {
                deck: {
                    id: deckId || null,
                    ...deckForm,
                    contentTopicId: Number(deckForm.contentTopicId) || null,
                    attributeMappings: filteredAttributeMappings
                },
                cards: transformedCards,
                projectId: selectedProject
            };

            try {
                // Call the API
                const response = await addTraingramDeck(payload);

                // Check if response is successful
                if (response && (response.id || response.success || response.deckId || response.data)) {
                    dispatch(setSubmitLoading(false));

                    // Close immediately on success
                    resetToInitialState();
                    onClose();
                    
                    // Call success callback if provided
                    if (onSuccess) {
                        onSuccess();
                    }
                } else {
                    throw new Error('Failed to save deck. Please try again.');
                }
            } catch (apiError: any) {
                console.error('API Error:', apiError);

                // Handle specific error cases
                let errorMessage = `Failed to ${isEditMode ? 'update' : 'add'} Traingram`;


                // Show error snackbar
                enqueueSnackbar(errorMessage, {
                    variant: 'error',
                    autoHideDuration: 5000
                });

                throw apiError;
            }

        } catch (error: any) {
            dispatch(setSubmitLoading(false));
            // Don't reset on error - let user fix and retry
        }
    };

    // Handle clicking outside or ESC key
    const handleModalClose = () => {
        // Use the same logic as cancel
        handleCancel();
    };

    // Clean up when modal is closed from parent
    useEffect(() => {
        if (!open) {
            // Ensure state is reset when modal is closed from parent
            resetToInitialState();
            // Reset loading state
            setIsLoading(false);
        }
    }, [open]);

    if (!open) return null;

    // Show loader while fetching data
    if (isLoading) {
        return (
            <Spinner blur={true} zIndex={9999} version="fixed"/>
        );
    } else {
        return (
            <>
                <Modal
                    open={open}
                    onClose={handleModalClose} // Use handleModalClose instead of onClose directly
                    fullScreen={modal.currentStep === Steps.TWO}
                    allowBorder={true}
                    closeOnOutsideClick={false}
                    className="animate-fadeIn"
                    header={<h2 className="text-base font-semibold text-[#3F4254]">{modal.currentStep === Steps.ONE ? (isEditMode ? 'Edit' : 'Add') + ' Deck' : 'Configure Cards'}</h2>}
                    footer={
                        <>
                            {modal.currentStep === Steps.ONE ? (
                                <>
                                    <Button
                                        className="bg-[#E4E6EF] hover:bg-gray-300 text-[#3F4254] rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm"
                                        aria-label="Cancel"
                                        onClick={handleCancel}
                                    >Cancel
                                    </Button>
    
                                    <Button
                                        className="bg-[#3699FF] hover:bg-blue-600 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm"
                                        aria-label="Next"
                                        onClick={handleNext}
                                    >Next
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        className="bg-[#E4E6EF] hover:bg-gray-300 text-[#3F4254] rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm"
                                        aria-label="Back"
                                        disabled={modal.submitLoading}
                                        onClick={() => {
                                            dispatch(setCurrentStep(Steps.ONE));
                                            dispatch(setStep1Valid(false)); // Reset validation when going back
                                            dispatch(setModalError(null));
                                        }}
                                    >Back
                                    </Button>
                                    <Button
                                        className="bg-[#3699FF] hover:bg-blue-600 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm"
                                        aria-label="Save & Finish"
                                        onClick={handleSubmit}
                                        disabled={modal.submitLoading}
                                    >
                                        {modal.submitLoading ? (
                                            <div className="flex items-center">
                                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-500"></div>
                                                <span>Saving...</span>
                                            </div>
                                        ) : (
                                            'Save & Finish'
                                        )}
                                    </Button>
                                </>
                            )}
                        </>
                    }
                >
                    <div className={modal.currentStep === Steps.ONE ? 'block' : 'hidden'}>
                        <DeckConfigurationStep
                            isEditMode={isEditMode}
                            roles={roles}
                            dynamicNames={dynamicNames}
                            formFields={formFields}
                            contentTopicOptions={
                                contentTopics
                                    .filter(t => t.status === 1)
                                    .map(t => ({ value: String(t.id), label: t.topicName }))
                            }
                        />
                    </div>

                    <div className={modal.currentStep === Steps.TWO ? 'block h-full ' : 'hidden'}>
                        <CardConfigurationStep
                            onSave={() => {
                                // Handle saving cards data
                                // Cards are already in Redux state
                            }}
                        />
                    </div>
    
                </Modal>
    
                {/* Unsaved Changes Confirmation Dialog */}
                <ConfirmationDialog
                    open={showUnsavedDialog}
                    onClose={handleCancelDialog}
                    onConfirm={handleConfirmCancel}
                    title="Unsaved Changes"
                    message="You have unsaved changes. Are you sure you want to close? All your changes will be lost."
                    confirmText="Yes"
                    cancelText="No"
                    confirmButtonClass="bg-red-500 hover:bg-red-600 text-white"
                    icon="warning"
                />
            </>
        );
    }

    
};

export default AddEditContentDeckModal;