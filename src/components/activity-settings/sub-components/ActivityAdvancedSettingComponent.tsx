import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useSnackbar } from 'notistack';
import TextInput from '@/components/common/input-fields/TextInput';
import Select from '@/components/common/input-fields/Select';
import MultiSelect from '@/components/common/input-fields/MultiSelect';
import CheckboxInput from '@/components/common/input-fields/CheckboxInput';
import CheckboxGroupInput from '@/components/common/input-fields/CheckboxGroupInput';
import NumericInput from '@/components/common/input-fields/wrapper/NumericInput';
import DateTimeInput from '@/components/common/input-fields/DateTimeInput';
import ToggleSwitchInput from '@/components/common/input-fields/ToggleSwitchInput';
import FormField from '@/components/common/input-fields/FormField';
import Form from '@/components/common/Form';
import Spinner from '@/components/common/Spinner';
import SaveButton from '@/components/common/buttons/SaveButton';
import CancelButton from '@/components/common/buttons/CancelButton';
import userRoleService from '@/lib/services/userRoleService';
import userService from '@/lib/services/userService';
import activitiesService from '@/lib/services/activitiesService';
import settingsService from '@/lib/services/settingsService';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import AdditionalFilterBuilder from './AdditionalFilterBuilder';

interface FieldOption {
  value: string;
  label: string;
  attributeTypeId: number;
  lookupValues: { id: number; lookupValue: string }[];
}

interface Props {
  projectId: number;
  activityId: number;
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
  showObjective: boolean;
  status: string;
  advancedSettings: boolean;
  activeFor: string;
  selectRoles: string[];
  selectUsers: string[];
  activityPeriodStart: string;
  activityPeriodEnd: string;
  applyAdditionalFilter: boolean;
  allowUserToAssign: string;
}

interface DynamicFieldNames {
  customersLabel: string | null;
  opportunitiesLabel: string | null;
  opportunityEnabled: boolean;
}

interface RoleOption {
  value: string;
  label: string;
}

interface UserOption {
  value: string;
  label: string;
}

