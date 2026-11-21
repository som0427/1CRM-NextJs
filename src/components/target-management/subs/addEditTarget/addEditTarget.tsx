import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm, useFieldArray, useWatch } from 'react-hook-form';
import Modal from '@/components/common/Modal';
import { Button } from '../../../ui/tailwind/Button';
import TextInput from '@/components/common/input-fields/TextInput';
import DateInput from '@/components/common/input-fields/DateInput';
import Select from '@/components/common/input-fields/Select';
import RadioInput from '@/components/common/input-fields/RadioInput';
import settingsService from '@/lib/services/settingsService';
import { getProjectId } from '@/lib/storage/sharedStorage';
import generalSettingService from '@/lib/services/generalSettingsService';
import { CustomAttibute } from '@/lib/models/custom-attibute.model';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import targetService from '@/lib/services/targetService';
import RemoveActionButton from '@/components/common/buttons/action-button/RemoveActionButton';
import AddActionButton from '@/components/common/buttons/action-button/AddActionButton';

interface AddEditTargetProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSave?: (targetName: string) => void;
  defaultTargetName?: string;
  targetId?: number | null;
}

interface TargetCondition {
  entity: string;
  attribute: string;
  value: string;
  condition: '1' | '2';
}

interface TargetFormValues {
  targetName: string;
  startDate: string;
  endDate: string;
  targetFor: string;
  aggregateFor: string;
  targetSetOn: '' | 'sum' | 'count';
  valueInEntity: string;
  valueInActivity: string;
  valueInAttribute: string;
  valueInAttributeValue: string;
  status: string;
  conditions: TargetCondition[];
}

interface SelectOption {
  value: string;
  label: string;
}

interface ValueInAttributeDetail {
  attributeTypeId?: number;
  parentFormId?: number;
}

const targetModuleFallbackLabels: Record<number, string> = {
  [SystemAttributeEnum.USER_MODULE]: 'User',
  [SystemAttributeEnum.COMPANY_MODULE]: 'Customer',
  [SystemAttributeEnum.OPPORTUNITY_MODULE]: 'Opportunity'
};

const ACTIVITY_OPTION_VALUE = '100';

const extractResponseArray = (response: any): any[] => {
  if (!response) {
    return [];
  }
  const payload = response.responseData ?? response.data ?? response;
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  return [];
};

