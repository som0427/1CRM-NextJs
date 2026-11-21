import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
    addCard,
    selectCard,
    updateCard,
    updateCardOption,
    toggleCorrectOption,
    reorderCards,
    addOption,
    removeOption,
    clearCardFieldError,
    Card
} from '@/store/contentDeckSlice';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TextInput from '@/components/common/input-fields/TextInput';
import { EyeOpenIcon, EyeClosedIcon } from '@/components/common/icons/EyeIcons';
import Select from '@/components/common/input-fields/Select';
import RadioInput from '@/components/common/input-fields/RadioInput';
import DragAndDropUpload from '@/components/common/input-fields/DragAndDropUpload';
import TextArea from '@/components/common/input-fields/TextArea';
import uploadService from '@/lib/services/uploadService';
import PhonePreview from './PhonePreview';
import CheckboxInput from '@/components/common/input-fields/CheckboxInput';
import RemoveActionButton from '@/components/common/buttons/action-button/RemoveActionButton';
import AddActionButton from '@/components/common/buttons/action-button/AddActionButton';

interface CardConfigurationStepProps {
    onSave?: (cards: Card[]) => void;
    onBeforeValidation?: () => void;
}

// Export a ref that parent components can use to sync form data
export const cardConfigRef = React.createRef<{ syncFormToRedux: () => void }>();

// Helper function to validate YouTube URL
const validateYouTubeUrl = (url: string): boolean => {
    const patterns = [
        /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/,
        /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[\w-]+/
    ];
    return patterns.some(pattern => pattern.test(url));
};

interface CardFormData {
    code: string;
    name: string;
    mediaType: '1' | '2'; // 1 = image, 2 = video
    mediaUrl?: string;
    youtubeUrl?: string;
    question?: string | null; // Made optional, can be null
    status: '1' | '0'; // 1 = active, 0 = inactive
    questionType: '1' | '2'; // 1 = question, 2 = poll
    options: Array<{
        id: any | null;
        text: string;
        isCorrect: boolean;
    }>;
}

