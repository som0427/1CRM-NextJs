import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import TwinModal from '@/components/common/TwinModal';
import Spinner from '@/components/common/Spinner';
import Select from '@/components/common/input-fields/Select';
import TextArea from '@/components/common/input-fields/TextArea';
import FormField from '@/components/common/input-fields/FormField';
import { useForm } from 'react-hook-form';
import { useSnackbar } from 'notistack';
import approvalService, { ApprovalUpdatePayload } from '@/lib/services/approvalServie';
import { getProjectId } from '@/lib/storage/sharedStorage';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import moment from 'moment-timezone';

// Dynamically import entity forms to avoid SSR issues
const CustomerEditForm = dynamic(
  () => import('@/components/customers/AddEditForm/EditForm'),
  { ssr: false }
);

const ActivityEditForm = dynamic(
  () => import('@/components/activities/AddEditForm/EditForm'),
  { ssr: false }
);

const ContactEditForm = dynamic(
  () => import('@/components/contacts/AddEditForm/EditForm'),
  { ssr: false }
);

const OpportunityEditForm = dynamic(
  () => import('@/components/opportunities/AddEditForm/EditForm'),
  { ssr: false }
);

// Preloaders
import { preloadCustomerEditFormData, PreloadedCustomerFormData } from '@/components/customers/AddEditForm/subs/formDataPreloader';
import { preloadEditFormData as preloadActivityEditFormData, PreloadedFormData as PreloadedActivityFormData } from '@/components/activities/AddEditForm/subs/formDataPreloader';
import { PreloadedContactFormData } from '@/components/contacts/AddEditForm/subs/formDataPreloader';
import { PreloadedOpportunityFormData } from '@/components/opportunities/AddEditForm/subs/formDataPreloader';

// Module type constants
const MODULE_TYPE = {
  CONTACT: 1,
  CUSTOMER: 2,
  OPPORTUNITY: 3,
  ACTIVITY_MIN: 100, // Activities have moduleType >= 100
};

// Field visibility attribute IDs that should not be considered for visibility logic
const FIELD_VISIBILITY_NOT_ATTRIBUTE_IDS = [5, 14, 19, 10, 11, 12, 17];

interface ApprovalRowData {
  id: number;
  entityRecordId: number;
  entityRecordName: string;
  moduleType: number;
  moduleName: string;
  serialNo: string;
  workflowApprovalId: number;
  workflowApprovalName: string;
  workflowNodeId: number;
  submittedBy: number;
  submittedByUserName: string;
  createdOn: string;
  projectId: number;
  advanceSetting: number;
  approvalActionId: number | null;
  approvalActionName: string | null;
  approvalRemarks: string | null;
  actionBy: number | null;
  actionOn: string | null;
}

interface ApprovalAction {
  key: number;
  value: string;
  remarksId: number; // 0 = no remarks, 1 = optional remarks, 2 = mandatory remarks
}

interface ApprovalFieldVisibilityConfig {
  id: number | null;
  approvalId: number | null;
  projectId: number;
  moduleType: number;
  attributeId: number;
  attributeName: string;
  systemAttributeId: number | null;
  fieldVisibility: number; // 1 = locked/readonly
}

interface ApprovalEditModalProps {
  open: boolean;
  onClose: () => void;
  rowData: ApprovalRowData | null;
  onSuccess?: () => void;
  isCompleted?: boolean; // If true, show in view-only mode
  // Preloaded data from parent component
  preloadedCustomerData?: PreloadedCustomerFormData | null;
  preloadedActivityData?: PreloadedActivityFormData | null;
  preloadedContactData?: PreloadedContactFormData | null;
  preloadedOpportunityData?: PreloadedOpportunityFormData | null;
  preloadedApprovalActions?: any[];
  preloadedFieldVisibility?: any[];
}

