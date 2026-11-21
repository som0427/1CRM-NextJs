import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import Select from '@/components/common/input-fields/Select';
import settingsService from '@/lib/services/settingsService';
import userService from '@/lib/services/userService';
import swapDataService from '@/lib/services/swapDataService';
import type { AttributeFilter, SwapDataEntityDetail } from '@/lib/services/swapDataService';
import { getProjectId } from '@/lib/storage/sharedStorage';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import { BasicUserDetails } from '@/lib/models/basic-user-details.model';
import SwapEntitySection from './subs/Swap-Entity-Section/Swap-Entity-Section';
import SpinLoader from '../common/loader/SpinLoader';
import Toast, { useToast } from '@/components/common/Toast';

interface UserOption {
  value: string;
  label: string;
}

interface SwapDataContainerProps {
  userOptions?: UserOption[];
  onSwap?: (payload: { fromUser: string; toUser: string }) => void;
  onClear?: () => void;
}

const SwapDataContainer: React.FC<SwapDataContainerProps> = ({
  userOptions,
  onSwap,
  onClear
}) => {
  const { toast, showToast, hideToast } = useToast();
  const stableUserOptions = useMemo(() => userOptions ?? [], [userOptions]);
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>(stableUserOptions);
  const [userLabel, setUserLabel] = useState('User');
  const [isLoading, setIsLoading] = useState(false);
  const [entityAvailability, setEntityAvailability] = useState({
    users: false,
    customers: false,
    opportunities: false,
    contacts: false
  });
  const [isEntityLoading, setIsEntityLoading] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [entityTitles, setEntityTitles] = useState({
    users: 'Users',
    customers: 'Customers',
    opportunities: 'Opportunities',
    contacts: 'Contacts'
  });
  // Track selected items per entity: { entityId: number[] }
  const [entitySelections, setEntitySelections] = useState<Record<number, number[]>>({});
  // Track attribute filters per entity: { entityId: AttributeFilter[] }
  const [entityFilters, setEntityFilters] = useState<Record<number, AttributeFilter[]>>({});
  // Track select all state per entity: { entityId: boolean }
  const [entitySelectAll, setEntitySelectAll] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setAvailableUsers(stableUserOptions);
  }, [stableUserOptions]);

  useEffect(() => {
    const projectId = getProjectId();
    if (!projectId) {
      return;
    }

    const loadSwapDataDependencies = async () => {
      setIsLoading(true);
      try {
        const [dynamicFieldNamesResponse, usersResponse] = await Promise.all([
          settingsService.getdynamicFieldNames(projectId),
          userService.getActiveUsers(projectId)
        ]);

        const dynamicPayload =
          (dynamicFieldNamesResponse as any)?.responseData ??
          (dynamicFieldNamesResponse as any)?.data ??
          [];
        const dynamicRows = Array.isArray(dynamicPayload)
          ? dynamicPayload
          : Array.isArray(dynamicPayload?.data)
            ? dynamicPayload.data
            : [];

        const userModuleConfig = dynamicRows.find(
          (row: any) => Number(row?.moduleId) === SystemAttributeEnum.USER_MODULE
        );
        if (userModuleConfig?.singularName) {
          setUserLabel(userModuleConfig.singularName);
        }
        const companyModule = dynamicRows.find((row: any) => Number(row?.moduleId) === SystemAttributeEnum.COMPANY_MODULE);
        const contactModule = dynamicRows.find((row: any) => Number(row?.moduleId) === SystemAttributeEnum.CONTACT_MODULE);
        const opportunityModule = dynamicRows.find((row: any) => Number(row?.moduleId) === SystemAttributeEnum.OPPORTUNITY_MODULE);
        setEntityTitles({
          users: 'Users',
          customers: companyModule?.pluralName,
          opportunities: opportunityModule?.pluralName,
          contacts: contactModule?.pluralName
        });

        const users: BasicUserDetails[] = Array.isArray(usersResponse?.responseData)
          ? usersResponse.responseData
          : Array.isArray((usersResponse as any)?.data)
            ? (usersResponse as any).data
            : Array.isArray(usersResponse)
              ? (usersResponse as any)
              : [];

        const mappedUsers =
          users
            .map((user: BasicUserDetails) => {
              const value = user?.userId?.toString() ?? '';
              if (!value) {
                return null;
              }

              const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
              const serial = user?.serialNumber || '';
              const fallbackId = user?.userName || '';

              const primary = fullName || fallbackId || 'User';
              const detail = serial || fallbackId || '';
              const label = detail && detail !== primary ? `${primary} - ${detail}` : primary;

              return { value, label };
            }) as UserOption[];

        setAvailableUsers(mappedUsers.length ? mappedUsers : stableUserOptions);
      } catch (error) {
        console.error('Error loading swap data dependencies:', error);
        // If API fails, keep any provided options
        setAvailableUsers(stableUserOptions);
      } finally {
        setIsLoading(false);
      }
    };

    loadSwapDataDependencies();
  }, []);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isValid }
  } = useForm({
    defaultValues: { fromUser: '', toUser: '' },
    mode: 'onChange'
  });

  const fromUser = watch('fromUser');
  const toUser = watch('toUser');

  useEffect(() => {
    const projectId = getProjectId();
    if (!projectId || !fromUser) {
      setEntityAvailability({
        users: false,
        customers: false,
        opportunities: false,
        contacts: false
      });
      setIsEntityLoading(false);
      return;
    }

    const fetchTransactionExistence = async () => {
      setIsEntityLoading(true);
      try {
        const response = await userService.isUserTransactionExist(projectId, Number(fromUser));
        const data = response?.responseData;
        setEntityAvailability({
          users: (data?.userCount ?? 0) > 0,
          customers: (data?.companyCount ?? 0) > 0,
          opportunities: (data?.opportunityCount ?? 0) > 0,
          contacts: (data?.contactCount ?? 0) > 0
        });
      } catch (error) {
        console.error('Error checking user transactions:', error);
        setEntityAvailability({
          users: false,
          customers: false,
          opportunities: false,
          contacts: false
        });
      } finally {
        setIsEntityLoading(false);
      }
    };

    fetchTransactionExistence();
  }, [fromUser]);

  const availableFromOptions = useMemo(
    () => availableUsers.filter((option) => option.value !== toUser),
    [availableUsers, toUser]
  );

  const availableToOptions = useMemo(
    () => availableUsers.filter((option) => option.value !== fromUser),
    [availableUsers, fromUser]
  );

  const handleClear = () => {
    reset({ fromUser: '', toUser: '' });
    setEntitySelections({});
    setEntityFilters({});
    setEntitySelectAll({});
    onClear?.();
  };

  // Handle selection changes from entity sections
  const handleSelectionChange = useCallback((entityId: number, selectedIds: number[], attributeFilters: AttributeFilter[], isSelectAll: boolean) => {
    setEntitySelections(prev => ({
      ...prev,
      [entityId]: selectedIds
    }));
    setEntityFilters(prev => ({
      ...prev,
      [entityId]: attributeFilters
    }));
    setEntitySelectAll(prev => ({
      ...prev,
      [entityId]: isSelectAll
    }));
  }, []);

  // Check if any entity has selected items or select all is active
  const hasAnySelection = useMemo(() => {
    return Object.values(entitySelections).some(ids => ids.length > 0) || 
           Object.values(entitySelectAll).some(isSelectAll => isSelectAll);
  }, [entitySelections, entitySelectAll]);

  const onSubmit = async (data: { fromUser: string; toUser: string }) => {
    const projectId = getProjectId();
    if (!projectId) return;

    // Build swap data entity details from selections
    const swapDataEntityDetails: SwapDataEntityDetail[] = Object.entries(entitySelections)
      .filter(([entityId, ids]) => ids.length > 0 || entitySelectAll[Number(entityId)])
      .map(([entityId, ids]) => {
        const isSwapAll = entitySelectAll[Number(entityId)] || false;
        return {
          moduleType: Number(entityId),
          isSwapAll,
          recordIdsToSwap: ids,
          attributeFilters: entityFilters[Number(entityId)] || []
        };
      });

    if (swapDataEntityDetails.length === 0) return;

    setIsSwapping(true);
    try {
      await swapDataService.swapEntity({
        projectId,
        oldOwnerUserId: data.fromUser,
        newOwnerUserId: data.toUser,
        swapDataEntityDetails
      });
      onSwap?.(data);
      // Clear form and selections after successful swap
      handleClear();
      showToast('Data migration is in progress', 'success');
    } catch (error) {
      console.error('Error swapping data:', error);
    } finally {
      setIsSwapping(false);
    }
  };

  const swapDisabled = isLoading || isSwapping || !isValid || !fromUser || !toUser || !hasAnySelection;

  return (
    <div className="bg-white flex flex-col h-full w-full min-h-0 overflow-hidden relative">
      {(isLoading || isEntityLoading || isSwapping) && <SpinLoader />}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
        <div className="border border-[#D9D9D9] border-[1px] rounded-t-md flex-1 overflow-auto">
          <div className="py-4 flex-1 overflow-auto">
          <div className="px-6 flex flex-wrap gap-[60px]">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1 whitespace-nowrap">
                From {userLabel} <span className="text-[#F64E60]">*</span>
              </label>
              <Select
                name="fromUser"
                control={control}
                validationRules={{ required: `From ${userLabel} is required` }}
                options={availableFromOptions}
                disabled={isLoading}
                maxWidth="w-[350px]"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1 whitespace-nowrap">
                To {userLabel} <span className="text-[#F64E60]">*</span>
              </label>
              <Select
                name="toUser"
                control={control}
                validationRules={{ required: `To ${userLabel} is required` }}
                options={availableToOptions}
                disabled={isLoading}
                maxWidth="w-[350px]"
              />
            </div>
          </div>
          {fromUser && !isEntityLoading && (
            <div className="mt-8">
              {[
                { enabled: entityAvailability.users, id: SystemAttributeEnum.USER_MODULE, title: entityTitles.users },
                { enabled: entityAvailability.customers, id: SystemAttributeEnum.COMPANY_MODULE, title: entityTitles.customers },
                { enabled: entityAvailability.opportunities, id: SystemAttributeEnum.OPPORTUNITY_MODULE, title: entityTitles.opportunities },
                { enabled: entityAvailability.contacts, id: SystemAttributeEnum.CONTACT_MODULE, title: entityTitles.contacts }
              ].filter(cfg => cfg.enabled).map(cfg => (
                <SwapEntitySection
                  key={`${cfg.id}-${fromUser}`}
                  projectId={getProjectId()}
                  ownerId={fromUser}
                  entityId={cfg.id}
                  entityTitle={cfg.title}
                  onSelectionChange={handleSelectionChange}
                />
              ))}
            </div>
          )}
          </div>
        </div>

        <div className="border rounded-b-md border-gray-200 px-6 py-4 mb-10 flex justify-end gap-4 shrink-0">
          <button
            type="button"
            onClick={handleClear}
            className="px-5 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={swapDisabled}
            className="px-5 py-2 rounded-md bg-[#3699FF] text-white hover:bg-[#2680D7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Swap
          </button>
        </div>
      </form>
      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
        position="top"
      />
    </div>
  );
};

export default SwapDataContainer;
