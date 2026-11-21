import React, { useEffect, useState, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useSnackbar } from 'notistack';
import { RootState, AppDispatch } from '@/store';
import {
    setUserRoles,
    setLoading,
    setSaving,
    setRoleVisibility,
    setRoleFieldValueComplex,
    clearRoleFieldValuesComplex,
    setCustomAttributesListForRole,
    appendChildAttributesForRole,
    setSelectedField,
    resetFieldAccessState,
} from '@/store/fieldAccessSlice';
import {
    CustomAttribute,
    FieldVisibilitySetting,
} from '@/lib/models/attributes/field-visibility.model';
import { UserRoleData } from '@/lib/models/user-role.model';
import settingsService from '@/lib/services/settingsService';
import userService from '@/lib/services/userService';
import TwinModal from '@/components/common/TwinModal';
import Spinner from '@/components/common/Spinner';
import { Button } from '@/components/ui/tailwind';
import TextInput from '@/components/common/input-fields/TextInput';
import TextArea from '@/components/common/input-fields/TextArea';
import Select from '@/components/common/input-fields/Select';
import MultiSelect from '@/components/common/input-fields/MultiSelect';
import DateInput from '@/components/common/input-fields/DateInput';
import DateTimeInput from '@/components/common/input-fields/DateTimeInput';
import TimeInput from '@/components/common/input-fields/TimeInput';
import RadioInput from '@/components/common/input-fields/RadioInput';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import UploadInput from '@/components/common/input-fields/UploadInput';
import ReferenceDocuments from '@/components/common/input-fields/ReferenceDocuments';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import uploadService from '@/lib/services/uploadService';
import { DocumentFile } from '@/components/common/input-fields/UploadInput';
import { CodeSquare } from 'lucide-react';

interface ManageFieldAccessProps {
    open: boolean;
    onClose: () => void;
    attributeId: number | null;
    projectId: number;
    moduleType: number;
    onSuccess?: () => void;
}

// Role Field Form Component - wraps each role's fields with react-hook-form
interface RoleFieldFormProps {
    role: UserRoleData;
    field: CustomAttribute;
    onFieldValueChange: (roleId: number, fieldName: string, value: any) => void;
    onInvokeChildMethod?: (lookupValue: any, customAttr: CustomAttribute, roleId: number, roleName: string, setValue?: boolean) => Promise<void>;
    onFileUpload?: (roleId: number, fieldName: string, file: File, attributeTypeId: number, maxImagesAllowed?: number) => Promise<string | null>;
    onFileRemove?: (roleId: number, fieldName: string, index?: number) => void;
    isLoading?: boolean;
    isLoadingLookupValues?: boolean;
    isUploadingFile?: boolean;
    currentValue: any;
    projectId: number;
    moduleType: number;
}

// Ref handle for RoleFieldForm to expose validation trigger
interface RoleFieldFormRef {
    triggerValidation: () => Promise<boolean>;
}

// Validation patterns based on Angular code
const VALIDATION_PATTERNS = {
    NUMERIC: /^(0|[1-9][0-9]*)$/,
    DECIMAL: /^(0|[1-9][0-9]*)$|^((0|[1-9][0-9]*)\.\d{1,2})$/,
    ALPHABET_ONLY: /^[a-zA-Z ]*$/,
    ALPHANUMERIC: /^[a-zA-Z0-9 ]*$/,
    ALPHABET_MULTILINE: /^[a-zA-Z \n]*$/,
    ALPHANUMERIC_MULTILINE: /^[a-zA-Z0-9 \n]*$/,
    EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
};

const VALIDATION_MESSAGES = {
    REQUIRED: 'This field is required',
    ALPHABET_ONLY: 'Only alphabets are allowed',
    ALPHANUMERIC: 'Only alpha-numeric characters are allowed',
    NUMERIC: 'Please enter a valid number',
    DECIMAL: 'Please enter a valid decimal number',
    EMAIL: 'Please enter a valid email address',
};

// Helper function to serialize field values for API request
// Handles file uploads (DocumentFile objects) by extracting server paths (name) and joining with commas
const serializeFieldValue = (value: any, attributeTypeId: number): any => {
    if (value === undefined || value === null) return value;

    // For file upload types (IMAGE, DOCUMENT_UPLOAD, AUDIO_VIDEO)
    const fileUploadTypes = [
        CustomAttributeTypeEnum.IMAGE,
        CustomAttributeTypeEnum.DOCUMENT_UPLOAD,
        CustomAttributeTypeEnum.AUDIO_VIDEO
    ];

    if (fileUploadTypes.includes(attributeTypeId)) {
        // Handle array of DocumentFile objects
        if (Array.isArray(value)) {
            const serverPaths = value
                .map((item: DocumentFile) => item?.name || item?.url || item)
                .filter((path: any) => path && typeof path === 'string');
            return serverPaths.length > 0 ? serverPaths.join(',') : null;
        }
        // Handle single DocumentFile object - use name (server path) for API
        if (typeof value === 'object' && (value.name || value.url)) {
            return value.name || value.url;
        }
        // Already a string (server path)
        if (typeof value === 'string') {
            return value;
        }
        return null;
    }

    // For other field types, return value as-is
    return value;
};

// Helper function to get static URL base from environment
const getStaticUrlBase = (): string => {
    return process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL || '';
};

// Helper function to deserialize field values from API response
// Converts comma-separated file paths to DocumentFile objects for UploadInput
const deserializeFieldValue = (value: any, attributeTypeId: number, maxImagesAllowed?: number): any => {
    if (value === undefined || value === null || value === '') return value;

    // For file upload types (IMAGE, DOCUMENT_UPLOAD, AUDIO_VIDEO)
    const fileUploadTypes = [
        CustomAttributeTypeEnum.IMAGE,
        CustomAttributeTypeEnum.DOCUMENT_UPLOAD,
        CustomAttributeTypeEnum.AUDIO_VIDEO
    ];

    if (fileUploadTypes.includes(attributeTypeId) && typeof value === 'string') {
        // Split comma-separated paths into array
        const paths = value.split(',').filter((path: string) => path && path.trim() !== '');

        if (paths.length === 0) return undefined;

        const staticUrlBase = getStaticUrlBase();

        // Convert each path to DocumentFile object
        const documentFiles: DocumentFile[] = paths.map((path: string) => {
            const trimmedPath = path.trim();
            // Check if it's already a full URL or just a relative path
            const isFullUrl = trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://');
            return {
                name: trimmedPath, // Server path for saving
                size: 0,
                type: '',
                url: isFullUrl ? trimmedPath : `${staticUrlBase}${trimmedPath}`, // Full URL for display
            };
        });

        // Return single object if only one file and maxImagesAllowed is 1, otherwise return array
        if (documentFiles.length === 1 && (maxImagesAllowed ?? 0) <= 1) {
            return documentFiles[0];
        }
        return documentFiles;
    }

    // For other field types, return value as-is
    return value;
};

