import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useEntityHeading } from '@/hooks/useEntityHeading';
import { Button } from '../../../ui/tailwind';
import styles from '@/styles/addEditForm.module.css';
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
import SerialKeyInput from '@/components/common/input-fields/wrapper/SerialKeyInput';
import Select from '@/components/common/input-fields/Select';
import MultiSelect from '@/components/common/input-fields/MultiSelect';
import DateInput from '@/components/common/input-fields/DateInput';
import RadioInput from '@/components/common/input-fields/RadioInput';
import TextArea from '@/components/common/input-fields/TextArea';
import UploadInput from '@/components/common/input-fields/UploadInput';
import TwinModal from '@/components/common/TwinModal';
import Spinner from '@/components/common/Spinner';

interface EditFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (message: string) => void;
  userId?: number | string;
  serialNo?: string;
}

type DynamicFormValues = Record<string, any>;

const EditForm: FC<EditFormProps> = ({ open, onClose, onSuccess, onError, userId, serialNo }) => {
  const { enqueueSnackbar } = useSnackbar();
  const pageHeading = useEntityHeading('Users', 'Users');
  const projectId = getProjectId() || 0;
  const baseFileUrl = process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL || '';

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<DynamicFormValues>({
    defaultValues: {},
  });

  const [roles, setRoles] = useState<{ id: number; name: string }[]>([]);
  const [managers, setManagers] = useState<{ id: number; name: string }[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [attributeValues, setAttributeValues] = useState<any[]>([]);
  const [formLoading, setFormLoading] = useState<boolean>(true);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [childLoading, setChildLoading] = useState<string | null>(null);

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
      const typeOrderA = a.attributeType?.displayOrder ?? 0;
      const typeOrderB = b.attributeType?.displayOrder ?? 0;
      if (typeOrderA !== typeOrderB) return typeOrderA - typeOrderB;
      const fieldOrderA = a.displayOrder ?? 0;
      const fieldOrderB = b.displayOrder ?? 0;
      if (fieldOrderA !== fieldOrderB) return fieldOrderA - fieldOrderB;
      return (a.attributeName || '').localeCompare(b.attributeName || '');
    });

  useEffect(() => {
    let isMounted = true;
    const loadUser = async () => {
      setFormLoading(true);
      try {
        try {
          const roleResp = await userRoleService.getUserRoles(projectId);
          if (isMounted) {
            if (roleResp?.responseData) {
              const mapped = roleResp.responseData
                .filter((r: any) => r.active === undefined || r.active === 1)
                .map((r: any) => ({ id: r.roleId, name: r.roleName }));
              setRoles(mapped);
            } else {
              setRoles([]);
            }
          }
        } catch (err) {
          if (isMounted) {
            setRoles([]);
          }
        }

        try {
          const resolvedUserId = userId !== undefined && userId !== null ? Number(userId) : undefined;
          const mgrResp = await userService.getReportingHeadUserList(projectId, resolvedUserId);
          if (isMounted) {
            if (mgrResp?.responseData) {
              const mapped = mgrResp.responseData.map((u: any) => ({
                id: u.id || u.userId,
                name: u.lookupValue || u.fullName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.userName,
              }));
              setManagers(mapped);
            } else {
              setManagers([]);
            }
          }
        } catch (err) {
          if (isMounted) {
            setManagers([]);
          }
        }

        let fieldData: any[] = [];

        // Use getFormFields API (getFields endpoint) instead of getFieldsInSetting
        try {
          const fieldsResp: any = await settingsService.getFormFields(projectId, SystemAttributeEnum.USER_MODULE);
          fieldData = Array.isArray(fieldsResp) ? fieldsResp : fieldsResp?.responseData || [];
        } catch (err) {
          fieldData = [];
        }

        const userResp = userId
          ? await userManagementService.getUserWithAttributes(projectId, Number(userId))
          : { responseData: [] };
        const userDetailResp = userId ? await userManagementService.getUser(projectId, Number(userId)) : null;

        let activeFields = fieldData
          .filter((f: any) => f.status === 1)
          .filter(
            (f: any) =>
              f.systemAttribute?.id !== SystemAttributeEnum.USER_SET_PASSWORD_CHECKBOX_FIELD_ID &&
              f.systemAttribute?.id !== SystemAttributeEnum.USER_PASSWORD_FIELD_ID,
          )
          .filter((f: any) => !(f.attributeType?.id === CustomAttributeTypeEnum.IMAGE && f.allowBrowsing !== 1));

        // Fetch lookup values when they are missing
        const hydrateLookups = async (fieldList: any[]) => {
          const needsLookup = fieldList.filter(
            (f) =>
              [CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN, CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN, CustomAttributeTypeEnum.RADIO].includes(
                f.attributeType?.id,
              ) && (!f.lookupValues || f.lookupValues.length === 0),
          );
          if (needsLookup.length === 0) return fieldList;

          const results = await Promise.all(
            needsLookup.map(async (f) => {
              try {
                const resp = await settingsService.getAttribLookup(f.id);
                const lookupValues = resp?.responseData || [];
                return { id: f.id, lookupValues };
              } catch {
                return { id: f.id, lookupValues: [] };
              }
            }),
          );

          const lookupMap = new Map(results.map((r) => [r.id, r.lookupValues]));
          return fieldList.map((f) => {
            if (f.lookupValues && f.lookupValues.length > 0) {
              return f;
            }
            const hydrated = lookupMap.get(f.id) ?? f.dataListLookupValues ?? f.parentLookupValues ?? [];
            return { ...f, lookupValues: hydrated };
          });
        };

        activeFields = sortFields(await hydrateLookups(activeFields));

        const attributeValues = userResp?.responseData || [];

        const serialFromAttributes =
          attributeValues.find((val: any) => val.systemAttributeId === SystemAttributeEnum.USER_SERIAL_KEY_ID)?.value ?? '';

        const serialValue =
          serialFromAttributes ||
          serialNo ||
          userDetailResp?.responseData?.serialNo ||
          userDetailResp?.responseData?.serialKey ||
          (userDetailResp as any)?.serialNo ||
          (userDetailResp as any)?.serialKey ||
          '';
        const hasSerialField = activeFields.some((f: any) => f.systemAttribute?.id === SystemAttributeEnum.USER_SERIAL_KEY_ID);
        if (!hasSerialField) {
          activeFields.unshift({
            id: SystemAttributeEnum.USER_SERIAL_KEY_ID,
            attributeName: 'Serial No.',
            combinedAttributeName: 'SerialNo',
            mandatoryFlag: 0,
            status: 1,
            displayOrder: -1,
            attributeType: { id: CustomAttributeTypeEnum.TEXT_SINGLE_LINE, displayOrder: -1 },
            systemAttribute: { id: SystemAttributeEnum.USER_SERIAL_KEY_ID },
            lookupValues: [],
          });
        }

        if (isMounted) {
          setCustomFields(activeFields);
          setAttributeValues(attributeValues);
        }

        const defaults: Record<string, any> = {};

        activeFields.forEach((field: any) => {
          const match = attributeValues.find((val: any) => val.attributeId === field.id);
          const rawValue =
            field.systemAttribute?.id === SystemAttributeEnum.USER_SERIAL_KEY_ID ? serialValue ?? '' : match?.value ?? '';
          const name = field.combinedAttributeName;

          switch (field.attributeType?.id) {
            case CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN:
              defaults[name] = rawValue ? String(rawValue).split(',').filter(Boolean) : [];
              break;
            case CustomAttributeTypeEnum.IMAGE:
            case CustomAttributeTypeEnum.DOCUMENT_UPLOAD:
            case CustomAttributeTypeEnum.AUDIO_VIDEO:
              defaults[name] = rawValue ? String(rawValue).split(',').filter(Boolean) : [];
              break;
            case CustomAttributeTypeEnum.DATE:
              defaults[name] = rawValue ? rawValue.split('T')[0] : '';
              break;
            default:
              defaults[name] = rawValue ?? '';
          }
        });

        if (isMounted) {
          reset(defaults);
        }

        // Preload child attributes based on existing selections
        const childFetchCandidates = activeFields.filter(
          (f: any) =>
            (f.hasChildAttribute ||
              f.systemAttribute?.id === SystemAttributeEnum.USER_ROLE_FIELD_ID ||
              f.systemAttribute?.id === SystemAttributeEnum.USER_STATUS_FIELD_ID) &&
            defaults[f.combinedAttributeName],
        );
        for (const parent of childFetchCandidates) {
          const val = defaults[parent.combinedAttributeName];
          const selectedVal = Array.isArray(val) ? val[0] : val;
          if (selectedVal && isMounted) {
            await fetchChildAttributes(parent, selectedVal);
          }
        }
      } catch (err) {
        if (isMounted) {
          enqueueSnackbar('Unable to load user details', { variant: 'error' });
        }
      } finally {
        if (isMounted) {
          setFormLoading(false);
          setDataLoaded(true);
        }
      }
    };

    loadUser();
    return () => {
      isMounted = false;
    };
  }, [projectId, userId, serialNo, enqueueSnackbar, reset]);

  const resetChildFields = (parentId: number) => {
    customFields.forEach((f) => {
      if (f.parentAttributeId === parentId && f.combinedAttributeName) {
        const currentVal = getValues(f.combinedAttributeName);
        setValue(f.combinedAttributeName, Array.isArray(currentVal) ? [] : '', { shouldDirty: true });
      }
    });
  };

  const parseValueByType = (field: any, raw: any) => {
    if (raw === undefined || raw === null) return '';
    switch (field.attributeType?.id) {
      case CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN:
        return String(raw || '')
          .split(',')
          .filter(Boolean);
      case CustomAttributeTypeEnum.IMAGE:
      case CustomAttributeTypeEnum.DOCUMENT_UPLOAD:
      case CustomAttributeTypeEnum.AUDIO_VIDEO:
        return String(raw || '')
          .split(',')
          .filter(Boolean);
      case CustomAttributeTypeEnum.DATE:
        return raw ? String(raw).split('T')[0] : '';
      default:
        return raw;
    }
  };

  const fetchChildAttributes = async (field: any, selectedValue: string | number) => {
    if (!field?.id) return;
    if (!selectedValue) {
      resetChildFields(field.id);
      return;
    }

    setChildLoading(field.combinedAttributeName);
    try {
      const resp = await settingsService.getFieldRelation(field.id, Number(selectedValue));
      const childAttrs = resp?.responseData || [];

      setCustomFields((prev) => {
        const next = [...prev];
        childAttrs.forEach((child: any) => {
          const idx = next.findIndex((f) => f.id === child.id);
          const updatedChild = {
            ...child,
            lookupValues: child.lookupValues || child.childLookupValues || child.lookupvalues || [],
          };
          if (idx >= 0) {
            next[idx] = { ...next[idx], ...updatedChild };
          } else {
            next.push(updatedChild);
          }
        });
        return sortFields(next);
      });

      childAttrs.forEach((child: any) => {
        const name = child.combinedAttributeName || fieldNameById[child.id];
        if (name) {
          const match = attributeValues.find((v: any) => v.attributeId === child.id);
          const parsed = parseValueByType(child, match?.value ?? '');
          setValue(name, parsed, { shouldDirty: !!match });
        }
      });
    } catch (err) {
      enqueueSnackbar('Failed to load child attributes', { variant: 'error' });
    } finally {
      setChildLoading(null);
    }
  };

  const formatDateForSave = (dateVal: any) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const uploadFiles = async (files: FileList, field: any) => {
    if (!files || files.length === 0) return;
    setUploadingField(field.combinedAttributeName);
    try {
      const current: string[] = getValues(field.combinedAttributeName) || [];
      const uploaded: string[] = [...current];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadService.uploadImage(SystemAttributeEnum.USER_MODULE, file, projectId);
        if (res?.responseData?.name) {
          uploaded.push(res.responseData.name);
        }
      }
      setValue(field.combinedAttributeName, uploaded, { shouldDirty: true });
    } catch (err) {
      enqueueSnackbar('Failed to upload file. Please try again.', { variant: 'error' });
    } finally {
      setUploadingField(null);
    }
  };

  const onSubmit = async (data: DynamicFormValues) => {
    try {
      const customAttributeValues = customFields
        .filter((field: any) => field.systemAttribute?.id !== SystemAttributeEnum.USER_SERIAL_KEY_ID)
        .map((field: any) => {
          const value = data[field.combinedAttributeName];
          let formattedValue = '';

          switch (field.attributeType?.id) {
            case CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN:
              formattedValue = Array.isArray(value) ? value.join(',') : '';
              break;
            case CustomAttributeTypeEnum.IMAGE:
            case CustomAttributeTypeEnum.DOCUMENT_UPLOAD:
            case CustomAttributeTypeEnum.AUDIO_VIDEO:
              formattedValue = Array.isArray(value) ? value.join(',') : value || '';
              break;
            case CustomAttributeTypeEnum.DATE:
              formattedValue = formatDateForSave(value);
              break;
            default:
              formattedValue = value !== undefined && value !== null ? String(value).trim() : '';
          }

          return {
            attributeId: field.id,
            value: formattedValue,
            systemAttributeId: field.systemAttribute?.id,
          };
        });

      const payload = {
        projectId,
        userId: userId ? Number(userId) : undefined,
        moduleType: SystemAttributeEnum.USER_MODULE,
        customAttributeValues,
      };

      // Use legacy-compatible endpoint to honor dynamic attributes
      const response = await userManagementService.saveUserData(payload);

      if (response && response.statusCode >= 200 && response.statusCode < 300) {
        onSuccess?.();
        onClose();
      } else {
        const message = response?.message || 'Unable to update user';
        if (onError) {
          onError(message);
        } else {
          enqueueSnackbar(message, { variant: 'error' });
        }
      }
    } catch (error) {
      const message = 'Unable to update user';
      if (onError) {
        onError(message);
      } else {
        enqueueSnackbar(message, { variant: 'error' });
      }
    }
  };

  const getFieldOptions = (field: any) => {
    let options =
      (field.lookupValues && field.lookupValues.length > 0
        ? field.lookupValues
        : field.dataListLookupValues || field.parentLookupValues || []) || [];

    if ([SystemAttributeEnum.USER_ROLE_FIELD_ID].includes(field.systemAttribute?.id)) {
      options = roles.map((r) => ({ id: r.id, lookupValue: r.name }));
    }
    if ([SystemAttributeEnum.USER_REPORTS_TO_FIELD_ID, SystemAttributeEnum.USER_PARALLEL_REPORTING_FIELD_ID].includes(field.systemAttribute?.id)) {
      options = managers.map((m) => ({ id: m.id, lookupValue: m.name }));
    }

    return options.map((opt: any) => ({ value: String(opt.id), label: opt.lookupValue || opt.name || '' }));
  };

  const handleFieldChange = async (field: any, value: any) => {
    const shouldFetchChild =
      field.hasChildAttribute ||
      field.systemAttribute?.id === SystemAttributeEnum.USER_ROLE_FIELD_ID ||
      field.systemAttribute?.id === SystemAttributeEnum.USER_STATUS_FIELD_ID;
    if (shouldFetchChild) {
      const selectedVal = Array.isArray(value) ? value[0] : value;
      await fetchChildAttributes(field, selectedVal);
    }
  };

  const shouldShowField = (field: any) => {
    if (!field.parentAttributeId) return true;
    const parentName = fieldNameById[field.parentAttributeId];
    if (!parentName) return true;
    const parentValue = watch(parentName);
    if (Array.isArray(parentValue)) {
      return parentValue.length > 0;
    }
    return !!parentValue;
  };

  const renderField = (field: any) => {
    if (!shouldShowField(field)) return null;

    const isDisabled = [SystemAttributeEnum.USER_WORK_EMAIL_FIELD_ID, SystemAttributeEnum.USER_SERIAL_KEY_ID].includes(field.systemAttribute?.id);
    const isMandatory = field.mandatoryFlag === 1;
    const options = getFieldOptions(field);
    const label = field.attributeName;
    const name = field.combinedAttributeName;
    const hint = field.instructions || undefined;
    const typeId = field.attributeType?.id;

    switch (typeId) {
      case CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN:
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
                options={options}
                placeholder={`Select ${label}`}
                disabled={isDisabled}
                hint={hint}
                validationRules={isMandatory ? { required: `${label} is required` } : {}}
                onChange={(value) => handleFieldChange(field, value)}
              />
            </div>
          </div>
        );

      case CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN:
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
                options={options}
                placeholder={`Select ${label}`}
                disabled={isDisabled}
                hint={hint}
                validationRules={isMandatory ? { required: `${label} is required` } : {}}
                onChange={(values) => {
                  if (values?.length > 0) {
                    handleFieldChange(field, values);
                  }
                }}
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
                disabled={isDisabled}
                hint={hint}
                validationRules={isMandatory ? { required: `${label} is required` } : {}}
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
                options={options}
                disabled={isDisabled}
                hint={hint}
                validationRules={isMandatory ? { required: `${label} is required` } : {}}
              />
            </div>
          </div>
        );

      case CustomAttributeTypeEnum.TEXT_SINGLE_LINE:
        if (field.systemAttribute?.id === SystemAttributeEnum.USER_SERIAL_KEY_ID) {
          return (
            <div key={field.id} className="grid grid-cols-12 gap-6 items-start min-h-[54px]">
              <div className="col-span-4 pt-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  {label}{isMandatory && <span className="text-[#F64E60] ml-1">*</span>}
                </label>
              </div>
              <div className="col-span-8">
                <SerialKeyInput
                  name={name}
                  control={control}
                  placeholder={`Enter ${label}`}
                  validationRules={isMandatory ? { required: `${label} is required` } : {}}
                  hint={hint}
                />
              </div>
            </div>
          );
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
                disabled={isDisabled}
                hint={hint}
                validationRules={isMandatory ? { required: `${label} is required` } : {}}
              />
            </div>
          </div>
        );

      case CustomAttributeTypeEnum.TEXT_MULTI_LINE:
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
                rows={3}
                disabled={isDisabled}
                validationRules={isMandatory ? { required: `${label} is required` } : {}}
              />
            </div>
          </div>
        );

      case CustomAttributeTypeEnum.NUMERIC:
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
                disabled={isDisabled}
                instructions={hint}
                validationRules={isMandatory ? { required: `${label} is required` } : {}}
                numericValidationType={field.numericValidationType ?? null}
                maxDigits={field.maxDigits ?? null}
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
                disabled={isDisabled}
                hint={hint}
                validationRules={{
                  ...(isMandatory ? { required: `${label} is required` } : {}),
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
                }}
              />
            </div>
          </div>
        );

      case CustomAttributeTypeEnum.IMAGE:
      case CustomAttributeTypeEnum.DOCUMENT_UPLOAD:
      case CustomAttributeTypeEnum.AUDIO_VIDEO:
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
                attributeTypeId={typeId}
                moduleType={SystemAttributeEnum.USER_MODULE}
                projectId={projectId}
                disabled={isDisabled}
                hint={hint}
                validationRules={isMandatory ? { required: `${label} is required` } : {}}
                multiple={true}
                onRemove={(index) => {
                  const current: string[] = getValues(name) || [];
                  const updated = [...current];
                  if (index !== undefined) updated.splice(index, 1);
                  setValue(name, updated, { shouldDirty: true });
                }}
              />
            </div>
          </div>
        );

      default:
        return null;
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
          <h2 className="text-base font-semibold text-[#3F4254]">Edit {pageHeading}</h2>
        </div>
      }
      footer={
        <>
          <Button
            className="bg-[#E4E6EF] hover:bg-gray-300 text-black rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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

export default EditForm;