const ApprovalEditModal: React.FC<ApprovalEditModalProps> = ({
  open,
  onClose,
  rowData,
  onSuccess,
  isCompleted = false,
  preloadedCustomerData: propCustomerData,
  preloadedActivityData: propActivityData,
  preloadedContactData: propContactData,
  preloadedOpportunityData: propOpportunityData,
  preloadedApprovalActions: propApprovalActions,
  preloadedFieldVisibility: propFieldVisibility,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const projectId = getProjectId() || 0;

  // Form states
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Use preloaded data from props (data is already loaded by parent before modal opens)
  const customerPreloadedData = propCustomerData || null;
  const activityPreloadedData = propActivityData || null;
  const contactPreloadedData = propContactData || null;
  const opportunityPreloadedData = propOpportunityData || null;

  // Approval action states - use preloaded data from props
  const [approvalActions, setApprovalActions] = useState<ApprovalAction[]>([]);
  const [showRemarks, setShowRemarks] = useState(false);
  const [remarksRequired, setRemarksRequired] = useState(false);

  // Field visibility config for approval - passed to entity forms
  const [approvalFieldVisibilityConfig, setApprovalFieldVisibilityConfig] = useState<ApprovalFieldVisibilityConfig[]>([]);

  // Ref to store form data getter function from child forms
  const formDataGetterRef = useRef<(() => any) | null>(null);

  // React Hook Form for approval action
  const { control, watch, setValue, handleSubmit, reset, clearErrors, unregister, register } = useForm({
    defaultValues: {
      action: null as number | null,
      remarks: '',
    },
  });

  const selectedAction = watch('action');

  // Determine entity type based on moduleType
  const getEntityType = useCallback((moduleType: number): 'customer' | 'activity' | 'contact' | 'opportunity' | null => {
    if (moduleType === MODULE_TYPE.CUSTOMER) return 'customer';
    if (moduleType === MODULE_TYPE.CONTACT) return 'contact';
    if (moduleType === MODULE_TYPE.OPPORTUNITY) return 'opportunity';
    if (moduleType >= MODULE_TYPE.ACTIVITY_MIN) return 'activity';
    return null;
  }, []);

  // Effect to initialize data from props when modal opens
  useEffect(() => {
    if (open && rowData) {
      // Use preloaded data from props
      setApprovalActions(propApprovalActions || []);
      setApprovalFieldVisibilityConfig(propFieldVisibility || []);
      
      // Reset approval form
      reset({
        action: rowData.approvalActionId || null,
        remarks: rowData.approvalRemarks || '',
      });
    } else {
      // Clear data when modal closes
      setApprovalActions([]);
      setApprovalFieldVisibilityConfig([]);
      setShowRemarks(false);
      setRemarksRequired(false);
    }
  }, [open, rowData, propApprovalActions, propFieldVisibility, reset]);

  // Handle action selection change
  useEffect(() => {
    if (selectedAction) {
      const action = approvalActions.find(a => a.key === Number(selectedAction));
      if (action) {
        // remarksId: 1 = no remarks, 2 = optional remarks, 3 = mandatory remarks
        setShowRemarks(action.remarksId > 1);
        setRemarksRequired(action.remarksId === 3);
      }
    } else {
      setShowRemarks(false);
      setRemarksRequired(false);
    }
    // Clear remarks field and errors when action changes - but NOT for completed approvals (preserve original remarks)
    if (!isCompleted) {
      // Unregister and re-register the remarks field to reset validation state completely
      unregister('remarks');
      setValue('remarks', '');
    }
  }, [selectedAction, approvalActions, setValue, isCompleted, unregister]);

  // Handle form close
  const handleClose = useCallback(() => {
    if (!isFormSubmitting && !isApiLoading) {
      onClose();
    }
  }, [isFormSubmitting, isApiLoading, onClose]);

  // Handle form data ready callback from child forms (used by approval screen)
  const handleApprovalFormDataReady = useCallback((getFormData: () => any) => {
    formDataGetterRef.current = getFormData;
  }, []);

  // Handle approval submission
  const handleApprovalSubmit = useCallback(() => {
    handleSubmit(
      async ({ action, remarks }) => {
        if (!rowData) return;

        setIsFormSubmitting(true);
        setApiError(null);

        try {
          const entityType = getEntityType(rowData.moduleType);
          const allowEditing = rowData.advanceSetting === 1 ? 1 : 0;

          // Get current time in user's timezone
          const userTime = moment().format('YYYY-MM-DD HH:mm:ss');
          const guessedTimeZone = moment.tz.guess();
          const transTimeZone =
            guessedTimeZone === 'Asia/Calcutta' || guessedTimeZone === 'Asia/Kolkata'
              ? 'IST'
              : guessedTimeZone || 'IST';

          // Build the approval update payload matching Angular structure
          const payload: ApprovalUpdatePayload = {
            approvalId: rowData.id,
            approvalAction: action as number,
            approvalRemarks: remarks?.trim() || null,
            projectId: projectId,
            allowEditing: allowEditing,
          };

          // Get form data if available (includes customAttributeValues with productFormData)
          const formData = formDataGetterRef.current ? formDataGetterRef.current() : null;

          // Always include entity data in payload (Angular sends it for both editable and view-only)
          // The allowEditing flag tells the backend whether to process the edits or not
          if (entityType === 'activity') {
            // Build activityRequestDTO - customAttributeValues includes productFormData entries
            payload.activityRequestDTO = {
              activityId: rowData.entityRecordId,
              appVersion: null,
              deviceInfo: null,
              gps: null,
              isActive: 1,
              projectId: projectId,
              moduleType: rowData.moduleType,
              userTime: userTime,
              transTimeZone: transTimeZone,
              customAttributeValues: formData?.customAttributeValues || [],
            };
          } else if (entityType === 'customer') {
            // Build companyRequestDTO
            payload.companyRequestDTO = {
              companyId: rowData.entityRecordId,
              appVersion: null,
              deviceInfo: null,
              gps: null,
              isActive: 1,
              projectId: projectId,
              moduleType: rowData.moduleType,
              userTime: userTime,
              transTimeZone: transTimeZone,
              customAttributeValues: formData?.customAttributeValues || [],
            };
          } else if (entityType === 'contact') {
            // Build contactRequestDTO
            payload.contactRequestDTO = {
              contactId: rowData.entityRecordId,
              appVersion: null,
              deviceInfo: null,
              gps: null,
              isActive: 1,
              projectId: projectId,
              userTime: userTime,
              transTimeZone: transTimeZone,
              customAttributeValues: formData?.customAttributeValues || [],
            };
          } else if (entityType === 'opportunity') {
            // Build opportunityRequestDTO
            payload.opportunityRequestDTO = {
              opportunityId: rowData.entityRecordId,
              appVersion: null,
              deviceInfo: null,
              gps: null,
              isActive: 1,
              projectId: projectId,
              transTimeZone: transTimeZone,
              customAttributeValues: formData?.customAttributeValues || [],
            };
          }

          const response = await approvalService.updateApproval(payload);

          if (response?.statusCode === 200) {
            enqueueSnackbar('Approval action submitted successfully', { variant: 'success' });
            onSuccess?.();
            onClose();
          } else {
            setApiError(response?.message || 'Failed to submit approval action');
          }
        } catch (error: any) {
          console.error('Error submitting approval action:', error);
          setApiError(error?.message || 'Error submitting approval action');
        } finally {
          setIsFormSubmitting(false);
        }
      },
      () => {
        // Validation errors: allow RHF/field components to display errors
      }
    )();
  }, [handleSubmit, rowData, getEntityType, projectId, enqueueSnackbar, onSuccess, onClose]);

  // Get modal header
  const getModalHeader = useCallback(() => {
    if (!rowData) return 'Approval';
    
    if (isCompleted) {
      const actionOn = rowData.actionOn || rowData.createdOn;
	  const formattedActionOn = (() => {
		if (!actionOn) return '';
		const date = new Date(actionOn);
		if (isNaN(date.getTime())) return actionOn;
		const datePart = moment(date).format('DD-MMM-YYYY');
		const timePart = date.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: true,
		});
		return `${datePart} ${timePart}`;
	  })();
	  return `Action On: ${formattedActionOn}`;
    }
    
    return `${rowData.moduleName} - ${rowData.serialNo}`;
  }, [rowData, isCompleted]);

  // Check if entity form should be disabled (view-only mode)
  const isFieldDisabled = isCompleted || !rowData?.advanceSetting;

  // Render entity form based on moduleType
  const renderEntityForm = () => {
    if (!rowData) return null;

    const entityType = getEntityType(rowData.moduleType);

    if (entityType === 'customer' && customerPreloadedData) {
      return (
        <CustomerEditForm
          onCancel={handleClose}
          onSuccess={() => {}}
          onSubmittingChange={setIsFormSubmitting}
          onApiLoadingChange={setIsApiLoading}
          onApiError={setApiError}
          companyId={rowData.entityRecordId}
          source="all"
          preloadedData={customerPreloadedData}
          isEditAllowed={!isFieldDisabled}
          hideInternalActions
          hideHeading
          approvalFieldVisibilityConfig={approvalFieldVisibilityConfig}
          onApprovalFormDataReady={handleApprovalFormDataReady}
        />
      );
    }

    if (entityType === 'activity' && activityPreloadedData) {
      return (
        <ActivityEditForm
          onCancel={handleClose}
          onSuccess={() => {}}
          onSubmittingChange={setIsFormSubmitting}
          onApiLoadingChange={setIsApiLoading}
          onApiError={setApiError}
          activityId={rowData.entityRecordId}
          activityTypeId={rowData.moduleType}
          moduleType={rowData.moduleType}
          activityView="all"
          preloadedData={activityPreloadedData}
          hideInternalActions
          hideHeading
          approvalFieldVisibilityConfig={approvalFieldVisibilityConfig}
          onApprovalFormDataReady={handleApprovalFormDataReady}
        />
      );
    }

    if (entityType === 'contact' && contactPreloadedData) {
      return (
        <ContactEditForm
          onCancel={handleClose}
          onSuccess={() => {}}
          onSubmittingChange={setIsFormSubmitting}
          onApiLoadingChange={setIsApiLoading}
          contactId={rowData.entityRecordId}
          source="all"
          preloadedData={contactPreloadedData}
          isEditAllowed={!isFieldDisabled}
          hideInternalActions
          hideHeading
          approvalFieldVisibilityConfig={approvalFieldVisibilityConfig}
          onApprovalFormDataReady={handleApprovalFormDataReady}
        />
      );
    }

    if (entityType === 'opportunity' && opportunityPreloadedData) {
      return (
        <OpportunityEditForm
          onCancel={handleClose}
          onSuccess={() => {}}
          onSubmittingChange={setIsFormSubmitting}
          onApiLoadingChange={setIsApiLoading}
          opportunityId={rowData.entityRecordId}
          source="all"
          preloadedData={opportunityPreloadedData}
          isEditAllowed={!isFieldDisabled}
          hideInternalActions
          hideHeading
          approvalFieldVisibilityConfig={approvalFieldVisibilityConfig}
          onApprovalFormDataReady={handleApprovalFormDataReady}
        />
      );
    }

    return (
      <div className="p-4 text-center text-gray-500">
        Unknown entity type
      </div>
    );
  };

  if (!open) return null;

  return (
    <TwinModal
      open={open}
      onClose={handleClose}
      modalClassName="max-w-4xl"
      allowBorder={true}
      closeOnOutsideClick={false}
      header={
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#3F4254]">
            {getModalHeader()}
          </h2>
        </div>
      }
      footer={
        <div className="flex justify-end space-x-3">
          {apiError && (
            <span className="text-red-500 text-sm self-center mr-2">{apiError}</span>
          )}
          <button
            className={`bg-gray-200 text-black rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm ${
              (isFormSubmitting || isApiLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'
            }`}
            onClick={handleClose}
            type="button"
            aria-label="Cancel"
            disabled={isFormSubmitting || isApiLoading}
          >
            Cancel
          </button>
          {!isCompleted && (
            <button
              className={`bg-blue-500 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm min-w-[80px] ${
                (isFormSubmitting || isApiLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
              }`}
              onClick={handleApprovalSubmit}
              type="button"
              aria-label="Save"
              disabled={isFormSubmitting || isApiLoading}
            >
              {isFormSubmitting ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      }
    >
      {/* Centered spinner overlay when API is loading */}
      {isApiLoading && (
        <div className="fixed inset-0 bg-white/80 z-[100] flex items-center justify-center pointer-events-auto">
          <Spinner size="medium" customLoadingName="Loading data..." />
        </div>
      )}

      {/* Data is preloaded by parent before modal opens, so no loading state needed here */}
      <div className="space-y-6">
        {/* Entity Form Section */}
        <div>
          {renderEntityForm()}
        </div>

          {/* Approval Action Section - Only show for pending approvals */}
          {!isCompleted && (
            <div>
              <FormField label="Action" required>
                <Select
                  name="action"
                  control={control}
                  options={approvalActions.map(action => ({
                    value: action.key,
                    label: action.value,
                  }))}
                  placeholder="Select action..."
                  validationRules={{ required: 'Action is required' }}
                  disabled={isCompleted}
                />
              </FormField>

              {/* Remarks Field - Conditionally shown */}
              {showRemarks && (
                <FormField label='Remarks' required={remarksRequired} fixedHeight={false}>
                  <TextArea
                    key={`remarks-${remarksRequired ? 'required' : 'optional'}`}
                    name="remarks"
                    control={control}
                    placeholder="Enter remarks..."
                    validationRules={remarksRequired ? { required: 'Remarks are required' } : {}}
                    disabled={isCompleted}
                    rows={1}
                  />
                </FormField>
              )}
            </div>
          )}

          {/* Completed Approval Info - Show for completed approvals */}
          {isCompleted && rowData && (
            <div>
              <div className="mt-4 space-y-4">
                <FormField label="Action" required>
                  <Select
                    name="action"
                    control={control}
                    options={approvalActions.map(action => ({
                      value: action.key,
                      label: action.value,
                    }))}
                    placeholder="Select action..."
                    disabled
                  />
                </FormField>

                {/* For completed approvals, show remarks if remarksId is 2 or 3 (optional/mandatory) - show blank if no data */}
                {showRemarks && (
                  <FormField label="Remarks" fixedHeight={false}>
                    <TextArea
                      name="remarks"
                      control={control}
                      placeholder=""
                      disabled
                      rows={1}
                    />
                  </FormField>
                )}
              </div>
            </div>
          )}
        </div>
    </TwinModal>
  );
};

export default ApprovalEditModal;