const ActivityAdvancedSettingComponent: React.FC<Props> = ({
  projectId,
  activityId,
  onSave,
}) => {
  const { enqueueSnackbar } = useSnackbar();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [dynamicNames, setDynamicNames] = useState<DynamicFieldNames>({
    customersLabel: null,
    opportunitiesLabel: null,
    opportunityEnabled: false,
  });

  // Pre-fetched field options for AdditionalFilterBuilder
  const [initialFieldOptionsMap, setInitialFieldOptionsMap] = useState<Record<string, FieldOption[]>>({});

  // Track if any transaction has been performed against this activity
  const [anyTransactionPerformed, setAnyTransactionPerformed] = useState(false);

  // Store initial form values to reset on Cancel
  const initialFormValuesRef = useRef<FormValues | null>(null);

  const { control, handleSubmit, reset, setValue, getValues } = useForm<FormValues>({
    defaultValues: {
      activityName: '',
      associateWith: ['activities'],
      mandatoryActivity: false,
      enforceLiveLocation: false,
      geofence: false,
      geofenceDistance: '',
      key: '',
      showObjective: false,
      status: '1',
      advancedSettings: false,
      activeFor: '',
      selectRoles: [],
      selectUsers: [],
      activityPeriodStart: '',
      activityPeriodEnd: '',
      applyAdditionalFilter: false,
      allowUserToAssign: '0',
    },
    mode: 'onChange',
  });

  // Watch values for conditional rendering
  const associateWithValue = useWatch({ control, name: 'associateWith' });
  const geofenceValue = useWatch({ control, name: 'geofence' });
  const advancedSettingsValue = useWatch({ control, name: 'advancedSettings' });
  const activeForValue = useWatch({ control, name: 'activeFor' });
  const applyAdditionalFilterValue = useWatch({ control, name: 'applyAdditionalFilter' });
  const activityPeriodStartValue = useWatch({ control, name: 'activityPeriodStart' });

  // State for additional filter values
  const [additionalFilters, setAdditionalFilters] = useState<any[]>([]);

  // Determine if geofence should be enabled (when Company or Opportunity is selected)
  const isGeofenceEnabled = associateWithValue?.includes('consumers') || associateWithValue?.includes('opportunities');

  // Enable/disable geofence based on Company or Opportunity selection
  useEffect(() => {
    if (!isGeofenceEnabled) {
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

  // Fetch initial data when component mounts
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch dynamic field names, roles, users, and activity settings in parallel
        const [dynamicNamesResult, rolesResult, usersResult, activitySettingsResult] = await Promise.all([
          settingsService.getdynamicFieldNames(projectId),
          userRoleService.getUserRoles(projectId),
          userService.getActiveUsers(projectId),
          activitiesService.getActivitySettings(activityId, projectId),
        ]);

        // Check if component is still mounted
        if (!isMounted) return;

        // Process dynamic names
        const names: DynamicFieldNames = {
          customersLabel: null,
          opportunitiesLabel: null,
          opportunityEnabled: false,
        };
        dynamicNamesResult.responseData?.forEach((row: { moduleId: number; pluralName: string; opportunityEnabled?: boolean }) => {
          if (row.moduleId === SystemAttributeEnum.COMPANY_MODULE) {
            names.customersLabel = row.pluralName;
          }
          if (row.moduleId === SystemAttributeEnum.OPPORTUNITY_MODULE) {
            names.opportunitiesLabel = row.pluralName;
            names.opportunityEnabled = row.opportunityEnabled ?? false;
          }
        });
        setDynamicNames(names);

        // Process roles
        const roleOptions: RoleOption[] = (rolesResult.responseData || []).map((role: any) => ({
          value: String(role.roleId),
          label: role.roleName,
        }));
        setRoles(roleOptions);

        // Process users
        const userOptions: UserOption[] = (usersResult.responseData || []).map((user: any) => ({
          value: String(user.userId),
          label: `${user.firstName || ''} ${user.lastName || ''}`.trim() || String(user.userId),
        }));
        setUsers(userOptions);

        // Populate activity settings from API response
        const activity = activitySettingsResult.responseData;
        if (activity) {
          // Store transaction status to disable fields accordingly
          setAnyTransactionPerformed(!!activity.anyTransactionPerformed);
          // Helper to check if value equals 1 (handles both string and number)
          const isOne = (val: any) => val === 1 || val === '1';

          // Build associateWith array from activity data
          const associateWith: string[] = ['activities'];
          if (isOne(activity.allowForCompanies)) associateWith.push('consumers');
          if (isOne(activity.allowForOpportunities)) associateWith.push('opportunities');
          if (isOne(activity.allowForDialer)) associateWith.push('dialer');

          // Parse selected roles/users from selectedIdList if available
          const selectedIds: string[] = Array.isArray(activity.selectedIdList)
            ? activity.selectedIdList.map((id: number) => String(id))
            : activity.selectedIdList
              ? String(activity.selectedIdList).split(',').map((id: string) => id.trim()).filter(Boolean)
              : [];

          // Determine if selectedIds are roles or users based on activeFor value
          const activeForVal = activity.activeFor != null ? String(activity.activeFor) : '';
          const selectedRoles: string[] = activeForVal === '1' ? selectedIds : [];
          const selectedUsers: string[] = activeForVal === '2' ? selectedIds : [];

          // Helper to convert 12-hour AM/PM time to 24-hour format
          const convertTo24Hour = (time12h: string): string => {
            const timeParts = time12h.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!timeParts) return '00:00';
            let hours = parseInt(timeParts[1], 10);
            const minutes = timeParts[2];
            const period = timeParts[3].toUpperCase();
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            return `${String(hours).padStart(2, '0')}:${minutes}`;
          };

          // Combine startDate + startTime into activityPeriodStart (format: YYYY-MM-DD HH:mm)
          let activityPeriodStart = '';
          if (activity.startDate && activity.startTime) {
            const time24h = convertTo24Hour(activity.startTime);
            activityPeriodStart = `${activity.startDate} ${time24h}`;
          }

          // Combine endDate + endTime into activityPeriodEnd (format: YYYY-MM-DD HH:mm)
          let activityPeriodEnd = '';
          if (activity.endDate && activity.endTime) {
            const time24h = convertTo24Hour(activity.endTime);
            activityPeriodEnd = `${activity.endDate} ${time24h}`;
          }

          // Parse additionalEntityFilterList into filter format
          let parsedFilters: any[] = [];
          if (activity.additionalEntityFilterList && Array.isArray(activity.additionalEntityFilterList)) {
            parsedFilters = activity.additionalEntityFilterList.map((filter: any, index: number) => {
              // Map entityId to entity string (2 = consumer/company, 3 = opportunity)
              let entity = '';
              if (filter.entityId === 2) entity = 'consumer';
              else if (filter.entityId === 3) entity = 'opportunity';

              return {
                id: filter.id || Date.now() + index,
                entity,
                entityField: String(filter.entityFieldId),
                values: filter.entityFieldValue ? filter.entityFieldValue.split(',').map((v: string) => v.trim()) : [],
                operator: filter.conditionOperation === 'AND' ? 'AND' : 'OR',
              };
            });
            setAdditionalFilters(parsedFilters);
          }

          // Pre-fetch field options for entities used in filters
          const uniqueEntities = Array.from(new Set(parsedFilters.map(f => f.entity).filter(Boolean)));
          if (uniqueEntities.length > 0) {
            const fieldOptionsMap: Record<string, FieldOption[]> = {};

            // Fetch fields for each unique entity
            await Promise.all(uniqueEntities.map(async (entityValue) => {
              const moduleType = entityValue === 'consumer'
                ? SystemAttributeEnum.COMPANY_MODULE
                : SystemAttributeEnum.OPPORTUNITY_MODULE;

              try {
                const fields = await settingsService.getFormFields(projectId, moduleType);

                // Filter only single-select and multi-select fields
                const allowedTypes = new Set([
                  CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN,
                  CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN,
                ]);

                const filteredFields: FieldOption[] = (fields || [])
                  .filter((field: any) => {
                    const typeId = field?.attributeType?.id;
                    return allowedTypes.has(typeId) && field.status !== 0;
                  })
                  .map((field: any) => ({
                    value: String(field.id),
                    label: field.attributeName || field.attributeIdentifierName || 'Field',
                    attributeTypeId: field.attributeType?.id,
                    lookupValues: field.lookupValues || [],
                  }));

                fieldOptionsMap[entityValue] = filteredFields;
              } catch (error) {
                console.error(`Error fetching fields for ${entityValue}:`, error);
                fieldOptionsMap[entityValue] = [];
              }
            }));

            setInitialFieldOptionsMap(fieldOptionsMap);
          }

          const formValues: FormValues = {
            activityName: activity.activityName || '',
            associateWith,
            mandatoryActivity: isOne(activity.isMandatory),
            enforceLiveLocation: isOne(activity.captureLiveLocation),
            geofence: isOne(activity.allowGeofence),
            geofenceDistance: activity.geofenceDistance || '',
            key: activity.serialKey || '',
            showObjective: isOne(activity.showObjective),
            status: isOne(activity.active) ? '1' : '0',
            advancedSettings: isOne(activity.advanceSetting),
            activeFor: activeForVal,
            selectRoles: selectedRoles,
            selectUsers: selectedUsers,
            activityPeriodStart,
            activityPeriodEnd,
            applyAdditionalFilter: isOne(activity.additionalFilter),
            allowUserToAssign: activity.allowUserToAssignOther != null ? String(activity.allowUserToAssignOther) : '0',
          };

          // Store initial values for Cancel reset
          initialFormValuesRef.current = formValues;

          reset(formValues);
        }
      } catch (error: any) {
        // Don't show error if component was unmounted
        if (!isMounted) return;
        console.error('Error fetching data:', error);
        enqueueSnackbar('Failed to load activity settings', { variant: 'error' });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (projectId && activityId) {
      fetchData();
    }

    return () => {
      isMounted = false;
    };
  }, [projectId, activityId, reset, enqueueSnackbar]);

  const handleSave = useCallback(async (data: FormValues) => {
    // Check if additional filter is enabled but no entities are selected
    const hasEntitySelected = data.associateWith?.includes('consumers') || data.associateWith?.includes('opportunities');
    if (data.advancedSettings && data.applyAdditionalFilter && !hasEntitySelected) {
      enqueueSnackbar('Please select at least one entity (Consumer or Opportunity) in "Associate This Activity With" or uncheck "Apply Additional Filter"', { variant: 'error' });
      return;
    }

    setIsSaving(true);

    try {
      // Helper to convert 24-hour time to 12-hour AM/PM format
      const convertTo12Hour = (time24h: string): string => {
        const [hours, minutes] = time24h.split(':');
        let h = parseInt(hours, 10);
        const period = h >= 12 ? 'PM' : 'AM';
        if (h > 12) h -= 12;
        if (h === 0) h = 12;
        return `${h}:${minutes} ${period}`;
      };

      // Parse activityPeriodStart into startDate and startTime (format: YYYY-MM-DD HH:mm)
      let startDate: string | null = null;
      let startTime: string | null = null;
      if (data.advancedSettings && data.activityPeriodStart) {
        // Handle both "YYYY-MM-DD HH:mm" (space) and "YYYY-MM-DDTHH:mm" (T) formats
        const parts = data.activityPeriodStart.includes('T')
          ? data.activityPeriodStart.split('T')
          : data.activityPeriodStart.split(' ');
        startDate = parts[0];
        if (parts[1]) {
          startTime = convertTo12Hour(parts[1]);
        }
      }

      // Parse activityPeriodEnd into endDate and endTime
      let endDate: string | null = null;
      let endTime: string | null = null;
      if (data.advancedSettings && data.activityPeriodEnd) {
        const parts = data.activityPeriodEnd.includes('T')
          ? data.activityPeriodEnd.split('T')
          : data.activityPeriodEnd.split(' ');
        endDate = parts[0];
        if (parts[1]) {
          endTime = convertTo12Hour(parts[1]);
        }
      }

      // Transform additional filters for API
      const additionalEntityFilterList = data.advancedSettings && data.applyAdditionalFilter && additionalFilters.length > 0
        ? additionalFilters.map(filter => ({
            activityTypeId: activityId,
            entityId: filter.entity === 'consumer' ? '2' : '3', // 2 = Customer, 3 = Opportunity
            entityFieldId: parseInt(filter.entityField, 10),
            entityFieldValue: filter.values.join(','),
            conditionOperation: filter.operator,
          }))
        : [];

      // Get selected IDs as array of numbers
      const selectedIdList = data.advancedSettings && data.activeFor
        ? (data.activeFor === '1' ? data.selectRoles : data.selectUsers).map(id => parseInt(id, 10))
        : [];

      // Get current user time and timezone
      const now = new Date();
      const userTime = now.toISOString().slice(0, 19).replace('T', ' ');
      const transTimeZone = 'IST';

      const payload = {
        activityId,
        activityName: data.activityName.trim(),
        allowForCompanies: data.associateWith?.includes('consumers') ? 1 : 0,
        projectId,
        allowForOpportunities: dynamicNames.opportunityEnabled
          ? (data.associateWith.includes('opportunities') ? 1 : 0)
          : 0,
        allowForDialer: data.associateWith?.includes('dialer') ? 1 : 0,
        allowGeofence: data.geofence ? 1 : 0,
        geofenceDistance: data.geofence && data.geofenceDistance ? Number(data.geofenceDistance) : null,
        showObjective: data.showObjective ? 1 : 0,
        active: data.status,
        captureLiveLocation: data.enforceLiveLocation ? 1 : 0,
        isMandatory: data.mandatoryActivity ? 1 : 0,
        advanceSetting: data.advancedSettings ? 1 : 0,
        activeFor: data.advancedSettings ? data.activeFor : null,
        startDate,
        endDate,
        additionalFilter: data.advancedSettings ? (data.applyAdditionalFilter ? 1 : 0) : 0,
        allowUserToAssignOther: data.advancedSettings ? data.allowUserToAssign : '0',
        endTime,
        startTime,
        selectedIdList,
        additionalEntityFilterList,
        serialKey: data.key.trim(),
        userTime,
        transTimeZone,
      };

      const response = await activitiesService.saveActivity(payload);

      if (response.statusCode >= 400) {
        enqueueSnackbar(response.message || 'An error occurred while saving the activity', { variant: 'error' });
        return;
      }

      enqueueSnackbar('Activity settings saved successfully', { variant: 'success' });
      onSave?.();
    } catch (error) {
      console.error('Error saving activity:', error);
      enqueueSnackbar(error instanceof Error ? error.message : 'An error occurred while saving the activity', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [projectId, activityId, dynamicNames.opportunityEnabled, additionalFilters, enqueueSnackbar, onSave]);

  // Build options array for associate with checkboxes
  const associateWithOptions = [
    { value: 'activities', label: 'Activities', disabled: true },
    dynamicNames.customersLabel ? { value: 'consumers', label: dynamicNames.customersLabel } : null,
    dynamicNames.opportunitiesLabel && dynamicNames.opportunityEnabled ? { value: 'opportunities', label: dynamicNames.opportunitiesLabel } : null,
    { value: 'dialer', label: 'Dialer' },
  ].filter(Boolean) as { value: string; label: string; disabled?: boolean }[];

  // Status options
  const statusOptions = [
    { value: '1', label: 'Active' },
    { value: '0', label: 'Inactive' },
  ];

  // Active For options
  const activeForOptions = [
    { value: '1', label: 'Roles' },
    { value: '2', label: 'Users' },
  ];

  // Allow User to Assign options
  const allowUserToAssignOptions = [
    { value: '0', label: 'None' },
    { value: '1', label: 'Any user' },
    { value: '2', label: 'Up the hierarchy' },
    { value: '3', label: 'Down the hierarchy' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="medium" customLoadingName="Loading activity settings..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-lg border border-gray-300 bg-white" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Scrollable Form Container */}
      <div className="flex-1 overflow-y-auto px-6 my-4 min-h-0">
        <Form onSubmit={handleSubmit(handleSave)} spaceY={4}>
          {/* Activity Name */}
          <FormField label="Activity Name" required>
            <TextInput
              name="activityName"
              control={control}
              placeholder="Enter Info"
              maxLength={500}
              showCharacterCount={true}
              validationRules={{
                required: 'Activity Name is required',
              }}
            />
          </FormField>

          {/* Associate this Activity with */}
          <FormField label="Associate This Activity With">
            <CheckboxGroupInput
              name="associateWith"
              control={control}
              mode="allowAll"
              options={associateWithOptions}
              hint='Tick the options from where this activity can be performed'
            />
          </FormField>

          {/* Mandatory Activity */}
          <FormField label="Mandatory Activity">
            <CheckboxInput
              name="mandatoryActivity"
              control={control}
            />
          </FormField>

          {/* Enforce Live Location Capture while Adding from App */}
          <FormField label="Enforce Live Location while Adding the App">
            <CheckboxInput
              name="enforceLiveLocation"
              control={control}
              label="Yes"
              hint="Tick this if you want to enable real time location during addition"
            />
          </FormField>

          {/* Geofence */}
          <FormField label="Geofence">
            <CheckboxInput
              name="geofence"
              control={control}
              label="Yes"
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
                isSystemAttribute={true}
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
              placeholder="Enter Info"
              maxLength={5}
              showCharacterCount={true}
              disabled={anyTransactionPerformed}
              validationRules={{
                required: 'Key is required',
                maxLength: {
                  value: 5,
                  message: 'Maximum 5 characters',
                },
              }}
            />
          </FormField>

          {/* Show Objective */}
          <FormField label="Show Objective">
            <CheckboxInput
              name="showObjective"
              control={control}
              hint={"Tick this checkbox if you want to show objective of the activity"}
            />
          </FormField>

          {/* Status */}
          <FormField label="Status" required>
            <Select
              name="status"
              control={control}
              options={statusOptions}
              validationRules={{
                required: 'Status is required',
              }}
            />
          </FormField>

          {/* Advanced Settings Toggle */}
          <FormField labelColSpan={null} inputColSpan={3} fixedHeight={true}>
            <div className='flex gap-[16px] items-center'>
              <label className="block text-sm font-medium text-gray-700">
                Advanced Settings
              </label>
              <ToggleSwitchInput
                name="advancedSettings"
                control={control}
              />
            </div>
          </FormField>

          {/* Advanced Settings Section - Conditionally rendered */}
          {advancedSettingsValue && (
            <>
              {/* Active For */}
              <FormField label="Active For" required>
                <Select
                  name="activeFor"
                  control={control}
                  options={activeForOptions}
                  placeholder="Select"
                  hint="Select to activate this activity for selected users, blank defaults to no restriction"
                  validationRules={{
                    required: 'Active For is required',
                  }}
                  onChange={() => {
                    // Clear both selectRoles and selectUsers when activeFor changes
                    setValue('selectRoles', []);
                    setValue('selectUsers', []);
                  }}
                />
              </FormField>

              {/* Select Roles - Only shown when Active For is "1" (Roles) */}
              {activeForValue === '1' && (
                <FormField label="Select Roles" required>
                  <MultiSelect
                    name="selectRoles"
                    control={control}
                    options={roles}
                    placeholder="Select Roles"
                    validationRules={{
                      required: 'Please select at least one role',
                    }}
                  />
                </FormField>
              )}

              {/* Select Users - Only shown when Active For is "2" (Users) */}
              {activeForValue === '2' && (
                <FormField label="Select Users" required>
                  <MultiSelect
                    name="selectUsers"
                    control={control}
                    options={users}
                    placeholder="Select Users"
                    validationRules={{
                      required: 'Please select at least one user',
                    }}
                  />
                </FormField>
              )}

              {/* Activity Period */}
              <FormField label="Activity Period">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <DateTimeInput
                      name="activityPeriodStart"
                      control={control}
                      placeholder="YYYY-MM-DD HH:MM"
                      minDateTime={anyTransactionPerformed ? undefined : new Date().toISOString().slice(0, 16)}
                      disabled={anyTransactionPerformed}
                      hint={"Select Start Date-Time for this activity, blank defaults to no limit"}
                      validationRules={!anyTransactionPerformed ? {
                        validate: (value: string) => {
                          if (!value) return true;
                          const now = new Date();
                          now.setSeconds(0, 0);
                          return new Date(value) >= now || 'Start date must be greater than or equal to current date';
                        }
                      } : undefined}
                    />
                  </div>
                  <div className="flex-1">
                    <DateTimeInput
                      name="activityPeriodEnd"
                      control={control}
                      placeholder="YYYY-MM-DD HH:MM"
                      minDateTime={anyTransactionPerformed
                        ? new Date().toISOString().slice(0, 16)
                        : (activityPeriodStartValue || new Date().toISOString().slice(0, 16))}
                      hint={"Select End Date-Time for this activity, blank defaults to no limit"}
                      validationRules={{
                        validate: (value: string) => {
                          if (!value) return true;
                          const now = new Date();
                          now.setSeconds(0, 0);
                          if (new Date(value) <= now) {
                            return 'End date must be greater than current date';
                          }
                          if (activityPeriodStartValue && new Date(value) <= new Date(activityPeriodStartValue)) {
                            return 'End date must be greater than start date';
                          }
                          return true;
                        }
                      }}
                    />
                  </div>
                </div>
              </FormField>

              {/* Apply Additional Filter */}
              <FormField label="Apply Additional Filter">
                <CheckboxInput
                  name="applyAdditionalFilter"
                  control={control}
                  label="Yes"
                  hint="Tick this if you want this activity to be performed at specific customers or opportunities"
                />
              </FormField>

              {/* Additional Filter Builder - Only shown when Apply Additional Filter is checked */}
              {applyAdditionalFilterValue && (
                <FormField label="Select Values">
                  <AdditionalFilterBuilder
                    projectId={projectId}
                    control={control}
                    setValue={setValue}
                    associateWith={associateWithValue || []}
                    dynamicNames={{
                      customersLabel: dynamicNames.customersLabel,
                      opportunitiesLabel: dynamicNames.opportunitiesLabel,
                    }}
                    value={additionalFilters}
                    onChange={setAdditionalFilters}
                    initialFieldOptionsMap={initialFieldOptionsMap}
                  />
                </FormField>
              )}

              {/* Allow User to Assign the Activity to Other users */}
              <FormField label="Allow User to Assign the Activity to Other users" required>
                <Select
                  name="allowUserToAssign"
                  control={control}
                  options={allowUserToAssignOptions}
                  validationRules={{
                    required: 'This field is required',
                  }}
                />
              </FormField>
            </>
          )}
        </Form>
      </div>

      {/* Fixed Action Buttons - Outside the form */}
      <div
        className="flex-shrink-0 flex justify-end gap-4 border-t border-gray-200 bg-white rounded-b-lg"
        style={{ padding: '16px' }}
      >
        <CancelButton
          onClick={() => {
            // Reset to initial values loaded from API
            if (initialFormValuesRef.current) {
              reset(initialFormValuesRef.current);
            }
          }}
          disabled={isSaving}
        />
        <SaveButton
          onClick={handleSubmit(handleSave)}
          loading={isSaving}
          disabled={isSaving}
        />
      </div>
    </div>
  );
};

export default ActivityAdvancedSettingComponent;