const AddEditTarget: React.FC<AddEditTargetProps> = ({
  isOpen = false,
  onClose,
  onSave,
  defaultTargetName = '',
  targetId = null
}) => {
  const today = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const formDefaults: TargetFormValues = useMemo(() => ({
    targetName: defaultTargetName,
    startDate: '',
    endDate: '',
    targetFor: '',
    aggregateFor: '',
    targetSetOn: 'sum',
    valueInEntity: '',
    valueInActivity: '',
    valueInAttribute: '',
    valueInAttributeValue: '',
    status: '1',
    conditions: [
      {
        entity: '',
        attribute: '',
        value: '',
        condition: '1'
      }
    ]
  }), [defaultTargetName]);

  const { control, handleSubmit, reset, watch, setValue } = useForm<TargetFormValues>({
    defaultValues: formDefaults
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: 'conditions'
  });

  const isEditMode = Boolean(targetId);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!isEditMode) {
      isFormInitializingRef.current = true;
      reset(formDefaults);
      replace(formDefaults.conditions);
      setSelectedConditionEntityId('');
      setConditionEntityLabel('');
      setTimeout(() => {
        isFormInitializingRef.current = false;
      }, 0);
    }
  }, [isOpen, isEditMode, formDefaults, reset, replace]);

  useEffect(() => {
    if (!isOpen) {
      setSaveError(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  const startDateValue = watch('startDate');
  const endDateValue = watch('endDate');
  const selectedTargetFor = watch('targetFor');
  const selectedTargetSetOn = watch('targetSetOn');
  const selectedValueInEntity = watch('valueInEntity');
  const selectedValueInActivity = watch('valueInActivity');
  const selectedValueInAttribute = watch('valueInAttribute');

  useEffect(() => {
    if (startDateValue && endDateValue && endDateValue < startDateValue) {
      setValue('endDate', startDateValue);
    }
  }, [startDateValue, endDateValue, setValue]);

  const handleClose = () => {
    setSaveError(null);
    setDetailError(null);
    setIsSaving(false);
    setIsDetailLoading(false);
    isFormInitializingRef.current = false;
    if (onClose) {
      onClose();
    }
  };

  const handleSave = handleSubmit(async (values) => {
    if (isSaving) {
      return;
    }

    setSaveError(null);

    const projectId = getProjectId();
    if (!projectId) {
      setSaveError('Project not available. Please select a project and try again.');
      return;
    }

    const resolvedValueInEntity =
      values.valueInEntity === ACTIVITY_OPTION_VALUE ? values.valueInActivity : values.valueInEntity;

    if (!resolvedValueInEntity) {
      setSaveError('Please configure the Value In section before saving.');
      return;
    }

    const payload = buildTargetPayload(values, projectId);

    if (!payload.conditions || payload.conditions.length === 0) {
      setSaveError('Please add at least one valid condition.');
      return;
    }

    try {
      setIsSaving(true);
      await targetService.saveTarget(payload);
      if (onSave) {
        onSave(values.targetName.trim());
      }
      handleClose();
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to save target. Please try again.';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  });

  const [targetForOptions, setTargetForOptions] = useState<SelectOption[]>([]);
  const [isTargetForLoading, setIsTargetForLoading] = useState(false);
  const targetOptionsFetchedRef = useRef(false);
  const conditionsValues =
    (useWatch({
      control,
      name: 'conditions'
    }) as TargetCondition[]) ?? [];
  const previousConditionAttributesRef = useRef<Record<string, string>>({});
  const [whenAttributes, setWhenAttributes] = useState<SelectOption[]>([]);
  const whenAttributeValuesMapRef = useRef<Record<string, SelectOption[]>>({});
  const [whenAttributeValuesVersion, setWhenAttributeValuesVersion] = useState(0);
  const [conditionAttributeValueOptionsMap, setConditionAttributeValueOptionsMap] = useState<
    Record<string, SelectOption[]>
  >({});
  const [selectedConditionEntityId, setSelectedConditionEntityId] = useState('');
  const [conditionEntityLabel, setConditionEntityLabel] = useState('');
  const previousConditionEntityRef = useRef<string>('');
  const [valueInActivities, setValueInActivities] = useState<SelectOption[]>([]);
  const [valueInAttributes, setValueInAttributes] = useState<SelectOption[]>([]);
  const [valueInAttributeValues, setValueInAttributeValues] = useState<SelectOption[]>([]);
  const [isValueInActivitiesLoading, setIsValueInActivitiesLoading] = useState(false);
  const [isValueInAttributesLoading, setIsValueInAttributesLoading] = useState(false);
  const [isValueInAttributeValuesLoading, setIsValueInAttributeValuesLoading] = useState(false);
  const [isWhenAttributesLoading, setIsWhenAttributesLoading] = useState(false);
  const valueInActivitiesFetchedRef = useRef(false);
  const valueInAttributeCacheRef = useRef<Record<string, SelectOption[]>>({});
  const valueInAttributeDetailsRef = useRef<Record<string, ValueInAttributeDetail>>({});
  const formFieldsCacheRef = useRef<Record<string, any[]>>({});
  const formFieldsPromiseRef = useRef<Record<string, Promise<any[]>>>({});
  const productFormValuesCacheRef = useRef<Record<string, SelectOption[]>>({});
  const previousTargetForRef = useRef<string>('');
  const previousValueInEntityRef = useRef<string>('');
  const previousValueInActivityRef = useRef<string>('');
  const previousValueInAttributeRef = useRef<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isFormInitializingRef = useRef(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const disableGeneralFields = isEditMode || isDetailLoading;
  const conditionRowControls = !disableGeneralFields && fields.length > 1;
  const showAggregateForField =
    selectedTargetFor?.toString() === SystemAttributeEnum.COMPANY_MODULE.toString() ||
    selectedTargetFor?.toString() === SystemAttributeEnum.OPPORTUNITY_MODULE.toString();
  const aggregateEntityOptions = useMemo(() => {
    const customerId = SystemAttributeEnum.COMPANY_MODULE.toString();
    const opportunityId = SystemAttributeEnum.OPPORTUNITY_MODULE.toString();
    const allowedValues = [customerId, opportunityId];
    const targetValue = selectedTargetFor?.toString();

    return targetForOptions.filter(option => {
      const isAllowed = allowedValues.includes(option.value);
      if (!isAllowed) {
        return false;
      }
      if (!targetValue) {
        return true;
      }
      return option.value === targetValue;
    });
  }, [targetForOptions, selectedTargetFor]);

  const valueInEntityOptions = useMemo(() => {
    const customerId = SystemAttributeEnum.COMPANY_MODULE.toString();
    const opportunityId = SystemAttributeEnum.OPPORTUNITY_MODULE.toString();
    const userId = SystemAttributeEnum.USER_MODULE.toString();
    if (!selectedTargetFor) {
      return [] as SelectOption[];
    }

    const selected = selectedTargetFor.toString();
    const options: SelectOption[] = [];
    const customerLabel =
      targetForOptions.find(option => option.value === customerId)?.label || targetModuleFallbackLabels[SystemAttributeEnum.COMPANY_MODULE];
    const opportunityLabel =
      targetForOptions.find(option => option.value === opportunityId)?.label ||
      targetModuleFallbackLabels[SystemAttributeEnum.OPPORTUNITY_MODULE];

    if (selected === userId || selected === customerId) {
      options.push({
        value: customerId,
        label: customerLabel
      });
    }

    if (selected === userId || selected === opportunityId) {
      options.push({
        value: opportunityId,
        label: opportunityLabel
      });
    }

    options.push({
      value: ACTIVITY_OPTION_VALUE,
      label: 'Activity'
    });

    return options;
  }, [selectedTargetFor, targetForOptions]);

  const showValueInActivitySelect = selectedValueInEntity === ACTIVITY_OPTION_VALUE;
  const canShowAttributeAfterActivity = showValueInActivitySelect && !!selectedValueInActivity;
  const canShowAttributeAfterEntity = !showValueInActivitySelect && !!selectedValueInEntity;
  const showValueInAttributeSelect =
    selectedTargetSetOn === 'sum' && (canShowAttributeAfterActivity || canShowAttributeAfterEntity);
  const selectedAttributeDetail = selectedValueInAttribute
    ? valueInAttributeDetailsRef.current[selectedValueInAttribute]
    : undefined;
  const showValueInAttributeValueSelect =
    showValueInAttributeSelect &&
    selectedAttributeDetail?.attributeTypeId === CustomAttributeTypeEnum.LINK_FROM_OTHER_ENTITIES;
  const conditionEntityDisplayOptions = useMemo(() => {
    return selectedConditionEntityId
      ? [
        {
          value: selectedConditionEntityId,
          label: conditionEntityLabel || 'Entity'
        }
      ]
      : [];
  }, [selectedConditionEntityId, conditionEntityLabel]);
  const disableNameField = isDetailLoading;
  const disableStatusField = isDetailLoading;
  const disableConditionFields = disableGeneralFields;
  const valueInSectionLoading =
    isValueInActivitiesLoading || isValueInAttributesLoading || isValueInAttributeValuesLoading;
  const editModeDataLoading =
    isEditMode && (isDetailLoading || valueInSectionLoading || isWhenAttributesLoading);

  useEffect(() => {
    if (isFormInitializingRef.current) {
      return;
    }

    let entityId = '';
    let entityLabel = '';

    if (selectedValueInEntity === ACTIVITY_OPTION_VALUE) {
      if (selectedValueInActivity) {
        entityId = selectedValueInActivity;
        entityLabel =
          valueInActivities.find(option => option.value === selectedValueInActivity)?.label || 'Activity';
      }
    } else if (selectedValueInEntity) {
      entityId = selectedValueInEntity;
      entityLabel =
        valueInEntityOptions.find(option => option.value === selectedValueInEntity)?.label || '';
    }

    setSelectedConditionEntityId(entityId);
    setConditionEntityLabel(entityLabel);
  }, [selectedValueInEntity, selectedValueInActivity, valueInEntityOptions, valueInActivities]);

  useEffect(() => {
    if (!showAggregateForField) {
      setValue('aggregateFor', '');
    }
  }, [showAggregateForField, setValue]);

  const handleAddCondition = () => {
    if (disableConditionFields || !selectedConditionEntityId) {
      return;
    }
    append({
      entity: selectedConditionEntityId,
      attribute: '',
      value: '',
      condition: '1'
    });
  };

  const fetchValueInActivities = useCallback(async (): Promise<SelectOption[]> => {
    if (valueInActivitiesFetchedRef.current) {
      return valueInActivities;
    }

    const projectId = getProjectId();
    if (!projectId) {
      return [];
    }

    setIsValueInActivitiesLoading(true);
    try {
      const response = await targetService.getActivities(projectId);
      const payload = extractResponseArray(response);
      const options = payload
        .map((activity: any) => ({
          value: activity.activityId?.toString() ?? activity.id?.toString() ?? '',
          label: activity.activityName || activity.name || 'Activity'
        }))
        .filter(option => option.value);

      setValueInActivities(options);
      valueInActivitiesFetchedRef.current = true;
      return options;
    } catch (error) {
      return [];
    } finally {
      setIsValueInActivitiesLoading(false);
    }
  }, [valueInActivities]);

  const fetchFormFieldsForEntity = useCallback(async (entityId: string) => {
    if (!entityId) {
      return [];
    }

    const cached = formFieldsCacheRef.current[entityId];
    if (cached) {
      return cached;
    }

    if (!formFieldsPromiseRef.current[entityId]) {
      const projectId = getProjectId();
      if (!projectId) {
        return [];
      }

      formFieldsPromiseRef.current[entityId] = settingsService
        .getFormFields(projectId, Number(entityId))
        .then(response => {
          const payload = Array.isArray(response) ? response : extractResponseArray(response);
          formFieldsCacheRef.current[entityId] = payload;
          delete formFieldsPromiseRef.current[entityId];
          return payload;
        })
        .catch(error => {
          delete formFieldsPromiseRef.current[entityId];
          throw error;
        });
    }

    return formFieldsPromiseRef.current[entityId];
  }, []);

  const fetchValueInAttributes = useCallback(
    async (entityId: string, options: { isActivity?: boolean } = {}) => {
      if (!entityId) {
        setValueInAttributes([]);
        return;
      }

      const cacheKey = `${options.isActivity ? 'activity' : 'entity'}-${entityId}`;
      const cachedOptions = valueInAttributeCacheRef.current[cacheKey];
      if (cachedOptions) {
        setValueInAttributes(cachedOptions);
        return;
      }

      setIsValueInAttributesLoading(true);
      try {
        const payload = await fetchFormFieldsForEntity(entityId);
        const attributeOptions: SelectOption[] = [];
        const details: Record<string, ValueInAttributeDetail> = { ...valueInAttributeDetailsRef.current };

        payload.forEach((attribute: any) => {
          const attributeId = attribute?.id?.toString();
          if (!attributeId) {
            return;
          }

          const attributeTypeId = attribute?.attributeType?.id;
          const parentFormId = attribute?.parentFormId;
          const isActive = attribute?.isActive === 1;
          const isLinkedAttribute = attribute?.linkedAttributeId != null;
          const hasParentForm = parentFormId !== null && parentFormId !== undefined;
          details[attributeId] = {
            attributeTypeId,
            parentFormId: hasParentForm ? Number(parentFormId) : undefined
          };

          const includeForValueIn =
            isActive &&
            !isLinkedAttribute &&
            (attributeTypeId === CustomAttributeTypeEnum.NUMERIC ||
              hasParentForm);

          if (includeForValueIn) {
            attributeOptions.push({
              value: attributeId,
              label: attribute.attributeName || attribute.attributeIdentifierName || 'Attribute'
            });
          }
        });

        valueInAttributeDetailsRef.current = details;
        setValueInAttributes(attributeOptions);
        valueInAttributeCacheRef.current[cacheKey] = attributeOptions;
      } catch (error) {
        setValueInAttributes([]);
      } finally {
        setIsValueInAttributesLoading(false);
      }
    },
    []
  );

  const fetchWhenAttributes = useCallback(async (entityId: string) => {
    if (!entityId) {
      setWhenAttributes([]);
      whenAttributeValuesMapRef.current = {};
      setWhenAttributeValuesVersion(version => version + 1);
      setIsWhenAttributesLoading(false);
      return;
    }

    setIsWhenAttributesLoading(true);
    try {
      const payload = await fetchFormFieldsForEntity(entityId);
      const attributeOptions: SelectOption[] = [];
      const valueMap: Record<string, SelectOption[]> = {};

      payload.forEach((attribute: any) => {
        const attributeId = attribute?.id?.toString();
        if (!attributeId) {
          return;
        }

        const attributeTypeId = attribute?.attributeType?.id;
        const includeForConditions =
          attribute?.isActive === 1 &&
          attribute?.linkedAttributeId == null &&
          (attributeTypeId === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN ||
            attributeTypeId === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN ||
            attributeTypeId === CustomAttributeTypeEnum.DATA_LIST);

        if (!includeForConditions) {
          return;
        }

        attributeOptions.push({
          value: attributeId,
          label: attribute.attributeName || attribute.attributeIdentifierName || 'Attribute'
        });

        const lookupSource =
          Array.isArray(attribute.lookupValues) && attribute.lookupValues.length > 0
            ? attribute.lookupValues
            : Array.isArray(attribute.lookupValueList) && attribute.lookupValueList.length > 0
              ? attribute.lookupValueList
              : [];

        valueMap[attributeId] = lookupSource
          .map((lookup: any) => ({
            value:
              lookup.id?.toString() ??
              lookup.lookupValue?.toString() ??
              lookup.dataListValueId?.toString() ??
              lookup.dataListId?.toString() ??
              '',
            label:
              lookup.lookupValue ||
              lookup.stageId ||
              lookup.dataListValueName ||
              lookup.name ||
              lookup.value ||
              ''
          }))
          .filter(option => option.value);
      });

      setWhenAttributes(attributeOptions);
      whenAttributeValuesMapRef.current = valueMap;
      setWhenAttributeValuesVersion(version => version + 1);
    } catch (error) {
      setWhenAttributes([]);
      whenAttributeValuesMapRef.current = {};
      setWhenAttributeValuesVersion(version => version + 1);
    } finally {
      setIsWhenAttributesLoading(false);
    }
  }, [fetchFormFieldsForEntity]);

  const fetchValueInAttributeValues = useCallback(
    async (parentFormId: number | string | undefined) => {
      if (!parentFormId && parentFormId !== 0) {
        setValueInAttributeValues([]);
        return;
      }

      const cacheKey = parentFormId.toString();
      const cachedValues = productFormValuesCacheRef.current[cacheKey];
      if (cachedValues) {
        setValueInAttributeValues(cachedValues);
        return;
      }

      const projectId = getProjectId();
      if (!projectId) {
        return;
      }

      setIsValueInAttributeValuesLoading(true);
      try {
        const [fieldsResponse, productFormResponse] = await Promise.all([
          settingsService.getFieldDetails(projectId, Number(parentFormId)),
          targetService.getProductFormSetting(Number(parentFormId))
        ]);

        const fieldsPayload = extractResponseArray(fieldsResponse);
        const productFormConfig = productFormResponse?.responseData ?? productFormResponse?.data ?? productFormResponse;

        const valueOptions =
          fieldsPayload
            ?.filter(
              (attribute: any) =>
                attribute?.isActive === 1 && attribute?.attributeType?.id === CustomAttributeTypeEnum.CALCULATED_FIELD
            )
            ?.map((attribute: any) => ({
              value: `${attribute.id}-0`,
              label: attribute.attributeName || 'Value'
            })) ?? [];

        const summaryFieldId = productFormConfig?.summaryTotalField;
        if (summaryFieldId) {
          const summaryField = fieldsPayload?.find(
            (attribute: any) => attribute?.isActive === 1 && attribute?.id === summaryFieldId
          );
          if (summaryField) {
            valueOptions.push({
              value: `${summaryField.id}-1`,
              label: `Summary (${summaryField.attributeName || 'Field'})`
            });
          }
        }

        productFormValuesCacheRef.current[cacheKey] = valueOptions;
        setValueInAttributeValues(valueOptions);
      } catch (error) {
        setValueInAttributeValues([]);
      } finally {
        setIsValueInAttributeValuesLoading(false);
      }
    },
    []
  );

  const applyTargetDetails = useCallback(
    async (target: any) => {
      isFormInitializingRef.current = true;

      const targetEntityRaw = target?.targetEntity != null ? target.targetEntity.toString() : '';
      const targetForAggregateRaw =
        target?.targetForAggregate != null ? target.targetForAggregate.toString() : '';
      const aggregateControlValue =
        targetEntityRaw &&
          targetForAggregateRaw &&
          targetForAggregateRaw !== '0' &&
          targetForAggregateRaw !== ''
          ? targetForAggregateRaw
          : targetEntityRaw;

      const calculationType =
        target?.calculationType?.toString() === '2' ? 'count' : 'sum';

      const valueInEntityRaw = target?.valueInEntity != null ? target.valueInEntity.toString() : '';
      const isActivityEntity = valueInEntityRaw && Number(valueInEntityRaw) >= 100;
      const valueInEntityControl = isActivityEntity ? ACTIVITY_OPTION_VALUE : valueInEntityRaw;
      const valueInActivityControl = isActivityEntity ? valueInEntityRaw : '';

      const summaryFlagRaw = target?.summaryFlag != null ? target.summaryFlag.toString() : '0';
      const valueInAttributeValueControl =
        target?.valueInSecondaryAttributeId != null
          ? `${target.valueInSecondaryAttributeId}${summaryFlagRaw ? `-${summaryFlagRaw}` : ''
          }`
          : '';

      const mappedConditions =
        Array.isArray(target?.conditions) && target.conditions.length > 0
          ? target.conditions.map((condition: any) => ({
            entity:
              (condition?.entity ?? valueInEntityRaw)?.toString() ??
              valueInEntityRaw ??
              '',
            attribute: condition?.attributeId?.toString() ?? '',
            value: condition?.value?.toString() ?? '',
            condition: condition?.condition?.toString() === '2' ? '2' : '1'
          }))
          : [
            {
              entity: valueInEntityRaw,
              attribute: '',
              value: '',
              condition: '1'
            }
          ];

      const formData: TargetFormValues = {
        targetName: target?.targetName ?? '',
        startDate: target?.startDate ?? '',
        endDate: target?.endDate ?? '',
        targetFor: targetEntityRaw,
        aggregateFor: aggregateControlValue,
        targetSetOn: calculationType,
        valueInEntity: valueInEntityControl,
        valueInActivity: valueInActivityControl,
        valueInAttribute: target?.valueInAttributeId?.toString() ?? '',
        valueInAttributeValue: valueInAttributeValueControl,
        status: target?.status?.toString() ?? '1',
        conditions: mappedConditions
      };

      reset(formData);
      replace(mappedConditions);

      let resolvedConditionEntityId =
        mappedConditions?.[0]?.entity?.toString() || valueInEntityRaw || '';

      const conditionEntityIsActivity =
        resolvedConditionEntityId &&
        !Number.isNaN(Number(resolvedConditionEntityId)) &&
        Number(resolvedConditionEntityId) >= 100;

      let resolvedConditionLabel = '';

      if (conditionEntityIsActivity) {
        const activityOptions = await fetchValueInActivities();
        const activityLabel =
          activityOptions.find(option => option.value === resolvedConditionEntityId)?.label ||
          activityOptions.find(option => option.value === valueInActivityControl)?.label;

        resolvedConditionLabel =
          activityLabel ||
          target?.activityName ||
          target?.conditions?.[0]?.entityName ||
          target?.valueInEntityName ||
          target?.selectedEntityName ||
          '';
      } else {
        resolvedConditionLabel =
          target?.conditions?.[0]?.entityName ||
          target?.valueInEntityName ||
          target?.selectedEntityName ||
          '';
      }

      if (!resolvedConditionLabel) {
        if (conditionEntityIsActivity) {
          resolvedConditionLabel = target?.activityName || 'Activity';
        } else if (resolvedConditionEntityId === SystemAttributeEnum.COMPANY_MODULE.toString()) {
          resolvedConditionLabel = targetModuleFallbackLabels[SystemAttributeEnum.COMPANY_MODULE];
        } else if (resolvedConditionEntityId === SystemAttributeEnum.OPPORTUNITY_MODULE.toString()) {
          resolvedConditionLabel = targetModuleFallbackLabels[SystemAttributeEnum.OPPORTUNITY_MODULE];
        } else {
          resolvedConditionLabel = targetModuleFallbackLabels[SystemAttributeEnum.USER_MODULE];
        }
      }

      setSelectedConditionEntityId(resolvedConditionEntityId);
      setConditionEntityLabel(resolvedConditionLabel);

      if (isActivityEntity) {
        await fetchValueInActivities();
        if (valueInActivityControl) {
          formFieldsCacheRef.current[valueInActivityControl] = undefined;
          await fetchValueInAttributes(valueInActivityControl, { isActivity: true });
        }
      } else if (valueInEntityControl) {
        formFieldsCacheRef.current[valueInEntityControl] = undefined;
        await fetchValueInAttributes(valueInEntityControl, { isActivity: false });
      }

      if (formData.valueInAttribute) {
        const detail = valueInAttributeDetailsRef.current[formData.valueInAttribute];
        if (detail?.attributeTypeId === CustomAttributeTypeEnum.LINK_FROM_OTHER_ENTITIES && detail.parentFormId) {
          await fetchValueInAttributeValues(detail.parentFormId);
        }
      }

      if (resolvedConditionEntityId) {
        formFieldsCacheRef.current[resolvedConditionEntityId] = undefined;
        await fetchWhenAttributes(resolvedConditionEntityId);
      }

      setTimeout(() => {
        isFormInitializingRef.current = false;
      }, 0);
    },
    [
      fetchValueInActivities,
      fetchValueInAttributes,
      fetchValueInAttributeValues,
      fetchWhenAttributes,
      replace,
      reset
    ]
  );

  const buildTargetPayload = (values: TargetFormValues, projectId: number) => {
    const resolvedValueInEntity =
      values.valueInEntity === ACTIVITY_OPTION_VALUE ? values.valueInActivity : values.valueInEntity;

    const [secondaryAttributeId, summaryFlag] = values.valueInAttributeValue
      ? values.valueInAttributeValue.split('-')
      : [null, null];

    const aggregateForValue =
      showAggregateForField &&
        values.aggregateFor &&
        values.aggregateFor !== values.targetFor
        ? values.aggregateFor
        : '0';

    const conditionsPayload =
      values.conditions?.map((condition, index) => {
        const entity =
          condition.entity || selectedConditionEntityId || resolvedValueInEntity || values.valueInEntity || '';
        return {
          condition: condition.condition || '1',
          attributeId: condition.attribute,
          value: condition.value,
          entity,
          sequence: index + 1
        };
      }) ?? [];

    const filteredConditions = conditionsPayload.filter(
      condition => condition.attributeId && condition.value && condition.entity
    );

    return {
      id: targetId ?? null,
      projectId,
      targetName: values.targetName.trim(),
      startDate: values.startDate,
      endDate: values.endDate,
      targetEntity: values.targetFor,
      targetForAggregate: aggregateForValue,
      calculationType: values.targetSetOn === 'count' ? '2' : '1',
      valueInEntity: resolvedValueInEntity,
      valueInAttributeId: values.targetSetOn === 'sum' ? values.valueInAttribute || null : null,
      valueInSecondaryAttributeId:
        values.targetSetOn === 'sum' ? secondaryAttributeId || null : null,
      summaryFlag: values.targetSetOn === 'sum' ? summaryFlag || null : null,
      status: values.status,
      conditions: filteredConditions
    };
  };

  const formId = 'target-settings-form';

  const handleTargetForFetch = useCallback(async () => {
    if (targetOptionsFetchedRef.current) {
      return;
    }

    const projectId = getProjectId();
    if (!projectId) {
      targetOptionsFetchedRef.current = true;
      return;
    }

    setIsTargetForLoading(true);
    try {
      const [dynamicResult, projectSettings] = await Promise.all([
        settingsService.getdynamicFieldNames(projectId),
        generalSettingService.getProjectSettings(projectId)
      ]);

      const dynamicPayload = dynamicResult?.responseData ?? [];
      const responseData = Array.isArray(dynamicPayload)
        ? dynamicPayload
        : Array.isArray(dynamicPayload?.data)
          ? dynamicPayload.data
          : [];

      if (responseData.length === 0) {
        targetOptionsFetchedRef.current = true;
        return;
      }

      const allowedModuleIds = new Set<number>();
      const projectConfig = projectSettings?.responseData;

      const moduleFlagMap: Record<string, number> = {
        userTargetFlag: SystemAttributeEnum.USER_MODULE,
        customerTargetFlag: SystemAttributeEnum.COMPANY_MODULE,
        opportunityTargetFlag: SystemAttributeEnum.OPPORTUNITY_MODULE
      };

      if (projectConfig) {
        if (projectConfig.userTargetFlag === 1) {
          allowedModuleIds.add(moduleFlagMap.userTargetFlag);
        }
        if (projectConfig.customerTargetFlag === 1) {
          allowedModuleIds.add(moduleFlagMap.customerTargetFlag);
        }
        if (projectConfig.opportunityTargetFlag === 1) {
          allowedModuleIds.add(moduleFlagMap.opportunityTargetFlag);
        }
      }

      const mappedOptions = responseData
        .filter((row: any) => {
          const moduleId = Number(row.moduleId);
          return allowedModuleIds.size === 0 || allowedModuleIds.has(moduleId);
        })
        .map((row: any) => ({
          value: row.moduleId?.toString() ?? row.moduleName ?? row.singularName ?? row.pluralName ?? '',
          label: row.singularName || row.pluralName || row.displayName || row.moduleName || 'Entity'
        }))
        .filter(option => option.value);

      let finalOptions = mappedOptions;

      if (allowedModuleIds.size > 0) {
        const existingValues = new Set(mappedOptions.map(option => option.value));
        const fallbackOptions: SelectOption[] = [];

        allowedModuleIds.forEach(moduleId => {
          const moduleIdStr = moduleId.toString();
          if (!existingValues.has(moduleIdStr)) {
            const fallbackLabel =
              responseData.find((row: any) => Number(row.moduleId) === moduleId)?.singularName ||
              targetModuleFallbackLabels[moduleId] ||
              'Entity';

            fallbackOptions.push({
              value: moduleIdStr,
              label: fallbackLabel
            });
          }
        });

        if (fallbackOptions.length > 0) {
          finalOptions = [...mappedOptions, ...fallbackOptions];
        }
      }

      if (finalOptions.length > 0) {
        setTargetForOptions(finalOptions);
        targetOptionsFetchedRef.current = true;
      } else {
        targetOptionsFetchedRef.current = true;
        setTargetForOptions([]);
      }
    } catch (error) {
    } finally {
      setIsTargetForLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTargetForOptions([]);
      targetOptionsFetchedRef.current = false;
      handleTargetForFetch();
    }
  }, [isOpen, handleTargetForFetch]);

  useEffect(() => {
    if (!isOpen) {
      setDetailError(null);
      setIsDetailLoading(false);
      setSelectedConditionEntityId('');
      setConditionEntityLabel('');
      isFormInitializingRef.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isEditMode || !targetId) {
      return;
    }

    const projectId = getProjectId();
    if (!projectId) {
      setDetailError('Project not available. Please select a project and try again.');
      return;
    }

    let isCancelled = false;

    const loadDetails = async () => {
      setIsDetailLoading(true);
      setDetailError(null);
      try {
        const response = await targetService.getTargetDetails(projectId, targetId);
        if (isCancelled) {
          return;
        }
        const targetData = response?.responseData ?? response?.data ?? response;
        if (!targetData) {
          throw new Error('Target not found');
        }
        await applyTargetDetails(targetData);
      } catch (error) {
        if (!isCancelled) {
          setDetailError('Unable to load target details. Please try again.');
        }
      } finally {
        if (!isCancelled) {
          setIsDetailLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, isEditMode, targetId, applyTargetDetails]);

  useEffect(() => {
    if (fields.length !== conditionsValues.length) {
      return;
    }

    const nextAttributeMap: Record<string, string> = {};

    conditionsValues.forEach((condition, index) => {
      const fieldId = fields[index]?.id;
      if (!fieldId) {
        return;
      }

      if (selectedConditionEntityId && condition?.entity !== selectedConditionEntityId) {
        setValue(`conditions.${index}.entity`, selectedConditionEntityId);
      }

      const attributeValue = condition?.attribute || '';
      const previousAttribute = previousConditionAttributesRef.current[fieldId];

      if (previousAttribute !== undefined && attributeValue !== previousAttribute) {
        setValue(`conditions.${index}.value`, '');
      }

      nextAttributeMap[fieldId] = attributeValue;
    });

    previousConditionAttributesRef.current = nextAttributeMap;
  }, [conditionsValues, selectedConditionEntityId, setValue, fields]);

  useEffect(() => {
    if (fields.length !== conditionsValues.length) {
      return;
    }

    const nextMap: Record<string, SelectOption[]> = {};
    conditionsValues.forEach((condition, index) => {
      const fieldId = fields[index]?.id;
      if (!fieldId) {
        return;
      }
      const attributeValue = condition?.attribute || '';
      nextMap[fieldId] = attributeValue ? whenAttributeValuesMapRef.current[attributeValue] ?? [] : [];
    });
    setConditionAttributeValueOptionsMap(nextMap);
  }, [conditionsValues, whenAttributeValuesVersion, fields]);

  useEffect(() => {
    if (isFormInitializingRef.current) {
      return;
    }

    const previousTargetFor = previousTargetForRef.current;
    if (previousTargetFor !== (selectedTargetFor || '')) {
      setValue('aggregateFor', '');
    }
    previousTargetForRef.current = selectedTargetFor || '';

    if (!selectedTargetFor) {
      setValue('valueInEntity', '');
      setValue('valueInActivity', '');
      setValue('valueInAttribute', '');
      setValue('valueInAttributeValue', '');
      setValueInAttributes([]);
      setValueInAttributeValues([]);
      return;
    }

    const allowedValues = new Set(valueInEntityOptions.map(option => option.value));
    if (selectedValueInEntity && !allowedValues.has(selectedValueInEntity)) {
      setValue('valueInEntity', '');
      setValue('valueInActivity', '');
      setValue('valueInAttribute', '');
      setValue('valueInAttributeValue', '');
      setValueInAttributes([]);
      setValueInAttributeValues([]);
    }
  }, [selectedTargetFor, valueInEntityOptions, selectedValueInEntity, setValue]);

  useEffect(() => {
    if (isFormInitializingRef.current) {
      return;
    }
    setValue('valueInEntity', '');
    setValue('valueInActivity', '');
    setValue('valueInAttribute', '');
    setValue('valueInAttributeValue', '');
    setValueInAttributes([]);
    setValueInAttributeValues([]);
    previousValueInEntityRef.current = '';
    previousValueInActivityRef.current = '';
    previousValueInAttributeRef.current = '';
  }, [selectedTargetSetOn, setValue]);

  useEffect(() => {
    if (isFormInitializingRef.current) {
      return;
    }

    const previousValue = previousValueInEntityRef.current;
    if (previousValue !== selectedValueInEntity) {
      setValue('valueInActivity', '');
      setValue('valueInAttribute', '');
      setValue('valueInAttributeValue', '');
      setValueInAttributes([]);
      setValueInAttributeValues([]);
    }
    previousValueInEntityRef.current = selectedValueInEntity || '';

    if (!selectedValueInEntity) {
      return;
    }

    if (selectedValueInEntity === ACTIVITY_OPTION_VALUE) {
      fetchValueInActivities();
    } else {
      fetchValueInAttributes(selectedValueInEntity, { isActivity: false });
    }
  }, [selectedValueInEntity, fetchValueInActivities, fetchValueInAttributes, setValue]);

  useEffect(() => {
    if (isFormInitializingRef.current) {
      return;
    }

    if (selectedValueInEntity !== ACTIVITY_OPTION_VALUE) {
      return;
    }

    const previousValue = previousValueInActivityRef.current;
    if (previousValue !== selectedValueInActivity) {
      setValue('valueInAttribute', '');
      setValue('valueInAttributeValue', '');
      setValueInAttributes([]);
      setValueInAttributeValues([]);
    }

    previousValueInActivityRef.current = selectedValueInActivity || '';

    if (selectedValueInActivity) {
      fetchValueInAttributes(selectedValueInActivity, { isActivity: true });
    }
  }, [selectedValueInEntity, selectedValueInActivity, fetchValueInAttributes, setValue]);

  useEffect(() => {
    if (isFormInitializingRef.current) {
      previousConditionEntityRef.current = selectedConditionEntityId || '';
      return;
    }

    const previousEntity = previousConditionEntityRef.current;
    if (selectedConditionEntityId && selectedConditionEntityId !== previousEntity) {
      replace([
        {
          entity: selectedConditionEntityId,
          attribute: '',
          value: '',
          condition: '1'
        }
      ]);
      previousConditionEntityRef.current = selectedConditionEntityId;
    } else if (!selectedConditionEntityId && previousEntity) {
      replace([
        {
          entity: '',
          attribute: '',
          value: '',
          condition: '1'
        }
      ]);
      previousConditionEntityRef.current = '';
    }
  }, [selectedConditionEntityId, replace]);

  useEffect(() => {
    if (selectedConditionEntityId) {
      fetchWhenAttributes(selectedConditionEntityId);
    } else {
      setWhenAttributes([]);
      whenAttributeValuesMapRef.current = {};
      setWhenAttributeValuesVersion(version => version + 1);
    }
  }, [selectedConditionEntityId, fetchWhenAttributes]);

  useEffect(() => {
    if (isFormInitializingRef.current) {
      previousValueInAttributeRef.current = selectedValueInAttribute || '';
      return;
    }

    const previousValue = previousValueInAttributeRef.current;
    if (previousValue !== selectedValueInAttribute) {
      setValue('valueInAttributeValue', '');
      setValueInAttributeValues([]);
    }
    previousValueInAttributeRef.current = selectedValueInAttribute || '';

    if (!selectedValueInAttribute) {
      return;
    }

    const detail = valueInAttributeDetailsRef.current[selectedValueInAttribute];
    if (
      detail?.attributeTypeId === CustomAttributeTypeEnum.LINK_FROM_OTHER_ENTITIES &&
      detail?.parentFormId &&
      selectedTargetSetOn === 'sum'
    ) {
      fetchValueInAttributeValues(detail.parentFormId);
    }
  }, [selectedValueInAttribute, selectedTargetSetOn, fetchValueInAttributeValues, setValue]);

  if (!isOpen) {
    return null;
  }

  const showLoaderOverlay =
    editModeDataLoading ||
    (!isEditMode && isTargetForLoading && targetForOptions.length === 0);

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      allowBorder
      closeOnOutsideClick={false}
      // modalClassName="max-w-2xl"
      // containerClassName="w-full"
      header={
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">Target Settings</h2>
        </div>
      }
      footer={
        <>
          <Button
            className="bg-gray-200 hover:bg-gray-300 text-black rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm"
            aria-label="Back"
            onClick={handleClose}
          >Cancel
          </Button>
          <Button
            className="bg-[#3699FF] hover:bg-blue-600 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm"
            aria-label="Save"
            onClick={handleSave}
            disabled={isSaving || showLoaderOverlay || isDetailLoading}
          >
            {isSaving ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                <span>Saving...</span>
              </div>
            ) : (
              'Save'
            )}
          </Button>
        </>
      }
    >
      <div className="relative">
        {showLoaderOverlay && (
          <div className="absolute inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-lg" />
            <div className="relative bg-transparent rounded-lg p-8">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                <p className="text-white font-medium">Loading...</p>
              </div>
            </div>
          </div>
        )}
        <form id={formId} onSubmit={handleSave} className={`space-y-7 ${showLoaderOverlay ? 'pointer-events-none opacity-50' : ''}`}>
          {detailError && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              {detailError}
            </div>
          )}
          {saveError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {saveError}
            </div>
          )}
          {isEditMode && isDetailLoading && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
              Loading target details...
            </div>
          )}
          <div className="grid grid-cols-12 gap-6 items-center">
            <label htmlFor="targetName" className="col-span-3 text-sm font-semibold text-gray-700">
              Target Name <span className="text-[#F64E60]">*</span>
            </label>
            <div className="col-span-9">
              <TextInput
                name="targetName"
                control={control}
                validationRules={{
                  required: 'Target name is required'
                }}
                disabled={disableNameField}
                placeholder="Enter target name"
                showCharacterCount
                maxLength={500}
                maxWidth="w-full"
                inputProps={{
                  id: 'targetName'
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 items-center">
            <label className="col-span-3 text-sm font-semibold text-gray-700">
              Target Period <span className="text-[#F64E60]">*</span>
            </label>
            <div className="col-span-9 grid grid-cols-2 gap-4">
              <DateInput
                name="startDate"
                control={control}
                validationRules={{
                  required: 'Start date is required'
                }}
                disabled={disableGeneralFields}
                placeholder="Select start date"
                minDate={today}
              />
              <DateInput
                name="endDate"
                control={control}
                validationRules={{
                  required: 'End date is required'
                }}
                disabled={disableGeneralFields || !startDateValue}
                minDate={startDateValue || undefined}
                placeholder="Select end date"
              />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 items-center">
            <label className="col-span-3 text-sm font-semibold text-gray-700">
              Target For <span className="text-[#F64E60]">*</span>
            </label>
            <div className="col-span-9 grid grid-cols-2 gap-4">
              <Select
                name="targetFor"
                control={control}
                validationRules={{
                  required: 'Target for is required'
                }}
                disabled={disableGeneralFields}
                options={targetForOptions}
                placeholder="Select entity"
              />
              {showAggregateForField && (
                <div>
                  <Select
                    name="aggregateFor"
                    control={control}
                    validationRules={{
                      required: 'Aggregate for is required'
                    }}
                    disabled={disableGeneralFields}
                    options={aggregateEntityOptions}
                    placeholder="Aggregate for"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 items-center">
            <label className="col-span-3 text-sm font-semibold text-gray-700">
              Target Set On <span className="text-[#F64E60]">*</span>
            </label>
            <div className="col-span-9">
              <RadioInput
                name="targetSetOn"
                control={control}
                validationRules={{
                  required: 'Select how to set the target'
                }}
                disabled={disableGeneralFields}
                options={[
                  { value: 'sum', label: 'Sum Of' },
                  { value: 'count', label: 'Count Of' }
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 items-center">
            <label className="col-span-3 text-sm font-semibold text-gray-700">
              Value In <span className="text-[#F64E60]">*</span>
            </label>
            <div className="col-span-9 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                name="valueInEntity"
                control={control}
                validationRules={{
                  required: 'Entity is required'
                }}
                options={valueInEntityOptions}
                placeholder="Select entity"
                disabled={disableGeneralFields || valueInEntityOptions.length === 0}
              />
              {showValueInActivitySelect && (
                <Select
                  name="valueInActivity"
                  control={control}
                  validationRules={{
                    required: 'Activity is required'
                  }}
                  options={valueInActivities}
                  placeholder="Select activity"
                  disabled={disableGeneralFields || valueInActivities.length === 0}
                />
              )}
              {showValueInAttributeSelect && (
                <Select
                  name="valueInAttribute"
                  control={control}
                  validationRules={{
                    required: 'Attribute is required'
                  }}
                  options={valueInAttributes}
                  placeholder="Select attribute"
                  disabled={disableGeneralFields || valueInAttributes.length === 0}
                />
              )}
              {showValueInAttributeValueSelect && (
                <Select
                  name="valueInAttributeValue"
                  control={control}
                  validationRules={{
                    required: 'Value is required'
                  }}
                  options={valueInAttributeValues}
                  placeholder="Select value"
                  disabled={disableGeneralFields || valueInAttributeValues.length === 0}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 items-start">
            <label className="col-span-3 text-sm font-semibold text-gray-700 pt-2">
              When <span className="text-[#F64E60]">*</span>
            </label>
            <div className="col-span-9 space-y-4">
              {fields.map((field, index) => {
                const condition = conditionsValues?.[index];
                const fieldId = field.id;
                const attributeValue = condition?.attribute || '';
                const attributeValueOptions = conditionAttributeValueOptionsMap[fieldId] ?? [];
                const conditionValue = condition?.condition || '1';

                return (
                    <div key={field.id} className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-start">
                      <div className="w-full">
                        {index === 0 ? (
                          <Select
                            name={`conditions.${index}.entity`}
                            control={control}
                            options={conditionEntityDisplayOptions}
                            placeholder="Entity"
                            disabled
                          />
                        ) : (
                          <>
                            <Controller
                              name={`conditions.${index}.entity`}
                              control={control}
                              render={({ field }) => <input type="hidden" {...field} />}
                            />
                            <div className="h-10" />
                          </>
                        )}
                      </div>
                      <div className="w-full">
                        <Select
                          name={`conditions.${index}.attribute`}
                          control={control}
                          validationRules={{ required: 'Attribute is required' }}
                          options={whenAttributes}
                          placeholder="Attribute"
                          disabled={
                            disableConditionFields ||
                            !selectedConditionEntityId ||
                            whenAttributes.length === 0
                          }
                        />
                      </div>
                      <div className="w-full">
                        <Select
                          name={`conditions.${index}.value`}
                          control={control}
                          validationRules={{ required: 'Value is required' }}
                          options={attributeValueOptions}
                          placeholder="Value"
                          disabled={disableConditionFields || !attributeValue}
                        />
                      </div>
                      {isEditMode ? (
                        <div className="w-full" />
                      ) : (
                        <div className="flex items-center justify-start gap-3 ml-3 lg:justify-start lg:ml-3 mt-[9px]">
                          <RemoveActionButton
                            id={index}
                            onRemove={() => conditionRowControls && remove(index)}
                            disabled={!conditionRowControls}
                            className="h-6 w-6 shrink-0"
                          />
                          {index === fields.length - 1 && (
                            <AddActionButton
                              onAdd={handleAddCondition}
                              disabled={disableConditionFields}
                              className="h-6 w-6 shrink-0"
                            />
                          )}
                        </div>
                      )}
                    </div>
                    {fields.length > 1 && index < fields.length - 1 && (
                      <div className="flex justify-end">
                        <div className="inline-flex rounded-md border border-gray-300 text-sm">
                          <button
                            type="button"
                            className={`px-4 py-1 rounded-l-md ${conditionValue === '1'
                                ? 'bg-[#3699FF] text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-100'
                              } ${disableConditionFields ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={disableConditionFields}
                            onClick={() => {
                              if (disableConditionFields) {
                                return;
                              }
                              setValue(`conditions.${index}.condition`, '1');
                            }}
                          >
                            AND
                          </button>
                          <button
                            type="button"
                            className={`px-4 py-1 rounded-r-md border-l border-gray-300 ${conditionValue === '2'
                                ? 'bg-[#3699FF] text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-100'
                              } ${disableConditionFields ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={disableConditionFields}
                            onClick={() => {
                              if (disableConditionFields) {
                                return;
                              }
                              setValue(`conditions.${index}.condition`, '2');
                            }}
                          >
                            OR
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 items-center">
            <label className="col-span-3 text-sm font-semibold text-gray-700">
              Status <span className="text-[#F64E60]">*</span>
            </label>
            <div className="col-span-9">
              <Select
                name="status"
                control={control}
                validationRules={{
                  required: 'Status is required'
                }}
                disabled={disableStatusField}
                options={[
                  { value: '1', label: 'Active' },
                  { value: '0', label: 'Inactive' }
                ]}
                placeholder="Select status"
              />
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddEditTarget;
