import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm, useWatch, useFieldArray } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updateDeckForm } from '@/store/contentDeckSlice';
import uploadService from '@/lib/services/uploadService';
import TextInput from '@/components/common/input-fields/TextInput';
import RadioInput from '@/components/common/input-fields/RadioInput';
import DateInput from '@/components/common/input-fields/DateInput';
import MultiSelect from '@/components/common/input-fields/MultiSelect';
import Select from '@/components/common/input-fields/Select';
import CheckboxInput from '@/components/common/input-fields/CheckboxInput';
import UploadImage from '@/components/common/input-fields/UploadImage';
import AddActionButton from '@/components/common/buttons/action-button/AddActionButton';
import RemoveActionButton from '@/components/common/buttons/action-button/RemoveActionButton';
import AndOrToggle from '@/components/common/buttons/action-button/AndOrToggle';

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

interface ContentTopicOption {
    value: string;
    label: string;
}

interface DeckConfigurationStepProps {
    isEditMode?: boolean;
    onValidationTrigger?: (isValid: boolean) => void;
    roles?: any[];
    dynamicNames?: DynamicFieldNames;
    formFields?: FormFieldData[];
    contentTopicOptions?: ContentTopicOption[];
}

interface AttributeMapping {
    attributeId: string;
    lookupValues: string[];
    conditionOperator: 1 | 2;  // 1 for AND, 2 for OR
}

interface DeckFormData {
    name: string;
    contentTopicId: string;
    dueByType: '1' | '2' | '3';
    dueDate: string;
    relativeDays: number;
    notifyOnEdit: boolean;
    thumbnailUrl: string;
    assignedTo: string[];
    status: '1' | '0';
    // Entity type fields - '5' for User, '2' for Customer (Entity)
    entityType: '5' | '2' | '';
    attributeMappings: AttributeMapping[];  // Used when entityType is '2' (Customer)
    passScore: string;
    maxReattempt: string;
}

interface DynamicFieldNames {
    customersLabel: string | null;
    opportunitiesLabel: string | null;
    opportunityEnabled: boolean;
}

interface AttributeOption {
    value: string;
    label: string;
}

interface LookupOption {
    value: string;
    label: string;
}

