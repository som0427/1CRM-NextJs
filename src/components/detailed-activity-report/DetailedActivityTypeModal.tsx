import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import Modal from '../common/Modal';
import SingleMonthDateRangePicker from '../common/SingleMonthDateRangePicker';
import SelectInput from '../common/input-fields/Select';
import MultiSelect from '../common/input-fields/MultiSelect';
import Spinner from '../common/Spinner';
import { useDetailedActivityReport } from '@/contexts/DetailedActivityReportContext';

const DetailedActivityTypeModal: React.FC = () => {
  const {
    isFilterModalOpen,
    closeFilterModal,
    activityOptions,
    filtersDataLoading,
    selectedActivityId,
    selectedActivityLabel,
    reportTypeOptions,
    selectedReportTypeId,
    performedByOptions,
    selectedPerformedByIds,
    applyFilters,
    startDate,
    endDate,
    defaultStartDate,
    defaultEndDate,
  } = useDetailedActivityReport();

  type SelectOption = { value: string; label: string };

  const [localDateRange, setLocalDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate,
    endDate,
  });

  const resolvedSelection = useMemo<SelectOption | null>(() => {
    if (!selectedActivityId) {
      return null;
    }

    return (
      activityOptions.find((option) => option.value === selectedActivityId) ??
      (selectedActivityLabel
        ? { value: selectedActivityId, label: selectedActivityLabel }
        : null)
    );
  }, [activityOptions, selectedActivityId, selectedActivityLabel]);

  const performedByOptionsWithAll = useMemo(() => {
    return [{ value: '', label: 'Select All' }, ...performedByOptions];
  }, [performedByOptions]);

  const { control, watch, setValue, trigger, clearErrors } = useForm<{
    activity: string;
    performedBy: string[];
    reportType: string;
  }>({
    defaultValues: {
      activity: resolvedSelection?.value ?? '',
      reportType: selectedReportTypeId ?? '',
      performedBy: selectedPerformedByIds.length > 0 ? selectedPerformedByIds : [''],
    },
  });

  const selectedActivityValue = watch('activity');
  const selectedPerformedByValue = watch('performedBy');
  const selectedReportTypeValue = watch('reportType');

  const previousActivityRef = useRef<string>(resolvedSelection?.value ?? '');

  useEffect(() => {
    previousActivityRef.current = resolvedSelection?.value ?? '';
  }, [resolvedSelection?.value]);

  useEffect(() => {
    if (!isFilterModalOpen) {
      return;
    }

    const trimmedActivity = selectedActivityValue?.trim() ?? '';
    const previousActivity = previousActivityRef.current?.trim() ?? '';

    if (trimmedActivity.length === 0) {
      previousActivityRef.current = '';
      return;
    }

    if (previousActivity && trimmedActivity !== previousActivity) {
      setValue('reportType', '', { shouldDirty: true, shouldValidate: false });
      clearErrors('reportType');
    }

    previousActivityRef.current = trimmedActivity;
  }, [clearErrors, isFilterModalOpen, selectedActivityValue, setValue]);

  useEffect(() => {
    const hasActivitySelection = Boolean(selectedActivityValue && selectedActivityValue.trim().length > 0);
    if (!hasActivitySelection) {
      setValue('reportType', '', { shouldDirty: false, shouldValidate: false });
      clearErrors(['activity', 'reportType']);
      return;
    }

    clearErrors('activity');

    if (!selectedReportTypeValue) {
      setValue('reportType', '', { shouldDirty: false, shouldValidate: false });
      return;
    }

    clearErrors('reportType');
  }, [clearErrors, selectedActivityValue, selectedReportTypeValue, setValue]);

  useEffect(() => {
    if (isFilterModalOpen) {
      setValue('activity', resolvedSelection?.value ?? '', { shouldDirty: false, shouldValidate: false });
      setValue('reportType', selectedReportTypeId ?? '', { shouldDirty: false, shouldValidate: false });
      setValue('performedBy', selectedPerformedByIds.length > 0 ? selectedPerformedByIds : [''], { shouldDirty: false, shouldValidate: false });
      setLocalDateRange({ startDate, endDate });
    }
  }, [endDate, isFilterModalOpen, resolvedSelection, selectedPerformedByIds, selectedReportTypeId, setValue, startDate]);

  const handleApply = async () => {
    const fieldsToValidate: Array<'activity' | 'reportType'> = showReportTypeField
      ? ['activity', 'reportType']
      : ['activity'];
    const isValid = await trigger(fieldsToValidate);
    if (!isValid) {
      return;
    }

    const normalizedId = selectedActivityValue && selectedActivityValue.trim().length > 0
      ? selectedActivityValue.trim()
      : null;

    const resolvedLabel = normalizedId
      ? activityOptions.find((option) => option.value === normalizedId)?.label ?? ''
      : '';

    const normalizedPerformedByIds = Array.isArray(selectedPerformedByValue)
      ? selectedPerformedByValue
        .map((value) => (value == null ? '' : `${value}`.trim()))
        .filter((value) => value.length > 0)
      : [];
    const normalizedReportTypeId = showReportTypeField && typeof selectedReportTypeValue === 'string'
      ? selectedReportTypeValue.trim()
      : '';

    applyFilters({
      startDate: localDateRange.startDate,
      endDate: localDateRange.endDate,
      activityId: normalizedId,
      activityLabel: resolvedLabel,
      performedByIds: normalizedPerformedByIds,
      reportTypeId: normalizedReportTypeId || null,
    });
  };

  const handleCancel = () => {
    closeFilterModal();
  };

  const handleClearAll = () => {
    setValue('activity', '', { shouldDirty: true, shouldValidate: true });
    setValue('reportType', '', { shouldDirty: true, shouldValidate: true });
    setValue('performedBy', [''], { shouldDirty: true, shouldValidate: true });
    setLocalDateRange({ startDate: defaultStartDate, endDate: defaultEndDate });
  };

  const showLoader = filtersDataLoading;
  const showReportTypeField = Boolean(selectedActivityValue && selectedActivityValue.trim().length > 0);

  return (
    <Modal
      open={isFilterModalOpen}
      onClose={closeFilterModal}
      header={
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#3F4254]">Select Filters</h2>
        </div>
      }
      footer={
        showLoader
          ? null
          : (
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          )
      }
      modalClassName="max-w-4xl"
      containerClassName="w-[90vw] h-auto max-h-[88vh]"
      allowBorder
    >
      {showLoader ? (
        <Spinner className="!min-h-[240px]" />
      ) : (
        <div className="space-y-5 text-sm">
          <div className="flex items-center gap-4">
            <label className="min-w-[110px] font-medium text-slate-700">
              Date Range <span className="text-[#F64E60]">*</span>
            </label>
            <div className="flex-1">
              <SingleMonthDateRangePicker
                startDate={localDateRange.startDate}
                endDate={localDateRange.endDate}
                onDateRangeChange={(newStart, newEnd) => setLocalDateRange({ startDate: newStart, endDate: newEnd })}
                maxDays={60}
              />
            </div>
          </div>

          <div className="flex items-start gap-4">
            <label className="min-w-[110px] pt-1 font-medium text-slate-700">
              Activity <span className="text-[#F64E60]">*</span>
            </label>
            {activityOptions.length === 0 ? (
              <div className="flex-1 rounded-md border border-dashed border-slate-200 px-4 py-6 text-center text-slate-500">
                No activity types available yet.
              </div>
            ) : (
              <div className="flex-1">
                <SelectInput
                  name="activity"
                  control={control}
                  options={activityOptions}
                  placeholder="Select activities"
                  validationRules={{ required: 'Activity cannot be blank' }}
                />
              </div>
            )}
          </div>

          {showReportTypeField && (
            <div className="flex items-start gap-4">
              <label className="min-w-[110px] pt-1 font-medium text-slate-700">
                Report Type <span className="text-[#F64E60]">*</span>
              </label>
              <div className="flex-1">
                <SelectInput
                  name="reportType"
                  control={control}
                  options={reportTypeOptions}
                  placeholder="Select report type"
                  validationRules={{ required: 'Report type cannot be blank' }}
                />
              </div>
            </div>
          )}

          <div className="flex items-start gap-4">
            <label className="min-w-[110px] pt-1 font-medium text-slate-700">
              Performed By
            </label>
            {performedByOptions.length === 0 ? (
              <div className="flex-1 rounded-md border border-dashed border-slate-200 px-4 py-6 text-center text-slate-500">
                No users available yet.
              </div>
            ) : (
              <div className="flex-1">
                <MultiSelect
                  name="performedBy"
                  control={control}
                  options={performedByOptionsWithAll}
                  placeholder="Select team members"
                  showSelectAll={false}
                  exclusiveAllOption={true}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default DetailedActivityTypeModal;
