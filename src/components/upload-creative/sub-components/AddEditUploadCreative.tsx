import Modal from "@/components/common/Modal";
import { Button } from "@/components/ui/tailwind/Button";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useForm, Control } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import Form from "@/components/common/Form";
import FormField from "@/components/common/input-fields/FormField";
import Select from "@/components/common/input-fields/Select";
import MultiSelect from "@/components/common/input-fields/MultiSelect";
import DateTimeInput from "@/components/common/input-fields/DateTimeInput";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tailwind/tabs";
import AddActionButton from "@/components/common/buttons/action-button/AddActionButton";
import RemoveActionButton from "@/components/common/buttons/action-button/RemoveActionButton";
import CarouselTab from "../tabs/CarouselTab";
import BannerTab from "../tabs/BannerTab";
import {
    setVisibleTo,
    setSelectedRole,
    setCreativeStatus,
    setVisibilityPeriod,
    setActiveTab,
    addFilter,
    updateFilter,
    removeFilter,
    resetCreative,
    initializeCreativeState,
    loadCreativeForEdit,
} from '@/store/uploadCreativeSlice';
import generalSettingsService from "@/lib/services/generalSettingsService";
import settingsService from "@/lib/services/settingsService";
import uploadCreativeService, { SaveUploadCreativePayload, UploadCreativeDetail, CreativeTypeEnum, resolveCreativeType } from "@/lib/services/uploadCreativeService";
import { SystemAttributeEnum } from "@/lib/constants/SystemAttributeEnum.constant";
import { CustomAttributeTypeEnum } from "@/lib/constants/CustomAttributeTypeEnum.constant";
import { getProjectId } from "@/lib/storage/sharedStorage";
import {
    buildFilterFieldKey,
    buildFilterFieldOptions,
    parseFilterFieldKey,
    FilterFieldMeta,
} from "./filterFields";
import styles from "../uploadCreative.module.css";

const DEBUG_MODE = process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true';

interface AddEditUploadCreativeModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    creativeId?: string | number;
    preloadedData?: UploadCreativeDetail | null;
}

interface CreativeFormData {
    visibleTo: string;
    selectedRole: string;
    status: string;
    visibilityBehaviour: string;
    [key: string]: any;
}

interface VisibleToOption {
    value: string;
    label: string;
}

interface RoleOption {
    value: string;
    label: string;
}

const statusOptions = [
    { value: '1', label: 'Active' },
    { value: '0', label: 'Inactive' },
];

// Form defaults, shared by useForm and every reset() call
const defaultFormValues = {
    visibleTo: '',
    selectedRole: '',
    status: '1',
    visibilityBehaviour: '',
    startDateTime: '',
    endDateTime: '',
};

/**
 * DateTimeInput stores "YYYY-MM-DD HH:mm". A bare space is not valid ISO 8601, so
 * normalise it before parsing rather than relying on engine-specific leniency.
 */
const parseScheduleValue = (value?: string | null): Date | null => {
    if (!value) return null;
    const parsed = new Date(value.replace(' ', 'T'));
    return isNaN(parsed.getTime()) ? null : parsed;
};

const DATE_TIME_MINUTES = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/;

/**
 * The current minute as DateTimeInput holds it, "YYYY-MM-DD HH:mm" — the earliest a new
 * schedule may begin. Floored to the minute because the picker has no seconds control, so
 * a boundary carrying seconds would reject the minute the user just picked.
 */
const currentMinuteValue = (): string => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

/**
 * Widen the picker's "YYYY-MM-DD HH:mm" to the API's 24-hour "YYYY-MM-DD HH:mm:ss".
 * The picker has no seconds control, so seconds are always sent as :00.
 */
const toApiDateTime = (value?: string | null): string | null => {
    if (!value) return null;
    const match = DATE_TIME_MINUTES.exec(value);
    return match ? `${match[1]} ${match[2]}:00` : null;
};

/**
 * Narrow the API's value back to what DateTimeInput can hold, dropping seconds and
 * accepting either "YYYY-MM-DD HH:mm:ss" or an ISO "T" separator.
 */
const fromApiDateTime = (value?: string | null): string => {
    if (!value) return '';
    const match = DATE_TIME_MINUTES.exec(value);
    return match ? `${match[1]} ${match[2]}` : '';
};

/**
 * Lookup rows fetched by attribute id do not always carry `isActive`, so an absent flag
 * is read as active and only an explicit 0 hides the value.
 */
const toValueOptions = (lookups: any[]): { value: string; label: string }[] => (
    (lookups ?? [])
        .filter((v: any) => v?.isActive !== 0)
        .map((v: any) => ({ value: String(v.id), label: v.lookupValue }))
);

// FilterRow component - uses useQuery to fetch lookup values for selected field
interface FilterRowProps {
    filter: { _trackingId: string; id: string | null; fieldId: string; fieldValue: string[] };
    index: number;
    totalFilters: number;
    control: Control<any>;
    fieldOptions: { value: string; label: string }[];
    /** Field data keyed by the option key, which for a child field pairs it with its data list. */
    fieldMetaMap: Record<string, FilterFieldMeta>;
    projectId: number | null;
    fieldsLoading?: boolean;
    onFieldChange: (trackingId: string, fieldId: string) => void;
    onValueChange: (trackingId: string, values: string[]) => void;
    onRemove: (trackingId: string) => void;
    onAdd: () => void;
}