const DeckConfigurationStep: React.FC<DeckConfigurationStepProps> = ({
    isEditMode = false,
    onValidationTrigger,
    roles = [],
    dynamicNames = { customersLabel: null, opportunitiesLabel: null, opportunityEnabled: false },
    formFields = [],
    contentTopicOptions = []
}) => {
    const dispatch = useAppDispatch();
    const { modal, deckForm } = useAppSelector(state => state.contentDeck);

    // Memoized role options from props
    const roleOptions = useMemo(() => {
        return roles ? roles.map(role => ({
            value: String(role.roleId),
            label: role.roleName
        })) : [];
    }, [roles]);

    // Derive attribute options from form fields prop
    const attributeOptions = useMemo(() => {
        return formFields.map((field) => ({
            value: String(field.id),
            label: field.attributeName,
        }));
    }, [formFields]);

    // Build lookup options map from form fields prop
    const lookupOptionsMap = useMemo(() => {
        const map: { [attributeId: string]: LookupOption[] } = {};
        formFields.forEach((field) => {
            const attributeId = String(field.id);
            if (field.lookupValues && Array.isArray(field.lookupValues)) {
                map[attributeId] = field.lookupValues.map((lookup) => ({
                    value: String(lookup.id),
                    label: lookup.lookupValue || '',
                }));
            }
        });
        return map;
    }, [formFields]);

    // Build attribute type map from form fields prop
    const attributeTypeMap = useMemo(() => {
        const map: { [attributeId: string]: number } = {};
        formFields.forEach((field) => {
            map[String(field.id)] = field.attributeType.id;
        });
        return map;
    }, [formFields]);

    // Get original deck data for default values, fallback to current deckForm
    const getOriginalDeckData = () => {
        const originalData = (window as any).getOriginalDeckData?.();
        return originalData || deckForm;
    };

    const originalDeckData = getOriginalDeckData();

    // React Hook Form setup
    const {
        control,
        handleSubmit,
        formState: { errors, isDirty },
        setValue,
        watch,
        reset,
        trigger,
        clearErrors,
        setError
    } = useForm<DeckFormData>({
        defaultValues: {
            name: originalDeckData.name,
            contentTopicId: originalDeckData.contentTopicId || '',
            dueByType: originalDeckData.dueByType,
            dueDate: originalDeckData.dueDate,
            relativeDays: originalDeckData.relativeDays,
            notifyOnEdit: originalDeckData.notifyOnEdit,
            thumbnailUrl: originalDeckData.thumbnailUrl,
            assignedTo: originalDeckData.assignedTo,
            status: originalDeckData.status,
            // Entity type fields
            entityType: originalDeckData.entityType || '',
            attributeMappings: originalDeckData.attributeMappings || [{ attributeId: '', lookupValues: [], conditionOperator: 1 }],
            passScore: originalDeckData.passScore || '70',
            maxReattempt: originalDeckData.maxReattempt || '3',
        },
        mode: 'onChange' // Validate on change for real-time feedback
    });

    // React Hook Form is the single source of truth during editing
    const watchedDueByType = watch('dueByType');
    // Use useWatch for reactive updates
    const watchedEntityType = useWatch({ control, name: 'entityType' });

    // Use useFieldArray for dynamic attribute mapping rows (like addEditTarget pattern)
    const { fields, replace, append, remove } = useFieldArray({
        control,
        name: 'attributeMappings'
    });

    // Watch attribute mappings for reactive lookup options and condition operator
    const watchedAttributeMappings = useWatch({ control, name: 'attributeMappings' }) || [];

    // Get the condition operator from the first row (all rows share the same operator)
    const watchedConditionOperator = (watchedAttributeMappings[0]?.conditionOperator as 1 | 2) || 1;

    // Track previous attribute values to detect changes and clear dependent values
    const previousAttributeValuesRef = useRef<Record<string, string>>({});

    // Track previous entity type to detect user-triggered changes (not initial load)
    const previousEntityTypeRef = useRef<string | undefined>(undefined);

    // Track if form has been initialized with API data
    const formInitializedRef = useRef(false);

    // Track if attribute mappings have been synced
    const attributeMappingsSyncedRef = useRef(false);

    // Reset form when deckForm is updated from API (for edit mode)
    useEffect(() => {
        // Only reset if we have entityType data (indicates API data has been loaded)
        // and form hasn't been initialized yet
        if (isEditMode && deckForm.entityType && !formInitializedRef.current) {
            formInitializedRef.current = true;

            // Reset form with the new data from Redux
            reset({
                name: deckForm.name,
                contentTopicId: deckForm.contentTopicId || '',
                dueByType: deckForm.dueByType,
                dueDate: deckForm.dueDate,
                relativeDays: deckForm.relativeDays,
                notifyOnEdit: deckForm.notifyOnEdit,
                thumbnailUrl: deckForm.thumbnailUrl,
                assignedTo: deckForm.assignedTo,
                status: deckForm.status,
                entityType: deckForm.entityType,
                attributeMappings: deckForm.attributeMappings || [{ attributeId: '', lookupValues: [], conditionOperator: 1 }],
                passScore: deckForm.passScore || '70',
                maxReattempt: deckForm.maxReattempt || '3',
            });

            // Update the previousEntityTypeRef so the clear effect doesn't trigger
            previousEntityTypeRef.current = deckForm.entityType;

            // Reset the sync flag so attribute mappings can be synced
            attributeMappingsSyncedRef.current = false;
        }
    }, [isEditMode, deckForm, reset]);

    // Sync attribute mapping values with React Hook Form after formFields are loaded
    useEffect(() => {
        // Only sync if:
        // 1. In edit mode
        // 2. Form has been initialized
        // 3. formFields (lookup options) are loaded
        // 4. attributeMappings have data
        // 5. Haven't synced yet
        if (
            isEditMode &&
            formInitializedRef.current &&
            formFields.length > 0 &&
            deckForm.attributeMappings &&
            deckForm.attributeMappings.length > 0 &&
            !attributeMappingsSyncedRef.current
        ) {
            attributeMappingsSyncedRef.current = true;

            // Use replace to set all attribute mappings at once
            replace(deckForm.attributeMappings);

            // Explicitly set each field value for Select/MultiSelect components
            deckForm.attributeMappings.forEach((mapping, index) => {
                if (mapping.attributeId) {
                    setValue(`attributeMappings.${index}.attributeId`, mapping.attributeId);
                }
                if (mapping.lookupValues && mapping.lookupValues.length > 0) {
                    setValue(`attributeMappings.${index}.lookupValues`, mapping.lookupValues);
                }
                setValue(`attributeMappings.${index}.conditionOperator`, mapping.conditionOperator || 1);
            });
        }
    }, [isEditMode, formFields, deckForm.attributeMappings, replace, setValue]);

    // Track when date field should animate (only on user interaction, not on mount)
    const [shouldAnimateDateField, setShouldAnimateDateField] = useState(false);
    const [previousDueByType, setPreviousDueByType] = useState(watchedDueByType);

    // Reset dependent fields when entity type changes (only on user interaction, not initial load)
    useEffect(() => {
        // Skip if this is the initial mount (previous value is undefined)
        if (previousEntityTypeRef.current === undefined) {
            previousEntityTypeRef.current = watchedEntityType;
            return;
        }

        // Skip if value hasn't actually changed
        if (previousEntityTypeRef.current === watchedEntityType) {
            return;
        }

        // User changed entity type - clear dependent fields
        if (watchedEntityType === '5') {
            // User selected - clear attribute mappings using replace from useFieldArray
            setValue('assignedTo', []);
            replace([{ attributeId: '', lookupValues: [], conditionOperator: 1 }]);
        } else if (watchedEntityType === '2') {
            // Customer (Entity) selected - clear roles
            setValue('assignedTo', []);
            replace([{ attributeId: '', lookupValues: [], conditionOperator: 1 }]);
        } else {
            // Nothing selected - clear both
            setValue('assignedTo', []);
            replace([{ attributeId: '', lookupValues: [], conditionOperator: 1 }]);
        }

        // Update the previous value
        previousEntityTypeRef.current = watchedEntityType;
    }, [watchedEntityType, setValue, replace]);

    // Effect to clear lookup values when attribute changes (like addEditTarget pattern)
    useEffect(() => {
        if (fields.length !== watchedAttributeMappings.length) {
            return;
        }

        const nextAttributeMap: Record<string, string> = {};

        watchedAttributeMappings.forEach((mapping: AttributeMapping, index: number) => {
            const fieldId = fields[index]?.id;
            if (!fieldId) return;

            const attributeValue = mapping?.attributeId || '';
            const previousAttribute = previousAttributeValuesRef.current[fieldId];

            // If attribute changed, clear the lookup values
            if (previousAttribute !== undefined && attributeValue !== previousAttribute) {
                setValue(`attributeMappings.${index}.lookupValues`, []);
            }

            nextAttributeMap[fieldId] = attributeValue;
        });

        previousAttributeValuesRef.current = nextAttributeMap;
    }, [watchedAttributeMappings, fields, setValue]);

    // Get lookup options for a specific attribute
    const getLookupOptionsForAttribute = (attributeId: string): LookupOption[] => {
        return lookupOptionsMap[attributeId] || [];
    };

    // Handler to add a new attribute mapping row
    const handleAddAttributeMapping = () => {
        // Check if the last row has an attribute and lookup values selected before adding a new row
        const lastMapping = watchedAttributeMappings[watchedAttributeMappings.length - 1];
        if (!lastMapping?.attributeId || !lastMapping?.lookupValues?.length) {
            return; // Don't add if current attribute or lookup values are not selected
        }
        // New row inherits the condition operator from the first row
        append({ attributeId: '', lookupValues: [], conditionOperator: watchedConditionOperator });
    };

    // Handler to remove an attribute mapping row
    const handleRemoveAttributeMapping = (index: number) => {
        if (fields.length > 1) {
            remove(index);
        }
    };

    // Handler for condition operator change (AND/OR -> 1/2)
    // Updates all rows to have the same condition operator
    const handleConditionOperatorChange = (value: 'AND' | 'OR') => {
        const newOperator = value === 'AND' ? 1 : 2;
        // Update conditionOperator for all rows
        watchedAttributeMappings.forEach((_: AttributeMapping, index: number) => {
            setValue(`attributeMappings.${index}.conditionOperator`, newOperator);
        });
    };

    // Sync Redux changes back to React Hook Form (for reset functionality)

    // Only animate when user actually changes the dueByType, not on component mount
    useEffect(() => {
        if (previousDueByType !== watchedDueByType && previousDueByType !== undefined) {
            setShouldAnimateDateField(true);
            // Reset animation flag after animation completes
            const timer = setTimeout(() => setShouldAnimateDateField(false), 300);
            return () => clearTimeout(timer);
        }
        setPreviousDueByType(watchedDueByType);
    }, [watchedDueByType, previousDueByType]);
    
    // Sync form values to Redux when moving to next step (not on unmount)
    const syncFormToRedux = useCallback(() => {
        const values = watch();
        const formData = {
            name: values.name || '',
            contentTopicId: values.contentTopicId || '',
            dueByType: values.dueByType || '1',
            dueDate: values.dueDate || '',
            thumbnailUrl: values.thumbnailUrl || '',
            status: values.status || '1',
            notifyOnEdit: values.notifyOnEdit || false,
            // Entity type fields
            entityType: values.entityType || '',
            assignedTo: values.assignedTo || [],
            attributeMappings: values.attributeMappings || [{ attributeId: '', lookupValues: [], conditionOperator: 1 }],
            passScore: values.passScore || '70',
            maxReattempt: values.maxReattempt || '3',
        };
        dispatch(updateDeckForm(formData));
    }, [watch, dispatch]);

    // Expose sync function globally for handleNext to use
    useEffect(() => {
        (window as any).syncDeckFormToRedux = syncFormToRedux;
        return () => {
            delete (window as any).syncDeckFormToRedux;
        };
    }, [syncFormToRedux]);

    // Memoized validation rules to prevent re-renders
    const validationRules = useMemo(() => ({
        name: {
            required: 'Deck name cannot be blank.',
            maxLength: {
                value: 100,
                message: 'Deck name must be 100 characters or less.'
            },
            pattern: {
                value: /^[a-zA-Z0-9\s]*$/,
                message: 'Deck name can only contain letters, numbers, and spaces'
            }
        },
        contentTopicId: {
            required: 'Content Topic is required.'
        },
        dueByType: {
            required: 'Due By selection is required.'
        },
        thumbnailUrl: {
            required: 'Thumbnail image is required.'
        },
        dueDate: {
            validate: (value: string, formValues: DeckFormData) => {
                if (formValues.dueByType === '3' && !value) {
                    return 'Due date cannot be blank.';
                }
                if (formValues.dueByType === '3' && value) {
                    // Always validate due date - even in edit mode
                    const dueDate = new Date(value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (dueDate < today) {
                        return 'Due date cannot be in the past.';
                    }
                }
                return true;
            }
        },
        relativeDays: {
            validate: (value: number, formValues: DeckFormData) => {
                if (formValues.dueByType === '2' && value <= 0) {
                    return 'Relative days must be greater than 0.';
                }
                return true;
            }
        },
        entityType: {
            required: 'Entity Type is required.'
        },
        assignedTo: {
            validate: (value: string[], formValues: DeckFormData) => {
                // Only required when entity type is '5' (User)
                if (formValues.entityType === '5') {
                    return (value && value.length > 0) || 'Assign To cannot be blank.';
                }
                return true;
            }
        }
    }), []);

    // State for upload loading (still needed for UploadImage component callbacks)
    const [isUploading, setIsUploading] = useState(false);

    // Function to trigger form validation and show individual field errors
    const triggerValidation = useCallback(async () => {
        // Manually validate all required fields to show individual errors
        const fieldsToValidate: (keyof DeckFormData | string)[] = ['name', 'contentTopicId', 'dueByType', 'thumbnailUrl', 'entityType', 'passScore', 'maxReattempt'];
        if (watchedDueByType === '3') {
            fieldsToValidate.push('dueDate');
        }
        // Add conditional validation based on entity type
        if (watchedEntityType === '5') {
            fieldsToValidate.push('assignedTo');
        }
        // Attribute mappings are optional, no validation needed

        // This will trigger validation and show field-level errors
        const results = await Promise.all(
            fieldsToValidate.map(field => trigger(field as any))
        );

        const isValid = results.every(result => result);
        return isValid;
    }, [trigger, watchedDueByType, watchedEntityType]);

    // Expose validation function globally so modal can call it
    useEffect(() => {
        (window as any).deckFormValidation = triggerValidation;
        return () => {
            delete (window as any).deckFormValidation;
        };
    }, [triggerValidation]);

    // Expose dirty state function globally
    useEffect(() => {
        console.log('DeckForm isDirty changed:', isDirty);
        (window as any).getDeckFormDirty = () => isDirty;
        return () => {
            delete (window as any).getDeckFormDirty;
        };
    }, [isDirty]);

    // Memoized options arrays to prevent re-renders
    const assignToOptions = useMemo(() => {
        return roles ? roles.map(role => ({
            value: role.roleId,
            label: role.roleName
        })) : [];
    }, [roles]);

    const statusOptions = [
        { value: '1', label: 'Active' },
        { value: '0', label: 'Inactive' }
    ];


    // All form fields now use React Hook Form Controller for consistent state management

    // Upload logic moved back to main component
    const handleFileSelect = async (file: File) => {
        // Clear any existing field error when user starts uploading
        clearErrors('thumbnailUrl');
        
        // Set uploading state immediately to show progress
        setIsUploading(true);

        // Validate file type
        const acceptedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!acceptedTypes.includes(file.type)) {
            setIsUploading(false);
            setError('thumbnailUrl', {
                type: 'manual',
                message: 'Invalid image. Please upload JPEG or PNG files only.'
            });
            return;
        }

        // Validate image dimensions (512x512)
        const img = new Image();
        img.onload = async () => {
            URL.revokeObjectURL(img.src); // Clean up
            if (img.width !== 512 || img.height !== 512) {
                setIsUploading(false);
                setError('thumbnailUrl', {
                    type: 'manual',
                    message: 'Invalid image. Image must be exactly 512x512 pixels.'
                });
                return;
            }

            // If validation passes, proceed with upload
            try {
                // Get selected project from localStorage
                const selectedProject = JSON.parse(localStorage.getItem('selectedProject') || '{}');

                const uploadResult = await uploadService.uploadImage(
                    9,  // use other module type
                    file,
                    selectedProject
                );

                if (uploadResult && uploadResult.responseData && uploadResult.responseData.path) {
                    // Use the full path URL directly from the API response
                    const fullImageUrl = uploadResult.responseData.path;
                    clearErrors('thumbnailUrl');
        
                    
                    // Update React Hook Form (primary source of truth during editing)
                    setValue('thumbnailUrl', fullImageUrl);
                    
                    
                    // Batch Redux update - only update what's necessary for UI state
                    dispatch(updateDeckForm({
                        thumbnailUrl: fullImageUrl,
                        isUploadingThumbnail: false
                    }));
                } else {
                    throw new Error('Upload failed - no file path returned');
                }

            } catch (error: any) {
                console.error('Upload error:', error);
                setError('thumbnailUrl', {
                    type: 'manual',
                    message: 'Invalid image. Failed to upload image.'
                });
                // Only update upload state on error
                dispatch(updateDeckForm({ isUploadingThumbnail: false }));
            } finally {
                setIsUploading(false);
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(img.src); // Clean up
            setIsUploading(false);
            setError('thumbnailUrl', {
                type: 'manual',
                message: 'Invalid image. Unable to process image file.'
            });
        };
        img.src = URL.createObjectURL(file);
    };

    const handleImageRemove = () => {
        // Clear any existing field error when user removes image
        clearErrors('thumbnailUrl');
        
        // Update React Hook Form first (primary source of truth during editing)
        setValue('thumbnailUrl', '');
        
        // Update Redux state for UI consistency
        dispatch(updateDeckForm({ thumbnailUrl: '' }));
    };

    // Form validation is now handled by React Hook Form Controller field-level validation

    return (
        <div className="bg-white">


            <form className="space-y-8" onSubmit={e => { e.preventDefault(); }}>
                {/* Deck Name */}
                <div className="grid grid-cols-12 gap-6 items-start">
                    <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 pt-2">
                            Deck Name<span className="text-[#F64E60]">*</span>
                        </label>
                    </div>
                    <div className="col-span-9">
                        <TextInput 
                            name="name"
                            control={control}
                            validationRules={validationRules.name}
                            placeholder="Enter deck name..."
                            maxLength={200}
                            showCharacterCount={true}
                            pattern={/^[a-zA-Z0-9\s]*$/}
                        />
                    </div>
                </div>

                {/* Content Topic */}
                <div className="grid grid-cols-12 gap-6 items-start">
                    <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 pt-2">
                            Content Topic<span className="text-[#F64E60]">*</span>
                        </label>
                    </div>
                    <div className="col-span-9">
                        <Select
                            name="contentTopicId"
                            control={control}
                            validationRules={validationRules.contentTopicId}
                            options={contentTopicOptions}
                            placeholder="Select Content Topic..."
                            maxWidth="w-[25%]"
                        />
                    </div>
                </div>

                {/* Due By */}
                <div className="grid grid-cols-12 gap-6 items-start">
                    <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700">
                            Due By<span className="text-[#F64E60]">*</span>
                        </label>
                    </div>
                    <div className="col-span-9">
                        <RadioInput 
                            name="dueByType"
                            control={control}
                            validationRules={validationRules.dueByType}
                            options={[
                                { value: '1', label: 'No Due Date' },
                                { value: '2', label: 'Relative Due Date', disabled: true },
                                { value: '3', label: 'With Fixed Due Date' }
                            ]}
                            onChange={(value) => {
                                if (value === '1') {
                                    setValue('dueDate', ''); // Clear date when no due date selected
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Date Field (conditional) */}
                {watchedDueByType === '3' && (
                    <div className={`grid grid-cols-12 gap-6 items-start ${
                        shouldAnimateDateField ? 'animate-fade-in-scale' : ''
                    }`}>
                        <div className="col-span-3">
                            <label className="block text-sm font-medium text-gray-700 pt-2">
                                Date<span className="text-[#F64E60]">*</span>
                            </label>
                        </div>
                        <div className="col-span-9">
                            <DateInput 
                                name="dueDate"
                                control={control}
                                validationRules={validationRules.dueDate}
                                placeholder="YYYY-MM-DD"
                                width="w-[25%]"
                                minDate={new Date().toISOString().split('T')[0]}
                                hint={<div>Instructions/ <span className="text-red-500">Error</span></div>}
                            />
                        </div>
                    </div>
                )}



                {/* Notify On Edit */}
                <div className="grid grid-cols-12 gap-6 items-start">
                    <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 pt-2">Notify On Edit</label>
                    </div>
                    <div className="col-span-9">
                        <CheckboxInput
                            name="notifyOnEdit"
                            control={control}
                            className="mt-2"
                            label="Yes"
                        />
                    </div>
                </div>

                {/* Thumbnail Image */}
                <div className="grid grid-cols-12 gap-6 items-start">
                    <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 pt-2">
                            Thumbnail Image<span className="text-[#F64E60]">*</span>
                        </label>
                    </div>
                    <div className="col-span-9">
                        <UploadImage
                            name="thumbnailUrl"
                            control={control}
                            validationRules={validationRules.thumbnailUrl}
                            onFileSelect={handleFileSelect}
                            onRemove={handleImageRemove}
                            acceptedTypes={[
                                'image/jpeg', 'image/png', 'image/jpg'
                            ]}
                            isUploading={isUploading}
                            hint="Upload .jpeg, .png files only, Dimensions 512*512 pixels"
                        />
                    </div>
                </div>

                {/* Pass Score (%) */}
                <div className="grid grid-cols-12 gap-6 items-start">
                    <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 pt-2">
                            Pass Score (%)<span className="text-[#F64E60]">*</span>
                        </label>
                    </div>
                    <div className="col-span-9">
                        <TextInput
                            name="passScore"
                            control={control}
                            type="number"
                            placeholder="Enter pass score (0-100)"
                            validationRules={{
                                required: 'Pass Score is required.',
                                min: { value: 0, message: 'Pass Score must be between 0 and 100.' },
                                max: { value: 100, message: 'Pass Score must be between 0 and 100.' },
                            }}
                            blockInvalidInput
                            pattern={/^\d{0,3}$/}
                            maxWidth="w-[25%]"
                            inputProps={{ min: 0, max: 100 }}
                        />
                    </div>
                </div>

                {/* Max Reattempt */}
                <div className="grid grid-cols-12 gap-6 items-start">
                    <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 pt-2">
                            Max Reattempt<span className="text-[#F64E60]">*</span>
                        </label>
                    </div>
                    <div className="col-span-9">
                        <TextInput
                            name="maxReattempt"
                            control={control}
                            type="number"
                            placeholder="Enter max reattempt (0-1000)"
                            validationRules={{
                                required: 'Max Reattempt is required.',
                                min: { value: 0, message: 'Max Reattempt must be between 0 and 1000.' },
                                max: { value: 1000, message: 'Max Reattempt must be between 0 and 1000.' },
                            }}
                            blockInvalidInput
                            pattern={/^\d{0,4}$/}
                            maxWidth="w-[25%]"
                            inputProps={{ min: 0, max: 1000 }}
                        />
                    </div>
                </div>

                {/* Entity Type */}
                <div className="grid grid-cols-12 gap-6 items-start">
                    <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 pt-2">
                            Entity Type<span className="text-[#F64E60]">*</span>
                        </label>
                    </div>
                    <div className="col-span-9">
                        <Select
                            name="entityType"
                            control={control}
                            validationRules={validationRules.entityType}
                            options={
                                dynamicNames.customersLabel
                                    ? [
                                        { value: '5', label: 'User' },
                                        { value: '2', label: dynamicNames.customersLabel },
                                    ]
                                    : [{ value: '5', label: 'User' }]
                            }
                            placeholder="Select Entity Type..."
                            maxWidth="w-[25%]"
                        />
                    </div>
                </div>

                {/* Assign To - Show when Entity Type is '5' (User) */}
                {watchedEntityType === '5' && (
                    <div className="grid grid-cols-12 gap-6 items-start">
                        <div className="col-span-3">
                            <label className="block text-sm font-medium text-gray-700 pt-2">
                                Assign To<span className="text-[#F64E60]">*</span>
                            </label>
                        </div>
                        <div className="col-span-9">
                            <MultiSelect
                                name="assignedTo"
                                control={control}
                                validationRules={validationRules.assignedTo}
                                options={assignToOptions}
                                placeholder="Select Roles..."
                                maxWidth="w-[25%]"
                            />
                        </div>
                    </div>
                )}

                {/* Attribute Mapping Section - Show when Entity Type is '2' (Customer) and options are loaded */}
                {watchedEntityType === '2' && attributeOptions.length > 0 && (
                    <div className="grid grid-cols-12 gap-6 items-start">
                        <div className="col-span-3">
                            <label className="block text-sm font-medium text-gray-700 pt-2">
                                Attribute Mapping
                            </label>
                        </div>
                        <div className="col-span-9">
                            <div className="space-y-3">
                                {fields.map((field, index) => {
                                    // Get the current attribute ID from RHF watched value (source of truth)
                                    const currentAttributeId = watchedAttributeMappings[index]?.attributeId || '';
                                    // Get lookup options based on the RHF attribute value
                                    const currentLookupOptions = getLookupOptionsForAttribute(currentAttributeId);

                                    // Get all selected attribute IDs except current row
                                    const selectedAttributeIds = watchedAttributeMappings
                                        .map((mapping: AttributeMapping, i: number) => i !== index ? mapping?.attributeId : null)
                                        .filter((id: string | null): id is string => !!id);

                                    // Filter out already selected attributes from options for this row
                                    const availableAttributeOptions = attributeOptions.filter(
                                        (option) => !selectedAttributeIds.includes(option.value)
                                    );

                                    return (
                                        <div key={field.id}>
                                            <div className="flex gap-3 items-start">
                                                {/* Single-Select for Attribute Type */}
                                                <div className="w-[25%]">
                                                    <Select
                                                        name={`attributeMappings.${index}.attributeId`}
                                                        control={control}
                                                        options={availableAttributeOptions}
                                                        placeholder="Select Attribute..."
                                                    />
                                                </div>
                                                {/* Value input - TextInput for text type, MultiSelect for dropdown types */}
                                                <div className="w-[25%]">
                                                    {attributeTypeMap[currentAttributeId] === 6 ? (
                                                        <TextInput
                                                            name={`attributeMappings.${index}.lookupValues`}
                                                            control={control}
                                                            placeholder="Enter value..."
                                                            disabled={!currentAttributeId}
                                                        />
                                                    ) : (
                                                        <MultiSelect
                                                            name={`attributeMappings.${index}.lookupValues`}
                                                            control={control}
                                                            options={currentLookupOptions}
                                                            placeholder="Select Values..."
                                                            disabled={!currentAttributeId}
                                                        />
                                                    )}
                                                </div>
                                                {/* Add/Remove Buttons */}
                                                <div className="flex items-center gap-1 pt-1">
                                                    {fields.length > 1 && (
                                                        <RemoveActionButton
                                                            id={index}
                                                            onRemove={() => handleRemoveAttributeMapping(index)}
                                                            className="!w-6 !h-6"
                                                        />
                                                    )}
                                                    {index === fields.length - 1 && (
                                                        <AddActionButton
                                                            onAdd={handleAddAttributeMapping}
                                                            className="!w-6 !h-6"
                                                            disabled={!currentAttributeId || !watchedAttributeMappings[index]?.lookupValues?.length}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                            {/* AND/OR Toggle - Show between rows when there are multiple rows */}
                                            {index < fields.length - 1 && (
                                                <div className="flex items-center pt-3 pb-2">
                                                    {index === 0 ? (
                                                        // First row: User can toggle between AND/OR
                                                        <AndOrToggle
                                                            value={watchedConditionOperator === 1 ? 'AND' : 'OR'}
                                                            onChange={handleConditionOperatorChange}
                                                        />
                                                    ) : (
                                                        // Subsequent rows: Show only the selected state (AND or OR)
                                                        <AndOrToggle
                                                            value={watchedConditionOperator === 1 ? 'AND' : 'OR'}
                                                            onChange={handleConditionOperatorChange}
                                                            showAnd={watchedConditionOperator === 1}
                                                            showOr={watchedConditionOperator === 2}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* Status */}
                <div className="grid grid-cols-12 gap-6 items-start">
                    <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 pt-2">Status</label>
                    </div>
                    <div className="col-span-9">
                        <Select
                            name="status"
                            control={control}
                            options={statusOptions}
                            placeholder="Select Option..."
                            maxWidth="w-[20%]"
                            disabled={!isEditMode}
                        />
                    </div>
                </div>

            </form>
        </div>
    );
};

export default DeckConfigurationStep;