const CardConfigurationStep: React.FC<CardConfigurationStepProps> = () => {
    const selectedProject = JSON.parse(localStorage.getItem('selectedProject') || '{}');
    const moduleType = 9;
    const dispatch = useAppDispatch();
    const { cardConfig, cardValidationErrors } = useAppSelector(state => state.contentDeck);
    const [mediaFileNames, setMediaFileNames] = useState<{ [key: number]: string }>({});
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string>('');
    const [previousCardId, setPreviousCardId] = useState<number | null>(null);

    const currentCard = cardConfig.cards.find(card => card.id === cardConfig.selectedCardId) || cardConfig.cards[0];
    
    // Get original card data for default values
    const getOriginalCardData = (cardId: number) => {
        const getOriginalCardsData = (window as any).getOriginalCardsData;
        if (getOriginalCardsData) {
            const originalCards = getOriginalCardsData();
            return originalCards.find((card: any) => card.id === cardId || card.cardId === cardId);
        }
        return null;
    };

    // Helper function to check if a card has validation errors
    const cardHasErrors = (cardId: number): boolean => {
        const hasErrors = Object.keys(cardValidationErrors).some(key => key.startsWith(`card-${cardId}-`));
        return hasErrors;
    };

    // Get error for current card's question field
    const questionError = currentCard ? cardValidationErrors[`card-${currentCard.id}-question`] : null;

    // Get original card data for default values, fallback to current card data
    const originalCard = getOriginalCardData(currentCard.id) || currentCard;

    // React Hook Form setup - Each card gets its own form instance
    const {
        control,
        setValue,
        getValues,
        watch,
        reset,
        clearErrors,
        trigger,
        formState: { touchedFields, isSubmitted, errors }
    } = useForm<CardFormData>({
        defaultValues: {
            code: originalCard.code,
            name: originalCard.name,
            mediaType: originalCard.mediaType,
            mediaUrl: originalCard.mediaUrl,
            youtubeUrl: originalCard.youtubeUrl,
            question: originalCard.question,
            status: originalCard.status,
            questionType: originalCard.questionType,
            options: originalCard.options?.map((opt: any) => ({ ...opt })) || [{ id: null, text: '', isCorrect: false }]
        },
        mode: 'onTouched',
        reValidateMode: 'onChange'
    });

    // Watch form values
    const watchedValues = watch();

    // Use field array for form validation while keeping Redux as source of truth
    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: 'options',
        rules: {
            validate: (options) => {
                // Skip validation if field hasn't been touched and form hasn't been submitted
                if (!touchedFields.options && !isSubmitted) {
                    return true;
                }

                // Get current question value
                const currentQuestion = getValues('question');

                // Skip options validation if there's no question
                if (!currentQuestion || !currentQuestion.trim()) {
                    return true;
                }

                // Check if all options have text
                const emptyOptions = options.filter(opt => !opt.text?.trim());

                if (emptyOptions.length > 0) {
                    return 'Option text is required';
                }

                // Check if at least one option is marked as correct (only for questions)
                if (currentCard.questionType === '1') {
                    const hasCorrectAnswer = options.some(opt => opt.isCorrect && opt.text?.trim());
                    if (!hasCorrectAnswer) {
                        return 'At least one correct answer must be selected';
                    }
                }

                return true;
            }
        }
    });

    // Function to sync current form values to Redux immediately
    const syncFormToRedux = React.useCallback(() => {
        const currentValues = getValues();
        // Use the previousCardId to ensure we're syncing the right card
        if (previousCardId && previousCardId !== currentCard.id) {
            // We're in the middle of switching cards, don't sync
            return;
        }
        
        if (currentCard.id) {
            const updates: any = {};
            
            // Sync all fields
            if (currentValues.name !== currentCard.name) updates.name = currentValues.name || '';
            if (currentValues.mediaType !== currentCard.mediaType) updates.mediaType = currentValues.mediaType || '1';

            // Only sync mediaUrl if it has actually changed - don't propagate empty values
            if (currentValues.mediaUrl !== currentCard.mediaUrl) {
                updates.mediaUrl = currentValues.mediaUrl || '';
            }

            if (currentValues.youtubeUrl !== currentCard.youtubeUrl) updates.youtubeUrl = currentValues.youtubeUrl || '';
            if (currentValues.question !== currentCard.question) updates.question = currentValues.question || '';
            if (currentValues.status !== currentCard.status) updates.status = currentValues.status || '1';
            if (currentValues.questionType !== currentCard.questionType) updates.questionType = currentValues.questionType || '1';
            
            // Most importantly, sync options
            if (JSON.stringify(currentValues.options) !== JSON.stringify(currentCard.options)) {
                updates.options = currentValues.options?.map(opt => ({ ...opt })) || [];
            }
            
            // Dispatch updates if there are any
            if (Object.keys(updates).length > 0) {
                dispatch(updateCard({
                    cardId: currentCard.id,
                    updates
                }));
            }
        }
    }, [currentCard, dispatch, getValues, previousCardId]);

    // Expose syncFormToRedux through ref so parent can call it
    React.useImperativeHandle(cardConfigRef, () => ({
        syncFormToRedux
    }), [syncFormToRedux]);

    // Get validation errors for current card
    const optionsError = currentCard ? cardValidationErrors[`card-${currentCard.id}-options`] : null;
    const mediaTypeError = currentCard ? cardValidationErrors[`card-${currentCard.id}-mediaType`] : null;
    const mediaUrlError = currentCard ? cardValidationErrors[`card-${currentCard.id}-mediaUrl`] : null;
    const statusError = currentCard ? cardValidationErrors[`card-${currentCard.id}-status`] : null;

    // Trigger validation when question error changes
    useEffect(() => {
        if (questionError) {
            trigger('question');
        }
    }, [questionError, trigger]);

    // CRITICAL FIX: Properly reset form and options when switching cards
    useEffect(() => {
        // Only run when actually switching to a different card
        if (previousCardId !== currentCard.id) {
            // Don't sync on initial mount or when adding a new card
            if (previousCardId !== null && previousCardId !== currentCard.id) {
                // Save previous card's data before switching only if it still exists
                const previousCardExists = cardConfig.cards.some(c => c.id === previousCardId);
                if (previousCardExists) {
                    syncFormToRedux();
                }
            }

            // Create deep copy of options for the new card
            const newOptions = currentCard.options.length > 0 
                ? currentCard.options.map(opt => ({ 
                    id: opt.id, 
                    text: opt.text, 
                    isCorrect: opt.isCorrect 
                }))
                : [{ id: null, text: '', isCorrect: false }]; // Ensure at least one option

            // Reset the form with new card's data
            // Note: This will reset the current form's dirty state, but we track it separately per card
            reset({
                code: currentCard.code,
                name: currentCard.name,
                mediaType: currentCard.mediaType,
                mediaUrl: currentCard.mediaUrl,
                youtubeUrl: currentCard.youtubeUrl,
                question: currentCard.question,
                status: currentCard.status,
                questionType: currentCard.questionType,
                options: newOptions
            });

            // IMPORTANT: Force replace the field array to ensure it's completely refreshed
            replace(newOptions);

            // Update the previous card ID
            setPreviousCardId(currentCard.id);

            // Clear upload error when switching cards
            setUploadError('');

            // Clear validation errors if the loaded card already has valid data
            setTimeout(() => {
                // Only validate options if there's a question
                if (currentCard.question && currentCard.question.trim()) {
                    const allOptionsHaveText = currentCard.options.every(opt => opt.text?.trim());
                    const hasCorrectAnswer = currentCard.questionType === '1'
                        ? currentCard.options.some(opt => opt.isCorrect && opt.text?.trim())
                        : true;

                    if (allOptionsHaveText && hasCorrectAnswer) {
                        dispatch(clearCardFieldError(`card-${currentCard.id}-options`));
                    }

                    currentCard.options.forEach((opt, index) => {
                        if (opt.text?.trim()) {
                            dispatch(clearCardFieldError(`card-${currentCard.id}-option-${index}`));
                        }
                    });
                }
            }, 100);
        }
    }, [currentCard.id, previousCardId, reset, currentCard, replace, dispatch, syncFormToRedux, cardConfig.cards]);

    // Ensure at least one option exists - but don't add if card already has options
    useEffect(() => {
        // Only append if fields are empty AND it's not during a card switch
        if (fields.length === 0 && currentCard.id === previousCardId) {
            // Check if the current card in Redux actually has no options
            const currentCardInRedux = cardConfig.cards.find(c => c.id === currentCard.id);
            if (currentCardInRedux && currentCardInRedux.options.length === 0) {
                append({ id: null, text: '', isCorrect: false });
            }
        }
    }, [fields.length, append, currentCard.id, previousCardId, cardConfig.cards]);

    // Sync form values to Redux with debouncing - separate question and options handling
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (currentCard.id) {
                // Only update if values have changed (excluding question and options)
                const updates: any = {};

                if (watchedValues.name !== currentCard.name) updates.name = watchedValues.name || '';
                if (watchedValues.mediaType !== currentCard.mediaType) {
                    updates.mediaType = watchedValues.mediaType || '1';
                    // Trigger validation for media fields when media type changes
                    if (watchedValues.mediaType === '1') {
                        trigger('mediaUrl');
                    } else if (watchedValues.mediaType === '2') {
                        trigger('youtubeUrl');
                    }
                }
                if (watchedValues.mediaUrl !== currentCard?.mediaUrl) updates.mediaUrl = watchedValues.mediaUrl;
                if (watchedValues.youtubeUrl !== currentCard?.youtubeUrl) updates.youtubeUrl = watchedValues.youtubeUrl;
                if (watchedValues.status !== currentCard?.status) updates.status = watchedValues.status || '1';
                if (watchedValues.questionType !== currentCard?.questionType) updates.questionType = watchedValues.questionType || '1';

                // Only dispatch if there are actual changes
                if (Object.keys(updates).length > 0) {
                    dispatch(updateCard({
                        cardId: currentCard.id,
                        updates
                    }));
                }
            }
        }, 100); // Faster 100ms for other fields

        return () => clearTimeout(timeoutId);
    }, [watchedValues.name, watchedValues.mediaType, watchedValues.mediaUrl,
    watchedValues.youtubeUrl, watchedValues.status, watchedValues.questionType,
        dispatch, currentCard, trigger]);

    // Separate debouncing for question field with shorter delay
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (currentCard?.id && watchedValues.question !== currentCard?.question) {
                const updates: any = { question: watchedValues.question || '' };

                // If question is cleared, reset options to a single empty option
                if (!watchedValues.question || !watchedValues.question.trim()) {
                    updates.options = [{ id: null, text: '', isCorrect: false }];
                    // Reset the form field array too
                    replace([{ id: null, text: '', isCorrect: false }]);
                }

                dispatch(updateCard({
                    cardId: currentCard.id,
                    updates
                }));

                // Clear validation error for this specific field if question has valid content
                if (watchedValues.question && watchedValues.question.trim()) {
                    dispatch(clearCardFieldError(`card-${currentCard?.id}-question`));
                }

                // If question is empty, clear all option-related errors since options are not required
                if (!watchedValues.question || !watchedValues.question.trim()) {
                    dispatch(clearCardFieldError(`card-${currentCard?.id}-options`));
                    // Clear individual option errors
                    watchedValues.options?.forEach((_, index) => {
                        dispatch(clearCardFieldError(`card-${currentCard?.id}-option-${index}`));
                    });
                }
            }
        }, 200); // 200ms for question field

        return () => clearTimeout(timeoutId);
    }, [watchedValues.question, watchedValues.options, dispatch, currentCard?.id, currentCard?.question, replace]);

    // Sync options changes to Redux - ONLY for the current card
    useEffect(() => {
        // Make sure we're updating the right card's options
        if (currentCard.id !== previousCardId) {
            return; // Skip if we're in the middle of switching cards
        }

        // Get current question value
        const currentQuestion = getValues('question');

        // Only validate if options have been touched or form was submitted, AND there's a question
        if (watchedValues.options && (touchedFields.options || isSubmitted) && currentQuestion && currentQuestion.trim()) {
            trigger('options');

            // Clear validation error if options are now valid
            const allOptionsHaveText = watchedValues.options?.every(opt => opt.text?.trim());
            const hasCorrectAnswer = currentCard.questionType === '1'
                ? watchedValues.options?.some(opt => opt.isCorrect && opt.text?.trim())
                : true; // Polls don't need correct answers

            if (allOptionsHaveText && hasCorrectAnswer) {
                dispatch(clearCardFieldError(`card-${currentCard?.id}-options`));
            }
        }

        // Debounced store update
        const timeoutId = setTimeout(() => {
            if (currentCard.id && currentCard.id === previousCardId &&
                JSON.stringify(watchedValues.options) !== JSON.stringify(currentCard.options)) {
                dispatch(updateCard({
                    cardId: currentCard.id,
                    updates: { options: watchedValues.options?.map(opt => ({ ...opt })) || [] }
                }));
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [watchedValues.options, dispatch, currentCard.id, currentCard.options,
        trigger, currentCard.questionType, touchedFields.options, isSubmitted, previousCardId, getValues]);

    // Use ref to store latest form values
    const latestValuesRef = useRef(watchedValues);
    useEffect(() => {
        latestValuesRef.current = watchedValues;
    }, [watchedValues]);

    // Save options immediately when component unmounts to prevent data loss
    useEffect(() => {
        return () => {
            // Save current options to Redux when leaving the component
            const currentValues = latestValuesRef.current;
            if (currentCard?.id && currentValues.options && currentValues.options.length > 0) {
                // Force immediate update without debouncing
                dispatch(updateCard({
                    cardId: currentCard.id,
                    updates: {
                        options: currentValues.options.map(opt => ({ ...opt }))
                    }
                }));
            }
        };
    }, [currentCard?.id, dispatch]);

    // Validation rules
    const validationRules = useMemo(() => ({
        name: {
            required: 'Card name is required',
            maxLength: {
                value: 100,
                message: 'Card name must be 100 characters or less'
            },
            pattern: {
                value: /^[a-zA-Z0-9\s]*$/,
                message: 'Card name can only contain letters, numbers, and spaces'
            }
        },
        mediaUrl: {
            validate: (value: string | undefined) => {
                if (watchedValues.mediaType === '1' && !value) {
                    return 'Image is required';
                }
                return true;
            }
        },
        youtubeUrl: {
            validate: (value: string | undefined) => {
                if (watchedValues.mediaType === '2') {
                    if (!value) return 'YouTube URL is required';
                    if (!validateYouTubeUrl(value)) return 'Invalid YouTube URL format';
                }
                return true;
            }
        },
        question: {
            maxLength: {
                value: 500,
                message: 'Question/Poll must be 500 characters or less'
            }
        }
    }), [watchedValues.mediaType, questionError]);

    const handleDragEnd = (result: any) => {
        if (!result.destination) return;

        dispatch(reorderCards({
            sourceIndex: result.source.index,
            destinationIndex: result.destination.index
        }));
    };

    const handleAddCard = () => {
        // Save current card before adding new one
        syncFormToRedux();
        
        // Add the new card
        dispatch(addCard());
        
        // The new card will be selected automatically by the reducer
        // and the useEffect will handle resetting the form
    };

    const handleAddOption = () => {
        if (fields.length < 10) { // Max 10 options
            append({ id: null, text: '', isCorrect: false });
        }
    };

    const handleRemoveOption = (index: number) => {
        // Clear the error for this specific option when removing it
        dispatch(clearCardFieldError(`card-${currentCard.id}-option-${index}`));
        
        // Also need to clear errors for options after this one since their indices will shift
        const totalOptions = fields.length;
        for (let i = index + 1; i < totalOptions; i++) {
            const errorKey = `card-${currentCard.id}-option-${i}`;
            if (cardValidationErrors[errorKey]) {
                // Clear the error since indices will shift
                dispatch(clearCardFieldError(errorKey));
            }
        }
        
        remove(index);
    };

    const handleFileSelect = async (file: File) => {
        clearErrors('mediaUrl');
        setUploadError('');
        setIsUploading(true);

        // Validate file
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            setUploadError('Invalid file type. Please upload JPEG or PNG files only.');
            setIsUploading(false);
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            setUploadError('File size exceeds 8MB limit.');
            setIsUploading(false);
            return;
        }

        try {
            const uploadResult = await uploadService.uploadImage(
                moduleType,
                file,
                selectedProject
            );

            // console.log('Upload result:', uploadResult);

            if (uploadResult.statusCode === 200) {
                const imageUrl = uploadResult.responseData?.path;

                if (imageUrl) {
                    const fullImageUrl = imageUrl.startsWith('http')
                        ? imageUrl
                        : `${process.env.NEXT_PUBLIC_API_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;

                    // console.log('Full image URL:', fullImageUrl);

                    setValue('mediaUrl', fullImageUrl);
                    setMediaFileNames({ ...mediaFileNames, [currentCard?.id]: file.name });

                    dispatch(updateCard({
                        cardId: currentCard.id,
                        updates: { mediaUrl: fullImageUrl }
                    }));
                    
                    dispatch(clearCardFieldError(`card-${currentCard.id}-mediaUrl`));

                    // Only validate options if there's a question
                    const currentQuestion = getValues('question');
                    if (currentQuestion && currentQuestion.trim()) {
                        const currentOptions = getValues('options');
                        if (currentOptions) {
                            currentOptions.forEach((opt, index) => {
                                if (opt.text?.trim()) {
                                    dispatch(clearCardFieldError(`card-${currentCard?.id}-option-${index}`));
                                }
                            });

                            const allOptionsHaveText = currentOptions.every(opt => opt.text?.trim());
                            if (allOptionsHaveText) {
                                dispatch(clearCardFieldError(`card-${currentCard?.id}-options`));

                                if (currentCard.questionType === '1') {
                                    const hasCorrectAnswer = currentOptions.some(opt => opt.isCorrect && opt.text?.trim());
                                    if (!hasCorrectAnswer) {
                                        return;
                                    }
                                }
                            }
                        }

                        setTimeout(() => {
                            trigger('options');
                        }, 100);
                    }
                } else {
                    console.error('No image URL in response:', uploadResult);
                    setUploadError('No image URL received from server');
                }
            } else {
                console.error('Upload failed:', uploadResult.message);
                setUploadError(uploadResult.message || 'Upload failed. Please try again.');
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            if (error?.response?.status === 413) {
                setUploadError('File size exceeds maximum allowed size of 6MB.');
            } else if (error?.response?.data?.message) {
                setUploadError(error.response.data.message);
            } else if (error?.message) {
                setUploadError(error.message);
            } else {
                setUploadError('An error occurred during upload. Please try again.');
            }
        } finally {
            setIsUploading(false);
        }
    };

    const handleImageRemove = () => {
        clearErrors('mediaUrl');
        setUploadError('');
        setValue('mediaUrl', '');
        setMediaFileNames({ ...mediaFileNames, [currentCard?.id]: '' });

        dispatch(updateCard({
            cardId: currentCard.id,
            updates: { mediaUrl: '' }
        }));
        
        setTimeout(() => {
            trigger('options');
        }, 100);
    };

    // Rest of the component remains the same (render section)
    return (
        <div className="h-full flex overflow-hidden">
            {/* Left Panel - Card List - Responsive width */}
            <div className="min-w-[50px] w-[25%] xl:w-1/4 flex flex-col flex-shrink-0 bg-white border-r border-gray-200 h-full overflow-hidden">
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="cards">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="flex-1 overflow-y-auto hide-scrollbar pr-1 min-h-0"
                            >
                                {cardConfig.cards.map((card, index) => (
                                    <Draggable
                                        key={card.id}
                                        draggableId={card.id.toString()}
                                        index={index}
                                        isDragDisabled={card.status === '0'}
                                    >
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`mb-2 transition-all duration-150 ${snapshot.isDragging
                                                        ? 'shadow-md bg-white rounded-lg'
                                                        : ''
                                                    }`}
                                                style={{
                                                    ...provided.draggableProps.style
                                                }}
                                            >
                                                <div
                                                    className={`flex items-center px-3 py-4 rounded-lg cursor-pointer transition-colors ${cardConfig.selectedCardId === card.id
                                                            ? cardHasErrors(card.id)
                                                                ? 'bg-red-50'
                                                                : 'relative'
                                                            : cardHasErrors(card.id)
                                                                ? 'hover:bg-red-50'
                                                                : 'relative hover:bg-transparent'
                                                        }`}
                                                    style={{
                                                        ...(cardConfig.selectedCardId === card.id ? {
                                                            background: cardHasErrors(card.id)
                                                                ? 'linear-gradient(to right, rgb(254 226 226) 0%, rgb(254 226 226 / 0.4) 80%, transparent 100%)'
                                                                : 'linear-gradient(to right, rgb(243 244 246) 0%, rgb(243 244 246 / 0.4) 80%, transparent 100%)'
                                                        } : {}),
                                                        ...(snapshot.isDragging && cardConfig.selectedCardId === card.id ? {
                                                            background: cardHasErrors(card.id)
                                                                ? 'linear-gradient(to right, rgb(254 226 226) 0%, rgb(254 226 226 / 0.4) 80%, transparent 100%) !important'
                                                                : 'linear-gradient(to right, rgb(243 244 246) 0%, rgb(243 244 246 / 0.4) 80%, transparent 100%) !important'
                                                        } : {})
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (cardConfig.selectedCardId !== card.id && !cardHasErrors(card.id)) {
                                                            e.currentTarget.style.background = 'linear-gradient(to right, rgb(249 250 251) 0%, rgb(249 250 251 / 0.4) 80%, transparent 100%)'
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (cardConfig.selectedCardId !== card.id && !cardHasErrors(card.id)) {
                                                            e.currentTarget.style.background = ''
                                                        }
                                                    }}
                                                    onClick={() => {
                                                        // Sync current card's form data to Redux before switching
                                                        syncFormToRedux();
                                                        // Then select the new card
                                                        setTimeout(() => {
                                                            dispatch(selectCard(card.id));
                                                        }, 50);
                                                    }}
                                                >
                                                    <div
                                                        {...provided.dragHandleProps}
                                                        className={`flex-shrink-0 mr-3 ${card.status === '0' ? 'opacity-30' : ''}`}
                                                    >
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <rect x="4" y="5" width="16" height="2.5" rx="1.25" fill={cardHasErrors(card.id) ? "#EF4444" : "#5B9EF7"} />
                                                            <rect x="4" y="9" width="16" height="2.5" rx="1.25" fill={cardHasErrors(card.id) ? "#EF4444" : "#5B9EF7"} />
                                                            <rect x="4" y="13" width="16" height="2.5" rx="1.25" fill={cardHasErrors(card.id) ? "#EF4444" : "#5B9EF7"} />
                                                            <rect x="4" y="17" width="16" height="2.5" rx="1.25" fill={cardHasErrors(card.id) ? "#EF4444" : "#5B9EF7"} />
                                                        </svg>
                                                    </div>
                                                    <span className={`flex-1 text-sm font-bold truncate ${card.status === '1' ? 'text-gray-700' : 'text-gray-400'
                                                        }`}>
                                                        {card.name || `Card ${index + 1}`}
                                                    </span>
                                                    <div className="flex-shrink-0 p-1">
                                                        {card.status === '1' ? (
                                                            <EyeOpenIcon />
                                                        ) : (
                                                            <EyeClosedIcon />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                <div className="flex-shrink-0 pr-3 bg-white">
                    <button
                        onClick={handleAddCard}
                        className="w-full bg-[#5B9EF7] hover:bg-[#4A8CE6] text-white rounded-lg py-3.5 text-base font-medium transition-colors"
                    >
                        Add Card
                    </button>
                </div>
            </div>

            {/* Middle Panel - Card Editor */}
            <div className="flex-1 p-4 md:p-6 h-full overflow-y-auto bg-white hide-scrollbar min-h-0">
                <form className="space-y-8" key={currentCard.id} onSubmit={e => { e.preventDefault(); }}>
                    {/* Card Code */}
                    <div className="grid grid-cols-12 gap-6 items-start">
                        <div className="col-span-3">
                            <label className="block text-sm font-medium text-gray-700 pt-2">Card Code</label>
                        </div>
                        <div className="col-span-9">
                            <TextInput
                                name="code"
                                control={control}
                                validationRules={validationRules.name}
                                placeholder="Enter Card Code..."
                                maxLength={100}
                                showCharacterCount={false}
                                disabled={true}
                                pattern={/^[a-zA-Z0-9\s]*$/}
                                maxWidth='w-[45%]'
                            />
                        </div>
                    </div>

                    {/* Card Name */}
                    <div className="grid grid-cols-12 gap-6 items-start">
                        <div className="col-span-3">
                            <label className="block text-sm font-medium text-gray-700 pt-2">
                                Card Name<span className="text-[#F64E60]">*</span>
                            </label>
                        </div>
                        <div className="col-span-9">
                            <TextInput
                                name="name"
                                control={control}
                                validationRules={validationRules.name}
                                placeholder="Enter card name..."
                                maxLength={100}
                                showCharacterCount={false}
                                pattern={/^[a-zA-Z0-9\s]*$/}
                                maxWidth='w-[45%]'
                            />
                        </div>
                    </div>

                    {/* Type of Media */}
                    <div className="grid grid-cols-12 gap-6 items-start">
                        <div className="col-span-3">
                            <label className="block text-sm font-medium text-gray-700 pt-2">
                                Type of Media<span className="text-[#F64E60]">*</span>
                            </label>
                        </div>
                        <div className="col-span-9">
                            <div className="space-y-1">
                                <Select
                                    name="mediaType"
                                    control={control}
                                    options={[
                                        { value: '1', label: 'Image' },
                                        { value: '2', label: 'Video' }
                                    ]}
                                    placeholder="---Select---"
                                    maxWidth='w-[35%]'
                                    validationRules={{ required: 'Media type is required' }}
                                    onChange={() => {
                                        // Clear media URL error when changing media type
                                        dispatch(clearCardFieldError(`card-${currentCard.id}-mediaUrl`));
                                        setUploadError('');
                                    }}
                                />
                                {mediaTypeError && (
                                    <div className="text-sm text-[#F64E60]">
                                        {mediaTypeError}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Media Upload/URL - Rest of the form remains the same */}
                    {watchedValues.mediaType === '1' ? (
                        <div className="grid grid-cols-12 gap-6 items-start">
                            <div className="col-span-12">
                                <div className="w-full">
                                    <DragAndDropUpload
                                        name="mediaUrl"
                                        control={control}
                                        validationRules={validationRules.mediaUrl}
                                        onFileSelect={handleFileSelect}
                                        onRemove={handleImageRemove}
                                        acceptedTypes={['image/jpeg', 'image/png']}
                                        isUploading={isUploading}
                                        maxSize={8 * 1024 * 1024} // 8MB
                                        hint="Use JPEG/PNG with a 9:16 aspect ratio and 1080 x 1920 resolution. Max size = 8 MB"
                                        error={uploadError || mediaUrlError}
                                        onError={setUploadError}
                                        imageHeight='h-16'
                                        imageWidth='w-16'
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-12 gap-3 items-start">
                            <div className="col-span-3">
                                <label className="block text-sm font-medium text-gray-700 "><svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_1025_32745)">
                                        <path d="M47.0432 12.3708C46.7719 11.3496 46.237 10.4177 45.4923 9.66813C44.7476 8.9186 43.819 8.37782 42.7996 8.09991C39.0469 7.09082 24.0469 7.09082 24.0469 7.09082C24.0469 7.09082 9.04688 7.09082 5.29415 8.09991C4.27474 8.37782 3.34619 8.9186 2.60145 9.66813C1.85671 10.4177 1.32189 11.3496 1.05051 12.3708C0.0468751 16.1399 0.046875 23.9999 0.046875 23.9999C0.046875 23.9999 0.0468751 31.8599 1.05051 35.629C1.32189 36.6502 1.85671 37.5822 2.60145 38.3317C3.34619 39.0812 4.27474 39.622 5.29415 39.8999C9.04688 40.909 24.0469 40.909 24.0469 40.909C24.0469 40.909 39.0469 40.909 42.7996 39.8999C43.819 39.622 44.7476 39.0812 45.4923 38.3317C46.237 37.5822 46.7719 36.6502 47.0432 35.629C48.0469 31.8599 48.0469 23.9999 48.0469 23.9999C48.0469 23.9999 48.0469 16.1399 47.0432 12.3708Z" fill="#FF0302" />
                                        <path d="M19.1387 31.1373V16.8628L31.6841 24.0001L19.1387 31.1373Z" fill="#FEFEFE" />
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_1025_32745">
                                            <rect width="48" height="48" fill="white" />
                                        </clipPath>
                                    </defs>
                                </svg>
                                </label>
                            </div>
                            <div className="col-span-9 pt-2">
                                <div className="space-y-1">
                                    <TextInput
                                        name="youtubeUrl"
                                        control={control}
                                        validationRules={validationRules.youtubeUrl}
                                        placeholder="https://www.youtube.com/..."
                                        maxLength={500}
                                        pattern={/.*/}
                                        maxWidth='w-[70%]'
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Question/Poll Section */}
                    <div className="space-y-4">
                        <RadioInput
                            name="questionType"
                            control={control}
                            options={[
                                { value: '1', label: 'Add Question' },
                                { value: '2', label: 'Add Poll' }
                            ]}
                            onChange={(value) => {
                                // Update questionType in Redux
                                dispatch(updateCard({
                                    cardId: currentCard.id,
                                    updates: { questionType: value as '1' | '2' }
                                }));
                                
                                // Re-validate options when switching between Question and Poll
                                setTimeout(() => {
                                    trigger('options');
                                    // Clear error if switching to poll and all options have text
                                    if (value === '2') {
                                        const allOptionsHaveText = watchedValues.options?.every(opt => opt.text?.trim());
                                        if (allOptionsHaveText) {
                                            dispatch(clearCardFieldError(`card-${currentCard.id}-options`));
                                        }
                                    }
                                }, 100);
                            }}
                        />

                        {/* Question Input */}
                        <div>
                            <TextArea
                                name="question"
                                control={control}
                                validationRules={validationRules.question}
                                placeholder="Type your question/poll here..."
                                maxLength={500}
                                rows={1}
                                showCharacterCount={true}
                                resize="none"
                            />
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                            {fields.map((field, index) => {
                                // Get individual option error from Redux
                                const optionError = cardValidationErrors[`card-${currentCard.id}-option-${index}`];
                                
                                return (
                                <div key={field.id}>
                                    <div className="flex items-start space-x-3">
                                        {currentCard.questionType === '1' && (
                                            <div className="pt-2">
                                                <CheckboxInput
                                                    name={`options.${index}.isCorrect`}
                                                    control={control}
                                                    label=""
                                                    className="mt-0"
                                                    onChange={(checked) => {
                                                        // When a checkbox is checked and the option has text, clear the "At least one correct answer" error
                                                        const currentOptions = getValues('options');
                                                        if (checked && currentOptions?.[index]?.text?.trim()) {
                                                            // This option is now marked as correct and has text
                                                            dispatch(clearCardFieldError(`card-${currentCard.id}-options`));
                                                        } else if (!checked) {
                                                            // Check if there's still at least one correct answer with text
                                                            const hasOtherCorrectAnswer = currentOptions?.some((opt, i) => 
                                                                i !== index && opt.isCorrect && opt.text?.trim()
                                                            );
                                                            if (hasOtherCorrectAnswer) {
                                                                dispatch(clearCardFieldError(`card-${currentCard.id}-options`));
                                                            }
                                                        }
                                                        
                                                        // Sync to Redux immediately to avoid stale data
                                                        setTimeout(() => {
                                                            syncFormToRedux();
                                                        }, 50);
                                                    }}
                                                />
                                            </div>
                                        )}
                                        <TextInput
                                            name={`options.${index}.text`}
                                            control={control}
                                            validationRules={{
                                                maxLength: {
                                                    value: 120,
                                                    message: 'Option must be 120 characters or less'
                                                },
                                                onChange: () => {
                                                    // Clear individual option error when user types if it has text
                                                    const currentValue = watchedValues.options?.[index]?.text;
                                                    if (optionError && currentValue?.trim()) {
                                                        dispatch(clearCardFieldError(`card-${currentCard.id}-option-${index}`));
                                                    }
                                                    
                                                    // If this option is marked as correct and now has text, clear the "correct answer" error
                                                    if (currentCard.questionType === '1' && watchedValues.options?.[index]?.isCorrect && currentValue?.trim()) {
                                                        dispatch(clearCardFieldError(`card-${currentCard.id}-options`));
                                                    }
                                                    
                                                    // Immediately sync to Redux to avoid stale data on Save & Finish
                                                    setTimeout(() => {
                                                        syncFormToRedux();
                                                    }, 50);
                                                }
                                            }}
                                            placeholder={`Enter Option ${String.fromCharCode(65 + index)}`}
                                            maxLength={120}
                                            showCharacterCount={true}
                                            pattern={/.*/}
                                            maxWidth='w-[40%]'
                                        />
                                        <div className="">
                                            {fields.length > 1 && (<RemoveActionButton
                                                id={index}
                                                onRemove={handleRemoveOption}
                                            />)}
                                            {fields.length-1 == index && fields.length <10 && (<AddActionButton
                                                onAdd={handleAddOption} />)}
                                        </div>
                                    </div>
                                    {/* Show individual option error if present */}
                                    {optionError && (
                                        <div className="text-sm text-[#F64E60] ml-10 mt-1">
                                            {optionError}
                                        </div>
                                    )}
                                </div>
                                );
                            })}

                            {/* Validation errors - merged message for options and correct answers */}
                            {optionsError && (
                                <div className="text-sm text-[#F64E60] mt-2">
                                    {optionsError}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status */}
                    <div className="grid grid-cols-12 gap-6 items-start">
                        <div className="col-span-3">
                            <label className="block text-sm font-medium text-gray-700 pt-2">
                                Status<span className="text-[#F64E60]">*</span>
                            </label>
                        </div>
                        <div className="col-span-9">
                            <div className="space-y-1">
                                <Select
                                    name="status"
                                    control={control}
                                    options={[
                                        { value: '1', label: 'Active' },
                                        { value: '0', label: 'Inactive' }
                                    ]}
                                    placeholder="Select status..."
                                    disabled={!currentCard.id}
                                    maxWidth='w-[35%]'
                                    validationRules={{ required: 'Status is required' }}
                                />
                                {statusError && (
                                    <div className="text-sm text-red-500">
                                        {statusError}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Right Panel - Phone Preview - Hidden on screens < 1200px */}
            <div className="hidden xl:flex w-96 border-l border-gray-200 flex-col items-center justify-center flex-shrink-0 h-full overflow-hidden">
                <PhonePreview
                    currentCard={{
                        ...currentCard,
                        mediaType: watchedValues.mediaType || currentCard.mediaType,
                        mediaUrl: watchedValues.mediaUrl || currentCard.mediaUrl,
                        youtubeUrl: watchedValues.youtubeUrl || currentCard.youtubeUrl,
                        options: watchedValues.options || currentCard.options
                    }}
                    watchedValues={watchedValues}
                    totalCards={cardConfig.cards.length}
                    currentCardIndex={cardConfig.cards.findIndex(card => card.id === cardConfig.selectedCardId)}
                />
            </div>

        </div>
    );
};

export default CardConfigurationStep;