const FilterRow: React.FC<FilterRowProps> = ({
    filter, index, totalFilters, control, fieldOptions, fieldMetaMap, projectId, fieldsLoading,
    onFieldChange, onValueChange, onRemove, onAdd,
}) => {
    // Get selected field metadata
    const selectedMeta = filter.fieldId ? fieldMetaMap[filter.fieldId] : null;
    const selectedField = selectedMeta?.field ?? null;
    const isOwnerField = selectedField?.attributeIdentifierName?.endsWith('.owner');
    const isDataListChild = !!selectedMeta && selectedMeta.parentDataListId !== null;
    const isDataListParent = selectedField?.attributeType?.id === CustomAttributeTypeEnum.DATA_LIST;
    // Kept as a scalar: a fresh [] fallback on every render would churn the memo below
    // and defeat MultiSelect's memoisation
    const hasEmbeddedLookups = (selectedField?.lookupValues?.length ?? 0) > 0;

    // Fetch users for owner fields (cached via react-query)
    const { data: usersData } = useQuery({
        queryKey: ['projectUsers', projectId],
        queryFn: () => generalSettingsService.getUsers(projectId!),
        enabled: !!filter.fieldId && isOwnerField && !!projectId,
    });

    // A child field's own lookup list, which is every value the field can hold. Chosen
    // deliberately over getChildAttributes, which narrows the list to whichever parent
    // value was picked — this filter is meant to stand on its own.
    const { data: childLookupData, isLoading: childLookupLoading } = useQuery({
        queryKey: ['attribLookup', selectedField?.id],
        queryFn: () => settingsService.getAttribLookup(Number(selectedField.id)),
        enabled: isDataListChild && selectedField?.id != null,
        staleTime: 5 * 60 * 1000,
    });

    // A DATA_LIST field can arrive without its values embedded, so fetch them on demand.
    const { data: dataListLookupData, isLoading: dataListLookupLoading } = useQuery({
        queryKey: ['dataListLookup', selectedField?.id],
        queryFn: () => settingsService.getDataListLookupValues(Number(selectedField.id)),
        enabled: isDataListParent && !hasEmbeddedLookups && selectedField?.id != null,
        staleTime: 5 * 60 * 1000,
    });

    const valueOptions = useMemo(() => {
        if (!filter.fieldId || !selectedField) return [];
        // Owner fields → show users
        if (isOwnerField) {
            if (!usersData?.responseData) return [];
            return usersData.responseData.map((u: any) => ({
                value: String(u.userId ?? u.id),
                label: u.name || u.userName || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
            }));
        }
        if (isDataListChild) {
            return toValueOptions(childLookupData?.responseData as any[]);
        }
        if (isDataListParent && !hasEmbeddedLookups) {
            return toValueOptions(dataListLookupData?.responseData?.lookupValues);
        }
        // Regular fields → use embedded lookupValues from getFormFields response
        return toValueOptions(selectedField.lookupValues);
    }, [
        filter.fieldId, selectedField, isOwnerField, usersData, isDataListChild,
        isDataListParent, hasEmbeddedLookups, childLookupData, dataListLookupData,
    ]);

    const valuesLoading = childLookupLoading || dataListLookupLoading;

    return (
        <div className="flex justify-between items-start">
            <div className="flex gap-3 w-[60%]">
                <div className="w-1/2">
                    <Select
                        name={`filterFieldId_${filter._trackingId}`}
                        control={control}
                        options={fieldOptions}
                        placeholder="Enter the Entity Field"
                        loading={fieldsLoading}
                        onChange={(value) => onFieldChange(filter._trackingId, value)}
                    />
                </div>
                <div className="w-1/2">
                    <MultiSelect
                        name={`filterFieldValue_${filter._trackingId}`}
                        control={control}
                        options={valueOptions}
                        // MultiSelect has no loading state, so say it in the placeholder
                        // rather than showing an empty list as though there were no values
                        placeholder={valuesLoading ? 'Loading values...' : 'Enter the Entity Field Value'}
                        showSelectAll={false}
                        onChange={(values) => onValueChange(filter._trackingId, values)}
                    />
                </div>
            </div>
            <div className="flex items-center gap-1 pt-1">
                {totalFilters > 1 && (
                    <RemoveActionButton
                        id={index}
                        onRemove={() => onRemove(filter._trackingId)}
                        className="!w-6 !h-6"
                    />
                )}
                {index === totalFilters - 1 && (
                    <AddActionButton
                        onAdd={onAdd}
                        className="!w-6 !h-6"
                    />
                )}
            </div>
        </div>
    );
};

