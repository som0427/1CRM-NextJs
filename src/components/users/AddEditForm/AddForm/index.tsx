import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useEntityHeading } from '@/hooks/useEntityHeading';
import { Button } from '../../../ui/tailwind';
import { getProjectId } from '@/lib/storage/sharedStorage';
import userRoleService from '@/lib/services/userRoleService';
import userService from '@/lib/services/userService';
import userManagementService from '@/lib/services/userManagementService';
import settingsService from '@/lib/services/settingsService';
import uploadService from '@/lib/services/uploadService';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import { useSnackbar } from 'notistack';
import TextInput from '@/components/common/input-fields/TextInput';
import NumericInput from '@/components/common/input-fields/wrapper/NumericInput';
import Select from '@/components/common/input-fields/Select';
import MultiSelect from '@/components/common/input-fields/MultiSelect';
import DateInput from '@/components/common/input-fields/DateInput';
import RadioInput from '@/components/common/input-fields/RadioInput';
import TextArea from '@/components/common/input-fields/TextArea';
import CheckboxInput from '@/components/common/input-fields/CheckboxInput';
import UploadInput from '@/components/common/input-fields/UploadInput';
import TwinModal from '@/components/common/TwinModal';
import Spinner from '@/components/common/Spinner';

interface AddFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

type DynamicFormValues = Record<string, any>;