const RoleFieldForm = forwardRef<RoleFieldFormRef, RoleFieldFormProps>(({
    role,
    field,
    onFieldValueChange,
    onInvokeChildMethod,
    onFileUpload,
    onFileRemove,
    isLoading = false,
    isLoadingLookupValues = false,
    isUploadingFile = false,
    currentValue,
    projectId,
    moduleType,
}, ref) => {
    // Calculate min/max dates from dateAttributes (similar to Angular's iniatilizeControlsForDateField)
    const getDateConstraints = useCallback(() => {
        let minDate: string | undefined;
        let maxDate: string | undefined;

        if (field.dateAttributes) {
            // Calculate minDate by subtracting previousDateAllowed days from today
            if (field.dateAttributes.previousDateAllowed != null) {
                const previousDays = Number(field.dateAttributes.previousDateAllowed);
                if (!isNaN(previousDays)) {
                    const min = new Date();
                    min.setDate(min.getDate() - previousDays);
                    minDate = min.toISOString().split('T')[0]; // Format as YYYY-MM-DD
                }
            }
            // Calculate maxDate by adding futureDateAllowed days to today
            if (field.dateAttributes.futureDateAllowed != null) {
                const futureDays = Number(field.dateAttributes.futureDateAllowed);
                if (!isNaN(futureDays)) {
                    const max = new Date();
                    max.setDate(max.getDate() + futureDays);
                    maxDate = max.toISOString().split('T')[0]; // Format as YYYY-MM-DD
                }
            }
        }

        return { minDate, maxDate };
    }, [field.dateAttributes]);

    // Get validation rules based on field type and configuration
    const getValidationRules = useCallback(() => {
        const rules: any = {};

        // Add required validation if mandatory
        if (field.mandatoryFlag === 1) {
            rules.required = VALIDATION_MESSAGES.REQUIRED;
        }

        switch (field.attributeType.id) {
            case CustomAttributeTypeEnum.TEXT_SINGLE_LINE:
            case CustomAttributeTypeEnum.QR_CODE_SCANNER:
                // characterType: 2 = alphanumeric, 3 = alphabet only
                if (field.characterType === 3) {
                    rules.pattern = {
                        value: VALIDATION_PATTERNS.ALPHABET_ONLY,
                        message: VALIDATION_MESSAGES.ALPHABET_ONLY,
                    };
                } else if (field.characterType === 2) {
                    rules.pattern = {
                        value: VALIDATION_PATTERNS.ALPHANUMERIC,
                        message: VALIDATION_MESSAGES.ALPHANUMERIC,
                    };
                }
                break;

            case CustomAttributeTypeEnum.NUMERIC:
                if (field.decimalFlag) {
                    rules.pattern = {
                        value: VALIDATION_PATTERNS.DECIMAL,
                        message: VALIDATION_MESSAGES.DECIMAL,
                    };
                } else {
                    rules.pattern = {
                        value: VALIDATION_PATTERNS.NUMERIC,
                        message: VALIDATION_MESSAGES.NUMERIC,
                    };
                }
                break;

            case CustomAttributeTypeEnum.TEXT_MULTI_LINE:
                if (field.characterType === 3) {
                    rules.pattern = {
                        value: VALIDATION_PATTERNS.ALPHABET_MULTILINE,
                        message: VALIDATION_MESSAGES.ALPHABET_ONLY,
                    };
                } else if (field.characterType === 2) {
                    rules.pattern = {
                        value: VALIDATION_PATTERNS.ALPHANUMERIC_MULTILINE,
                        message: VALIDATION_MESSAGES.ALPHANUMERIC,
                    };
                }
                break;

            case CustomAttributeTypeEnum.EMAIL:
                rules.pattern = {
                    value: VALIDATION_PATTERNS.EMAIL,
                    message: VALIDATION_MESSAGES.EMAIL,
                };
                break;
        }

        return rules;
    }, [field.attributeType.id, field.mandatoryFlag, field.characterType, field.decimalFlag]);

    // Set appropriate default values based on field type
    const getDefaultValue = useCallback(() => {
        // For multi-select, convert comma-separated string back to array for the component
        if (field.attributeType.id === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
            if (currentValue && typeof currentValue === 'string' && currentValue !== '') {
                return currentValue.split(',');
            }
            return [];
        }

        // For single select and data list, ensure value is a string (to match option values)
        if (field.attributeType.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN ||
            field.attributeType.id === CustomAttributeTypeEnum.DATA_LIST) {
            if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
                return currentValue.toString();
            }
            return '';
        }

        if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
            return currentValue;
        }

        // Default values for different field types
        switch (field.attributeType.id) {
            case CustomAttributeTypeEnum.DATE:
            case CustomAttributeTypeEnum.DATE_TIME:
                return '';
            default:
                return '';
        }
    }, [currentValue, field.attributeType.id]);

    const { control, watch, reset, trigger } = useForm({
        defaultValues: {
            [field.combinedAttributeName]: getDefaultValue(),
        },
        mode: 'onChange', // Validate on every change to show errors immediately
    });

    // Expose triggerValidation method via ref
    useImperativeHandle(ref, () => ({
        triggerValidation: async () => {
            const isValid = await trigger();
            return isValid;
        }
    }), [trigger]);

    // Reset form when currentValue changes (for editing existing values)
    useEffect(() => {
        const newValue = getDefaultValue();
        reset({ [field.combinedAttributeName]: newValue });
    }, [currentValue, field.combinedAttributeName, getDefaultValue, reset]);

    const fieldKey = field.combinedAttributeName;

    // Watch for changes in multi-select and other fields that don't have onChange
    const fieldValue = watch(fieldKey);

    useEffect(() => {
        // For fields without onChange handlers, track value changes
        const fieldsWithoutOnChange = [
            CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN,
            CustomAttributeTypeEnum.DATE,
            CustomAttributeTypeEnum.TEXT_SINGLE_LINE,
            CustomAttributeTypeEnum.NUMERIC,
            CustomAttributeTypeEnum.TEXT_MULTI_LINE,
            CustomAttributeTypeEnum.EMAIL,
            CustomAttributeTypeEnum.DATE_TIME,
            CustomAttributeTypeEnum.TIME_DURATION,
            CustomAttributeTypeEnum.QR_CODE_SCANNER,
        ];

        if (fieldsWithoutOnChange.includes(field.attributeType.id)) {
            // For multi-select, convert array to comma-separated string
            if (field.attributeType.id === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN && Array.isArray(fieldValue)) {
                onFieldValueChange(role.roleId, field.combinedAttributeName, fieldValue.join(','));
            } else {
                onFieldValueChange(role.roleId, field.combinedAttributeName, fieldValue);
            }
        }
    }, [fieldValue, role.roleId, field.attributeType.id]);

    const handleChange = async (value: any, attribute?: CustomAttribute) => {
        const customAttr = attribute || field;

        // Update the field value using the correct field's combinedAttributeName
        onFieldValueChange(role.roleId, customAttr.combinedAttributeName, value);

        // Check if attribute is present and has child attributes
        if (customAttr && onInvokeChildMethod) {
            // For DATA_LIST (type 18), SINGLE_SELECT (type 1), or attributes with linkedAttributeId
            if ((customAttr.attributeType.id === CustomAttributeTypeEnum.DATA_LIST && customAttr.addDataListDependentFields === 1 )  ||
                customAttr.attributeType.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN ||
                customAttr.linkedAttributeId !== null) {
                await onInvokeChildMethod(value, customAttr, role.roleId, role.roleName, false);
            }
        }
    };

    switch (field.attributeType.id) {
        case CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN:
            return (
                <Select
                    name={fieldKey}
                    control={control}
                    options={field.lookupValues?.map((lv) => ({
                        value: lv.id.toString(),
                        label: lv.lookupValue,
                    })) || []}
                    placeholder={isLoadingLookupValues ? "Loading options..." : "Select option..."}
                    onChange={(value) => handleChange(value, field)}
                    maxWidth='w-[70%]'
                    disabled={isLoadingLookupValues}
                    loading={isLoading}
                    validationRules={getValidationRules()}
                />
            );

        case CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN:
            return (
                <MultiSelect
                    name={fieldKey}
                    control={control}
                    options={field.lookupValues?.map((lv) => ({
                        value: lv.id.toString(),
                        label: lv.lookupValue,
                    })) || []}
                    placeholder="Select options..."
                    maxWidth='w-[70%]'
                    validationRules={getValidationRules()}
                />
            );

        case CustomAttributeTypeEnum.DATE: {
            const { minDate, maxDate } = getDateConstraints();
            return (
                <DateInput
                    name={fieldKey}
                    control={control}
                    placeholder="Select date..."
                    width='w-[70%]'
                    minDate={minDate}
                    maxDate={maxDate}
                    validationRules={getValidationRules()}
                />
            );
        }

        case CustomAttributeTypeEnum.DATE_TIME: {
            const { minDate, maxDate } = getDateConstraints();
            return (
                <DateTimeInput
                    name={fieldKey}
                    control={control}
                    placeholder="Select date and time..."
                    width='w-[70%]'
                    minDateTime={minDate}
                    maxDateTime={maxDate}
                    validationRules={getValidationRules()}
                />
            );
        }
        case CustomAttributeTypeEnum.IMAGE:
            return (
                <UploadInput
                    name={fieldKey}
                    control={control}
                    onRemove={(index?: number) => {
                        if (onFileRemove) {
                            onFileRemove(role.roleId, field.combinedAttributeName, index);
                        }
                    }}
                    attributeTypeId={CustomAttributeTypeEnum.IMAGE}
                    multiple={(field.maxImagesAllowed ?? 0) > 1}
                    maxFiles={field.maxImagesAllowed ?? undefined}
                    moduleType={moduleType}
                    projectId={projectId}
                    validationRules={getValidationRules()}
                />
            );
        case CustomAttributeTypeEnum.RADIO:
            return (
                <RadioInput
                    name={fieldKey}
                    control={control}
                    options={field.lookupValues?.map((lv) => ({
                        value: lv.id.toString(),
                        label: lv.lookupValue,
                    })) || []}
                    onChange={handleChange}
                    validationRules={getValidationRules()}
                />
            );

        case CustomAttributeTypeEnum.TEXT_SINGLE_LINE:
        case CustomAttributeTypeEnum.QR_CODE_SCANNER:
            return (
                <TextInput
                    name={fieldKey}
                    control={control}
                    validationRules={getValidationRules()}
                    placeholder={`Enter value`}
                    maxWidth='w-[70%]'
                />
            );

        case CustomAttributeTypeEnum.NUMERIC:
            return (
                <TextInput
                    name={fieldKey}
                    control={control}
                    validationRules={getValidationRules()}
                    placeholder={`Enter number`}
                    type='number'
                    inputProps={{
                        step: field.decimalFlag ? '0.01' : '1',
                    }}
                    maxWidth='w-[70%]'
                />
            );

        case CustomAttributeTypeEnum.TEXT_MULTI_LINE:
            return (
                <TextArea
                    name={fieldKey}
                    control={control}
                    validationRules={getValidationRules()}
                    placeholder={`Enter value`}
                    rows={1}
                />
            );

        case CustomAttributeTypeEnum.EMAIL:
            return (
                <TextInput
                    name={fieldKey}
                    control={control}
                    validationRules={getValidationRules()}
                    placeholder={`Enter email`}
                    maxWidth='w-[70%]'
                />
            );
        case CustomAttributeTypeEnum.DOCUMENT_UPLOAD:
            return (
                <UploadInput
                    name={fieldKey}
                    control={control}
                    onRemove={(index?: number) => {
                        if (onFileRemove) {
                            onFileRemove(role.roleId, field.combinedAttributeName, index);
                        }
                    }}
                    attributeTypeId={CustomAttributeTypeEnum.DOCUMENT_UPLOAD}
                    multiple={(field.maxImagesAllowed ?? 0) > 1}
                    maxFiles={field.maxImagesAllowed ?? undefined}
                    moduleType={moduleType}
                    projectId={projectId}
                    validationRules={getValidationRules()}
                />
            );
        case CustomAttributeTypeEnum.AUDIO_VIDEO:
            return (
                <UploadInput
                    name={fieldKey}
                    control={control}
                    onRemove={(index?: number) => {
                        if (onFileRemove) {
                            onFileRemove(role.roleId, field.combinedAttributeName, index);
                        }
                    }}
                    attributeTypeId={CustomAttributeTypeEnum.AUDIO_VIDEO}
                    multiple={(field.maxImagesAllowed ?? 0) > 1}
                    maxFiles={field.maxImagesAllowed ?? undefined}
                    maxSize={25 * 1024 * 1024}
                    moduleType={moduleType}
                    projectId={projectId}
                    validationRules={getValidationRules()}
                />
            );
        case CustomAttributeTypeEnum.REFERENCE_DOCUMENTS:
            return (
                <ReferenceDocuments
                    customAttr={{
                        combinedAttributeName: field.combinedAttributeName,
                        attributeType: {
                            id: CustomAttributeTypeEnum.REFERENCE_DOCUMENTS
                        },
                        instructions: field.instructions,
                        mandatoryFlag: field.mandatoryFlag,
                    }}
                    fileArray={field.referenceDocumentUrl?.filter(url => url && url.trim() !== '') || []}
                />
            );
        case CustomAttributeTypeEnum.DATA_LIST:
            return (
                <Select
                    name={fieldKey}
                    control={control}
                    options={Array.isArray(field.lookupValues) ? field.lookupValues.map((lv) => ({
                        value: lv.id.toString(),
                        label: lv.lookupValue,
                    })) : []}
                    placeholder={isLoadingLookupValues ? "Loading options..." : "Select option..."}
                    onChange={(value) => { handleChange(value, field) }}
                    maxWidth='w-[70%]'
                    disabled={isLoadingLookupValues}
                    loading={isLoading}
                    validationRules={getValidationRules()}
                />
            );

        case CustomAttributeTypeEnum.TIME_DURATION:
            return (
                <TimeInput
                    name={fieldKey}
                    control={control}
                    placeholder="Select Time..."
                    withSeconds={true}
                    width='w-[70%]'
                    validationRules={getValidationRules()}
                />
            );


        case CustomAttributeTypeEnum.PAGE_SEPARATOR:
        case CustomAttributeTypeEnum.LINK_FROM_OTHER_ENTITIES:
            return (
                <></>
            );

        default:
            return (
                <></>
            );
    }
});

