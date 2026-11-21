import Modal from "@/components/common/Modal";
import { Button } from "../../../ui/tailwind/Button";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";
import React, { useEffect, useState, useCallback } from "react";
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import TextInput from "@/components/common/input-fields/TextInput";
import Select from "@/components/common/input-fields/Select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../ui/tailwind/tabs";
import ProfileTab from "../tabs/ProfileTab";
import { useSnackbar } from 'notistack';
import userRoleService from '@/lib/services/userRoleService';
import appFlowService from '@/lib/services/appFlowService';
import settingsService from '@/lib/services/settingsService';
import { getProjectId } from '@/lib/storage/sharedStorage';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';

// Field option interface for profile tab
interface FieldOption {
    value: string;
    label: string;
}
import {
    setFlowName,
    setSelectedRole,
    setFlowStatus,
    setIsFlowCreated,
    setHasUnsavedChanges,
    resetFlowDesigner,
    initializeInitialState
} from '@/store/appflowSlice';
import Spinner from "@/components/common/Spinner";

interface AddEditAppFlowModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    flowId?: string | number;
}



interface FlowFormData {
    flowName: string;
    selectedRole: string;
    status: string;
    sectionName?: string;
}

const AddEditContentDeckModal: React.FC<AddEditAppFlowModalProps> = ({
    open,
    onClose,
    onSuccess,
    flowId
}) => {
    const dispatch = useAppDispatch();
    const flowDesigner = useAppSelector((state) => state.appflow.flowDesigner);
    const [isLoading, setIsLoading] = useState(false);
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
    const { enqueueSnackbar } = useSnackbar();

    const isEditMode = flowId !== undefined && flowId !== null;
    const projectId = getProjectId();

    // React Hook Form setup
    const { control, handleSubmit, watch, reset, clearErrors } = useForm<FlowFormData>({
        defaultValues: {
            flowName: flowDesigner.flowName ?? '',
            selectedRole: flowDesigner.selectedRole ?? '',
            status: flowDesigner.status ?? '1',
            sectionName: ''
        }
    });

    // Local state for non-form data
    const [activeTab, setActiveTab] = useState<string>("profile");
    const [rolesOptions, setRolesOptions] = useState<Array<{ value: string; label: string }>>([]);
    const [fieldOptions, setFieldOptions] = useState<FieldOption[]>([]);

    // Watch form values for changes
    const watchedFlowName = watch('flowName');
    const watchedRole = watch('selectedRole');
    const watchedStatus = watch('status');

    // Sync form values with Redux store
    useEffect(() => {
        if (watchedFlowName !== undefined) {
            dispatch(setFlowName(watchedFlowName));
        }
    }, [watchedFlowName, dispatch]);

    useEffect(() => {
        if (watchedRole !== undefined) {
            dispatch(setSelectedRole(watchedRole));
        }
    }, [watchedRole, dispatch]);

    useEffect(() => {
        if (watchedStatus !== undefined) {
            dispatch(setFlowStatus(watchedStatus));
        }
    }, [watchedStatus, dispatch]);

    // Validation rules
    const flowNameValidation = {
        required: 'Flow name is required',
        pattern: {
            value: /^[a-zA-Z0-9\s]*$/,
            message: 'Flow name cannot contain special characters'
        }
    };

    const roleValidation = {
        required: 'Role is required'
    };

    const statusOptions = [
        { value: '1', label: 'Active' },
        { value: '0', label: 'Inactive' }
    ];

    // Fetch roles on component mount
    const fetchRoles = useCallback(async () => {
        try {
            const response = await userRoleService.getUserRoles(projectId);
            if (response && response.statusCode === 200 && Array.isArray(response.responseData)) {
                const activeRoles = response.responseData
                    .filter(role => role.active === 1) // Only active roles
                    .map(role => ({
                        value: role.roleId.toString(),
                        label: role.roleName
                    }));
                setRolesOptions(activeRoles);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
            enqueueSnackbar('Failed to fetch roles', { variant: 'error' });
        }
    }, [projectId, enqueueSnackbar]);

    // Attribute types to include from field options
    const attributeTypes = [
        CustomAttributeTypeEnum.IMAGE,
        CustomAttributeTypeEnum.DOCUMENT_UPLOAD,
        CustomAttributeTypeEnum.AUDIO_VIDEO,
        CustomAttributeTypeEnum.HEADER_TEXT,
        CustomAttributeTypeEnum.NORMAL_TEXT,
        CustomAttributeTypeEnum.OTP_VALIDATION,
        CustomAttributeTypeEnum.PAGE_SEPARATOR,
        CustomAttributeTypeEnum.REFERENCE_DOCUMENTS,
        CustomAttributeTypeEnum.QR_CODE_SCANNER
    ];

    // Fetch field options for profile tab using settingsService
    const fetchFieldOptions = useCallback(async () => {
        try {
            const response = await settingsService.getFieldDetails(projectId, SystemAttributeEnum.USER_MODULE);
            if (response.statusCode === 200 && response.responseData) {
                // Map API response to FieldOption format, filtering out excluded attribute types
                const options: FieldOption[] = response.responseData
                    .filter((field: any) =>
                        field.status === 1 && // Only active fields
                        attributeTypes.includes(field.attributeType?.id) // Include specified types
                    )
                    .map((field: any) => ({
                        value: field.id.toString(),
                        label: field.attributeName
                    }));
                setFieldOptions(options);
            }
        } catch (error) {
            console.error('Error fetching field options:', error);
            enqueueSnackbar('Failed to fetch field options', { variant: 'error' });
        }
    }, [projectId, enqueueSnackbar]);




    // Handle tab change
    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab);
    };

    useEffect(() => {
        if (open) {
            setIsLoading(true);
            Promise.all([fetchRoles(), fetchFieldOptions()])
                .finally(() => {
                    setIsLoading(false);
                    // Initialize the initial state for dirty check after data is loaded
                    dispatch(initializeInitialState());
                });
        }
    }, [open, fetchRoles, fetchFieldOptions, dispatch]);

    const handleClose = () => {
        // Check for unsaved changes
        if (flowDesigner.hasUnsavedChanges) {
            setShowUnsavedDialog(true);
        } else {
            // Reset Redux state and form when closing
            dispatch(resetFlowDesigner());
            reset({
                flowName: '',
                selectedRole: '',
                status: '1',
                sectionName: ''
            });
            clearErrors();
            onClose();
        }
    };
    
    const handleCancel = () => {
        // Check for unsaved changes - same as handleClose
        if (flowDesigner.hasUnsavedChanges) {
            setShowUnsavedDialog(true);
        } else {
            // Cancel button resets Redux, form and errors, then closes
            dispatch(resetFlowDesigner());
            reset({
                flowName: '',
                selectedRole: '',
                status: '1',
                sectionName: ''
            });
            clearErrors();
            onClose();
        }
    };

    const onSubmit = async () => {
        // Check all sections have names and at least one field
        for (const section of flowDesigner.sections) {
            if (!section.name.trim()) {
                enqueueSnackbar('All sections must have a name', { variant: 'error',autoHideDuration: 1000 });
                return;
            }
            if (section.fields.length === 0) {
                enqueueSnackbar(`Section "${section.name}" must have at least one field`, { variant: 'error' ,autoHideDuration: 1000 });
                return;
            }

            // Check if any field has empty fieldId (not selected)
            for (const field of section.fields) {
                if (!field.fieldId || field.fieldId.trim() === '') {
                    enqueueSnackbar(`All fields in section "${section.name}" must be selected`, { variant: 'error',autoHideDuration: 1000 });
                    return;
                }
            }
        }

        setIsLoading(true);

        try {

            // Transform Redux state to API payload format
            const payload = {
                projectId: projectId,
                flowId: isEditMode ? flowId : null,
                flowName: flowDesigner.flowName,
                roleId: flowDesigner.selectedRole,
                status: flowDesigner.status === '1' ? 1 : 0,
                profile: flowDesigner.sections.map(section => ({
                    sectionId: section.sectionId, 
                    sectionName: section.name,
                    sectionStatus: section.status === '1' ? 1 : 0,
                    fields: section.fields.map(field => ({
                        fieldId: field.fieldId, // For now, always null (new fields)
                        fieldSeqName: field.fieldName, // It will be Sequence for this field like Field 1, Field 2 ...
                        dataListId: field.dataListId || null
                    }))
                })),
                homeScreen: null,
                cardView: null
            };

            // Console log the payload for debugging
            console.log('=== App Flow Save Payload ===');
            console.log(JSON.stringify(payload, null, 2));
            console.log('============================');

            // Call API
            // const response = isEditMode
            //     ? await appFlowService.updateAppFlow(payload)
            //     : await appFlowService.createAppFlow(payload);

            // console.log('=== App Flow Save Response ===');
            // console.log(response);
            // console.log('==============================');

            // if (response.statusCode === 200) {
            //     enqueueSnackbar(response.message || 'Flow saved successfully', { variant: 'success' });
            //     dispatch(setHasUnsavedChanges(false));
            //     dispatch(setIsFlowCreated(true));
            //     onSuccess?.();
            //     onClose();
            // } else {
            //     enqueueSnackbar(response.message || 'Failed to save flow', { variant: 'error' });
            // }
        } catch (error: any) {
            console.error(error);
            const errorMessage = error?.data?.message || error?.message || 'Failed to save flow';
            enqueueSnackbar(errorMessage, { variant: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!open) {
            // Reset state when modal closes
            setIsLoading(false);
            setActiveTab('profile');
            dispatch(resetFlowDesigner());
        }
    }, [open, dispatch]);

    // Reset form when Redux store is reset (e.g., on cancel)
    useEffect(() => {
        // If flowDesigner is reset to initial state, reset the form
        // Initial state has status: '1', flowName: '', selectedRole: ''
        if (flowDesigner.flowName === '' && flowDesigner.selectedRole === '' && flowDesigner.status === '1') {
            reset({
                flowName: '',
                selectedRole: '',
                status: '1',
                sectionName: ''
            });
        }
    }, [flowDesigner.flowName, flowDesigner.selectedRole, flowDesigner.status, reset]);

    if (!open) return null;


    // Show loading state
    if (isLoading) {
        return (
            <Spinner blur={true} zIndex={9999} version="fixed"/>
        );
    }

    return (
        <>
            <Modal
                open={open}
                onClose={handleClose}
                fullScreen={true}
                allowBorder={true}
                closeOnOutsideClick={false}
                className="animate-fadeIn"
                header={<h2 className="text-base font-semibold text-[#3F4254]">Flow Designer</h2>}
                footer={
                    <>
                        <Button
                            className="bg-[#E4E6EF] hover:bg-gray-300 text-[#3F4254] rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm"
                            aria-label="Cancel"
                            onClick={handleCancel}
                        >Cancel
                        </Button>

                        <Button
                            className="bg-[#3699FF] hover:bg-blue-600 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm"
                            aria-label="Save"
                            onClick={handleSubmit(onSubmit)}
                        >Save
                        </Button>
                    </>
                }
            >
                <div className="flex flex-col h-full">
                    {/* Fixed Top Form Section */}
                    <div className="flex-shrink-0 sticky top-0 pb-4 z-20 bg-white">
                        <div className="bg-gray-100 rounded-md relative">
                            {/* Expand/Collapse Button - Absolute positioned */}
                            <button
                                type="button"
                                onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                                className="absolute right-4 top-3 p-0 hover:bg-[#E4E6EF] rounded transition-colors z-10"
                            >
                                {isHeaderExpanded ?
                                    <Image
                                        src="/svg/icons/general/collapse-icon.svg"
                                        alt="Collapse"
                                        width={20}
                                        height={21}
                                        className="text-gray-600"
                                    />
                                    :
                                    <Image
                                        src="/svg/icons/general/expand-icon.svg"
                                        alt="Expand"
                                        width={20}
                                        height={21}
                                        className="text-gray-600"
                                    />
                                }
                            </button>

                            {/* Always visible row with Flow Name */}
                            <div className="px-6 pt-4 pb-3">
                                <div className="grid grid-cols-12 gap-4 items-center">
                                    <label className="col-span-3 text-sm font-medium text-gray-700">
                                        Flow Name
                                    </label>
                                    <div className="col-span-5">
                                        <TextInput
                                            name="flowName"
                                            control={control}
                                            validationRules={flowNameValidation}
                                            placeholder="Enter Flow name..."
                                            maxLength={200}
                                            pattern={/^[a-zA-Z0-9\s]*$/}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Expandable section with Role and Status */}
                            <div
                                className={`overflow-hidden transition-all duration-300 ease-in-out ${isHeaderExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                            >
                                <div className="px-6 pb-4 space-y-3">
                                    <div className="grid grid-cols-12 gap-4 items-center">
                                        <label className="col-span-3 text-sm font-medium text-gray-700">
                                            Role
                                        </label>
                                        <div className="col-span-5">
                                            <Select
                                                name="selectedRole"
                                                control={control}
                                                validationRules={roleValidation}
                                                options={rolesOptions}
                                                placeholder="Select Role"
                                                disabled={flowDesigner.isFlowCreated}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-12 gap-4 items-center">
                                        <label className="col-span-3 text-sm font-medium text-gray-700">
                                            Status
                                        </label>
                                        <div className="col-span-5">
                                            <Select
                                                name="status"
                                                control={control}
                                                options={statusOptions}
                                                disabled={!isEditMode && !flowDesigner.isFlowCreated}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Tabs Section */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <Tabs
                            value={activeTab}
                            onValueChange={handleTabChange}
                            className="h-full flex flex-col"
                        >
                            <TabsList className="bg-transparent justify-start rounded-none p-0 h-auto border-b border-t border-gray-200">
                                <TabsTrigger
                                    value="profile"
                                    className="px-4 rounded-none !bg-transparent border-x-0 border-t-0 !border-b-2 !border-transparent data-[state=active]:!border-blue-500 data-[state=active]:!bg-transparent !shadow-none !outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 data-[state=active]:!shadow-none ring-0 ring-offset-0 transition-all duration-300 ease-in-out"
                                >
                                    <div className="py-2">Profile</div>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="homescreen"
                                    className="px-4  rounded-none !bg-transparent border-x-0 border-t-0 !border-b-2 !border-transparent data-[state=active]:!border-blue-500 data-[state=active]:!bg-transparent !shadow-none !outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 data-[state=active]:!shadow-none ring-0 ring-offset-0 transition-all duration-300 ease-in-out"
                                >
                                    <div className="py-2">Home Screen</div>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="cardviews"
                                    className="px-4  rounded-none !bg-transparent border-x-0 border-t-0 !border-b-2 !border-transparent data-[state=active]:!border-blue-500 data-[state=active]:!bg-transparent !shadow-none !outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 data-[state=active]:!shadow-none ring-0 ring-offset-0 transition-all duration-300 ease-in-out"
                                >
                                    <div className="py-2">Card Views</div>
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="profile" className="mt-0 flex-1 overflow-auto pt-4">
                                <ProfileTab fieldOptions={fieldOptions} />
                            </TabsContent>

                            <TabsContent value="homescreen" className="flex-1 overflow-auto py-4">
                                <div className="bg-white rounded-lg border p-6">
                                    <p className="text-gray-500">Home Screen configuration coming soon...</p>
                                </div>
                            </TabsContent>

                            <TabsContent value="cardviews" className="flex-1 overflow-auto py-4">
                                <div className="bg-white rounded-lg border p-6">
                                    <p className="text-gray-500">Card Views configuration coming soon...</p>
                                </div>
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
                    dispatch(resetFlowDesigner());
                    reset({
                        flowName: '',
                        selectedRole: '',
                        status: '1',
                        sectionName: ''
                    });
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

export default AddEditContentDeckModal;