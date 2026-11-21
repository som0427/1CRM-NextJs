import React, { useEffect, useMemo, useState, useCallback } from "react";
import TwinModal from "@/components/common/TwinModal";
import { Button } from "@/components/ui/tailwind/Button";
import { useForm } from "react-hook-form";
import TextInput from "@/components/common/input-fields/TextInput";
import TextArea from "@/components/common/input-fields/TextArea";
import Select from "@/components/common/input-fields/Select";
import MultiSelect from "@/components/common/input-fields/MultiSelect";
import RadioInput from "@/components/common/input-fields/RadioInput";
import DateInput from "@/components/common/input-fields/DateInput";
import workflowService from "@/lib/services/workflowService";
import * as workflowCommunicationService from "@/lib/services/workflowCommunicationService";
import { useSnackbar } from "notistack";
import { getSingularNames } from "@/lib/storage/sharedStorage";
import { SystemModules } from "@/lib/models/entity-logs";

interface WorkflowSaveData {
  name?: string;
  workflowDescription?: string;
  entityId: number;
  triggerId: number;
  triggerFieldId: number | null;
  status: number;
  projectId: number;
  description: string | null;
  startDate: string | null;
  startTime: string | null;
  startAtAm: number;
  repeatOn: string | null;
  repeatFrequency: string | null;
  endDate: string | null;
  endTime: string | null;
  endAtAm: number;
  repeatedOn: number[] | null;
}

interface AddWorkflowModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: WorkflowSaveData) => void;
  projectId: number;
  loading?: boolean;
}

