import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import TwinModal from '@/components/common/TwinModal';
import CancelButton from '@/components/common/buttons/CancelButton';
import SaveButton from '@/components/common/buttons/SaveButton';
import TextInput from '@/components/common/input-fields/TextInput';
import NumericInput from '@/components/common/input-fields/wrapper/NumericInput';
import CheckboxInput from '@/components/common/input-fields/CheckboxInput';
import CheckboxGroupInput from '@/components/common/input-fields/CheckboxGroupInput';
import FormField from '@/components/common/input-fields/FormField';
import Form from '@/components/common/Form';
import Spinner from '@/components/common/Spinner';
import AlertDialog from '@/components/common/AlertDialog';
import settingsService from '@/lib/services/settingsService';
import activitiesService from '@/lib/services/activitiesService';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: number;
  onSave?: () => void;
}

interface FormValues {
  activityName: string;
  associateWith: string[];
  mandatoryActivity: boolean;
  enforceLiveLocation: boolean;
  geofence: boolean;
  geofenceDistance: number | '';
  key: string;
}

interface DynamicFieldNames {
  customersLabel: string | null;
  opportunitiesLabel: string | null;
  opportunityEnabled: boolean;
}

const AddActivity: React.FC<Props> = ({
  open,
  onClose,
  projectId,
  onSave,
}) => {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showOpportunityAlert, setShowOpportunityAlert] = useState(false);
  const [dynamicNames, setDynamicNames] = useState<DynamicFieldNames>({
    customersLabel: null,
    opportunitiesLabel: null,
    opportunityEnabled: false,
  });

  const { control, handleSubmit, reset, setValue } = useForm<FormValues>({
    defaultValues: {
      activityName: '',
      associateWith: ['activities'],
      mandatoryActivity: false,
      enforceLiveLocation: false,
      geofence: false,
      geofenceDistance: '',
      key: '',
    },
    mode: 'onChange',
  });

  // Watch for changes in associateWith to show alert when opportunities is selected
  const associateWithValue = useWatch({ control, name: 'associateWith' });
  const prevAssociateWithRef = useRef<string[]>(['activities']);

  // Determine if geofence should be enabled (when Company or Opportunity is selected)
  const isGeofenceEnabled = associateWithValue?.includes('consumers') || associateWithValue?.includes('opportunities');

  // Watch geofence checkbox value to show/hide distance field
  const geofenceValue = useWatch({ control, name: 'geofence' });

  useEffect(() => {
    const prevValue = prevAssociateWithRef.current;
    const wasOpportunitiesSelected = prevValue.includes('opportunities');
    const isOpportunitiesSelected = associateWithValue?.includes('opportunities');

    // Show alert only when opportunities is newly selected (was not selected before, now is)
    if (!wasOpportunitiesSelected && isOpportunitiesSelected) {
      setShowOpportunityAlert(true);
    }

    // Update ref with current value
    prevAssociateWithRef.current = associateWithValue || ['activities'];
  }, [associateWithValue]);

  // Enable/disable geofence based on Company or Opportunity selection
  useEffect(() => {
    if (!isGeofenceEnabled) {
      // Reset geofence and distance when neither Company nor Opportunity is selected
      setValue('geofence', false);
      setValue('geofenceDistance', '');
    }
  }, [isGeofenceEnabled, setValue]);

  // Reset geofence distance when geofence is unchecked
  useEffect(() => {
    if (!geofenceValue) {
      setValue('geofenceDistance', '');
    }
  }, [geofenceValue, setValue]);

  // Fetch dynamic field names when modal opens
  useEffect(() => {
    if (open && projectId) {
      setIsLoading(true);
      settingsService.getdynamicFieldNames(projectId)
        .then((result) => {
          const names: DynamicFieldNames = {
            customersLabel: null,
            opportunitiesLabel: null,
            opportunityEnabled: false,
          };

          result.responseData?.forEach((row: { moduleId: number; pluralName: string; opportunityEnabled?: boolean }) => {
            if (row.moduleId === SystemAttributeEnum.COMPANY_MODULE) {
              names.customersLabel = row.pluralName;
            }
            if (row.moduleId === SystemAttributeEnum.OPPORTUNITY_MODULE) {
              names.opportunitiesLabel = row.pluralName;
              names.opportunityEnabled = row.opportunityEnabled ?? false;
            }
          });

          setDynamicNames(names);
        })
        .catch((err) => {
          console.error('Error fetching dynamic field names:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, projectId]);

  const handleSave = useCallback(async (data: FormValues) => {
    setIsSaving(true);

    try {
      // Prepare payload matching API structure
      const payload = {
        projectId,
        activityName: data.activityName.trim(),
        allowForCompanies: data.associateWith?.includes('consumers') ? 1 : 0,
        allowForDialer: data.associateWith?.includes('dialer') ? 1 : 0,
        allowForOpportunities: dynamicNames.opportunityEnabled
          ? (data.associateWith.includes('opportunities') ? 1 : 0)
          : 0,
        allowGeofence: data.geofence ? 1 : 0,
        geofenceDistance: data.geofence && data.geofenceDistance ? Number(data.geofenceDistance) : 0,
        captureLiveLocation: data.enforceLiveLocation ? 1 : 0,
        isMandatory: data.mandatoryActivity ? 1 : 0,
        serialKey: data.key.trim(),
      };

      const response = await activitiesService.saveActivity(payload);

      if (response.statusCode >= 400) {
        enqueueSnackbar(response.message || 'An error occurred while saving the activity', { variant: 'error' });
        reset();
        return;
      }

      const activityId = response.responseData?.activityId;
      const activityName = data.activityName.trim();

      // Store new activity in cookies before navigating
      if (activityId) {
        try {
          // Get existing activities from cookies
          const cookieMatch = document.cookie.match(/activityNames=([^;]*)/);
          let activityList: { activityId: number; activityName: string }[] = [];
          if (cookieMatch) {
            activityList = JSON.parse(decodeURIComponent(cookieMatch[1]));
          }
          // Add new activity
          activityList.push({ activityId, activityName });
          // Update cookie
          document.cookie = `activityNames=${encodeURIComponent(JSON.stringify(activityList))}; path=/; max-age=86400`;
        } catch (e) {
          console.error('Error updating activity cookies:', e);
        }

        await router.push(`/activity-list/${activityId}`);
      }

      reset();
      onClose();
      onSave?.();
    } catch (error) {
      console.error('Error saving activity:', error);
      enqueueSnackbar(error instanceof Error ? error.message : 'An error occurred while saving the activity', { variant: 'error' });
      reset();
    } finally {
      setIsSaving(false);
    }
  }, [projectId, dynamicNames.opportunityEnabled, reset, onClose, onSave, router, enqueueSnackbar]);

  const handleClose = useCallback(() => {
    if (!isSaving) {
      reset();
      onClose();
    }
  }, [isSaving, onClose, reset]);

  // Build options array, filtering out null labels
  // Activities is always present, Customers and Opportunities are conditional based on dynamic names
  const associateWithOptions = [
    { value: 'activities', label: 'Activities', disabled: true },
    dynamicNames.customersLabel ? { value: 'consumers', label: dynamicNames.customersLabel } : null,
    dynamicNames.opportunitiesLabel && dynamicNames.opportunityEnabled ? { value: 'opportunities', label: dynamicNames.opportunitiesLabel } : null,
    { value: 'dialer', label: 'Dialer' },
  ].filter(Boolean) as { value: string; label: string; disabled?: boolean }[];


  return (
    <>
      <TwinModal
        open={open}
        onClose={handleClose}
        closeOnOutsideClick={!isSaving}
        mainHeightClassName="h-auto max-h-[90vh]"
        allowBorder={true}
        modalClassName="max-w-[800px]"
        header="Add New Activity"
        footer={
          <>
            <CancelButton
              onClick={handleClose}
              disabled={isSaving}
            />
            <SaveButton
              onClick={handleSubmit(handleSave)}
              loading={isSaving}
              disabled={isSaving}
            />
          </>
        }
      >
        {isLoading ? (
          <Spinner size="medium" customLoadingName="Loading..." />
        ) : (
          <Form onSubmit={handleSubmit(handleSave)} spaceY={4}>
            {/* Activity Name */}
            <FormField label="Activity Name" required>
              <TextInput
                name="activityName"
                control={control}
                placeholder=""
                maxLength={500}
                showCharacterCount={true}
                validationRules={{
                  required: 'Activity Name is required',
                }}
              />
            </FormField>

            {/* Associate this Activity with */}
            <FormField label="Associate this Activity with">
              <CheckboxGroupInput
                name="associateWith"
                control={control}
                mode="allowAll"
                options={associateWithOptions}
                hint="Tick the options from where this activity can be performed"
              />
            </FormField>

            {/* Mandatory Activity */}
            <FormField label="Mandatory Activity">
              <CheckboxInput
                name="mandatoryActivity"
                control={control}
                label="Yes"
              />
            </FormField>

            {/* Enforce Live Location Capture while Adding from App */}
            <FormField label="Enforce Live Location Capture while Adding from App">
              <CheckboxInput
                name="enforceLiveLocation"
                control={control}
                label="Yes"
                hint="Tick this if you want to enable real time location during addition"
              />
            </FormField>

            {/* Geofence - Always visible, disabled when Company/Opportunity not selected */}
            <FormField label="Geofence">
              <CheckboxInput
                name="geofence"
                control={control}
                label="Yes"
                hint="Select to activate geofence."
                disabled={!isGeofenceEnabled}
              />
            </FormField>

            {/* Geofence Distance - Only shown when geofence is checked */}
            {geofenceValue && (
              <FormField label="Geofence Distance (in meters)" required>
                <NumericInput
                  name="geofenceDistance"
                  control={control}
                  placeholder="Enter distance in meters"
                  minNumber={1}
                  validationRules={{
                    required: 'Geofence distance is required',
                  }}
                />
              </FormField>
            )}

            {/* Key */}
            <FormField label="Key" required>
              <TextInput
                name="key"
                control={control}
                placeholder=""
                maxLength={5}
                showCharacterCount={true}
                validationRules={{
                  required: 'Serial No. Key cannot be blank',
                  maxLength: {
                    value: 5,
                    message: 'Maximum 5 characters',
                  },
                }}
              />
            </FormField>
          </Form>
        )}
      </TwinModal>

      {/* Alert Dialog for Opportunity Selection */}
      <AlertDialog
        open={showOpportunityAlert}
        onClose={() => setShowOpportunityAlert(false)}
        title="Alert"
        titleIcon="info"
        message="Please make sure that field 'Select Opportunity' is Active in field details."
        buttons={[
          { label: 'OK', onClick: () => setShowOpportunityAlert(false), variant: 'ghost' }
        ]}
        closeOnBackdropClick={false}
      />
    </>
  );
};

export default AddActivity;