RoleFieldForm.displayName = 'RoleFieldForm';

const ManageFieldAccess: React.FC<ManageFieldAccessProps> = ({
    open,
    onClose,
    attributeId,
    projectId,
    moduleType,
    onSuccess,
}) => {
    const dispatch = useDispatch<AppDispatch>();
    const { enqueueSnackbar } = useSnackbar();

    // Local state for child fields loading - tracks which specific field is loading (key: "roleId-combinedAttributeName")
    const [loadingChildFieldKey, setLoadingChildFieldKey] = useState<string | null>(null);
    // Local state for loading lookup values (during initial fetch)
    const [isLoadingLookupValues, setIsLoadingLookupValues] = useState(false);

    // Redux state (only for user roles and field values, not for field details)
    const {
        userRoles,
        isLoading,
        isSaving,
        roleVisibility,
        roleFieldValuesComplex,
        customAttributesList,
        selectedField,
    } = useSelector((state: RootState) => state.fieldAccess);



    // State for tracking open/visible child divs per role
    const [openDivsObj, setOpenDivsObj] = useState<Record<string, Record<string, boolean>>>({});

    // State for tracking child field version per role (increments when parent changes to force remount)
    const [childFieldVersion, setChildFieldVersion] = useState<Record<string, number>>({});

    // State for tracking form version per role (increments when visibility changes to force form reset)
    const [formVersion, setFormVersion] = useState<Record<string, number>>({});

    // State for file uploads - tracks which field is currently uploading (key: "roleId-combinedAttributeName")
    const [uploadingFileKey, setUploadingFileKey] = useState<string | null>(null);

    // Refs collection for all RoleFieldForm components to trigger validation
    const formRefsMap = useRef<Map<string, RoleFieldFormRef>>(new Map());

    // File upload handler - uploads file and updates field value with the URL
    const handleFileUpload = useCallback(async (
        roleId: number,
        fieldName: string,
        file: File,
        attributeTypeId: number,
        maxImagesAllowed?: number
    ): Promise<string | null> => {
        const uploadKey = `${roleId}-${fieldName}`;
        setUploadingFileKey(uploadKey);

        try {
            let response;

            // Use appropriate upload service based on attribute type
            if (attributeTypeId === CustomAttributeTypeEnum.IMAGE) {
                response = await uploadService.uploadImage(moduleType, file, projectId);
            } else {
                // DOCUMENT_UPLOAD (15) and AUDIO_VIDEO (16) use uploadDoc
                response = await uploadService.uploadDoc(moduleType, file, projectId);
            }

            if (response.statusCode === 200 && response.responseData?.name) {
                // name: relative path to send to server (e.g., "ap-south-1-data/202/...")
                // path: full URL for display/preview (e.g., "https://static.preprod.1channel.co/...")
                const uploadedFileName = response.responseData.name;
                const uploadedFilePath = response.responseData.path || uploadedFileName;

                // Get current value (could be array for multiple files or single string)
                const currentValue = roleFieldValuesComplex[roleId.toString()]?.[fieldName];
                let newValue: DocumentFile | DocumentFile[];

                // Create DocumentFile object with both url (for display) and name (for server)
                const newFile: DocumentFile = {
                    name: uploadedFileName, // Server filename/path for saving
                    size: file.size,
                    type: file.type,
                    url: uploadedFilePath, // Full URL for display/preview
                };

                // Check if multiple files are allowed based on maxImagesAllowed
                const isMultiple = (maxImagesAllowed ?? 0) > 1;

                if (isMultiple) {
                    // Multiple mode - always use array
                    if (Array.isArray(currentValue)) {
                        newValue = [...currentValue, newFile];
                    } else if (currentValue && typeof currentValue === 'object') {
                        // Single file already exists, convert to array
                        newValue = [currentValue as DocumentFile, newFile];
                    } else {
                        // First file in multiple mode - start with array
                        newValue = [newFile];
                    }
                } else {
                    // Single file mode - replace existing
                    newValue = newFile;
                }

                // Update the field value in Redux
                dispatch(setRoleFieldValueComplex({
                    key: roleId.toString(),
                    fieldName,
                    value: newValue,
                }));

                return uploadedFileName;
            } else {
                enqueueSnackbar('Failed to upload file', { variant: 'error' });
                return null;
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            enqueueSnackbar('Failed to upload file', { variant: 'error' });
            return null;
        } finally {
            setUploadingFileKey(null);
        }
    }, [moduleType, projectId, roleFieldValuesComplex, dispatch, enqueueSnackbar]);

    // File remove handler - removes file from field value
    const handleFileRemove = useCallback((
        roleId: number,
        fieldName: string,
        index?: number
    ) => {
        const currentValue = roleFieldValuesComplex[roleId.toString()]?.[fieldName];

        if (Array.isArray(currentValue)) {
            if (index !== undefined && index >= 0 && index < currentValue.length) {
                // Remove specific file from array
                const newValue = currentValue.filter((_, i) => i !== index);
                dispatch(setRoleFieldValueComplex({
                    key: roleId.toString(),
                    fieldName,
                    value: newValue.length > 0 ? newValue : undefined,
                }));
            }
        } else {
            // Single file - clear the value
            dispatch(setRoleFieldValueComplex({
                key: roleId.toString(),
                fieldName,
                value: undefined,
            }));
        }
    }, [roleFieldValuesComplex, dispatch]);

    // Invoke child method - fetches child fields when parent DataList/Select value changes
    const invokeChildMethod = async (
        lookupValue: any,
        customAttr: CustomAttribute,
        roleId: number,
        roleName: string,
        setValue: boolean = false,
        existingChildData?: any[], // Existing child field data from API
        parentFieldWithLookups?: CustomAttribute // Parent field passed directly to avoid stale closure
    ): Promise<void> => {
        // Only proceed if this field actually has child attributes
        // if (!customAttr.hasChildAttribute) return;

        // Get the parent's combinedAttributeName to identify its children
        const parentCombinedName = customAttr.combinedAttributeName;
        const roleKey = `${roleId}-${attributeId}`;

        // STEP 1: Clear children from Redux store and DOM FIRST (before API call)
        // This prevents visual flash/flicker and ensures clean state before fetching new children
        if (!setValue) {
            const currentAttributes = customAttributesList[roleKey] || [];
            const parentIndex = currentAttributes.findIndex(attr =>
                attr.combinedAttributeName === parentCombinedName
            );

            if (parentIndex !== -1) {
                // Clear values for all fields after the parent from Redux store
                currentAttributes.slice(parentIndex + 1).forEach(attr => {
                    dispatch(setRoleFieldValueComplex({
                        key: roleId.toString(),
                        fieldName: attr.combinedAttributeName,
                        value: undefined,
                    }));
                });

                // Immediately update DOM to remove child fields (keep only up to parent)
                const filteredAttributesWithoutChildren = currentAttributes.slice(0, parentIndex + 1);
                dispatch(setCustomAttributesListForRole({
                    key: roleKey,
                    attributes: filteredAttributesWithoutChildren
                }));
            } else {
                // Fallback: Clear by name prefix (for DATA_LIST fields)
                const roleValues = roleFieldValuesComplex[roleId.toString()] || {};
                Object.keys(roleValues).forEach(fieldName => {
                    if (fieldName !== parentCombinedName && fieldName.startsWith(parentCombinedName)) {
                        dispatch(setRoleFieldValueComplex({
                            key: roleId.toString(),
                            fieldName,
                            value: undefined,
                        }));
                    }
                });
            }
        }

        // Track which specific field is loading (only set after confirming it has children)
        const loadingKey = `${roleId}-${customAttr.combinedAttributeName}`;
        setLoadingChildFieldKey(loadingKey);

        try {
            let attrId: number;
            let parentLinkedDataListAttribId: number;

            // Determine attributeId and parentLinkedDataListAttribId based on attribute type
            if (customAttr.attributeType.id === CustomAttributeTypeEnum.DATA_LIST) {
                // For DATA_LIST: attributeId = parentDataListId, parentLinkedDataListAttribId = attribute.id
                attrId = customAttr.parentDataListId || customAttr.id;
                parentLinkedDataListAttribId = customAttr.id;
            } else {
                // For SINGLE_SELECT or linked attributes
                attrId = customAttr.linkedAttributeId || customAttr.id;
                parentLinkedDataListAttribId = customAttr.id;
            }

            const response = await settingsService.getFieldRelation(attrId, Number(lookupValue) || 0);

            if (response.statusCode === 200 && response.responseData) {
                // Filter active child fields
                const childFields: CustomAttribute[] = response.responseData.filter(
                    (field: CustomAttribute) => field.status === 1 && field.attributeType.id !== CustomAttributeTypeEnum.DATA_LIST
                );

                // Update child fields with combined attribute name
                // Note: DO NOT overwrite child field properties like mandatoryFlag - they have their own values from API
                // For hierarchical fields, prefix the child's combinedAttributeName with the parent's full combinedAttributeName
                // This ensures the hierarchy chain is preserved: Parent + Child1 + Child2 + ...
                childFields.forEach((element: CustomAttribute) => {
                    // Check if parent is DATA_LIST or SINGLE_SELECT type - handles both original parent and nested children
                    // Also check if child itself is DATA_LIST or SINGLE_SELECT (for multi-level hierarchies)
                    const isParentDataList = customAttr.attributeType?.id === CustomAttributeTypeEnum.DATA_LIST;
                    const isParentSingleSelect = customAttr.attributeType?.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN;
                    const isChildDataList = element.attributeType?.id === CustomAttributeTypeEnum.DATA_LIST;
                    const isChildSingleSelect = element.attributeType?.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN;

                    // Apply prefix if parent is DATA_LIST/SINGLE_SELECT OR if the parent's combinedAttributeName
                    // already has a prefix (indicating it's part of a hierarchy chain)
                    const isPartOfHierarchyChain = parentCombinedName !== customAttr.attributeName;

                    // Apply prefix for any hierarchical relationship
                    if (isParentDataList || isParentSingleSelect || isChildDataList || isChildSingleSelect || isPartOfHierarchyChain) {
                        // Child fields from API may have combinedAttributeName set to their original name (e.g., "Device")
                        // We need to prefix it with the parent's full combined name to maintain the chain
                        // Use attributeName as fallback if combinedAttributeName is not set
                        const childOriginalName = element.attributeName || element.combinedAttributeName || '';
                        element.combinedAttributeName = parentCombinedName + childOriginalName;
                    }
                    // Child fields keep their own mandatoryFlag, dateAttributes, lookupValues, etc.
                });

                // Child fields already have lookupValues from getFieldRelation response
                // No need to make additional API calls - lookupValues are included in the response

                // Update openDivsObj for this role
                setOpenDivsObj(prev => {
                    const roleOpenDivs = { ...(prev[roleKey] || {}) };

                    // Close all child divs first (reset to false)
                    Object.keys(roleOpenDivs).forEach(key => {
                        if (key.startsWith(`${parentLinkedDataListAttribId}_`)) {
                            roleOpenDivs[key] = false;
                        }
                    });

                    // Open divs for the fetched child fields
                    childFields.forEach((field: CustomAttribute) => {
                        const divKey = `${parentLinkedDataListAttribId}_${field.id}`;
                        roleOpenDivs[divKey] = true;
                    });

                    return {
                        ...prev,
                        [roleKey]: roleOpenDivs
                    };
                });

                // STEP 2: Update custom attributes list - get fresh copy and add new children
                // IMPORTANT: When setValue=true (loading from API), we need to APPEND children
                // after the parent without removing existing ancestors. This is crucial for
                // multi-level hierarchies where recursive calls happen async.

                if (setValue) {
                    // When loading from API, we need to append children after the parent
                    // Use a custom action that preserves existing attributes
                    dispatch(appendChildAttributesForRole({
                        key: roleKey,
                        parentCombinedName: parentCombinedName,
                        children: childFields
                    }));
                } else {
                    // For user interaction (setValue=false), use the existing logic
                    // which correctly clears children before fetching new ones
                    const currentAttributes = customAttributesList[roleKey] || [];

                    // Find the index of the current parent in the attributes list
                    const parentIndex = currentAttributes.findIndex(attr =>
                        attr.combinedAttributeName === parentCombinedName
                    );

                    // Keep all attributes from the beginning up to and including the parent
                    // This preserves the entire hierarchy chain in the correct order (by index position)
                    // DO NOT sort by name length - this breaks the hierarchy order for DATA_LIST fields
                    let filteredAttributes: CustomAttribute[];
                    if (parentIndex !== -1) {
                        // Keep everything up to and including the parent - slice preserves order
                        filteredAttributes = currentAttributes.slice(0, parentIndex + 1);
                    } else {
                        // Parent not found - use parentFieldWithLookups or selectedField as fallback
                        if (parentFieldWithLookups) {
                            filteredAttributes = [parentFieldWithLookups];
                        } else {
                            // Last resort - just use the parent attribute
                            filteredAttributes = [customAttr];
                        }
                    }

                    // Add new child fields at the end (after all ancestors and parent)
                    // Children are added in the order received from API - no sorting needed
                    if (childFields.length > 0) {
                        filteredAttributes.push(...childFields);
                    }

                    // Dispatch updated attributes to Redux (with new children)
                    dispatch(setCustomAttributesListForRole({
                        key: roleKey,
                        attributes: filteredAttributes
                    }));
                }

                // If setValue is true, set the existing child field values
                if (setValue && existingChildData && existingChildData.length > 0) {
                    // Check if parent is DATA_LIST, SINGLE_SELECT, or part of a hierarchy chain
                    const isParentDataList = customAttr.attributeType?.id === CustomAttributeTypeEnum.DATA_LIST;
                    const isParentSingleSelect = customAttr.attributeType?.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN;
                    // Check if we're part of a hierarchy chain (combinedAttributeName has been prefixed)
                    const isPartOfDataListChain = parentCombinedName !== customAttr.attributeName;
                    // Also check if this is any kind of hierarchical relationship
                    const isPartOfHierarchy = isParentDataList || isParentSingleSelect || isPartOfDataListChain ||
                        customAttr.hasChildAttribute || customAttr.linkedAttributeId !== null;

                    childFields.forEach((childField: CustomAttribute) => {
                        // Find existing value for this child field
                        // For DATA_LIST: match by attributeId and parentDataListId (use immediate parent's id)
                        // For SINGLE_SELECT: match by attributeId only (parentDataListId is null)

                        // Debug logging to trace the matching
                        const configsForThisRole = existingChildData.filter((c: any) => c.roleId === roleId);
                        const configsWithMatchingAttrId = configsForThisRole.filter((c: any) => c.attributeId === childField.id);

                        // The API stores parentDataListId as the ROOT DATA_LIST parent's attribute ID,
                        // NOT the immediate parent's attribute ID. So for a hierarchy like:
                        // Fridge (DATA_LIST, id=63884) -> Company (SINGLE_SELECT) -> Device (SINGLE_SELECT)
                        // Device's config will have parentDataListId = 63884 (Fridge's ID), not Company's ID.
                        //
                        // For matching, we need to find configs where:
                        // 1. attributeId matches the child field
                        // 2. roleId matches
                        // 3. parentDataListId matches the ROOT DATA_LIST parent's ID (from parentField)

                        // Get the root DATA_LIST parent's ID from the parentFieldWithLookups parameter
                        const rootParentId = parentFieldWithLookups?.id;

                        // Find config matching by attributeId, roleId, and rootParentId
                        let existingChildConfig = existingChildData.find(
                            (config: any) => {
                                if (config.attributeId !== childField.id || config.roleId !== roleId) {
                                    return false;
                                }

                                // For hierarchies starting with DATA_LIST, check parentDataListId matches root parent
                                if (rootParentId && (isParentDataList || isPartOfDataListChain || isPartOfHierarchy)) {
                                    const matches = config.parentDataListId === rootParentId;
                                    return matches;
                                }

                                // For SINGLE_SELECT root (not part of DATA_LIST chain), parentDataListId should be null
                                if (isParentSingleSelect && !isPartOfDataListChain) {
                                    const matches = config.parentDataListId === null || config.parentDataListId === undefined;
                                    return matches;
                                }

                                // Default: parentDataListId is null
                                return config.parentDataListId === null;
                            }
                        );

                        // Fallback: Match by attributeId only regardless of parentDataListId
                        // This handles edge cases where the structure is different than expected
                        if (!existingChildConfig) {
                            existingChildConfig = existingChildData.find(
                                (config: any) => {
                                    const matches = config.attributeId === childField.id && config.roleId === roleId;
                                    return matches;
                                }
                            );
                        }


                        if (existingChildConfig && existingChildConfig.value) {
                            let childValue = existingChildConfig.value;
                            // For Select fields, ensure value is string
                            if (childField.attributeType?.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN ||
                                childField.attributeType?.id === CustomAttributeTypeEnum.DATA_LIST) {
                                childValue = childValue?.toString() || '';
                            }

                            dispatch(setRoleFieldValueComplex({
                                key: roleId.toString(),
                                fieldName: childField.combinedAttributeName,
                                value: childValue,
                            }));

                            // RECURSIVE: If this child field can have children and has a value,
                            // recursively load its children (grandchildren of original parent)
                            // Check for: DATA_LIST, SINGLE_SELECT, hasChildAttribute, linkedAttributeId, or childAttributeList
                            const childCanHaveChildren =
                                childField.attributeType?.id === CustomAttributeTypeEnum.DATA_LIST ||
                                childField.attributeType?.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN ||
                                childField.hasChildAttribute ||
                                childField.linkedAttributeId !== null ||
                                (childField.childAttributeList && childField.childAttributeList.length > 0);

                            if (childCanHaveChildren && childValue) {
                                // Use setTimeout to allow state to update first
                                setTimeout(async () => {
                                    try {
                                        await invokeChildMethod(
                                            childValue,
                                            childField,
                                            roleId,
                                            roleName,
                                            true, // setValue = true to load existing values
                                            existingChildData, // Pass the same child configs for deeper levels
                                            parentFieldWithLookups // IMPORTANT: Pass the ROOT parent field to preserve parentDataListId matching
                                        );
                                    } catch (e) {
                                        console.error(`Error loading grandchild fields:`, e);
                                    }
                                }, 50);
                            }
                        }
                    });
                }

                // Increment child field version to force remount of child RoleFieldForm components
                setChildFieldVersion(prev => ({
                    ...prev,
                    [roleKey]: (prev[roleKey] || 0) + 1
                }));
            }
        } catch (error) {
            console.error('Error fetching child fields:', error);
        } finally {
            setLoadingChildFieldKey(null);
        }
    };

    // Initialize component when modal opens
    useEffect(() => {
        if (open && attributeId) {
            initializeComponent();
        }

        // Cleanup on unmount or close
        return () => {
            if (!open) {
                dispatch(resetFieldAccessState());
            }
        };
    }, [open, attributeId, dispatch]);

    // Fetch lookup values for a single field (no children)
    const fetchFieldLookups = async (field: CustomAttribute): Promise<CustomAttribute> => {
        setIsLoadingLookupValues(true);

        try {
            let updatedField = { ...field };

            // Check if this is a special owner field (systemAttribute 34, 35, or 65)
            const isOwnerField = field.systemAttribute?.id === 34 ||
                field.systemAttribute?.id === 35 ||
                field.systemAttribute?.id === 65;

            if (isOwnerField) {
                // Fetch owner options from userService
                try {
                    const ownerResponse = await userService.getOwner(projectId, moduleType);
                    if (ownerResponse.statusCode === 200 && ownerResponse.responseData) {
                        // Transform the response to match lookupValues format
                        updatedField.lookupValues = ownerResponse.responseData.map((owner: any) => ({
                            id: owner.id || owner.userId,
                            lookupValue: owner.name || owner.userName || owner.fullName,
                        }));
                    }
                } catch (error) {
                    console.error(`Error fetching owner options for field ${field.id}:`, error);
                }
            } else if (field.linkedAttributeModuleId === SystemAttributeEnum.DATA_LIST_MODULE) {
                // Special case: linkedAttributeModuleId is 6 - fetch from custom module 6
                try {
                    const customFieldsResponse = await settingsService.getFieldDetails(projectId, SystemAttributeEnum.DATA_LIST_MODULE);
                    if (customFieldsResponse.statusCode === 200 && customFieldsResponse.responseData?.length) {
                        // Find the field with matching parentDataListId
                        const matchingField = customFieldsResponse.responseData.find(
                            (res: CustomAttribute) => res.id === field.parentDataListId
                        );
                        if (matchingField) {
                            updatedField.childAttributeList = matchingField.childAttributeList;
                        }
                    }
                    // Also fetch lookup values for the DataList
                    const dataListResponse = await settingsService.getDataListLookupValues(field.id);
                    if (dataListResponse.statusCode === 200 && dataListResponse.responseData) {
                        updatedField.lookupValues = dataListResponse.responseData.lookupValues || [];
                        updatedField.parentLookupValues = dataListResponse.responseData.parentLookupValues || [];
                        updatedField.parentRelationList = dataListResponse.responseData.parentRelationList || [];
                    }
                } catch (error) {
                    console.error(`Error fetching custom module 6 fields for field ${field.id}:`, error);
                }
            } else if (field.attributeType.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN ||
                field.attributeType.id === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
                // For SINGLE_SELECT and MULTI_SELECT fields, always use getAttribLookup
                try {
                    const lookupsResponse = await settingsService.getAttribLookup(field.id);
                    if (lookupsResponse.statusCode === 200) {
                        updatedField.lookupValues = lookupsResponse.responseData || [];
                    }
                } catch (error) {
                    console.error(`Error fetching lookups for field ${field.id}:`, error);
                }
            } else if (field.attributeType.id === CustomAttributeTypeEnum.DATA_LIST) {
                try {
                    const dataListResponse = await settingsService.getDataListLookupValues(field.id);
                    if (dataListResponse.statusCode === 200 && dataListResponse.responseData) {
                        updatedField.lookupValues = dataListResponse.responseData.lookupValues || [];
                        updatedField.parentLookupValues = dataListResponse.responseData.parentLookupValues || [];
                        updatedField.parentRelationList = dataListResponse.responseData.parentRelationList || [];
                    }
                } catch (error) {
                    console.error(`Error fetching DATA_LIST lookup values for field ${field.id}:`, error);
                }
            } else if (field.attributeType.id === CustomAttributeTypeEnum.DATE ||
                field.attributeType.id === CustomAttributeTypeEnum.DATE_TIME) {
                try {
                    const dateAttributeResponse = await settingsService.getCustomDateAttribute(field.id);
                    if (dateAttributeResponse.statusCode === 200) {
                        (updatedField as any).customDateAttribute = dateAttributeResponse.responseData || null;
                    }
                } catch (error) {
                    console.error(`Error fetching custom date attribute for field ${field.id}:`, error);
                }
            }

            return updatedField;
        } finally {
            setIsLoadingLookupValues(false);
        }
    };

    const initializeComponent = async () => {
        dispatch(setLoading(true));
        try {
            // Fetch all data needed for this component
            const [fieldsResponse, visibilityResponse, rolesResponse] = await Promise.all([
                settingsService.getFieldDetails(projectId, moduleType),
                settingsService.getFieldVisibilitySettings(projectId, moduleType, false),
                settingsService.getUserRoles(projectId),
            ]);

            // Get all fields
            const allFields = fieldsResponse?.responseData || [];

            // Get existing visibility configs for this attribute (can have multiple - one per role)
            const visibilityConfigs = visibilityResponse?.responseData || [];
            const existingFieldVisibilityConfigs = visibilityConfigs.filter(
                (config: FieldVisibilitySetting) => config.attributeId === attributeId
            );

            // Also get all visibility configs (including child fields) for loading existing child values
            // Child fields have parentDataListId set to the parent DATA_LIST's id
            const allFieldVisibilityConfigs = visibilityConfigs;

            // Find the selected field
            const currentField = allFields.find((f: CustomAttribute) => f.id === attributeId);

            if (!currentField) {
                enqueueSnackbar('Field not found', { variant: 'error' });
                onClose();
                return;
            }

            // Process user roles
            if (rolesResponse.statusCode === 200) {
                const activeRoles = rolesResponse.responseData.filter(
                    (role: UserRoleData) => role.active === 1
                );
                dispatch(setUserRoles(activeRoles));

                // Fetch lookup values for the current field (just the parent, no children)
                // This also fetches childAttributeList for linkedAttributeModuleId === 6
                const fieldWithLookups = await fetchFieldLookups(currentField);

                // Store selected field in Redux (with enriched data - lookups, childAttributeList)
                dispatch(setSelectedField(fieldWithLookups));

                // Collect roles that need child fields to be loaded
                const rolesWithChildFieldsToLoad: Array<{
                    role: UserRoleData;
                    value: any;
                    field: CustomAttribute;
                }> = [];

                // Get the visibility config object that contains fieldVisibilityConfig array
                const roleVisibilityConfig = existingFieldVisibilityConfigs.find(
                    (config: any) => config.attributeId === currentField.id
                );

                // Initialize visibility for each role using props data
                activeRoles.forEach((role: UserRoleData) => {
                    const key = `${role.roleId}-${currentField.id}`;

                    // Find the visibility config for this specific role from fieldVisibilityConfig array
                    const roleConfig = roleVisibilityConfig?.fieldVisibilityConfig?.find(
                        (config: any) => config.roleId === role.roleId
                    );

                    // Check if this specific role has visibility settings for this attribute
                    // Default to '3' (Allow Edit) if no config found
                    const visibility = roleConfig ? roleConfig.fieldVisibility.toString() : '3';

                    dispatch(
                        setRoleVisibility({
                            key,
                            visibility,
                        })
                    );

                    // If not "Allow Edit" (3), populate existing values BEFORE setting attributes
                    // This ensures the value is available when the component renders
                    if (visibility !== '3' && roleConfig && roleConfig.value) {
                        try {
                            // Try to parse as JSON first, if it fails, use the value as-is (it's already a string)
                            let value = roleConfig.value;
                            try {
                                value = JSON.parse(roleConfig.value);
                            } catch {
                                // If JSON parse fails, it's already a plain string (like comma-separated values)
                                value = roleConfig.value;
                            }

                            // For Select/DataList fields, ensure value is stored as string to match option values
                            if (currentField.attributeType.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN ||
                                currentField.attributeType.id === CustomAttributeTypeEnum.DATA_LIST) {
                                value = value?.toString() || '';
                            }

                            // For file upload types, deserialize comma-separated paths to DocumentFile objects
                            value = deserializeFieldValue(value, currentField.attributeType.id, currentField.maxImagesAllowed);

                            // Store value using the field's combinedAttributeName
                            dispatch(
                                setRoleFieldValueComplex({
                                    key: role.roleId.toString(),
                                    fieldName: currentField.combinedAttributeName,
                                    value,
                                })
                            );

                            // If field can have child attributes and has a value, queue it for child fields loading
                            // Check for: DATA_LIST (with addDataListDependentFields=1), SINGLE_SELECT, hasChildAttribute, linkedAttributeId, or childAttributeList
                            const isDataListWithChildren = currentField.attributeType.id === CustomAttributeTypeEnum.DATA_LIST &&
                                currentField.addDataListDependentFields === 1;
                            const canHaveChildren =
                                isDataListWithChildren ||
                                currentField.attributeType.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN ||
                                currentField.hasChildAttribute ||
                                currentField.linkedAttributeId !== null ||
                                (currentField.childAttributeList && currentField.childAttributeList.length > 0);

                            if (canHaveChildren && value) {
                                rolesWithChildFieldsToLoad.push({
                                    role,
                                    value,
                                    field: currentField,
                                });
                            }
                        } catch (e) {
                            console.error('Error parsing existing values:', e);
                        }
                    }

                    // Set field with lookups for this role (just the parent field)
                    // This is done AFTER setting the value so the component renders with the correct initial value
                    dispatch(
                        setCustomAttributesListForRole({
                            key,
                            attributes: [fieldWithLookups],
                        })
                    );
                });

                // Load child fields for roles that have existing values with parent having child attributes
                if (rolesWithChildFieldsToLoad.length > 0) {
                    // Extract ALL child/descendant field visibility configs from API response
                    // This includes not just first-level children, but also grandchildren, great-grandchildren, etc.
                    // For DATA_LIST: Child fields have parentDataListId set (could be any level in hierarchy)
                    // For SINGLE_SELECT: Child fields are linked via the parent's linkedAttributeId
                    const childFieldConfigs: any[] = [];
                    const isParentSingleSelect = currentField.attributeType.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN;

                    // Get all child attribute IDs from the parent field for SINGLE_SELECT
                    const singleSelectChildIds = new Set<number>();
                    if (isParentSingleSelect && currentField.childAttributeList) {
                        currentField.childAttributeList.forEach((child: CustomAttribute) => {
                            singleSelectChildIds.add(child.id);
                        });
                    }

                    allFieldVisibilityConfigs.forEach((config: any) => {
                        // Each config has fieldVisibilityConfig array
                        if (config.fieldVisibilityConfig) {
                            config.fieldVisibilityConfig.forEach((fvc: any) => {
                                // For DATA_LIST hierarchies: Include ALL configs that have parentDataListId set
                                // This captures children at all levels (first-level children have parentDataListId = attributeId,
                                // grandchildren have parentDataListId = first-level child's id, etc.)
                                const isDataListDescendant = fvc.parentDataListId !== null && fvc.parentDataListId !== undefined;

                                // For SINGLE_SELECT root parent: Include configs where attributeId is in childAttributeList
                                // OR where the config's attributeId differs from parent and parentDataListId is null
                                const isSingleSelectChild = isParentSingleSelect && (
                                    singleSelectChildIds.has(config.attributeId) ||
                                    (config.attributeId !== attributeId && fvc.parentDataListId === null)
                                );

                                // For any hierarchical field (DATA_LIST or SINGLE_SELECT with children):
                                // Also include configs for any attribute that differs from the root parent
                                // This catches SINGLE_SELECT children of SINGLE_SELECT parents in mixed hierarchies
                                // (e.g., DATA_LIST -> SINGLE_SELECT -> SINGLE_SELECT)
                                const isOtherDescendant = config.attributeId !== attributeId;

                                if (isDataListDescendant || isSingleSelectChild || isOtherDescendant) {
                                    childFieldConfigs.push({
                                        attributeId: config.attributeId,
                                        roleId: fvc.roleId,
                                        parentDataListId: fvc.parentDataListId,
                                        value: fvc.value,
                                        fieldVisibility: fvc.fieldVisibility,
                                    });
                                }
                            });
                        }
                    });

                    // Use setTimeout to allow state to update first, then load child fields
                    // Pass the parent field (fieldWithLookups) directly to avoid stale closure issue
                    setTimeout(async () => {
                        for (const { role, value, field } of rolesWithChildFieldsToLoad) {
                            try {
                                // Pass existingChildData and parentField to invokeChildMethod so it can set child values
                                await invokeChildMethod(value, field, role.roleId, role.roleName, true, childFieldConfigs, fieldWithLookups);
                            } catch (e) {
                                console.error(`Error loading child fields for role ${role.roleName}:`, e);
                            }
                        }
                    }, 100);
                }
            }
        } catch (error) {
            console.error('Error initializing component:', error);
            enqueueSnackbar('Failed to initialize field access settings', { variant: 'error' });
        } finally {
            dispatch(setLoading(false));
        }
    };

    const handleVisibilityChange = (roleId: number, visibility: string) => {
        if (!attributeId || !selectedField) return;
        const key = `${roleId}-${attributeId}`;

        dispatch(
            setRoleVisibility({
                key,
                visibility,
            })
        );

        // Clear field values from Redux store
        dispatch(clearRoleFieldValuesComplex(roleId.toString()));

        // Reset attributes list to only contain the parent field (remove all child fields from DOM)
        // This ensures a clean slate when visibility changes
        dispatch(
            setCustomAttributesListForRole({
                key,
                attributes: [selectedField],
            })
        );

        // Increment form version to force re-mount of RoleFieldForm components
        // This ensures the form resets to empty/default values when visibility changes
        setFormVersion(prev => ({
            ...prev,
            [key]: (prev[key] || 0) + 1
        }));
    };

    const handleFieldValueChange = (roleId: number, fieldName: string, value: any) => {
        // Store value using roleId as key and fieldName as sub-key
        dispatch(
            setRoleFieldValueComplex({
                key: roleId.toString(),
                fieldName,
                value,
            })
        );
    };

    const handleSave = async () => {
        if (!attributeId || !selectedField) return;

        // Trigger validation on all form refs and collect results
        const validationPromises: Promise<boolean>[] = [];
        formRefsMap.current.forEach((formRef) => {
            if (formRef && formRef.triggerValidation) {
                validationPromises.push(formRef.triggerValidation());
            }
        });

        // Wait for all validations to complete
        const validationResults = await Promise.all(validationPromises);

        // Check if any validation failed (built-in form validation will show errors on the fields)
        const hasValidationErrors = validationResults.some(isValid => !isValid);

        if (hasValidationErrors) {
            // Don't save - the built-in form validation will show red borders and error messages
            return;
        }

        dispatch(setSaving(true));
        try {
            const fieldVisibilityConfig: Array<{
                projectId: number;
                roleId: number;
                moduleType: number;
                fieldVisibility: any;
                attributeId: number;
                parentDataListId?: number | null;
                value?: any | null;
            }> = [];

            const isDataListField = selectedField.attributeType.id === CustomAttributeTypeEnum.DATA_LIST;
            const isSingleSelectWithChildren = selectedField.attributeType.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN && selectedField.hasChildAttribute;
            const hasChildFields = isDataListField || isSingleSelectWithChildren;

            userRoles.forEach((role) => {
                const key = `${role.roleId}-${attributeId}`;
                const visibility = roleVisibility[key] || '3';

                // Convert visibility to number
                const visibilityNum = parseInt(visibility.toString());

                // Parent field setting (parentDataListId is always null for the parent field)
                const setting: {
                    projectId: number;
                    roleId: number;
                    moduleType: number;
                    fieldVisibility: any;
                    attributeId: number;
                    parentDataListId?: number | null;
                    value?: any | null;
                } = {
                    projectId: projectId,
                    roleId: role.roleId,
                    moduleType: moduleType,
                    fieldVisibility: visibility.toString(),
                    attributeId: attributeId,
                    parentDataListId: null,
                    value: null
                };

                fieldVisibilityConfig.push(setting);

                // Get the value for the parent field from roleFieldValuesComplex
                const roleValues = roleFieldValuesComplex[role.roleId.toString()] || {};

                // Include field values only for Hidden (1) and View Only (2), not for Allow Edit (3)
                if (visibilityNum === 1 || visibilityNum === 2) {
                    const value = roleValues[selectedField.combinedAttributeName];

                    // Serialize value for API - handle file uploads (DocumentFile objects)
                    const serializedValue = serializeFieldValue(value, selectedField.attributeType.id);

                    // Send the value directly (it's already a string or comma-separated for multi-select)
                    if (serializedValue !== undefined && serializedValue !== null && serializedValue !== '') {
                        setting.value = serializedValue;
                    }
                }

                // For fields with child attributes, include ALL child attributes for ALL roles
                // Use selectedField.childAttributeList as the source of truth for all possible children
                if (selectedField.childAttributeList?.length > 0) {
                    const roleAttributes = customAttributesList[key] || [];
                    // Get visible child attributes (skip parent field at index 0)
                    const visibleChildAttributes = roleAttributes.slice(1);
                    // Track which child attribute IDs have been processed
                    const processedChildIds = new Set<number>();

                    // First, process visible child attributes (they have correct combinedAttributeName for value lookup)
                    visibleChildAttributes.forEach((childField: CustomAttribute) => {
                        const childValue = roleValues[childField.combinedAttributeName];
                        const serializedChildValue = serializeFieldValue(childValue, childField.attributeType?.id);

                        // Only include value for Hidden (1) and View Only (2)
                        const childValueToSend = (visibilityNum === 1 || visibilityNum === 2) &&
                            serializedChildValue !== undefined && serializedChildValue !== null && serializedChildValue !== ''
                            ? serializedChildValue
                            : null;

                        if(childValueToSend !== undefined || childValueToSend !== null || childValueToSend !== '') {
                            const childSetting = {
                                projectId: projectId,
                                roleId: role.roleId,
                                moduleType: moduleType,
                                fieldVisibility: visibility.toString(),
                                attributeId: childField.id,
                                parentDataListId: isDataListField ? selectedField.id : null,
                                value: childValueToSend
                            };
                            fieldVisibilityConfig.push(childSetting);
                        }
                        processedChildIds.add(childField.id);
                    });

                    // Then, add remaining child attributes from selectedField.childAttributeList that weren't visible
                    selectedField.childAttributeList.forEach((childField: CustomAttribute) => {
                        if (!processedChildIds.has(childField.id) && !isDataListField) {
                            const childSetting = {
                                projectId: projectId,
                                roleId: role.roleId,
                                moduleType: moduleType,
                                fieldVisibility: visibility.toString(),
                                attributeId: childField.id,
                                parentDataListId: isDataListField ? selectedField.id : null,
                                value: null // No value for non-visible child attributes
                            };
                            fieldVisibilityConfig.push(childSetting);
                        }
                    });
                }

                // For DATA_LIST with addDataListDependentFields=1 and visibility 1 (Hidden) or 2 (View Only),
                // add an intermediate child entry with parentDataListId and value=null
                // This is needed even when there are no visible child fields
                if (isDataListField &&
                    selectedField.addDataListDependentFields === 0 &&
                    (visibilityNum === 1 || visibilityNum === 2)) {

                    // Check if we already added child entries for this role
                    const existingChildEntries = fieldVisibilityConfig.filter(
                        config => config.roleId === role.roleId && config.parentDataListId === selectedField.id
                    );

                    // If no child entries exist, add an intermediate entry using first child attribute ID
                    if (existingChildEntries.length === 0 && selectedField.childAttributeList?.length > 0) {
                        // Use the first child attribute's ID from childAttributeList
                        const firstChildAttribute = selectedField.childAttributeList[0];
                        const intermediateChildSetting = {
                            projectId: projectId,
                            roleId: role.roleId,
                            moduleType: moduleType,
                            fieldVisibility: visibility.toString(),
                            attributeId: firstChildAttribute.id, // Use first child's attribute ID
                            parentDataListId: selectedField.id,
                            value: null
                        };
                        fieldVisibilityConfig.push(intermediateChildSetting);
                    }
                }


            });

            const payload = {
                projectId,
                moduleType,
                attributeId,
                attributeTypeId: selectedField.attributeType?.id || 1,
                fieldVisibilityConfig,
            };

            const response = await settingsService.saveFieldVisibilitySettings(payload);

            if (response.statusCode === 200) {
                enqueueSnackbar('Field access settings saved successfully', { variant: 'success' });
                if (onSuccess) {
                    onSuccess();
                }
                onClose();
            } else {
                throw new Error(response.message || 'Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving field access settings:', error);
            enqueueSnackbar('Failed to save field access settings', { variant: 'error' });
        } finally {
            dispatch(setSaving(false));
        }
    };

    const handelOnClose = () => {
        dispatch(resetFieldAccessState());
        onClose();
    }

    // Visibility Radio Component using RadioInput from input-fields
    const VisibilityRadio: React.FC<{ roleId: number }> = ({ roleId }) => {
        if (!attributeId) return null;
        const key = `${roleId}-${attributeId}`;
        const currentVisibility = roleVisibility[key] || '3';

        const { control, reset } = useForm({
            defaultValues: {
                [`visibility_${roleId}`]: currentVisibility,
            },
        });

        // Reset form when roleVisibility changes (e.g., when existing data is loaded)
        useEffect(() => {
            reset({ [`visibility_${roleId}`]: currentVisibility });
        }, [currentVisibility, reset, roleId]);

        const options = [
            { value: '1', label: 'Hidden' },
            { value: '2', label: 'View Only' },
            { value: '3', label: 'Allow Edit' },
        ];

        return (
            <RadioInput
                name={`visibility_${roleId}`}
                control={control}
                options={options}
                onChange={(value) => handleVisibilityChange(roleId, value)}
            />
        );
    };

    if (!open) return null;

    return (
        <TwinModal
            open={open}
            onClose={handelOnClose}
            modalClassName={"max-w-3xl"}
            closeOnOutsideClick={false}
            allowBorder={true}
            mainHeightClassName="min-h-[40vh] max-h-[calc(100vh-180px)]"
            header={<h3 className="text-base font-semibold text-[#3F4254]">Access</h3>}
            footer={
                <>
                    <Button
                        className="bg-[#E4E6EF] hover:bg-gray-300 text-[#3F4254] rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Cancel"
                        type="button"
                        onClick={handelOnClose}
                        disabled={isSaving || uploadingFileKey !== null}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="bg-[#3699FF] hover:bg-blue-600 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Save"
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || isLoading || uploadingFileKey !== null}
                    >
                        {uploadingFileKey !== null ? 'Uploading...' : 'Save'}
                    </Button>
                </>}
        >
            {isLoading ? (
                <Spinner />
            ) : (
                <div className="flex flex-col space-y-4">
                    {userRoles.map((role, index) => {
                        const key = attributeId ? `${role.roleId}-${attributeId}` : '';
                        return (
                            <div key={role.roleId} className='flex flex-col space-y-4'>
                                {/* Role Header with Radio Buttons */}
                                <div className="flex items-center justify-between h-[54px]">
                                    <div className="w-[20%]"><h4 className="text-base font-small text-gray-700">{role.roleName}</h4></div>
                                    <VisibilityRadio roleId={role.roleId} />
                                    <div></div>
                                </div>

                                {/* Default Value Section - Show for Hidden (1) and View Only (2), NOT for Allow Edit (3) */}
                                {/* Only show for field types that have a valid form component (not empty/blank) */}
                                {roleVisibility[key] !== '3' && (customAttributesList[key] || []).map((field, fieldIndex) => {
                                    // Check if this field type has a valid renderer (not returning empty fragment)
                                    // Owner fields (systemAttribute 34, 35, 65) are rendered as Select
                                    const isOwnerField = field.systemAttribute?.id === 34 ||
                                        field.systemAttribute?.id === 35 ||
                                        field.systemAttribute?.id === 65;

                                    const isLinkedField = field.linkedAttributeId ? field.linkedAttributeId !==null && field.linkedAttributeId!==0 : false;

                                    // Field types that have valid form components in RoleFieldForm
                                    const fieldTypesWithValidRenderer = [
                                        CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN,
                                        CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN,
                                        CustomAttributeTypeEnum.DATE,
                                        CustomAttributeTypeEnum.DATE_TIME,
                                        CustomAttributeTypeEnum.IMAGE,
                                        CustomAttributeTypeEnum.RADIO,
                                        CustomAttributeTypeEnum.TEXT_SINGLE_LINE,
                                        CustomAttributeTypeEnum.QR_CODE_SCANNER,
                                        CustomAttributeTypeEnum.NUMERIC,
                                        CustomAttributeTypeEnum.TEXT_MULTI_LINE,
                                        CustomAttributeTypeEnum.EMAIL,
                                        CustomAttributeTypeEnum.DOCUMENT_UPLOAD,
                                        CustomAttributeTypeEnum.AUDIO_VIDEO,
                                        CustomAttributeTypeEnum.REFERENCE_DOCUMENTS,
                                        CustomAttributeTypeEnum.DATA_LIST,
                                        CustomAttributeTypeEnum.TIME_DURATION,
                                    ];

                                    const hasValidRenderer = isOwnerField || fieldTypesWithValidRenderer.includes(field.attributeType.id);

                                    // Skip rendering if this field type doesn't have a valid form component
                                    if (!hasValidRenderer || isLinkedField) {
                                        return null;
                                    }

                                    // Get the value for this specific field from roleFieldValuesComplex
                                    const roleValues = roleFieldValuesComplex[role.roleId.toString()] || {};
                                    const fieldCurrentValue = roleValues[field.combinedAttributeName];

                                    // Include formVersion in key to force remount when visibility changes (resets default value)
                                    // For child fields (fieldIndex > 0), also include childFieldVersion when parent changes
                                    const currentFormVersion = formVersion[key] || 0;
                                    const fieldVersion = fieldIndex > 0 ? (childFieldVersion[key] || 0) : 0;
                                    const fieldKey = `${key}_${field.combinedAttributeName}_fv${currentFormVersion}_v${fieldVersion}`;

                                    // Check if this specific field is loading (for showing spinner only on the field being changed)
                                    const isFieldLoading = loadingChildFieldKey === `${role.roleId}-${field.combinedAttributeName}`;

                                    return (
                                        <div key={fieldKey} className="flex items-center justify-between pl-2 ">
                                            <div className="w-[35%]">
                                                <label className="text-sm text-gray-700">
                                                    {fieldIndex === 0 ? 'Default Value' : field.attributeName} {field.mandatoryFlag == 1 ? <span className="text-[#F64E60] ml-1">*</span> : ""}
                                                </label>
                                            </div>
                                            <div className="flex-1 px-4">
                                                <RoleFieldForm
                                                    key={fieldKey}
                                                    ref={(formRef) => {
                                                        if (formRef) {
                                                            formRefsMap.current.set(fieldKey, formRef);
                                                        } else {
                                                            formRefsMap.current.delete(fieldKey);
                                                        }
                                                    }}
                                                    role={role}
                                                    field={field}
                                                    currentValue={fieldCurrentValue}
                                                    onFieldValueChange={handleFieldValueChange}
                                                    onInvokeChildMethod={invokeChildMethod}
                                                    onFileUpload={handleFileUpload}
                                                    onFileRemove={handleFileRemove}
                                                    isLoading={isFieldLoading}
                                                    isLoadingLookupValues={isLoadingLookupValues}
                                                    isUploadingFile={uploadingFileKey === `${role.roleId}-${field.combinedAttributeName}`}
                                                    projectId={projectId}
                                                    moduleType={moduleType}
                                                />
                                            </div>
                                            <div></div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            )}
        </TwinModal>
    );
};

export default ManageFieldAccess;