const AddWorkflowModal: React.FC<AddWorkflowModalProps> = ({
  open,
  onClose,
  onSave,
  projectId,
  loading = false,
}) => {

  // Scheduling constants
  const { enqueueSnackbar } = useSnackbar();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const todayDate = new Date();
  const minPossibleHr = '01';
  const maxPossibleHr = '12';
  const minPossibleMin = '00';
  const maxPossibleMin = '59';
  const ZERO = '0';

  // Scheduling state
  const [isStartAM, setIsStartAM] = useState<boolean>(true);
  const [isStart_AMPM_disabled, setIsStart_AMPM_disabled] = useState<boolean>(true);
  const [isEndAM, setIsEndAM] = useState<boolean>(true);
  const [isEnd_AMPM_disabled, setIsEnd_AMPM_disabled] = useState<boolean>(true);

  const repeatOptions = [
    { id: 1, name: 'Never' },
    { id: 2, name: 'Daily' },
    { id: 3, name: 'Weekly' },
    { id: 4, name: 'Monthly' },
    { id: 5, name: 'Yearly' },
  ];

  const [showRepeatEvery, setShowRepeatEvery] = useState<boolean>(false);

  const repeatOnWeekDayNames = [
    { id: 1, name: 'Sunday' },
    { id: 2, name: 'Monday' },
    { id: 3, name: 'Tuesday' },
    { id: 4, name: 'Wednesday' },
    { id: 5, name: 'Thursday' },
    { id: 6, name: 'Friday' },
    { id: 7, name: 'Saturday' },
  ];

  const [showRepeatsOn1, setShowRepeatsOn1] = useState<boolean>(false);
  const [showRepeatsOn2, setShowRepeatsOn2] = useState<boolean>(false);
  const [showEndDateTime, setShowEndDateTime] = useState<boolean>(false);

  const orderOfNumber = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth'];

  const [repeatOnOptionsForMonthly, setRepeatOnOptionsForMonthly] = useState([
    { id: 1, name: '' },
    { id: 2, name: '' },
  ]);

  const [repeatOnOptionsForYearly, setRepeatOnOptionsForYearly] = useState([
    { id: 1, name: '' },
    { id: 2, name: '' },
  ]);

  const [showRadioOptionSetForMonthly, setShowRadioOptionSetForMonthly] = useState<boolean>(false);
  const [maxValAllowedForRepeatEvery, setMaxValAllowedForRepeatEvery] = useState<number>(0);
  const [repeatEveryTouched, setRepeatEveryTouched] = useState<boolean>(false);

  // Entity/Trigger state
  const [triggerListMap, setTriggerListMap] = useState<Map<number, any[]>>(new Map());
  const [entityList, setEntityListState] = useState<any[]>([]);
  const [triggerList, setTriggerList] = useState<any[]>([]);
  const [entityFieldList, setEntityFieldList] = useState<any[]>([]);
  const [showTriggerOptions, setShowTriggerOptions] = useState<boolean>(true);
  const [showTriggerField, setShowTriggerField] = useState<boolean>(false);
  const [isDateTimeEntity, setIsDateTimeEntity] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    clearErrors,
    trigger,
    formState: { errors },
  } = useForm({
    shouldUnregister: true,
    defaultValues: {
      name: "",
      description: "",
      entity: "",
      trigger: "",
      startDate: "",
      startHours: "",
      startMins: "",
      repeat: "",
      repeatEvery: "",
      repeatOn1: [] as Array<string>,
      repeatOn2: "",
      endDate: "",
      endHours: "",
      endMins: "",
      triggerField: "",
    },
  });

  useEffect(() => {
    reset({
      name: "",
      description: "",
      entity: "",
      trigger: "",
    });
    // Reset UI states when modal opens/closes
    setShowTriggerField(false);
    setShowTriggerOptions(true);
    setIsDateTimeEntity(false);
    setTriggerList([]);
    setEntityFieldList([]);
    setShowRepeatEvery(false);
    setShowRepeatsOn1(false);
    setShowRepeatsOn2(false);
    setShowEndDateTime(false);
    setIsStart_AMPM_disabled(true);
    setIsEnd_AMPM_disabled(true);
    setIsStartAM(true);
    setIsEndAM(true);
  }, [open, reset]);

  const remainingName = useMemo(() => 500 - (watch("name")?.length || 0), [watch]);
  const remainingDesc = useMemo(() => 200 - (watch("description")?.length || 0), [watch]);

  const todayDateStr = useMemo(() => {
    const year = todayDate.getFullYear();
    const month = String(todayDate.getMonth() + 1).padStart(2, '0');
    const day = String(todayDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [todayDate]);

  const selectedEntityValue = watch('entity');
  const selectedTriggerValue = watch('trigger');
  const startDateValue = watch('startDate');
  const endDateValue = watch('endDate');


  // Set entity list from communication service (filters active entities)
  const setEntityListFromComms = useCallback(() => {
    const commsEntityList = workflowCommunicationService.getEntityList();
    if (commsEntityList) {
      const activeEntities = commsEntityList.filter((element: any) => element.isActive);
      setEntityListState(activeEntities);
    }
  }, []);

  // Fetch entity list from API when modal opens
  const getEntityList = useCallback(async () => {
    // Check if entity list is already cached in communication service
    const cachedEntityList = workflowCommunicationService.getEntityList();
    if (cachedEntityList && cachedEntityList.length > 0) {
      setEntityListFromComms();
      setShowModal(true);
    } else {
      setIsLoading(true);
      try {
        const response: any = await workflowService.getActivityNames(projectId);
        setIsLoading(false);
        setShowModal(true);
        
        if (response?.statusCode >= 400) {
          enqueueSnackbar('Unable to fetch data.', { variant: 'error' });
          onClose();
          return;
        }
        
        // Set entity list in communication service (includes Date Time, User, and activities)
        const singularNamesFromStorage = getSingularNames();
        workflowCommunicationService.setEntityList(singularNamesFromStorage, response?.responseData || []);
        setEntityListFromComms();
      } catch (error) {
        setIsLoading(false);
        enqueueSnackbar('Unable to fetch data.', { variant: 'error' });
        onClose();
      }
    }
  }, [projectId, setEntityListFromComms, onClose, enqueueSnackbar]);

  const setTriggerListMapFromComms = useCallback(() => {
    const commsTriggerMap = workflowCommunicationService.getTriggerMap();
    if (commsTriggerMap) {
      setTriggerListMap(new Map(commsTriggerMap));
    }
  }, []);



  useEffect(() => {
    if (!selectedEntityValue) {
      return;
    }

    const selectedEntityId = String(selectedEntityValue);
    if (selectedEntityId === String(SystemModules.DATE_TIME)) {
      return;
    }

    const entityItem = entityList.find((x: any) => String(x.id) === selectedEntityId);
    if (!entityItem) {
      return;
    }

    const commsTriggerMap = workflowCommunicationService.getTriggerMap();
    const effectiveTriggerMap =
      triggerListMap && triggerListMap.size > 0
        ? triggerListMap
        : commsTriggerMap || new Map<number, any[]>();

    const triggers = entityItem.isActivity
      // Activity triggers are stored under key 101 in the trigger map
      ? effectiveTriggerMap.get(101) || []
      : effectiveTriggerMap.get(Number(entityItem.id)) || [];

    setTriggerList(triggers);
  }, [entityList, selectedEntityValue, triggerListMap]);

  // Initialize entity list and trigger map when modal opens
  useEffect(() => {
    if (open) {
      setTriggerListMapFromComms();
      getEntityList();
    }
  }, [open, getEntityList, setTriggerListMapFromComms]);

  // Get custom field values for entity
  const getCustomFieldValue = useCallback(async (pId: number, moduleType: number) => {
    setEntityFieldList([]);
    setIsLoading(true);
    try {
      const response: any = await workflowService.getFields(pId, moduleType);
      if (response?.statusCode <= 400) {
        setEntityFieldList(response.responseData.filter((x: any) => x.isActive === 1));
      }
    } catch (error) {
      console.error('Unable to fetch field data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Reset end date/time controls
  const resetEndDateTime = useCallback(() => {
    setShowEndDateTime(false);
    setValue('endDate', '');
    setValue('endHours', '');
    setValue('endMins', '');
    setIsEnd_AMPM_disabled(true);
    setIsEndAM(true);
  }, [setValue]);

  // Reset and disable all date/time controls
  const resetAndDisableDateTimeControls = useCallback(() => {
    setValue('startDate', '');
    setValue('startHours', '');
    setValue('startMins', '');
    setIsStartAM(true);
    setIsStart_AMPM_disabled(true);

    setValue('repeat', '');
    setShowRepeatEvery(false);
    setValue('repeatEvery', '');

    setShowRepeatsOn1(false);
    setValue('repeatOn1', []);

    setShowRepeatsOn2(false);
    setValue('repeatOn2', '');

    resetEndDateTime();
  }, [setValue, resetEndDateTime]);

  // Make date/time controls required
  const makeRequiredDateTimeControls = useCallback(() => {
    // In React Hook Form, validation is handled via validationRules
    // This function sets default values when date/time entity is selected
    setValue('repeat', '1'); // Default to 'Never'
  }, [setValue]);

  // Handle entity change
  const changeEntity = useCallback((nextEntityValue?: string) => {
    setValue('trigger', '', { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    clearErrors('trigger');

    const entityId = String(nextEntityValue ?? watch('entity'));

    if (entityId === String(SystemModules.DATE_TIME)) { // date time entity
      setShowTriggerOptions(false);
      setValue('triggerField', '', { shouldDirty: false, shouldTouch: false, shouldValidate: false });
      clearErrors('triggerField');
      setShowTriggerField(false);
      setTriggerList([]);
      makeRequiredDateTimeControls();
      setIsDateTimeEntity(true);
    } else {
      const entityItem = entityList.find((x: any) => String(x.id) === entityId);

      const commsTriggerMap = workflowCommunicationService.getTriggerMap();
      const effectiveTriggerMap =
        triggerListMap && triggerListMap.size > 0
          ? triggerListMap
          : commsTriggerMap || new Map<number, any[]>();

      if (triggerListMap.size === 0 && commsTriggerMap) {
        setTriggerListMap(new Map(commsTriggerMap));
      }

      if (entityItem?.isActivity) {
        // Activity triggers are stored under key 101 in the trigger map
        setTriggerList(effectiveTriggerMap.get(101) || []);
      } else if (entityItem) {
        setTriggerList(effectiveTriggerMap.get(Number(entityItem.id)) || []);
      } else {
        setTriggerList([]);
      }

      setShowTriggerOptions(true);
      setValue('triggerField', '', { shouldDirty: false, shouldTouch: false, shouldValidate: false });
      clearErrors('triggerField');
      resetAndDisableDateTimeControls();
      setIsDateTimeEntity(false);
    }

    setShowTriggerField(false);
  }, [setValue, watch, entityList, triggerListMap, makeRequiredDateTimeControls, resetAndDisableDateTimeControls]);

  // Handle trigger change
  const changeTrigger = useCallback((nextTriggerValue?: string) => {
    // Read entity fresh from form to avoid stale closure
    const selectedEntity = String(watch('entity') ?? '');
    const selectedTrigger = String(nextTriggerValue ?? watch('trigger') ?? '');
    const SystemModules_USER = String(SystemModules.USER); // User entity ID
    
    // Show Select Field when "Updated" (id: 2) trigger is selected and entity is not User
    if (selectedTrigger === '2' && selectedEntity !== SystemModules_USER) {
      setShowTriggerField(true);
      getCustomFieldValue(projectId, Number(selectedEntity));
    } else {
      setShowTriggerField(false);
      setValue('triggerField', '', { shouldDirty: false, shouldTouch: false, shouldValidate: false });
      clearErrors('triggerField');
    }
  }, [watch, projectId, getCustomFieldValue, setValue, clearErrors]);

  // Setup repeat options arrays based on selected date
  const setupRepeatOnOptionsArrays = useCallback((value: Date) => {
    const selectedDate = value.getDate();
    const selectedDayName = value.getDay();
    const selectedMonthNameShort = value.toLocaleDateString('en-US', { month: 'short' });
    const selectedMonthNameLong = value.toLocaleDateString('en-US', { month: 'long' });
    const selectedDayNameTxt = value.toLocaleDateString('en-US', { weekday: 'long' });

    const firstDayOfMonth = new Date(value.getFullYear(), value.getMonth(), 1);
    const firstDayOfMonthDayName = firstDayOfMonth.getDay();

    let diffBetwnSelectedAndFirstDay = selectedDayName - firstDayOfMonthDayName;
    if (diffBetwnSelectedAndFirstDay < 0) {
      diffBetwnSelectedAndFirstDay = 7 + diffBetwnSelectedAndFirstDay;
    }

    const firstDayOfSameDayNameDate = 1 + diffBetwnSelectedAndFirstDay;
    const diffOfDays = selectedDate - firstDayOfSameDayNameDate;

    const orderOfTheDay = Math.floor(diffOfDays / 7) + 1;
    const orderOfTheDayTxt = orderOfNumber[orderOfTheDay] || '';

    setRepeatOnOptionsForMonthly([
      { id: 1, name: 'Day ' + selectedDate },
      { id: 2, name: orderOfTheDayTxt + ' ' + selectedDayNameTxt },
    ]);

    setRepeatOnOptionsForYearly([
      { id: 1, name: selectedDate + '-' + selectedMonthNameShort },
      { id: 2, name: orderOfTheDayTxt + ' ' + selectedDayNameTxt + ' of ' + selectedMonthNameLong },
    ]);
  }, [orderOfNumber]);

  // Handle start date selection
  const startDateSelected = useCallback((value: Date | null) => {
    if (!value) return;

    setupRepeatOnOptionsArrays(value);

    if (isStart_AMPM_disabled) {
      setValue('startHours', maxPossibleHr);
      setValue('startMins', minPossibleMin);
      setIsStart_AMPM_disabled(false);
    }
  }, [isStart_AMPM_disabled, setValue, maxPossibleHr, minPossibleMin, setupRepeatOnOptionsArrays]);

  useEffect(() => {
    if (!startDateValue) {
      return;
    }
    const date = startDateValue ? new Date(startDateValue + 'T00:00:00') : null;
    startDateSelected(date);
  }, [startDateSelected, startDateValue]);

  // Handle end date selection
  const endDateSelected = useCallback((value: Date | null) => {
    if (!value) return;

    if (isEnd_AMPM_disabled) {
      setValue('endHours', '11');
      setValue('endMins', '59');
      setIsEndAM(false);
      setIsEnd_AMPM_disabled(false);
    }
  }, [isEnd_AMPM_disabled, setValue]);

  useEffect(() => {
    if (!endDateValue) {
      return;
    }
    const date = endDateValue ? new Date(endDateValue + 'T00:00:00') : null;
    endDateSelected(date);
  }, [endDateSelected, endDateValue]);

  // Watch repeatEvery value and trigger validation when it has a value
  const repeatEveryValue = watch('repeatEvery');
  useEffect(() => {
    if (repeatEveryValue && repeatEveryValue.length > 0) {
      trigger('repeatEvery');
    }
  }, [repeatEveryValue, trigger]);

  // Handle time input changes
  const timeChange = useCallback((value: string, item: string) => {
    let processedValue = value;
    
    if (processedValue.length > 2) {
      processedValue = processedValue.slice(0, 2);
    }

    switch (item) {
      case 'startHH':
        if (+processedValue > Number(maxPossibleHr)) {
          setValue('startHours', maxPossibleHr);
        } else if (+processedValue < Number(ZERO)) {
          setValue('startHours', ZERO);
        } else {
          setValue('startHours', processedValue);
        }
        break;
      case 'startMM':
        if (+processedValue > Number(maxPossibleMin)) {
          setValue('startMins', maxPossibleMin);
        } else if (+processedValue < Number(minPossibleMin)) {
          setValue('startMins', minPossibleMin);
        } else {
          setValue('startMins', processedValue);
        }
        break;
      case 'endHH':
        if (+processedValue > Number(maxPossibleHr)) {
          setValue('endHours', maxPossibleHr);
        } else if (+processedValue < Number(ZERO)) {
          setValue('endHours', ZERO);
        } else {
          setValue('endHours', processedValue);
        }
        break;
      case 'endMM':
        if (+processedValue > Number(maxPossibleMin)) {
          setValue('endMins', maxPossibleMin);
        } else if (+processedValue < Number(minPossibleMin)) {
          setValue('endMins', minPossibleMin);
        } else {
          setValue('endMins', processedValue);
        }
        break;
      case 'startAMPM':
        setIsStartAM(prev => !prev);
        break;
      case 'endAMPM':
        setIsEndAM(prev => !prev);
        break;
      default:
        break;
    }
  }, [setValue, maxPossibleHr, maxPossibleMin, minPossibleMin, ZERO]);

  // Handle time input blur (format on blur)
  const timeInputBlur = useCallback((value: string, item: string) => {
    switch (item) {
      case 'startHH':
        if (value.length === 1) {
          setValue('startHours', '0' + value);
        } else if (value.length === 0) {
          setValue('startHours', minPossibleHr);
        }
        if (+value < Number(minPossibleHr)) {
          setValue('startHours', minPossibleHr);
        }
        break;
      case 'startMM':
        if (value.length === 1) {
          setValue('startMins', '0' + value);
        } else if (value.length === 0) {
          setValue('startMins', minPossibleMin);
        }
        break;
      case 'endHH':
        if (value.length === 1) {
          setValue('endHours', '0' + value);
        } else if (value.length === 0) {
          setValue('endHours', minPossibleHr);
        }
        if (+value < Number(minPossibleHr)) {
          setValue('endHours', minPossibleHr);
        }
        break;
      case 'endMM':
        if (value.length === 1) {
          setValue('endMins', '0' + value);
        } else if (value.length === 0) {
          setValue('endMins', minPossibleMin);
        }
        break;
      default:
        break;
    }
  }, [setValue, minPossibleHr, minPossibleMin]);

  // Handle repeat type change
  const changeRepeatType = useCallback((value: number | string) => {
    const numValue = Number(value);
    
    if (numValue === 1) { // Never
      setShowRepeatEvery(false);
      setValue('repeatEvery', '');
      clearErrors('repeatEvery');
      resetEndDateTime();
    } else {
      // Set max value based on repeat type
      if (numValue === 2) { // Daily
        setMaxValAllowedForRepeatEvery(31);
      } else if (numValue === 3) { // Weekly
        setMaxValAllowedForRepeatEvery(5);
      } else if (numValue === 4) { // Monthly
        setMaxValAllowedForRepeatEvery(12);
      }
      setShowRepeatEvery(true);
      setShowEndDateTime(true);
      // Reset repeatEvery and endDate fields when repeat type changes
      setValue('repeatEvery', '');
      clearErrors('repeatEvery');
      setRepeatEveryTouched(false);
      // Reset end date fields
      setValue('endDate', '');
      setValue('endHours', '');
      setValue('endMins', '');
      setIsEnd_AMPM_disabled(true);
      setIsEndAM(true);
    }

    // For weekly - show repeats on weekdays
    if (numValue === 3) {
      setShowRepeatsOn1(true);
    } else {
      setShowRepeatsOn1(false);
      setValue('repeatOn1', []);
      clearErrors('repeatOn1');
    }

    // For monthly & yearly - show repeats on options
    if ([4, 5].includes(numValue)) {
      setShowRepeatsOn2(true);
      if (numValue === 4) {
        setShowRadioOptionSetForMonthly(true);
      } else {
        setShowRadioOptionSetForMonthly(false);
      }
    } else {
      setShowRepeatsOn2(false);
      setValue('repeatOn2', '');
      clearErrors('repeatOn2');
    }
  }, [setValue, resetEndDateTime, clearErrors, trigger]);

  // Handle repeat every input validation
  const repeatEveryInput = useCallback((value: string) => {
    if (value === '0') {
      setValue('repeatEvery', '');
    }
  }, [setValue]);

  // Remove a day from the selected days array
  const removeDayName = useCallback((day: { id: number; name: string }, controlName: string) => {
    const days = watch(controlName as any) as Array<{ id: number; name: string }>;
    if (!days || !Array.isArray(days)) return;

    const indexToRemove = days.findIndex(x => x.id === day.id);
    if (indexToRemove !== -1) {
      const updatedDays = [...days];
      updatedDays.splice(indexToRemove, 1);
      setValue(controlName as any, updatedDays as any);
    }
  }, [watch, setValue]);

  // Get ordinal suffix for a number
  const getOrdinal = useCallback((value: string): string => {
    if (value === '1') {
      return '';
    }
    const getOrdinalBasedOnLastDigit = (digit: string): string => {
      switch (digit) {
        case '1':
          return 'st';
        case '2':
          return 'nd';
        case '3':
          return 'rd';
        default:
          return 'th';
      }
    };
    if (value.length === 1) {
      return value + getOrdinalBasedOnLastDigit(value) + ' ';
    } else if (value.length === 2) {
      if (value[0] === '1') {
        return value + 'th ';
      } else {
        return value + getOrdinalBasedOnLastDigit(value[1]) + ' ';
      }
    }
    return value + ' ';
  }, []);

  // Slice text for description (max 69 chars)
  const getSlicedTextForDescription = useCallback((text: string): string => {
    if (text.length > 69) {
      text = text.slice(0, 66) + '...';
    }
    return text;
  }, []);

  // Create trigger node description for date/time entity
  const createTriggerNodeDescriptionForDateTime = useCallback((): string => {
    const formValues = watch();
    let triggerDescription = '';
    const repeatValue = Number(formValues.repeat);

    if (repeatValue === 1) { // never
      const startDate = formValues.startDate;
      if (startDate) {
        const date = new Date(startDate + 'T00:00:00');
        triggerDescription = 'Date is on ' + date.getDate() + ' ' + date.toLocaleDateString('en-US', { month: 'long' }) + 
          ' at ' + formValues.startHours + ':' + formValues.startMins + ':00 ';
        triggerDescription += isStartAM ? 'am' : 'pm';
      }
    } else if (repeatValue === 2) { // daily
      triggerDescription = 'Occurs every ' + getOrdinal(formValues.repeatEvery) + 'Day';
    } else if (repeatValue === 3) { // weekly
      triggerDescription = 'Occurs every ' + getOrdinal(formValues.repeatEvery) + 'Week on ';
      const repeatOn1Value = formValues.repeatOn1 as string[];
      if (repeatOn1Value && repeatOn1Value.length > 0) {
        const selectedDayNames = repeatOn1Value
          .map(dayId => repeatOnWeekDayNames.find(d => String(d.id) === String(dayId))?.name)
          .filter(Boolean);
        triggerDescription += selectedDayNames.join(', ');
      }
    } else if (repeatValue === 4) { // monthly
      triggerDescription = 'Occurs every ' + getOrdinal(formValues.repeatEvery) + 'Month on ';
      const repeatOn2Value = Number(formValues.repeatOn2);
      if (repeatOn2Value && repeatOnOptionsForMonthly[repeatOn2Value - 1]) {
        triggerDescription += repeatOnOptionsForMonthly[repeatOn2Value - 1].name;
      }
    } else if (repeatValue === 5) { // yearly
      triggerDescription = 'Occurs every ' + getOrdinal(formValues.repeatEvery) + 'Year on ';
      const startDate = formValues.startDate;
      const repeatOn2Value = Number(formValues.repeatOn2);
      if (repeatOn2Value === 1 && startDate) {
        const date = new Date(startDate + 'T00:00:00');
        triggerDescription += date.getDate() + ' ' + date.toLocaleDateString('en-US', { month: 'long' });
      } else if (repeatOnOptionsForYearly[1]) {
        triggerDescription += repeatOnOptionsForYearly[1].name;
      }
    }
    return triggerDescription;
  }, [watch, isStartAM, getOrdinal, repeatOnOptionsForMonthly, repeatOnOptionsForYearly]);

  // Build workflow details object for save
  const buildWorkflowDetails = useCallback(() => {
    const formValues = watch();
    const repeatValue = Number(formValues.repeat);
    
    // Format date as YYYY-MM-DD
    const formatDate = (date: string | null | undefined): string | null => {
      if (!date) return null;
      return String(date);
    };

    // Build repeatedOn array based on repeat type
    let repeatedOn: number[] | null = null;
    if (repeatValue === 4 || repeatValue === 5) {
      repeatedOn = [Number(formValues.repeatOn2)];
    } else if (repeatValue === 3) {
      const repeatOn1Value = formValues.repeatOn1 as string[];
      if (repeatOn1Value && repeatOn1Value.length > 0) {
        repeatedOn = repeatOn1Value.map(v => Number(v));
      }
    }

    const wfDetails = {
      name: formValues.name?.trim(),
      workflowDescription: formValues.description?.trim(),
      entityId: formValues.entity,
      triggerId: String(formValues.entity) === '7' ? null : formValues.trigger,
      triggerFieldId: formValues.triggerField || null,
      status: 0,
      description: null as string | null,

      startDate: formatDate(formValues.startDate),
      startTime: formValues.startHours ? (formValues.startHours + ':' + formValues.startMins) : null,
      startAtAm: isStartAM ? 1 : 0,

      repeatOn: formValues.repeat || null,
      repeatFrequency: formValues.repeatEvery || null,

      endDate: formatDate(formValues.endDate),
      endTime: isEnd_AMPM_disabled ? null : (formValues.endHours + ':' + formValues.endMins),
      endAtAm: isEndAM ? 1 : 0,

      repeatedOn: repeatedOn,
    };

    // Add description for date/time entity
    if (String(formValues.entity) === '7') {
      wfDetails.description = getSlicedTextForDescription(createTriggerNodeDescriptionForDateTime());
    }

    return wfDetails;
  }, [watch, isStartAM, isEndAM, isEnd_AMPM_disabled, getSlicedTextForDescription, createTriggerNodeDescriptionForDateTime]);

  const onSubmit = handleSubmit((formData) => {
    const repeatValue = Number(formData.repeat);
    
    // Build repeatedOn array based on repeat type
    let repeatedOn: number[] | null = null;
    if (repeatValue === 4 || repeatValue === 5) {
      repeatedOn = [Number(formData.repeatOn2)];
    } else if (repeatValue === 3) {
      const repeatOn1Value = formData.repeatOn1 as string[];
      if (repeatOn1Value && repeatOn1Value.length > 0) {
        repeatedOn = repeatOn1Value.map(v => Number(v));
      }
    }

    const wfDetails = {
      name: formData.name?.trim(),
      workflowDescription: formData.description?.trim(),
      entityId: Number(formData.entity),
      triggerId: Number(formData.entity) === 7 ? null : Number(formData.trigger),
      triggerFieldId: formData.triggerField ? Number(formData.triggerField) : null,
      status: 0,
      projectId: projectId,
      description: null as string | null,

      startDate: formData.startDate || null,
      startTime: formData.startHours ? (formData.startHours + ':' + formData.startMins) : null,
      startAtAm: isStartAM ? 1 : 0,

      repeatOn: formData.repeat || null,
      repeatFrequency: formData.repeatEvery || null,

      endDate: formData.endDate || null,
      endTime: isEnd_AMPM_disabled ? null : (formData.endHours + ':' + formData.endMins),
      endAtAm: isEndAM ? 1 : 0,

      repeatedOn: repeatedOn,
    };

    // Add description for date/time entity
    if (Number(formData.entity) === 7) {
      wfDetails.description = getSlicedTextForDescription(createTriggerNodeDescriptionForDateTime());
    }

    onSave(wfDetails);
  });

  if (!open) return null;

  return (
    <TwinModal
      open={open}
      onClose={onClose}
      closeOnOutsideClick={false}
      allowBorder
      header={<h2 className="text-base font-semibold text-[#3F4254]">Add New Workflow</h2>}
      modalClassName="max-w-4xl"
      mainHeightClassName="h-auto max-h-[80vh]"
      footer={
        <>
          <Button
            className="bg-[#E4E6EF] hover:bg-gray-300 text-[#3F4254] rounded h-10 px-3 py-2 flex items-center justify-center shadow-sm"
            aria-label="Cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#3699FF] hover:bg-blue-600 text-white rounded h-10 px-3 py-2 flex items-center justify-center shadow-sm"
            aria-label="Save"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                <span>Saving...</span>
              </div>
            ) : (
              'Save'
            )}
          </Button>
        </>
      }
    >
      <div className="flex flex-col" style={{ gap: '16px' }}>
        <div className="grid grid-cols-12 gap-4 items-start min-h-[54px]">
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 pt-2">
              Name<span className="text-[#F64E60]">*</span>
            </label>
          </div>
          <div className="col-span-9">
            <TextInput
              name="name"
              control={control}
              maxLength={500}
              showCharacterCount
              placeholder="Enter workflow name"
              validationRules={{ required: "Name is required", maxLength: { value: 500, message: "Max 500 characters" } }}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 items-start min-h-[54px]">
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 pt-2">
              Description
            </label>
          </div>
          <div className="col-span-9">
            <TextArea
              name="description"
              control={control}
              maxLength={200}
              rows={1}
              showCharacterCount
              placeholder="Add a brief description"
              resize="none"
              validationRules={{ maxLength: { value: 200, message: "Max 200 characters" } }}
            />
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4 items-start min-h-[54px]">
          <div className="col-span-3">
            <label className="block text-sm font-medium text-gray-700 pt-2">
              Entity<span className="text-[#F64E60]">*</span>
            </label>
          </div>
          <div className="col-span-9">
            <Select
              name="entity"
              control={control}
              options={entityList.map((entity: any) => ({ value: entity.id, label: entity.entityName }))}
              placeholder="Select entity"
              validationRules={{ required: "Entity cannot be blank." }}
              onChange={(value) => changeEntity(value)}
            />
          </div>
        </div>

        {showTriggerOptions && watch('entity') && (
          <div className="grid grid-cols-12 gap-4 items-start min-h-[54px]">
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-700 pt-2">
                Trigger<span className="text-[#F64E60]">*</span>
              </label>
            </div>
            <div className="col-span-9">
              <Select
                name="trigger"
                control={control}
                options={triggerList.map((trigger: any) => ({ value: trigger.key, label: trigger.value }))}
                placeholder="Select trigger"
                validationRules={{ required: "Trigger cannot be blank." }}
                onChange={(value) => changeTrigger(value)}
              />
            </div>
          </div>
        )}

        {showTriggerOptions && showTriggerField && (
          <div className="grid grid-cols-12 gap-4 items-start min-h-[54px]">
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-700 pt-2">
                Select Field
              </label>
            </div>
            <div className="col-span-9">
              <Select
                name="triggerField"
                control={control}
                options={entityFieldList.map((field: any) => ({ value: field.id, label: field.attributeName }))}
                placeholder="Select field"
              />
              <p className="text-xs text-gray-500 mt-1">
                Set field specific trigger, keeping blank means any field.
              </p>
            </div>
          </div>
        )}

        {/* DATE TIME ENTITY */}
        {isDateTimeEntity && (
          <>
            {/* Start Date */}
            <div className="grid grid-cols-12 gap-4 items-start min-h-[54px] mt-4">
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 pt-2">
                  Start Date<span className="text-[#F64E60]">*</span>
                </label>
              </div>
              <div className="col-span-4">
                <DateInput
                  name="startDate"
                  control={control}
                  minDate={todayDateStr}
                  validationRules={{ required: "Start date cannot be blank" }}
                />
              </div>
              <div className="col-span-5">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="w-16 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                    value={watch('startHours')}
                    disabled={isStart_AMPM_disabled}
                    onChange={(e) => timeChange(e.target.value, 'startHH')}
                    onBlur={(e) => timeInputBlur(e.target.value, 'startHH')}
                    min={1}
                    max={12}
                  />
                  <span className="text-blue-500 font-bold">:</span>
                  <input
                    type="number"
                    className="w-16 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                    value={watch('startMins')}
                    disabled={isStart_AMPM_disabled}
                    onChange={(e) => timeChange(e.target.value, 'startMM')}
                    onBlur={(e) => timeInputBlur(e.target.value, 'startMM')}
                    min={0}
                    max={59}
                  />
                  <button
                    type="button"
                    className={`px-3 py-2 border rounded-md ${isStart_AMPM_disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white text-blue-500 hover:bg-blue-50 cursor-pointer'}`}
                    disabled={isStart_AMPM_disabled}
                    onClick={() => timeChange('', 'startAMPM')}
                  >
                    {isStartAM ? 'AM' : 'PM'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Enter time</p>
              </div>
            </div>

            {/* Repeat */}
            <div className="grid grid-cols-12 gap-4 items-start min-h-[54px]">
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 pt-2">
                  Repeat<span className="text-[#F64E60]">*</span>
                </label>
              </div>
              <div className="col-span-9">
                <Select
                  name="repeat"
                  control={control}
                  options={repeatOptions.map((opt) => ({ value: String(opt.id), label: opt.name }))}
                  placeholder="Select repeat option"
                  validationRules={{ required: "Repeat cannot be blank." }}
                  onChange={(val) => changeRepeatType(val)}
                />
                <p className="text-xs text-gray-500 mt-1">Select the reoccurrence of this trigger.</p>
              </div>
            </div>

            {/* Repeat Every */}
            {showRepeatEvery && (
              <div className="grid grid-cols-12 gap-4 items-start min-h-[54px]">
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 pt-2">
                    Repeat Every<span className="text-[#F64E60]">*</span>
                  </label>
                </div>
                <div className="col-span-9">
                  <TextInput
                    name="repeatEvery"
                    control={control}
                    type="text"
                    maxLength={2}
                    showCharacterCount
                    blockInvalidInput
                    pattern={/^[0-9]*$/}
                    validationRules={{ 
                      required: "Value cannot be blank.",
                      validate: (value: string) => {
                        if (value && Number(value) > maxValAllowedForRepeatEvery) {
                          return `Value cannot be greater than ${maxValAllowedForRepeatEvery}`;
                        }
                        return true;
                      }
                    }}
                    hint="Only numeric values are allowed."
                    inputProps={{
                      onBlur: () => setRepeatEveryTouched(true)
                    }}
                  />
                </div>
              </div>
            )}

            {/* Repeat On 1 - Weekly (Multi select weekday) */}
            {showRepeatsOn1 && (
              <div className="grid grid-cols-12 gap-4 items-start min-h-[54px]">
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 pt-2">
                    Repeat On<span className="text-[#F64E60]">*</span>
                  </label>
                </div>
                <div className="col-span-9">
                  <MultiSelect
                    name="repeatOn1"
                    control={control}
                    options={repeatOnWeekDayNames.map((day) => ({ value: String(day.id), label: day.name }))}
                    placeholder="Select days..."
                    showSelectAll={false}
                    validationRules={{ required: "Value cannot be blank." }}
                    hint="Select days on which this trigger should repeat."
                  />
                </div>
              </div>
            )}

            {/* Repeat On 2 - Monthly/Yearly (Radio buttons) */}
            {showRepeatsOn2 && !isStart_AMPM_disabled && (
              <div className="grid grid-cols-12 gap-4 items-start min-h-[54px] mt-4">
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 pt-2">
                    Repeat On<span className="text-[#F64E60]">*</span>
                  </label>
                </div>
                <div className="col-span-9">
                  <RadioInput
                    name="repeatOn2"
                    control={control}
                    options={(showRadioOptionSetForMonthly ? repeatOnOptionsForMonthly : repeatOnOptionsForYearly).map((option) => ({ value: String(option.id), label: option.name }))}
                    validationRules={{ required: "Value cannot be blank." }}
                    hint="Select One"
                  />
                </div>
              </div>
            )}

            {/* End Date */}
            {showEndDateTime && (
              <div className="grid grid-cols-12 gap-4 items-start min-h-[54px] mt-4">
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 pt-2">
                    End Date
                  </label>
                </div>
                <div className="col-span-4">
                  <DateInput
                    name="endDate"
                    control={control}
                    minDate={startDateValue || todayDateStr}
                    hint="Select end date, keep blank for no end date"
                  />
                </div>
                <div className="col-span-5">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className="w-16 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      value={watch('endHours')}
                      onChange={(e) => timeChange(e.target.value, 'endHH')}
                      onBlur={(e) => timeInputBlur(e.target.value, 'endHH')}
                      min={1}
                      max={12}
                    />
                    <span className="text-blue-500 font-bold">:</span>
                    <input
                      type="number"
                      className="w-16 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                      value={watch('endMins')}
                      onChange={(e) => timeChange(e.target.value, 'endMM')}
                      onBlur={(e) => timeInputBlur(e.target.value, 'endMM')}
                      min={0}
                      max={59}
                    />
                    <button
                      type="button"
                      className={`px-3 py-2 border rounded-md ${isEndAM ? 'bg-white text-blue-500 hover:bg-blue-50' : 'bg-white text-blue-500 hover:bg-blue-50'} cursor-pointer`}
                      onClick={() => timeChange('', 'endAMPM')}
                    >
                      {isEndAM ? 'AM' : 'PM'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Enter time</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </TwinModal>
  );
};

export default AddWorkflowModal;