const AddEditUploadCreativeModal: React.FC<AddEditUploadCreativeModalProps> = ({
    open,
    onClose,
    onSuccess,
    creativeId,
    preloadedData
}) => {
    const dispatch = useAppDispatch();
    const uploadCreative = useAppSelector((state) => state.uploadCreative);
    const { enqueueSnackbar } = useSnackbar();
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const [visibleToOptions, setVisibleToOptions] = useState<VisibleToOption[]>([]);
    const [visibleToLoading, setVisibleToLoading] = useState(false);
    const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
    const [rolesLoading, setRolesLoading] = useState(false);
    const [isFormSticky, setIsFormSticky] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const isEditMode = creativeId !== undefined && creativeId !== null;

    // Get projectId once
    const projectId = useMemo(() => {
        const pid = getProjectId();
        return pid ? Number(pid) : null;
    }, []);

    // React Hook Form setup
    const { control, handleSubmit, watch, reset, clearErrors, setValue, getValues, setError } = useForm<CreativeFormData>({
        defaultValues: defaultFormValues,
    });

    // Watch status (string - safe for useEffect deps)
    const watchedStatus = watch('status');

    // DateTimeInput has no onChange prop, so mirror these into Redux the same way
    // status is mirrored. Also feeds the end field's minDateTime.
    const watchedPeriodStart = watch('startDateTime');
    const watchedPeriodEnd = watch('endDateTime');

    // Determine moduleType for attribute filters based on visibleTo selection
    const filterModuleType = useMemo(() => {
        const v = uploadCreative.visibleTo;
        if (v === '2') return SystemAttributeEnum.COMPANY_MODULE;   // 2
        if (v === '1') return SystemAttributeEnum.CONTACT_MODULE;   // 1
        if (v === '3') return SystemAttributeEnum.OPPORTUNITY_MODULE; // 3
        return null;
    }, [uploadCreative.visibleTo]);

    // Fetch form fields (attributes) for the selected module type (cached via react-query)
    // staleTime: 5 minutes — reuse prefetched data from page without background refetch
    const { data: formFields = [], isLoading: fieldsLoading } = useQuery({
        queryKey: ['formFields', projectId, filterModuleType],
        queryFn: () => settingsService.getFormFields(projectId!, filterModuleType!),
        enabled: !!projectId && filterModuleType !== null,
        staleTime: 5 * 60 * 1000,
    });

    // A DATA_LIST field's child fields live in the data-list module and are not reliably
    // carried on the entity fields response, so fetch that module too and let the builder
    // take whichever source has them. Deliberately fetched alongside the entity fields
    // rather than after inspecting them: chaining the two would delay the field list past
    // the point where the edit path restores its saved filter rows.
    const { data: dataListMasters = [], isLoading: dataListMastersLoading } = useQuery({
        queryKey: ['dataListFields', projectId],
        queryFn: async () => {
            const response = await settingsService.getFieldDetails(projectId!, SystemAttributeEnum.DATA_LIST_MODULE);
            return response?.responseData ?? [];
        },
        enabled: !!projectId && filterModuleType !== null,
        staleTime: 5 * 60 * 1000,
    });

    // Entity dropdowns, DATA_LIST fields and their child fields, flattened into one list
    // so each can be filtered on independently of the others
    const { options: allFieldOptions, metaMap: fieldMetaMap } = useMemo(
        () => buildFilterFieldOptions(formFields, dataListMasters),
        [formFields, dataListMasters],
    );

    // The field list is only complete once the data-list module has answered too
    const filterFieldsLoading = fieldsLoading || dataListMastersLoading;

    // Reports whether the entity fields response carries data-list child fields itself or
    // whether they had to come from the data-list module, which is otherwise invisible.
    useEffect(() => {
        if (!DEBUG_MODE || !formFields.length) return;
        const dataListFields = formFields.filter(
            (f: any) => f.attributeType?.id === CustomAttributeTypeEnum.DATA_LIST,
        );
        if (!dataListFields.length) return;
        const withChildren = dataListFields.filter((f: any) => f.childAttributeList?.length);
        console.info(
            `[UploadCreative] getFormFields returned ${dataListFields.length} DATA_LIST field(s), ` +
            `${withChildren.length} of them carrying childAttributeList — ` +
            (withChildren.length === dataListFields.length
                ? 'the data-list module join is redundant and could be dropped.'
                : 'child fields are being joined from the data-list module.'),
        );
    }, [formFields]);

    // Get available field options for a specific filter row (excludes already-selected fields in other rows)
    const getAvailableFieldOptions = useCallback((currentTrackingId: string) => {
        const selectedFieldIds = uploadCreative.customerAttributeFilters
            .filter(f => f._trackingId !== currentTrackingId && f.fieldId)
            .map(f => f.fieldId);
        return allFieldOptions.filter(opt => !selectedFieldIds.includes(opt.value));
    }, [allFieldOptions, uploadCreative.customerAttributeFilters]);

    // Fetch Visible To options (entity types) using dynamic field names
    const fetchVisibleToOptions = useCallback(async () => {
        if (!projectId) return;

        setVisibleToLoading(true);
        try {
            const result = await settingsService.getdynamicFieldNames(projectId);
            const options: VisibleToOption[] = [
                { value: '4', label: 'User Roles' },
            ];

            if (result.statusCode === 200 && result.responseData) {
                result.responseData.forEach((row: { moduleId: number; pluralName: string; opportunityEnabled?: boolean }) => {
                    if (row.moduleId === SystemAttributeEnum.COMPANY_MODULE) {
                        options.push({ value: '2', label: row.pluralName || 'Customer' });
                    }
                    if (row.moduleId === SystemAttributeEnum.CONTACT_MODULE) {
                        options.push({ value: '1', label: row.pluralName || 'Contact' });
                    }
                    if (row.moduleId === SystemAttributeEnum.OPPORTUNITY_MODULE && row.opportunityEnabled) {
                        options.push({ value: '3', label: row.pluralName || 'Opportunity' });
                    }
                });
            }

            setVisibleToOptions(options);
        } catch (error) {
            console.error('Error fetching visible to options:', error);
            // Fallback options
            setVisibleToOptions([
                { value: '4', label: 'User Roles' },
                { value: '2', label: 'Customer' },
                { value: '1', label: 'Contact' },
                { value: '3', label: 'Opportunity' },
            ]);
        } finally {
            setVisibleToLoading(false);
        }
    }, [projectId]);

    // Fetch roles when User Roles entity type is selected
    const fetchRoles = useCallback(async () => {
        if (!projectId) return;

        setRolesLoading(true);
        try {
            const response = await generalSettingsService.getRoles(projectId);
            if (response?.responseData) {
                const options = response.responseData.map((role: any) => ({
                    value: String(role.roleId),
                    label: role.roleName,
                }));
                setRoleOptions(options);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
        } finally {
            setRolesLoading(false);
        }
    }, [projectId]);

    // Sync status with Redux store
    useEffect(() => {
        if (watchedStatus !== undefined) {
            dispatch(setCreativeStatus(watchedStatus));
        }
    }, [watchedStatus, dispatch]);

    // Sync the visibility schedule with Redux store
    useEffect(() => {
        dispatch(setVisibilityPeriod({
            start: watchedPeriodStart || '',
            end: watchedPeriodEnd || '',
        }));
    }, [watchedPeriodStart, watchedPeriodEnd, dispatch]);

    // Initialize state and fetch options when modal opens
    useEffect(() => {
        if (open) {
            dispatch(initializeCreativeState());
            fetchVisibleToOptions();
        }
    }, [open, dispatch, fetchVisibleToOptions]);

    // Fetch roles when User Roles is selected
    useEffect(() => {
        if (uploadCreative.visibleTo === '4') {
            fetchRoles();
        }
    }, [uploadCreative.visibleTo, fetchRoles]);

    // Load preloaded data into form when editing
    useEffect(() => {
        if (!open || !isEditMode || !preloadedData) return;

        const detail = preloadedData;

        // Opens on the section this creative configures. Falls back to whichever
        // section holds data for records saved before creativeType existed.
        const resolvedType = resolveCreativeType(detail);
        const isCarouselRecord = resolvedType === CreativeTypeEnum.CAROUSEL;

        // Rows arrive as the unified array (`items`, or `creativeItems` before the
        // rename) or, for records saved before the merge, as the split
        // carouselItems/bannerItems. Carousel rows may carry the file as either
        // fileUrl or the older imageUrl.
        const rawUnifiedRows = detail.items ?? detail.creativeItems ?? null;
        const unifiedRows = rawUnifiedRows
            ? [...rawUnifiedRows]
                .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                .map((item) => ({
                    id: item.id ? String(item.id) : null,
                    fileUrl: item.fileUrl || item.imageUrl || '',
                    url: item.url || '',
                }))
            : null;

        // Loud instead of silent: a shape the reader does not recognise otherwise just
        // opens an empty form. Logs the keys so the real field name is obvious.
        if (!unifiedRows && !detail.carouselItems?.length && !detail.bannerItems?.length) {
            console.warn(
                '[UploadCreative] No item rows found on getUploadCreativeById response. ' +
                'Expected one of: items, creativeItems, carouselItems, bannerItems. Got keys:',
                Object.keys(detail), detail,
            );
        } else if (unifiedRows?.some((row) => !row.fileUrl)) {
            console.warn(
                '[UploadCreative] Some item rows have no fileUrl/imageUrl. Row keys:',
                Object.keys(rawUnifiedRows?.[0] ?? {}), rawUnifiedRows,
            );
        }

        const mappedData = {
            visibleTo: String(detail.visibleTo),
            selectedRole: detail.selectedRole ? String(detail.selectedRole) : '',
            status: String(detail.status),
            activeTab: (isCarouselRecord ? 'carousel' : 'banner') as 'carousel' | 'banner',
            visibilityBehaviour: String(detail.visibilityBehaviour),
            startDateTime: fromApiDateTime(detail.startDateTime),
            endDateTime: fromApiDateTime(detail.endDateTime),
            customerAttributeFilters: detail.customAttributeFilters && detail.customAttributeFilters.length > 0
                ? detail.customAttributeFilters.map((f, i) => ({
                    _trackingId: `filter-${Date.now()}-${i}`,
                    id: f.id ? String(f.id) : null,
                    // Recompose the option key, so a saved child filter resolves to the
                    // same entry the field dropdown offers
                    fieldId: buildFilterFieldKey(f.fieldId, f.parentDataListId),
                    fieldValue: f.fieldValue || [],
                }))
                : [{ _trackingId: `filter-${Date.now()}`, id: null, fieldId: '', fieldValue: [] }],
            carouselItems: (unifiedRows
                ? (isCarouselRecord ? unifiedRows : [])
                : [...(detail.carouselItems || [])]
                    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                    .map((c) => ({ id: c.id ? String(c.id) : null, fileUrl: c.imageUrl || '', url: c.url || '' }))
            ).map((c, i) => ({
                _trackingId: `carousel-${Date.now()}-${i}`,
                id: c.id,
                imageUrl: c.fileUrl,
                url: c.url,
            })),
            bannerItems: (unifiedRows
                ? (isCarouselRecord ? [] : unifiedRows)
                : [...(detail.bannerItems || [])]
                    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                    .map((b) => ({ id: b.id ? String(b.id) : null, fileUrl: b.fileUrl || '', url: '' }))
            ).map((b, i) => ({
                _trackingId: `banner-${Date.now()}-${i}`,
                id: b.id,
                fileUrl: b.fileUrl,
            })),
        };

        dispatch(loadCreativeForEdit(mappedData));

        // Sync top-level form fields immediately
        setValue('visibleTo', mappedData.visibleTo);
        setValue('selectedRole', mappedData.selectedRole);
        setValue('status', mappedData.status);
        setValue('visibilityBehaviour', mappedData.visibilityBehaviour);
        setValue('startDateTime', mappedData.startDateTime);
        setValue('endDateTime', mappedData.endDateTime);

        // Defer dynamic field setValue calls to after re-render
        // (Controllers with new tracking IDs must mount first)
        setTimeout(() => {
            // Set filter form values
            mappedData.customerAttributeFilters.forEach((f) => {
                setValue(`filterFieldId_${f._trackingId}`, f.fieldId);
                setValue(`filterFieldValue_${f._trackingId}`, f.fieldValue);
            });

            // Set carousel form values (image + url)
            mappedData.carouselItems.forEach((c) => {
                if (c.imageUrl) {
                    const fileName = c.imageUrl.split('/').pop() || 'image';
                    setValue(`carouselImage_${c._trackingId}`, {
                        name: fileName,
                        size: 0,
                        type: 'image/png',
                        serverUrl: c.imageUrl,
                    });
                }
                if (c.url) {
                    setValue(`carouselUrl_${c._trackingId}`, c.url);
                }
            });

            // Set banner form values (file urls for UploadInput)
            mappedData.bannerItems.forEach((b) => {
                if (b.fileUrl) {
                    const fileName = b.fileUrl.split('/').pop() || 'file';
                    const isVideo = /\.(mp4|mov)$/i.test(fileName);
                    setValue(`bannerFile_${b._trackingId}`, {
                        name: fileName,
                        size: 0,
                        type: isVideo ? 'video/mp4' : 'image/png',
                        serverUrl: b.fileUrl,
                    });
                }
            });

            // Initialize change tracking after all values are set
            dispatch(initializeCreativeState());
        }, 100);
    }, [open, isEditMode, preloadedData, dispatch, setValue]);

    // The selected tab is the creative type — only its section is validated and saved
    const isCarouselType = uploadCreative.activeTab === 'carousel';

    // Handle tab change
    const handleTabChange = (newTab: string) => {
        dispatch(setActiveTab(newTab as 'carousel' | 'banner'));
    };

    const handleClose = () => {
        if (uploadCreative.hasUnsavedChanges) {
            setShowUnsavedDialog(true);
        } else {
            dispatch(resetCreative());
            reset(defaultFormValues);
            clearErrors();
            onClose();
        }
    };

    const handleCancel = () => {
        if (uploadCreative.hasUnsavedChanges) {
            setShowUnsavedDialog(true);
        } else {
            dispatch(resetCreative());
            reset(defaultFormValues);
            clearErrors();
            onClose();
        }
    };

    const onSubmit = async () => {
        if (!projectId) return;

        const formValues = getValues();
        let hasValidationError = false;

        // Validate customer attribute filters — optional, but if a field is selected then value is required
        if (showEntityFilters) {
            uploadCreative.customerAttributeFilters.forEach((filter) => {
                if (filter.fieldId && (!filter.fieldValue || filter.fieldValue.length === 0)) {
                    setError(`filterFieldValue_${filter._trackingId}`, { type: 'required', message: 'Value is required' });
                    hasValidationError = true;
                }
            });
        }

        // A creative configures exactly one section — validate the selected one and
        // ignore the other, whose rows are discarded on save.
        if (isCarouselType) {
            uploadCreative.carouselItems.forEach((item) => {
                const formFile = formValues[`carouselImage_${item._trackingId}`];
                if (!(formFile?.serverUrl || item.imageUrl)) {
                    setError(`carouselImage_${item._trackingId}`, { type: 'required', message: 'Upload file is required' });
                    hasValidationError = true;
                }
            });
        } else {
            uploadCreative.bannerItems.forEach((item) => {
                const formFile = formValues[`bannerFile_${item._trackingId}`];
                if (!(formFile?.serverUrl || item.fileUrl)) {
                    setError(`bannerFile_${item._trackingId}`, { type: 'required', message: 'Upload file is required' });
                    hasValidationError = true;
                }
            });
        }

        // Errors can only land on the active tab, so there is nothing to navigate to
        if (hasValidationError) return;

        setIsSaving(true);

        try {
            const payload: SaveUploadCreativePayload = {
                ...(isEditMode && creativeId ? { id: Number(creativeId) } : {}),
                creativeType: isCarouselType ? CreativeTypeEnum.CAROUSEL : CreativeTypeEnum.BANNER,
                visibleTo: Number(uploadCreative.visibleTo),
                selectedRole: uploadCreative.visibleTo === '4' && uploadCreative.selectedRole
                    ? Number(uploadCreative.selectedRole)
                    : null,
                status: Number(uploadCreative.status),
                visibilityBehaviour: Number(uploadCreative.visibilityBehaviour),
                // "YYYY-MM-DD HH:mm:ss"; null means unbounded on that end
                startDateTime: toApiDateTime(uploadCreative.startDateTime),
                endDateTime: toApiDateTime(uploadCreative.endDateTime),
                // The row's fieldId is the option key, which pairs a data-list child with
                // its data list. Split back into the two ids the API expects.
                customAttributeFilters: uploadCreative.customerAttributeFilters
                    .filter((f) => f.fieldId && f.fieldValue.length > 0)
                    .map((f) => {
                        const { fieldId, parentDataListId } = parseFilterFieldKey(f.fieldId);
                        return { fieldId, parentDataListId, fieldValue: f.fieldValue };
                    }),
                // Only the selected section's rows are sent, so the record is
                // normalised to a single type on every save. displayOrder is assigned
                // after filtering so it stays contiguous.
                items: (isCarouselType
                    ? uploadCreative.carouselItems.map((item) => ({
                        id: item.id ? Number(item.id) : null,
                        fileUrl: formValues[`carouselImage_${item._trackingId}`]?.serverUrl || item.imageUrl || '',
                        url: item.url || '',
                    }))
                    : uploadCreative.bannerItems.map((item) => ({
                        id: item.id ? Number(item.id) : null,
                        fileUrl: formValues[`bannerFile_${item._trackingId}`]?.serverUrl || item.fileUrl || '',
                        // Banner rows have no click-through link
                        url: '',
                    }))
                )
                    .filter((item) => item.fileUrl)
                    .map((item, index) => ({ ...item, displayOrder: index + 1 })),
            };

            const response = await uploadCreativeService.saveUploadCreative(projectId, payload);

            if (response.message && response.message.toLowerCase().includes('already exists')) {
                enqueueSnackbar(response.message, { variant: 'error' });
            } else {
                enqueueSnackbar(response.message || 'Upload creative saved successfully.', { variant: 'success' });
                onSuccess?.();
            }
        } catch (error: any) {
            const errorMessage = error?.data?.message || error?.message || 'Failed to save upload creative.';
            enqueueSnackbar(errorMessage, { variant: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    // Reset both stores when the modal closes. This covers the save-then-close path,
    // where the parent closes the modal without going through handleClose/handleCancel.
    // Resetting here — rather than inferring "the store looks empty, so it must have been
    // reset" from state values — keeps Redux and the form from drifting apart.
    useEffect(() => {
        if (!open) {
            dispatch(resetCreative());
            reset(defaultFormValues);
            clearErrors();
        }
    }, [open, dispatch, reset, clearErrors]);

    // Customer attribute filter handlers
    const handleAddFilter = () => {
        dispatch(addFilter());
    };

    const handleRemoveFilter = (id: string) => {
        dispatch(removeFilter(id));
    };

    // When entity field changes, clear the field value (old values are no longer valid)
    const handleFilterFieldChange = useCallback((trackingId: string, fieldId: string) => {
        dispatch(updateFilter({
            _trackingId: trackingId,
            updates: { fieldId, fieldValue: [] },
        }));
        // Reset the multiselect form value
        setValue(`filterFieldValue_${trackingId}`, []);
    }, [dispatch, setValue]);

    const handleFilterValueChange = useCallback((trackingId: string, values: string[]) => {
        dispatch(updateFilter({
            _trackingId: trackingId,
            updates: { fieldValue: values },
        }));
    }, [dispatch]);

    // Show entity attribute filter when Customer, Contact, or Opportunity is selected
    const showEntityFilters = uploadCreative.visibleTo === '2' || uploadCreative.visibleTo === '1' || uploadCreative.visibleTo === '3';

    // Show roles dropdown when User Roles is selected
    const showRolesDropdown = uploadCreative.visibleTo === '4';

    // A new schedule cannot start in the past. An existing creative may legitimately have
    // started or ended before now, so the bound reaches back to its own saved value —
    // otherwise its value sits outside the picker's range and the field cannot be re-picked.
    //
    // Captured once per opening rather than read live: a time the picker accepted should not
    // turn invalid because the user spent a few minutes on the rest of the form. A start
    // slightly in the past is harmless in any case — it just means "show immediately".
    const scheduleFloor = useMemo(() => currentMinuteValue(), [open]);
    const relaxFloorFor = (saved?: string | null): string => {
        const value = fromApiDateTime(saved);
        return isEditMode && value && value < scheduleFloor ? value : scheduleFloor;
    };
    const startMinDateTime = relaxFloorFor(preloadedData?.startDateTime);
    const endMinDateTime = watchedPeriodStart || relaxFloorFor(preloadedData?.endDateTime);

    // Disable Save button during any API call
    const isAnyLoading = isSaving || visibleToLoading || rolesLoading || filterFieldsLoading;

    // Check if form section exceeds 50% of container height
    useEffect(() => {
        if (!formRef.current || !containerRef.current) return;

        const observer = new ResizeObserver(() => {
            const formHeight = formRef.current?.scrollHeight || 0;
            const containerHeight = containerRef.current?.clientHeight || 0;
            setIsFormSticky(formHeight <= containerHeight * 0.5);
        });

        observer.observe(formRef.current);
        if (containerRef.current) observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, [open, showEntityFilters, showRolesDropdown]);

    if (!open) return null;

    return (
        <>
            <Modal
                open={open}
                onClose={handleClose}
                fullScreen={true}
                allowBorder={true}
                closeOnOutsideClick={false}
                className="animate-fadeIn"
                header={
                    <h2 className="text-base font-semibold text-[#3F4254]">
                        {isEditMode ? 'Edit Creative' : 'Add Creative'}
                    </h2>
                }
                footer={
                    <>
                        <Button
                            className="bg-[#E4E6EF] hover:bg-gray-300 text-[#3F4254] rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm"
                            aria-label="Cancel"
                            onClick={handleCancel}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-[#3699FF] hover:bg-blue-600 text-white rounded h-10 px-4 py-2 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                            aria-label="Save"
                            onClick={handleSubmit(onSubmit)}
                            disabled={isAnyLoading}
                        >
                            {isSaving && (
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                            )}
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                    </>
                }
            >
                <div ref={containerRef} className={`flex flex-col h-full ${!isFormSticky ? `overflow-y-auto overflow-x-hidden ${styles.scroll}` : ''}`}>
                    {/* Fixed Top Form Section */}
                    <div ref={formRef} className={`flex-shrink-0 z-20 bg-white ${isFormSticky ? 'sticky top-0' : ''}`}>
                        <Form onSubmit={handleSubmit(onSubmit)} spaceY={4}>
                            {/* Visible To */}
                            <FormField label="Visible to" required labelColSpan={3} inputColSpan={9}>
                                <Select
                                    name="visibleTo"
                                    control={control}
                                    validationRules={{ required: 'Visible to is required' }}
                                    options={visibleToOptions}
                                    placeholder="Select visible to..."
                                    loading={visibleToLoading || (showEntityFilters && filterFieldsLoading)}
                                    onChange={(value) => {
                                        // Clear old filter form values before switching
                                        uploadCreative.customerAttributeFilters.forEach((f) => {
                                            setValue(`filterFieldId_${f._trackingId}`, '');
                                            setValue(`filterFieldValue_${f._trackingId}`, []);
                                        });
                                        dispatch(setVisibleTo(value));
                                    }}
                                />
                            </FormField>

                            {/* Roles Dropdown - Show when User Roles is selected */}
                            {showRolesDropdown && (
                                <FormField label="Select Role" required labelColSpan={3} inputColSpan={9}>
                                    <Select
                                        name="selectedRole"
                                        control={control}
                                        validationRules={{ required: 'Please select a role' }}
                                        options={roleOptions}
                                        placeholder="Select role..."
                                        loading={rolesLoading}
                                        onChange={(value) => {
                                            dispatch(setSelectedRole(value));
                                        }}
                                    />
                                </FormField>
                            )}

                            {/* Apply Customer Attribute Filter - only show after fields are loaded */}
                            {showEntityFilters && !filterFieldsLoading && (
                                <FormField label="Apply Customer Attribute Filter" labelColSpan={3} inputColSpan={9} fixedHeight={false}>
                                    <div className="space-y-3">
                                        {uploadCreative.customerAttributeFilters.map((filter, index) => (
                                            <FilterRow
                                                key={filter._trackingId}
                                                filter={filter}
                                                index={index}
                                                totalFilters={uploadCreative.customerAttributeFilters.length}
                                                control={control}
                                                fieldOptions={getAvailableFieldOptions(filter._trackingId)}
                                                fieldMetaMap={fieldMetaMap}
                                                projectId={projectId}
                                                fieldsLoading={filterFieldsLoading}
                                                onFieldChange={handleFilterFieldChange}
                                                onValueChange={handleFilterValueChange}
                                                onRemove={handleRemoveFilter}
                                                onAdd={handleAddFilter}
                                            />
                                        ))}
                                    </div>
                                </FormField>
                            )}

                            {/* Status */}
                            <FormField label="Status" labelColSpan={3} inputColSpan={9}>
                                <Select
                                    name="status"
                                    control={control}
                                    options={statusOptions}
                                />
                            </FormField>

                            {/* Schedule Visibility - optional window; blank ends are unbounded */}
                            <FormField label="Schedule Visibility" labelColSpan={3} inputColSpan={9} fixedHeight={false}>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <DateTimeInput
                                            name="startDateTime"
                                            control={control}
                                            placeholder="YYYY-MM-DD HH:MM"
                                            minDateTime={startMinDateTime}
                                            allowClear
                                            hint="Start date-time, blank shows it immediately"
                                            validationRules={{
                                                // Read the sibling from formValues, not a closure: RHF caches
                                                // rules at register time and does not refresh them on re-render.
                                                validate: (value: string, formValues: CreativeFormData) => {
                                                    const start = parseScheduleValue(value);
                                                    // Only block a past start on new creatives; an existing one
                                                    // may legitimately have started already.
                                                    if (start && !isEditMode && start < parseScheduleValue(scheduleFloor)!) {
                                                        return 'Start date-time cannot be in the past';
                                                    }
                                                    const end = parseScheduleValue(formValues.endDateTime);
                                                    if (!start || !end) return true;
                                                    return start < end || 'Start date-time must be before the end date-time';
                                                },
                                            }}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <DateTimeInput
                                            name="endDateTime"
                                            control={control}
                                            placeholder="YYYY-MM-DD HH:MM"
                                            minDateTime={endMinDateTime}
                                            allowClear
                                            hint="End date-time, blank keeps it visible indefinitely"
                                            validationRules={{
                                                validate: (value: string, formValues: CreativeFormData) => {
                                                    const end = parseScheduleValue(value);
                                                    if (!end) return true;
                                                    const start = parseScheduleValue(formValues.startDateTime);
                                                    if (start && end <= start) {
                                                        return 'End date-time must be after the start date-time';
                                                    }
                                                    // Only block already-expired windows on new creatives;
                                                    // an existing creative may legitimately have ended.
                                                    if (!isEditMode && end <= new Date()) {
                                                        return 'End date-time must be in the future';
                                                    }
                                                    return true;
                                                },
                                            }}
                                        />
                                    </div>
                                </div>
                            </FormField>
                        </Form>
                    </div>

                    {/* Scrollable Tabs Section */}
                    <div className={`flex-1 flex flex-col ${isFormSticky ? 'overflow-hidden' : ''}`}>
                        <Tabs
                            value={uploadCreative.activeTab}
                            onValueChange={handleTabChange}
                            className="h-full flex flex-col"
                        >
                            <TabsList className="bg-transparent justify-start rounded-none p-0 h-auto border-b border-gray-200">
                                <TabsTrigger
                                    value="carousel"
                                    className="px-4 rounded-none !bg-transparent border-x-0 border-t-0 !border-b-2 !border-transparent data-[state=active]:!border-blue-500 data-[state=active]:!bg-transparent !shadow-none !outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 data-[state=active]:!shadow-none ring-0 ring-offset-0 transition-all duration-300 ease-in-out"
                                >
                                    <div className="py-2">Carousel</div>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="banner"
                                    className="px-4 rounded-none !bg-transparent border-x-0 border-t-0 !border-b-2 !border-transparent data-[state=active]:!border-blue-500 data-[state=active]:!bg-transparent !shadow-none !outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 data-[state=active]:!shadow-none ring-0 ring-offset-0 transition-all duration-300 ease-in-out"
                                >
                                    <div className="py-2">Banner</div>
                                </TabsTrigger>
                            </TabsList>

                            {/* The tab selection is the creative type, so say so — tabs
                                normally just switch views rather than choose one */}
                            <p className="text-xs text-gray-500 pt-3">
                                A creative is either a Carousel or a Banner. Only the selected tab is saved.
                            </p>

                            <TabsContent value="carousel" className={`mt-0 flex-1 overflow-y-auto overflow-x-hidden ${styles.scroll} pt-4 !ring-0 !ring-offset-0 outline-none`}>
                                <CarouselTab control={control} projectId={projectId} />
                            </TabsContent>

                            <TabsContent value="banner" className={`mt-0 flex-1 overflow-y-auto overflow-x-hidden ${styles.scroll} pt-4 !ring-0 !ring-offset-0 outline-none`}>
                                <BannerTab control={control} projectId={projectId} />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </Modal>

            {/* Unsaved Changes Confirmation Dialog */}
            <ConfirmationDialog
                open={showUnsavedDialog}
                onClose={() => setShowUnsavedDialog(false)}
                onConfirm={() => {
                    setShowUnsavedDialog(false);
                    dispatch(resetCreative());
                    reset(defaultFormValues);
                    clearErrors();
                    onClose();
                }}
                title="Unsaved Changes"
                message="You have unsaved changes. Are you sure you want to close? All your changes will be lost."
                confirmText="Yes"
                cancelText="No"
                confirmButtonClass="bg-red-500 hover:bg-red-600 text-white"
                icon="warning"
            />
        </>
    );
};

export default AddEditUploadCreativeModal;