const AddForm: FC<AddFormProps> = ({ open, onClose, onSuccess, onError }) => {
  const { enqueueSnackbar } = useSnackbar();
  const pageHeading = useEntityHeading('Users', 'Users');
  const projectId = getProjectId() || 0;
  const baseFileUrl = process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL || '';

  const {
    handleSubmit,
    control,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<DynamicFormValues>({
    defaultValues: {},
  });

  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [managers, setManagers] = useState<{ id: number; name: string }[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [formLoading, setFormLoading] = useState<boolean>(true);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [childLoading, setChildLoading] = useState<string | null>(null);
  const [passwordControlName, setPasswordControlName] = useState<string>('');
  const [setPasswordCheckboxName, setSetPasswordCheckboxName] = useState<string>('');
  const [isMobileEmailLinked, setIsMobileEmailLinked] = useState<boolean>(false);
  const [emailMobileFieldVar, setEmailMobileFieldVar] = useState<string>('');
  const lastQueriedValueRef = useRef<Record<string, string>>({});

  // Watch the set password checkbox value
  const setUserPassword = watch(setPasswordCheckboxName) === true;

  const fieldNameById = useMemo(() => {
    const map: Record<number, string> = {};
    customFields.forEach((f) => {
      if (f.id && f.combinedAttributeName) {
        map[f.id] = f.combinedAttributeName;
      }
    });
    return map;
  }, [customFields]);

  const sortFields = (list: any[]) =>
    [...list].sort((a, b) => {
      const fieldOrderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const fieldOrderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
      return fieldOrderA - fieldOrderB;
    });

  useEffect(() => {
    if (!open) {
      setDataLoaded(false);
      return;
    }
    
    let isMounted = true;
    const loadFormData = async () => {
      setFormLoading(true);
      setDataLoaded(false);

      if (!projectId) {
        if (isMounted) setFormLoading(false);
        return;
      }

      try {
        // Fetch roles
        try {
          const roleResp = await userRoleService.getUserRoles(projectId);
          if (isMounted && roleResp?.responseData) {
            const mapped = roleResp.responseData
              .filter((r: any) => r.active === undefined || r.active === 1)
              .map((r: any) => ({ id: r.roleId, name: r.roleName }));
            setRoles(mapped);
          }
        } catch (err) {
          if (isMounted) setRoles([]);
        }

        // Fetch managers (active users for Reports To or Parallel Reporting field)
        try {
          const mgrResp = await userService.getActiveUsers(projectId);
          if (isMounted && mgrResp?.responseData) {
            const mapped = mgrResp.responseData.map((u: any) => ({
              id: u.id || u.userId,
              name: `${u.firstName || ''} - ${u.userName || ''}`.trim(),
            }));
            setManagers(mapped);
          }
        } catch (err) {
          if (isMounted) setManagers([]);
        }

        // Fetch custom fields
        let fieldData: any[] = [];
        try {
          const fieldsResp: any = await settingsService.getFormFields(projectId, SystemAttributeEnum.USER_MODULE);
          fieldData = Array.isArray(fieldsResp) ? fieldsResp : fieldsResp?.responseData || [];
        } catch (err) {
          fieldData = [];
        }

        // Filter active fields
        let activeFields = fieldData.filter((f: any) => f.status === 1);

        // Ensure systemAttribute is not null
        activeFields = activeFields.map((f: any) => ({
          ...f,
          systemAttribute: f.systemAttribute || {},
        }));

        // Find password control name and set password checkbox name
        const pwdField = activeFields.find((f: any) => f.systemAttribute?.id === SystemAttributeEnum.USER_PASSWORD_FIELD_ID);
        if (pwdField) {
          setPasswordControlName(pwdField.combinedAttributeName);
        }
        const setPasswordField = activeFields.find((f: any) => f.systemAttribute?.id === SystemAttributeEnum.USER_SET_PASSWORD_CHECKBOX_FIELD_ID);
        if (setPasswordField) {
          setSetPasswordCheckboxName(setPasswordField.combinedAttributeName);
        }

        // Sort fields - lookupValues are already included in getFields response
        activeFields = sortFields(activeFields);

        // Set default values for fields
        const defaults: Record<string, any> = {};
        activeFields.forEach((field: any) => {
          const name = field.combinedAttributeName;
          const typeId = field.attributeType?.id;
          
          // Project ID field - set first lookup value
          if (field.systemAttribute?.id === 61 && field.lookupValues?.length > 0) {
            defaults[name] = field.lookupValues[0]?.id?.toString() || '';
          } 
          // Single select - set lookupValue if exists
          else if (typeId === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN && field.lookupValue) {
            defaults[name] = field.lookupValue?.id?.toString() || '';
          }
          // Multi select - set lookupValue array if exists
          else if (typeId === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN && field.lookupValue) {
            const lookupValues = Array.isArray(field.lookupValue) ? field.lookupValue : [field.lookupValue];
            defaults[name] = lookupValues.map((lv: any) => lv?.id?.toString()).filter(Boolean);
          }
          // Radio - set lookupValue if exists
          else if (typeId === CustomAttributeTypeEnum.RADIO && field.lookupValue) {
            defaults[name] = field.lookupValue?.id?.toString() || '';
          }
          // Data List - set lookupValue if exists
          else if (typeId === CustomAttributeTypeEnum.DATA_LIST && field.lookupValue) {
            defaults[name] = field.lookupValue?.id?.toString() || '';
          }
          else {
            defaults[name] = '';
          }
        });

        if (isMounted) {
          setCustomFields(activeFields);
          reset(defaults);
        }
      } catch (err) {
        if (isMounted) {
          enqueueSnackbar('Unable to load form fields', { variant: 'error' });
        }
      } finally {
        if (isMounted) {
          setFormLoading(false);
          setDataLoaded(true);
        }
      }
    };

    loadFormData();

    return () => {
      isMounted = false;
    };
  }, [open, projectId, enqueueSnackbar, reset]);

  // Fetch child attributes when parent selection changes
  const fetchChildAttributes = useCallback(
    async (parentField: any, selectedValue: any) => {
      if (!parentField.hasChildAttribute && 
          parentField.systemAttribute?.id !== SystemAttributeEnum.USER_ROLE_FIELD_ID &&
          parentField.systemAttribute?.id !== SystemAttributeEnum.USER_STATUS_FIELD_ID) {
        return;
      }

      const attributeId = parentField.attributeType?.id === CustomAttributeTypeEnum.DATA_LIST 
        ? parentField.parentDataListId 
        : parentField.id;
      const lookupId = typeof selectedValue === 'object' ? selectedValue?.id : selectedValue;

      if (!lookupId) return;

      setChildLoading(parentField.combinedAttributeName);
      try {
        const resp = await settingsService.getFieldRelation(attributeId, Number(lookupId));
        if (resp?.responseData?.length > 0) {
          const childFields = resp.responseData.filter((f: any) => f.status === 1);
          
          setCustomFields((prev) => {
            const updated = [...prev];
            childFields.forEach((child: any) => {
              const existingIdx = updated.findIndex((f) => f.id === child.id);
              if (existingIdx >= 0) {
                updated[existingIdx] = { ...updated[existingIdx], lookupValues: child.lookupValues, isVisible: true };
              }
            });
            return updated;
          });
        }
      } catch (err) {
        console.error('Failed to fetch child attributes', err);
      } finally {
        setChildLoading(null);
      }
    },
    [],
  );

  // Handle email/mobile blur to check for existing user
  const handleFieldBlur = useCallback(
    async (systemAttribId: number, fieldName: string) => {
      const value = getValues(fieldName);
      if (!value || !String(value).trim()) return;

      const isEmail = systemAttribId === SystemAttributeEnum.USER_WORK_EMAIL_FIELD_ID;
      const emailOrMobile = String(value).trim();
      const normalized = isEmail ? emailOrMobile.toLowerCase() : emailOrMobile;

      if (lastQueriedValueRef.current[fieldName] === normalized) return;

      // Find email and mobile field names
      let emailFieldName = '';
      let mobileFieldName = '';
      customFields.forEach((f) => {
        if (f.systemAttribute?.id === SystemAttributeEnum.USER_MOBILE_NUMBER_FIELD_ID) {
          mobileFieldName = f.combinedAttributeName;
        } else if (f.systemAttribute?.id === SystemAttributeEnum.USER_WORK_EMAIL_FIELD_ID) {
          emailFieldName = f.combinedAttributeName;
        }
      });

      const emailVal = emailFieldName ? String(getValues(emailFieldName) || '').trim() : '';
      const mobileVal = mobileFieldName ? String(getValues(mobileFieldName) || '').trim() : '';

      if (mobileVal.length > 0 || emailVal.length > 0) {
        try {
          const resp = await userService.checkEmailOrMobileAlreadyExist(isEmail, emailOrMobile);
          lastQueriedValueRef.current[fieldName] = normalized;

          const responseData = resp?.responseData;
          if (isEmail) {
            setEmailMobileFieldVar('Mobile Number');
            if (responseData?.length > 0 && mobileFieldName) {
              setIsMobileEmailLinked(true);
              setValue(mobileFieldName, responseData, { shouldValidate: false });
            }
          } else {
            setEmailMobileFieldVar('Email Id');
            if (responseData?.length > 0 && emailFieldName) {
              setIsMobileEmailLinked(true);
              setValue(emailFieldName, responseData, { shouldValidate: false });
            }
          }
        } catch (err) {
          console.error('Error checking email/mobile', err);
        }
      }
    },
    [customFields, getValues, setValue],
  );

  // Clear password field when set password checkbox is unchecked
  useEffect(() => {
    if (!setUserPassword && passwordControlName) {
      setValue(passwordControlName, '');
    }
  }, [setUserPassword, passwordControlName, setValue]);

  // Dismiss linked email/mobile notification
  const dismissLinkedNotification = useCallback(() => {
    setIsMobileEmailLinked(false);
  }, []);

  // Show first validation error in a popup when submit is attempted
  useEffect(() => {
    if (!isSubmitted) return;
    const firstError = Object.values(errors).find((err: any) => err?.message);
    const firstErrorMessage = firstError?.message;
    if (firstErrorMessage && typeof firstErrorMessage === 'string') {
      enqueueSnackbar(firstErrorMessage, { variant: 'error' });
    }
  }, [errors, isSubmitted, enqueueSnackbar]);

  // Check if field should render (for child attributes)
  const shouldFieldRender = useCallback(
    (field: any) => {
      if (field.parentAttributeId && field.parentAttributeId > 0) {
        const parentField = customFields.find((f) => f.id === field.parentAttributeId);
        if (parentField) {
          const parentValue = watch(parentField.combinedAttributeName);
          if (!parentValue) return false;
        }
      }
      return true;
    },
    [customFields, watch],
  );

  // Build payload for save
  const buildPayload = useCallback(() => {
    const customAttributeValues: any[] = [];

    customFields.forEach((field) => {
      const name = field.combinedAttributeName;
      const value = getValues(name);

      // Skip set password checkbox field
      if (field.systemAttribute?.id === SystemAttributeEnum.USER_SET_PASSWORD_CHECKBOX_FIELD_ID) {
        return;
      }

      // Skip password field if set password is not checked
      if (field.systemAttribute?.id === SystemAttributeEnum.USER_PASSWORD_FIELD_ID && !setUserPassword) {
        return;
      }

      let formattedValue = '';

      switch (field.attributeType?.id) {
        case CustomAttributeTypeEnum.DATE:
          if (value) {
            const d = new Date(value);
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            formattedValue = `${d.getFullYear()}-${month}-${day}`;
          }
          break;
        case CustomAttributeTypeEnum.IMAGE:
        case CustomAttributeTypeEnum.DOCUMENT_UPLOAD:
        case CustomAttributeTypeEnum.AUDIO_VIDEO:
          formattedValue = Array.isArray(value) ? value.join(',') : '';
          break;
        case CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN:
          formattedValue = Array.isArray(value) ? value.join(',') : '';
          break;
        default:
          formattedValue = value != null ? String(value).trim() : '';
      }

      customAttributeValues.push({
        attributeId: field.id,
        parentLinkedDatalistAttribId: field.moduleType === 6 ? field.parentLinkedDataListAttribId : null,
        value: formattedValue,
        systemAttributeId: field.systemAttribute?.id || null,
      });
    });

    return {
      projectId,
      moduleType: SystemAttributeEnum.USER_MODULE,
      customAttributeValues,
    };
  }, [customFields, getValues, projectId, setUserPassword]);

  // Submit handler
  const onSubmit = async () => {
    try {
      const payload = buildPayload();
      const response = await userManagementService.saveUserData(payload);

      if (response?.statusCode === 412) {
        enqueueSnackbar(response.message || 'Validation error', { variant: 'error' });
        return;
      }

      if (response && response.statusCode >= 200 && response.statusCode < 300) {
        onSuccess?.();
        onClose();
        reset();
      } else {
        const message = response?.message || 'Unable to add user';
        if (onError) {
          onError(message);
        } else {
          enqueueSnackbar(message, { variant: 'error' });
        }
      }
    } catch (error: any) {
      const message = error?.response?.data?.responseData?.errorMsg || 'Unable to add user';
      if (onError) {
        onError(message);
      } else {
        enqueueSnackbar(message, { variant: 'error' });
      }
    }
  };

  // Render field based on type
  const renderField = (field: any) => {
    if (!shouldFieldRender(field)) return null;

    const name = field.combinedAttributeName;
    const label = field.attributeName;
    const isMandatory = field.mandatoryFlag === 1;
    const isDisabled = field.systemAttribute?.id === 61; // Project ID field
    const typeId = field.attributeType?.id;

    // Skip set password checkbox - render custom checkbox
    if (field.systemAttribute?.id === SystemAttributeEnum.USER_SET_PASSWORD_CHECKBOX_FIELD_ID) {
      return (
        <div key={field.id} className="grid grid-cols-12 gap-6 items-start min-h-[54px]">
          <div className="col-span-4 pt-1.5">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
          </div>
          <div className="col-span-8">
            <CheckboxInput
              name={name}
              control={control}
              label="Yes"
              hint={field.instructions}
              hintSizeClass="text-[10px]"
            />
          </div>
        </div>
      );
    }

    // Skip password field if set password is not checked
    if (field.systemAttribute?.id === SystemAttributeEnum.USER_PASSWORD_FIELD_ID && !setUserPassword) {
      return null;
    }

    switch (typeId) {
      case CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN:
        // Use roles from getUserRole API for role field (systemAttribute.id === 57)
        // Use managers from getActiveUserList API for reports to field (systemAttribute.id === 58)
        let selectOptions;
        if (field.systemAttribute?.id === SystemAttributeEnum.USER_ROLE_FIELD_ID) {
          selectOptions = roles.map((role) => ({
            value: String(role.id),
            label: role.name,
          }));
        } else if ([SystemAttributeEnum.USER_REPORTS_TO_FIELD_ID, SystemAttributeEnum.USER_PARALLEL_REPORTING_FIELD_ID].includes(field.systemAttribute?.id)) {
          selectOptions = managers.map((user) => ({
            value: String(user.id),
            label: user.name,
          }));
        } else {
          selectOptions = (field.lookupValues || []).map((opt: any) => ({
            value: String(opt.id),
            label: opt.lookupValue || opt.name,
          }));
        }
        return (
          <div key={field.id} className="grid grid-cols-12 gap-6 items-start min-h-[54px]">
            <div className="col-span-4 pt-1.5">
              <label className="block text-sm font-medium text-gray-700">
                {label}{isMandatory && <span className="text-[#F64E60] ml-1">*</span>}
              </label>
            </div>
            <div className="col-span-8">
              <Select
                name={name}
                control={control}
                validationRules={{ required: isMandatory ? `${label} is required` : false }}
                options={selectOptions}
                placeholder={`Select ${label}`}
                disabled={isDisabled}
                hint={field.instructions ? <div className="text-[10px]">{field.instructions}</div> : undefined}
                onChange={(value) => {
                  if (field.hasChildAttribute) {
                    fetchChildAttributes(field, value);
                  }
                }}
              />
            </div>
          </div>
        );

      case CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN:
        const multiSelectValidation: any = {
          required: isMandatory ? `${label} is required` : false,
        };
        if (field.minSelection) {
          multiSelectValidation.validate = {
            ...multiSelectValidation.validate,
            minSelection: (value: any) => !value || value.length >= field.minSelection || `Select at least ${field.minSelection} options`,
          };
        }
        if (field.maxSelection) {
          multiSelectValidation.validate = {
            ...multiSelectValidation.validate,
            maxSelection: (value: any) => !value || value.length <= field.maxSelection || `Select at most ${field.maxSelection} options`,
          };
        }
        return (
          <div key={field.id} className="grid grid-cols-12 gap-6 items-start min-h-[54px]">
            <div className="col-span-4 pt-1.5">
              <label className="block text-sm font-medium text-gray-700">
                {label}{isMandatory && <span className="text-[#F64E60] ml-1">*</span>}
              </label>
            </div>
            <div className="col-span-8">
              <MultiSelect
                name={name}
                control={control}
                validationRules={multiSelectValidation}
                options={(field.lookupValues || []).map((opt: any) => ({
                  value: String(opt.id),
                  label: opt.lookupValue || opt.name,
                }))}
                placeholder={`Select ${label}`}
                disabled={isDisabled}
                hint={field.instructions}
                onChange={(values) => {
                  if (field.hasChildAttribute && values?.length > 0) {
                    fetchChildAttributes(field, values[0]);
                  }
                }}
              />
            </div>
          </div>
        );

      case CustomAttributeTypeEnum.RADIO:
        return (
          <div key={field.id} className="grid grid-cols-12 gap-6 items-start min-h-[54px]">
            <div className="col-span-4 pt-1.5">
              <label className="block text-sm font-medium text-gray-700">
                {label}{isMandatory && <span className="text-[#F64E60] ml-1">*</span>}
              </label>
            </div>
            <div className="col-span-8">
              <RadioInput
                name={name}
                control={control}
                validationRules={{ required: isMandatory ? `${label} is required` : false }}
                options={(field.lookupValues || []).map((opt: any) => ({
                  value: String(opt.id),
                  label: opt.lookupValue || opt.name,
                }))}
                hint={field.instructions}
              />
            </div>
          </div>
        );

      case CustomAttributeTypeEnum.DATE:
        return (
          <div key={field.id} className="grid grid-cols-12 gap-6 items-start min-h-[54px]">
            <div className="col-span-4 pt-1.5">
              <label className="block text-sm font-medium text-gray-700">
                {label}{isMandatory && <span className="text-[#F64E60] ml-1">*</span>}
              </label>
            </div>
            <div className="col-span-8">
              <DateInput
                name={name}
                control={control}
                validationRules={{ required: isMandatory ? `${label} is required` : false }}
                minDate={field.dateAttributes?.minDate ? new Date(field.dateAttributes.minDate).toISOString().split('T')[0] : undefined}
                maxDate={field.dateAttributes?.maxDate ? new Date(field.dateAttributes.maxDate).toISOString().split('T')[0] : undefined}
                hint={field.instructions}
              />
            </div>
          </div>
        );

      case CustomAttributeTypeEnum.IMAGE:
      case CustomAttributeTypeEnum.DOCUMENT_UPLOAD:
      case CustomAttributeTypeEnum.AUDIO_VIDEO:
      case CustomAttributeTypeEnum.REFERENCE_DOCUMENTS:
        const maxFiles = field.maxImagesAllowed || undefined;
        return (
          <div key={field.id} className="grid grid-cols-12 gap-6 items-start min-h-[54px]">
            <div className="col-span-4 pt-1.5">
              <label className="block text-sm font-medium text-gray-700">
                {label}{isMandatory && <span className="text-[#F64E60] ml-1">*</span>}
              </label>
            </div>
            <div className="col-span-8">
              <UploadInput
                name={name}
                control={control}
                validationRules={{ required: isMandatory ? `${label} is required` : false }}
                attributeTypeId={typeId}
                moduleType={SystemAttributeEnum.USER_MODULE}
                projectId={projectId}
                multiple={maxFiles !== 1}
                maxFiles={maxFiles}
                hint={field.instructions ? <div className="text-[10px]">{field.instructions}</div> : undefined}
                disabled={isDisabled}
                onUploadingChange={(uploading) => setUploadingField(uploading ? name : null)}
              />
            </div>
          </div>
        );

      case CustomAttributeTypeEnum.NUMERIC:
        const numericValidation: any = {
          required: isMandatory ? `${label} is required` : false,
        };
        if (field.minNumber !== undefined && field.minNumber !== null) {
          numericValidation.min = { value: field.minNumber, message: field.minValueErrorMsg || `Minimum value is ${field.minNumber}` };
        }
        if (field.maxNumber !== undefined && field.maxNumber !== null) {
          numericValidation.max = { value: field.maxNumber, message: field.maxValueErrorMsg || `Maximum value is ${field.maxNumber}` };
        }

        return (
          <div key={field.id} className="grid grid-cols-12 gap-6 items-start min-h-[54px]">
            <div className="col-span-4 pt-1.5">
              <label className="block text-sm font-medium text-gray-700">
                {label}{isMandatory && <span className="text-[#F64E60] ml-1">*</span>}
              </label>
            </div>
            <div className="col-span-8">
              <NumericInput
                name={name}
                control={control}
                placeholder={`Enter ${label}`}
                validationRules={numericValidation}
                decimalAllowed={!!field.decimalFlag}
                disabled={isDisabled}
                instructions={field.instructions}
                numericValidationType={field.numericValidationType ?? null}
                maxDigits={field.maxDigits ?? null}
                minDigits={field.minDigits ?? null}
                maxNumber={field.maxNumber ?? null}
                addValidation={field.addValidation ?? false}
                regexExpression={field.regexExpression}
                errorMessage={field.errorMessage}
                isSystemAttribute={!!(field.systemAttribute && Object.keys(field.systemAttribute || {}).length > 0)}
                minNumber={field.minNumber ?? null}
                labelForMessage={label}
              />
            </div>
          </div>
        );

      case CustomAttributeTypeEnum.TEXT_MULTI_LINE:
        const multiLineValidation: any = {
          required: isMandatory ? `${label} is required` : false,
        };
        if (field.minCharacters) {
          multiLineValidation.minLength = { value: field.minCharacters, message: field.minLengthErrorMsg || `Minimum ${field.minCharacters} characters required` };
        }
        if (field.maxCharacters) {
          multiLineValidation.maxLength = { value: field.maxCharacters, message: field.maxLengthErrorMsg || `Maximum ${field.maxCharacters} characters allowed` };
        }
        return (
          <div key={field.id} className="grid grid-cols-12 gap-6 items-start min-h-[54px]">
            <div className="col-span-4 pt-1.5">
              <label className="block text-sm font-medium text-gray-700">
                {label}{isMandatory && <span className="text-[#F64E60] ml-1">*</span>}
              </label>
            </div>
            <div className="col-span-8">
              <TextArea
                name={name}
                control={control}
                placeholder={`Enter ${label}`}
                validationRules={multiLineValidation}
                maxLength={field.maxCharacters || 500}
                rows={1}
                showCharacterCount={!!field.maxCharacters}
              />
            </div>
          </div>
        );

      case CustomAttributeTypeEnum.EMAIL:
        return (
          <div key={field.id} className="grid grid-cols-12 gap-6 items-start min-h-[54px]">
            <div className="col-span-4 pt-1.5">
              <label className="block text-sm font-medium text-gray-700">
                {label}{isMandatory && <span className="text-[#F64E60] ml-1">*</span>}
              </label>
            </div>
            <div className="col-span-8">
              <TextInput
                name={name}
                control={control}
                type="email"
                placeholder={`Enter ${label}`}
                validationRules={{
                  required: isMandatory ? `${label} is required` : false,
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
                  onBlur: () => {
                    if (field.systemAttribute?.id === SystemAttributeEnum.USER_WORK_EMAIL_FIELD_ID) {
                      handleFieldBlur(SystemAttributeEnum.USER_WORK_EMAIL_FIELD_ID, name);
                    }
                  },
                }}
                maxLength={field.maxCharacters || 200}
                showCharacterCount={!!field.maxCharacters}
              />
            </div>
          </div>
        );

      case CustomAttributeTypeEnum.TEXT_SINGLE_LINE:
      default:
        // Handle password field
        if (field.systemAttribute?.id === SystemAttributeEnum.USER_PASSWORD_FIELD_ID) {
          return (
            <div key={field.id} className="grid grid-cols-12 gap-6 items-start min-h-[54px]">
              <div className="col-span-4 pt-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  {label}{setUserPassword && <span className="text-[#F64E60] ml-1">*</span>}
                </label>
              </div>
              <div className="col-span-8">
                <TextInput
                  name={name}
                  control={control}
                  type="password"
                  placeholder={`Enter ${label}`}
                  validationRules={{
                    required: setUserPassword ? `${label} is required` : false,
                  }}
                  maxLength={field.maxCharacters || 200}
                  showCharacterCount={!!field.maxCharacters}
                  inputProps={{ autoComplete: 'new-password' }}
                />
              </div>
            </div>
          );
        }

        // Handle mobile number field
        if (field.systemAttribute?.id === SystemAttributeEnum.USER_MOBILE_NUMBER_FIELD_ID) {
          return (
            <div key={field.id} className="grid grid-cols-12 gap-6 items-start min-h-[54px]">
              <div className="col-span-4 pt-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  {label}{isMandatory && <span className="text-[#F64E60] ml-1">*</span>}
                </label>
              </div>
              <div className="col-span-8">
                <TextInput
                  name={name}
                  control={control}
                  type="tel"
                  placeholder={`Enter ${label}`}
                  validationRules={{
                    required: isMandatory ? `${label} is required` : false,
                    onBlur: () => handleFieldBlur(SystemAttributeEnum.USER_MOBILE_NUMBER_FIELD_ID, name),
                  }}
                  maxLength={field.maxCharacters || 200}
                  showCharacterCount={!!field.maxCharacters}
                />
              </div>
            </div>
          );
        }

        const textValidation: any = {
          required: isMandatory ? `${label} is required` : false,
        };
        if (field.minCharacters) {
          textValidation.minLength = { value: field.minCharacters, message: field.minLengthErrorMsg || `Minimum ${field.minCharacters} characters required` };
        }
        if (field.maxCharacters) {
          textValidation.maxLength = { value: field.maxCharacters, message: field.maxLengthErrorMsg || `Maximum ${field.maxCharacters} characters allowed` };
        }
        if (field.pattern) {
          textValidation.pattern = { value: new RegExp(field.pattern), message: field.patternErrorMsg || 'Invalid format' };
        }
        return (
          <div key={field.id} className="grid grid-cols-12 gap-6 items-start min-h-[54px]">
            <div className="col-span-4 pt-1.5">
              <label className="block text-sm font-medium text-gray-700">
                {label}{isMandatory && <span className="text-[#F64E60] ml-1">*</span>}
              </label>
            </div>
            <div className="col-span-8">
              <TextInput
                name={name}
                control={control}
                type="text"
                placeholder={`Enter ${label}`}
                validationRules={textValidation}
                maxLength={field.maxCharacters || 200}
                showCharacterCount={!!field.maxCharacters}
                disabled={isDisabled}
              />
            </div>
          </div>
        );
    }
  };

  // Show full-screen loader until data is fully loaded
  if (open && !dataLoaded) {
    return (
      <div className="fixed inset-0 z-[9999]">
        <Spinner blur={true} customLoadingName="Loading..." />
      </div>
    );
  }

  return (
    <TwinModal
      open={open}
      onClose={onClose}
      header={
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#3F4254]">Add New {pageHeading}</h2>
        </div>
      }
      footer={
        <>
          <Button
            className=" bg-[#E4E6EF] hover:bg-gray-300 text-black rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Cancel"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#3699FF] hover:bg-blue-600 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
            aria-label="Save"
            type="submit"
            onClick={handleSubmit(onSubmit)}
            disabled={formLoading || isSubmitting || !!childLoading}
          >
            {isSubmitting || childLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              'Save'
            )}
          </Button>
        </>
      }
      modalClassName="max-w-4xl"
      allowBorder
      closeOnOutsideClick={false}
    >
      <div className="bg-white">
        {/* Linked email/mobile notification */}
        {isMobileEmailLinked && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex justify-between items-center">
            <span className="text-yellow-800">
              {emailMobileFieldVar} has been auto-filled based on existing user data.
            </span>
            <button
              type="button"
              onClick={dismissLinkedNotification}
              className="text-yellow-600 hover:text-yellow-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {customFields.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No fields available to display.</div>
        ) : (
          <form className="space-y-4 pt-1" onSubmit={handleSubmit(onSubmit)}>
            {customFields.map((field) => renderField(field))}
          </form>
        )}
      </div>
    </TwinModal>
  );
};

export default AddForm;
