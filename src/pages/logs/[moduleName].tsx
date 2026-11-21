import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { GridReadyEvent } from 'ag-grid-community';
import Layout from '@/components/layout/Layout';
import TailwindPageLayout from '@/components/layout/TailwindPageLayout';
import LogsHeader from '@/components/logs/LogsHeader';
import LogsDataGrid from '@/components/logs/LogsDataGrid';
import Spinner from '@/components/common/Spinner';
import { getEntityLogs, EntityLogsFilterRule } from '../../lib/services/entityLogsService';

import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { EntityLogData, SystemModules } from '@/lib/models/entity-logs';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import AdvanceFilter, { AdvanceFilterRef, FilterResult } from '@/components/common/filter/AdvanceFilter';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import settingsService from '@/lib/services/settingsService';
import userService from '@/lib/services/userService';
import activitiesService from '@/lib/services/activitiesService';
import { CustomAttibute } from '@/lib/models/custom-attibute.model';
import { AttributeType } from '@/lib/models/attribute-type.model';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';

const USER_LOG_USER_NAME_FIELD_ID = -10001;
const USER_LOG_EVENT_FIELD_ID = -10002;
const USER_LOG_OLD_VALUE_FIELD_ID = -10003;
const USER_LOG_NEW_VALUE_FIELD_ID = -10004;
const USER_LOG_FIELD_NAME_FIELD_ID = -10005;
const USER_LOG_LOGS_DATE_FIELD_ID = -10006;

const CUSTOMER_LOG_CUSTOMER_NAME_FIELD_ID = -20001;
const CUSTOMER_LOG_EVENT_FIELD_ID = -20002;
const CUSTOMER_LOG_FIELD_NAME_FIELD_ID = -20005;
const CUSTOMER_LOG_LOGS_DATE_FIELD_ID = -20006;

const ACTIVITY_LOG_ACTIVITY_NAME_FIELD_ID = -30001;
const ACTIVITY_LOG_EVENT_FIELD_ID = -30002;
const ACTIVITY_LOG_FIELD_NAME_FIELD_ID = -30005;
const ACTIVITY_LOG_LOGS_DATE_FIELD_ID = -30006;

const OPPORTUNITY_LOG_OPPORTUNITY_NAME_FIELD_ID = -40001;
const OPPORTUNITY_LOG_EVENT_FIELD_ID = -40002;
const OPPORTUNITY_LOG_FIELD_NAME_FIELD_ID = -40005;
const OPPORTUNITY_LOG_LOGS_DATE_FIELD_ID = -40006;

const CONTACT_LOG_CONTACT_NAME_FIELD_ID = -50001;
const CONTACT_LOG_EVENT_FIELD_ID = -50002;
const CONTACT_LOG_FIELD_NAME_FIELD_ID = -50005;
const CONTACT_LOG_LOGS_DATE_FIELD_ID = -50006;

// Field Name filters whose options are just the owning module's attributes.
// (User Logs is handled separately because it reuses an already-loaded cache.)
const FIELD_NAME_MODULE_BY_FIELD_ID = new Map<number, number>([
  [CUSTOMER_LOG_FIELD_NAME_FIELD_ID, SystemAttributeEnum.COMPANY_MODULE],
  [OPPORTUNITY_LOG_FIELD_NAME_FIELD_ID, SystemAttributeEnum.OPPORTUNITY_MODULE],
  [CONTACT_LOG_FIELD_NAME_FIELD_ID, SystemAttributeEnum.CONTACT_MODULE],
]);

// Event filters share the same fixed Created/Updated option list.
const EVENT_FIELD_IDS = new Set<number>([
  USER_LOG_EVENT_FIELD_ID,
  CUSTOMER_LOG_EVENT_FIELD_ID,
  ACTIVITY_LOG_EVENT_FIELD_ID,
  OPPORTUNITY_LOG_EVENT_FIELD_ID,
  CONTACT_LOG_EVENT_FIELD_ID,
]);

// Module-name keys for the logs page that support advance filtering.
const FILTERABLE_MODULES = ['users', 'customers', 'activities', 'opportunities', 'contacts'] as const;

type IdNameOption = { id: number; name: string };

interface PerformedByLoad {
  idToName: Map<number, string>;
  options: IdNameOption[];
}

async function loadPerformedByOptions(projectIdNumber: number): Promise<PerformedByLoad> {
  const idToName = new Map<number, string>();
  if (!Number.isFinite(projectIdNumber)) return { idToName, options: [] };

  try {
    const userResp = await userService.getAllUsers(projectIdNumber, 2);
    if (userResp?.statusCode !== 200 || !Array.isArray(userResp.responseData)) {
      return { idToName, options: [] };
    }

    // Format options to match the grid's "Performed By" column, which is built
    // backend-side via getFullNameByUserIdsWithSerialKey as
    // CONCAT(firstName, ' ', lastName, '-', up.serialNo). UserDetailDTO exposes
    // `serialNumber` for the same value, so we mirror the format here. A user
    // selected in the filter then matches verbatim against the rendered row.
    const rawUsers = userResp.responseData
      .map((u: any) => {
        const userId = Number(u?.userId ?? u?.id);
        const firstName = (u?.firstName || '').toString().trim();
        const lastName = (u?.lastName || '').toString().trim();
        const fullName = `${firstName} ${lastName}`.trim()
          || (u?.fullName || '').toString().trim();
        const serialNo = (u?.serialNumber || u?.serialNo || u?.serialKey || '').toString().trim();
        const label = serialNo ? `${fullName}-${serialNo}` : fullName;
        return { userId, name: label };
      })
      .filter((u: { userId: number; name: string }) => Number.isFinite(u.userId) && u.name.length > 0);

    const seen = new Set<number>();
    const dedup: Array<{ userId: number; name: string }> = [];
    for (const u of rawUsers) {
      if (seen.has(u.userId)) continue;
      seen.add(u.userId);
      dedup.push(u);
    }
    dedup.sort((a, b) => a.name.localeCompare(b.name));
    const options = dedup.map((u) => {
      idToName.set(u.userId, u.name);
      return { id: u.userId, name: u.name };
    });
    return { idToName, options };
  } catch (err) {
    console.error('Error loading project users for Performed By:', err);
    return { idToName, options: [] };
  }
}

interface FieldNameLoad {
  idToName: Map<number, string>;
  options: IdNameOption[];
}

async function fetchModuleFields(projectId: string | null, moduleId: number): Promise<CustomAttibute[]> {
  const projectIdNumber = Number(projectId);
  if (!Number.isFinite(projectIdNumber)) return [];
  try {
    const response = await settingsService.getFieldDetails(projectIdNumber, moduleId);
    if (response?.statusCode === 200 && Array.isArray(response.responseData)) {
      return response.responseData as CustomAttibute[];
    }
  } catch {
    /* fall through */
  }
  return [];
}

function buildFieldNameOptions(userFields: CustomAttibute[]): {
  idToName: Map<number, string>;
  options: IdNameOption[];
} {
  const idToName = new Map<number, string>();
  const options: IdNameOption[] = [];
  userFields.forEach((f) => {
    if (!f || typeof f.id !== 'number' || f.id <= 0) return;
    const name = (f.attributeName || '').toString().trim();
    if (!name) return;
    idToName.set(f.id, name);
    options.push({ id: f.id, name });
  });
  options.sort((a, b) => a.name.localeCompare(b.name));
  return { idToName, options };
}

// Accumulate one activity type's attributes into the shared id -> name /
// id -> owning-activity-names maps.
function collectActivityAttributes(
  fields: CustomAttibute[],
  typeName: string,
  idToAttribName: Map<number, string>,
  idToTypeNames: Map<number, string[]>,
): void {
  fields.forEach((f) => {
    if (!f || typeof f.id !== 'number' || f.id <= 0) return;
    const attribName = (f.attributeName || '').toString().trim();
    if (!attribName) return;
    if (!idToAttribName.has(f.id)) idToAttribName.set(f.id, attribName);
    if (!typeName) return;
    const bucket = idToTypeNames.get(f.id) || [];
    if (!bucket.includes(typeName)) bucket.push(typeName);
    idToTypeNames.set(f.id, bucket);
  });
}

// Build label-by-id so the same attribute id used under multiple activity
// types collapses to a single option whose label lists all owning activities
// ("Status (Call, Meeting)"). The backend filter matches on attribute id, so
// collapsing is safe.
function buildActivityFieldNameOptions(
  perTypeFields: CustomAttibute[][],
  typeNames: string[],
): FieldNameLoad {
  const idToTypeNames = new Map<number, string[]>();
  const idToAttribName = new Map<number, string>();
  perTypeFields.forEach((fields, idx) => {
    collectActivityAttributes(fields, typeNames[idx] || '', idToAttribName, idToTypeNames);
  });

  const idToName = new Map<number, string>();
  const options: IdNameOption[] = [];
  idToAttribName.forEach((attribName, id) => {
    const types = idToTypeNames.get(id) || [];
    const label = types.length ? `${attribName} (${types.join(', ')})` : attribName;
    idToName.set(id, label);
    options.push({ id, name: label });
  });
  options.sort((a, b) => a.name.localeCompare(b.name));
  return { idToName, options };
}

// Activity attributes are per activity-type (b2b_activity_settings.id), not a
// single ACTIVITY_MODULE list. Pull every activity type for the project, fetch
// its attribute list, and label each option with the owning activity type so
// the same field across different activities is distinguishable in the
// dropdown. Returns null when the project id is unusable.
async function loadActivityFieldNameOptions(projectId: string | null): Promise<FieldNameLoad | null> {
  const projectIdNumber = Number(projectId);
  if (!Number.isFinite(projectIdNumber)) return null;

  const typesResponse = await activitiesService.getAllActivitiesType(projectIdNumber);
  const activityTypes = (typesResponse?.statusCode === 200 && Array.isArray(typesResponse.responseData))
    ? typesResponse.responseData
    : [];
  const validTypes = activityTypes.filter((a) => Number.isFinite(Number(a?.activityId)));
  const perTypeFields = await Promise.all(
    validTypes.map((a) => fetchModuleFields(projectId, Number(a.activityId)))
  );
  const typeNames = validTypes.map((a) => (a?.activityName || '').toString().trim());

  return buildActivityFieldNameOptions(perTypeFields, typeNames);
}

// Activity Name options come from the project's activity settings list
// (b2b_activity_settings). Single-select with Equals only.
async function loadActivityNameOptions(projectId: number): Promise<IdNameOption[]> {
  const projectIdNumber = Number(projectId);
  if (!Number.isFinite(projectIdNumber)) return [];
  const response = await activitiesService.getAllActivitiesType(projectIdNumber);
  if (response?.statusCode === 200 && Array.isArray(response.responseData)) {
    return response.responseData
      .filter((a) => a?.activityId != null && a?.activityName)
      .map((a) => ({ id: a.activityId, name: a.activityName }));
  }
  return [];
}

async function loadFieldNameOptionsFromLogs(
  projectId: string,
  moduleType: number,
): Promise<FieldNameLoad> {
  const pageSizeForDropdown = 10000;
  const fieldNameSet = new Set<string>();
  let page = 1;
  let totalCount = Number.POSITIVE_INFINITY;

  while ((page - 1) * pageSizeForDropdown < totalCount) {
    const response = await getEntityLogs({
      projectId: Number(projectId),
      moduleType,
      pageSize: pageSizeForDropdown,
      pageNumber: page,
    });
    if (response?.statusCode !== 200 || !response.responseData) break;

    const details = response.responseData;
    totalCount = typeof details.totalCount === 'number' ? details.totalCount : totalCount;
    const rows = Array.isArray(details.response) ? details.response : [];

    rows.forEach((r) => {
      if ([1, 2].includes(Number((r as any)?.event))) {
        const fieldName = ((r as any)?.fieldName || '').toString().trim();
        if (fieldName) fieldNameSet.add(fieldName);
      }
    });

    if (!rows.length || rows.length < pageSizeForDropdown) break;
    page += 1;
    if (page > 200) break; // safety: avoid infinite loops
  }

  const idToName = new Map<number, string>();
  const options = Array.from(fieldNameSet)
    .sort((a, b) => a.localeCompare(b))
    .map((name, index) => {
      const id = index + 1;
      idToName.set(id, name);
      return { id, name };
    });
  return { idToName, options };
}

const EntityLogsPage = () => {
  const router = useRouter();
  const { moduleName } = router.query;
 
  // State management for localStorage values
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [pluralNames, setPluralNames] = useState<any>({});
  const [singularNames, setSingularNames] = useState<any>({});
  const [isClient, setIsClient] = useState(false);
  
  // State management
  const searchTerm = useSelector((state: RootState) => state.logs.searchTerm);
  const [rowData, setRowData] = useState<EntityLogData[]>([]);
  const [totalDataCount, setTotalDataCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [pageNumber, setPageNumber] = useState(1);
  const [gridApi, setGridApi] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [apiCallCompleted, setApiCallCompleted] = useState(false);

  const isUserLogs = moduleName === 'users';
  const isFilterableLogs = typeof moduleName === 'string' && (FILTERABLE_MODULES as readonly string[]).includes(moduleName);
  const advanceFilterRef = useRef<AdvanceFilterRef>(null);
  // Stash the latest applied filters so paginated load-more requests can
  // forward them without making fetchEntityLogs a function of state. The ref
  // mirrors the most recent payload sent to refetchLogs (or null after Clear).
  const activeFiltersRef = useRef<EntityLogsFilterRule[] | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [userEntityFieldsMap, setUserEntityFieldsMap] = useState<Map<number, CustomAttibute>>(new Map());
  const userEntityFieldsMapRef = useRef<Map<number, CustomAttibute>>(new Map());
  useEffect(() => {
    userEntityFieldsMapRef.current = userEntityFieldsMap;
  }, [userEntityFieldsMap]);

  // Constants
  const pageSize = 10000;
  const PAGE_TO_FETCH = 1; // Initial page to fetch
  const IS_LOAD_MORE= false;

  useEffect(() => {
    if (!isFilterableLogs) {
      setIsFilterModalOpen(false);
      setHasActiveFilters(false);
      setActiveFiltersCount(0);
      setUserEntityFieldsMap(new Map());
    }
  }, [isFilterableLogs]);

  // Project ID selection from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const projectValue = localStorage.getItem('selectedProject');
      const pluralNamesValue = localStorage.getItem('pluralName');
      const singularNamesValue = localStorage.getItem('singularName');
      setPluralNames(pluralNamesValue ? JSON.parse(pluralNamesValue) : {});
      setSingularNames(singularNamesValue ? JSON.parse(singularNamesValue) : {});
      let foundProjectId = null;
      
      if (projectValue && projectValue !== 'null' && projectValue !== 'undefined') {
        try {
          const parsed = JSON.parse(projectValue);
          if (parsed && (typeof parsed === 'string' || typeof parsed === 'number')) {
            foundProjectId = parsed.toString();
          }
        } catch {
          if (projectValue !== 'null' && projectValue !== 'undefined') {
            foundProjectId = projectValue;
          }
        }
      }
      
      if (foundProjectId && foundProjectId !== 'null' && foundProjectId !== 'undefined') {
        setSelectedProject(foundProjectId);
      } else {
        setError('No project selected. Please select a project first.');
        setApiCallCompleted(true);
      }
      setIsClient(true);
    }
  }, []);

  // Get module type and title based on entity name
  const { moduleType, title, singularEntityName } = useMemo(() => {

    if (!moduleName || typeof moduleName !== 'string') {
      return { moduleType: 0, title: 'Entity Logs', singularEntityName: 'Entity' };
    }

    const name = moduleName.toLowerCase();
    
    // Map lowercase module names to capitalized keys for lookup
    const moduleKeyMap: Record<string, string> = {
      'customers': 'Customers',
      'opportunities': 'Opportunities', 
      'contacts': 'Contacts',
      'activities': 'Activities',
      'users': 'Users'
    };
    
    const lookupKey = moduleKeyMap[name] || name;
    const dynamicPluralName = pluralNames[lookupKey];
    const dynamicSingularName = singularNames[lookupKey];
    
    switch (name) {
      case 'customers':
        return { 
          moduleType: SystemModules.COMPANY_OR_CUSTOMER, 
          title: dynamicPluralName || 'Customers',
          singularEntityName: dynamicSingularName || 'Customer'
        };
      case 'opportunities':
        return { 
          moduleType: SystemModules.OPPORTUNITY, 
          title: dynamicPluralName || 'Opportunities',
          singularEntityName: dynamicSingularName || 'Opportunity'
        };
      case 'contacts':
        return { 
          moduleType: SystemModules.CONTACT, 
          title: dynamicPluralName || 'Contacts',
          singularEntityName: dynamicSingularName || 'Contact'
        };
      case 'activities':
        return { 
          moduleType: SystemModules.ACTIVITY, 
          title: dynamicPluralName || 'Activities',
          singularEntityName: dynamicSingularName || 'Activity'
        };
      case 'users':
        return { 
          moduleType: SystemModules.USER, 
          title: dynamicPluralName || 'Users',
          singularEntityName: dynamicSingularName || 'User'
        };
      default:
        return { moduleType: 0, title: dynamicPluralName || 'Entity Logs', singularEntityName: dynamicSingularName || 'Entity' };
    }
  }, [moduleName, pluralNames, singularNames]);

  const createOverrideField = useCallback((id: number, attributeName: string, attributeTypeId: number) => {
    const f = new CustomAttibute();
    f.id = id;
    f.attributeName = attributeName;
    f.attributeType = new AttributeType(attributeTypeId, null as any);
    return f;
  }, []);

  const userLogsEntityFieldsOverride = useMemo(() => {
    return [
      createOverrideField(USER_LOG_LOGS_DATE_FIELD_ID, 'Logs Date', CustomAttributeTypeEnum.CREATED_UPDATED_DATE),
      createOverrideField(SystemAttributeEnum.USER_SERIAL_KEY_ID, 'Serial Key', CustomAttributeTypeEnum.TEXT_SINGLE_LINE),
      createOverrideField(USER_LOG_USER_NAME_FIELD_ID, 'User Name', CustomAttributeTypeEnum.TEXT_SINGLE_LINE),
      createOverrideField(USER_LOG_FIELD_NAME_FIELD_ID, 'Field Name', CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN),
      createOverrideField(SystemAttributeEnum.PERFORMED_BY, 'Performed By', CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN),
      createOverrideField(USER_LOG_EVENT_FIELD_ID, 'Event', CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN),
    ];
  }, [createOverrideField]);

  const customerLogsEntityFieldsOverride = useMemo(() => {
    return [
      createOverrideField(CUSTOMER_LOG_LOGS_DATE_FIELD_ID, 'Logs Date', CustomAttributeTypeEnum.CREATED_UPDATED_DATE),
      createOverrideField(SystemAttributeEnum.COMPANY_SERIAL_KEY_ID, 'Serial Key', CustomAttributeTypeEnum.TEXT_SINGLE_LINE),
      createOverrideField(CUSTOMER_LOG_CUSTOMER_NAME_FIELD_ID, 'Customer Name', CustomAttributeTypeEnum.TEXT_SINGLE_LINE),
      createOverrideField(CUSTOMER_LOG_FIELD_NAME_FIELD_ID, 'Field Name', CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN),
      createOverrideField(SystemAttributeEnum.PERFORMED_BY, 'Performed By', CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN),
      createOverrideField(CUSTOMER_LOG_EVENT_FIELD_ID, 'Event', CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN),
    ];
  }, [createOverrideField]);

  const activityLogsEntityFieldsOverride = useMemo(() => {
    return [
      createOverrideField(ACTIVITY_LOG_LOGS_DATE_FIELD_ID, 'Logs Date', CustomAttributeTypeEnum.CREATED_UPDATED_DATE),
      createOverrideField(SystemAttributeEnum.ACTIVITY_SERIAL_KEY_ID, 'Serial Key', CustomAttributeTypeEnum.TEXT_SINGLE_LINE),
      createOverrideField(ACTIVITY_LOG_ACTIVITY_NAME_FIELD_ID, 'Activity Name', CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN),
      createOverrideField(ACTIVITY_LOG_FIELD_NAME_FIELD_ID, 'Field Name', CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN),
      createOverrideField(SystemAttributeEnum.PERFORMED_BY, 'Performed By', CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN),
      createOverrideField(ACTIVITY_LOG_EVENT_FIELD_ID, 'Event', CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN),
    ];
  }, [createOverrideField]);

  const opportunityLogsEntityFieldsOverride = useMemo(() => {
    return [
      createOverrideField(OPPORTUNITY_LOG_LOGS_DATE_FIELD_ID, 'Logs Date', CustomAttributeTypeEnum.CREATED_UPDATED_DATE),
      createOverrideField(SystemAttributeEnum.OPPORTUNITY_SERIAL_KEY_ID, 'Serial Key', CustomAttributeTypeEnum.TEXT_SINGLE_LINE),
      createOverrideField(OPPORTUNITY_LOG_OPPORTUNITY_NAME_FIELD_ID, 'Opportunity Name', CustomAttributeTypeEnum.TEXT_SINGLE_LINE),
      createOverrideField(OPPORTUNITY_LOG_FIELD_NAME_FIELD_ID, 'Field Name', CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN),
      createOverrideField(SystemAttributeEnum.PERFORMED_BY, 'Performed By', CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN),
      createOverrideField(OPPORTUNITY_LOG_EVENT_FIELD_ID, 'Event', CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN),
    ];
  }, [createOverrideField]);

  const contactLogsEntityFieldsOverride = useMemo(() => {
    return [
      createOverrideField(CONTACT_LOG_LOGS_DATE_FIELD_ID, 'Logs Date', CustomAttributeTypeEnum.CREATED_UPDATED_DATE),
      createOverrideField(SystemAttributeEnum.CONTACT_SERIAL_KEY_ID, 'Serial Key', CustomAttributeTypeEnum.TEXT_SINGLE_LINE),
      createOverrideField(CONTACT_LOG_CONTACT_NAME_FIELD_ID, 'Contact Name', CustomAttributeTypeEnum.TEXT_SINGLE_LINE),
      createOverrideField(CONTACT_LOG_FIELD_NAME_FIELD_ID, 'Field Name', CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN),
      createOverrideField(SystemAttributeEnum.PERFORMED_BY, 'Performed By', CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN),
      createOverrideField(CONTACT_LOG_EVENT_FIELD_ID, 'Event', CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN),
    ];
  }, [createOverrideField]);

  // Per-module filter config. Each entry binds a moduleName to the AdvanceFilter
  // props that should drive the filter modal on that page. Adding a new
  // filterable module = one more entry here.
  const filterConfigByModule = useMemo(() => {
    return {
      users: {
        moduleId: SystemAttributeEnum.USER_MODULE,
        serialKeyId: SystemAttributeEnum.USER_SERIAL_KEY_ID,
        entityFieldsOverride: userLogsEntityFieldsOverride,
      },
      customers: {
        moduleId: SystemAttributeEnum.COMPANY_MODULE,
        serialKeyId: SystemAttributeEnum.COMPANY_SERIAL_KEY_ID,
        entityFieldsOverride: customerLogsEntityFieldsOverride,
      },
      activities: {
        moduleId: SystemAttributeEnum.ACTIVITY_MODULE,
        serialKeyId: SystemAttributeEnum.ACTIVITY_SERIAL_KEY_ID,
        entityFieldsOverride: activityLogsEntityFieldsOverride,
      },
      opportunities: {
        moduleId: SystemAttributeEnum.OPPORTUNITY_MODULE,
        serialKeyId: SystemAttributeEnum.OPPORTUNITY_SERIAL_KEY_ID,
        entityFieldsOverride: opportunityLogsEntityFieldsOverride,
      },
      contacts: {
        moduleId: SystemAttributeEnum.CONTACT_MODULE,
        serialKeyId: SystemAttributeEnum.CONTACT_SERIAL_KEY_ID,
        entityFieldsOverride: contactLogsEntityFieldsOverride,
      },
    } as Record<string, {
      moduleId: number;
      serialKeyId: number;
      entityFieldsOverride: CustomAttibute[];
    }>;
  }, [userLogsEntityFieldsOverride, customerLogsEntityFieldsOverride, activityLogsEntityFieldsOverride, opportunityLogsEntityFieldsOverride, contactLogsEntityFieldsOverride]);

  const currentFilterConfig = useMemo(() => {
    const key = typeof moduleName === 'string' ? moduleName : '';
    return filterConfigByModule[key];
  }, [moduleName, filterConfigByModule]);

  const operatorOverridesByFieldId = useMemo(() => {
    const equalsOnly = [{ key: 1, value: 'Equals to' }];
    const equalsAndContains = [
      { key: 1, value: 'Equals to' },
      { key: 3, value: 'Contains' },
    ];
    return new Map<number, Array<{ key: number; value: string }>>([
      [SystemAttributeEnum.PERFORMED_BY, equalsOnly],
      [USER_LOG_EVENT_FIELD_ID, equalsOnly],
      [USER_LOG_FIELD_NAME_FIELD_ID, equalsOnly],
      [SystemAttributeEnum.USER_SERIAL_KEY_ID, equalsAndContains],
      [USER_LOG_USER_NAME_FIELD_ID, equalsAndContains],
      [CUSTOMER_LOG_EVENT_FIELD_ID, equalsOnly],
      [CUSTOMER_LOG_FIELD_NAME_FIELD_ID, equalsOnly],
      [SystemAttributeEnum.COMPANY_SERIAL_KEY_ID, equalsAndContains],
      [CUSTOMER_LOG_CUSTOMER_NAME_FIELD_ID, equalsAndContains],
      [ACTIVITY_LOG_EVENT_FIELD_ID, equalsOnly],
      [ACTIVITY_LOG_FIELD_NAME_FIELD_ID, equalsOnly],
      [SystemAttributeEnum.ACTIVITY_SERIAL_KEY_ID, equalsAndContains],
      [ACTIVITY_LOG_ACTIVITY_NAME_FIELD_ID, equalsOnly],
      [OPPORTUNITY_LOG_EVENT_FIELD_ID, equalsOnly],
      [OPPORTUNITY_LOG_FIELD_NAME_FIELD_ID, equalsOnly],
      [SystemAttributeEnum.OPPORTUNITY_SERIAL_KEY_ID, equalsAndContains],
      [OPPORTUNITY_LOG_OPPORTUNITY_NAME_FIELD_ID, equalsAndContains],
      [CONTACT_LOG_EVENT_FIELD_ID, equalsOnly],
      [CONTACT_LOG_FIELD_NAME_FIELD_ID, equalsOnly],
      [SystemAttributeEnum.CONTACT_SERIAL_KEY_ID, equalsAndContains],
      [CONTACT_LOG_CONTACT_NAME_FIELD_ID, equalsAndContains],
    ]);
  }, []);

  const performedByUserMapRef = useRef<Map<number, string>>(new Map());
  const performedByOptionsRef = useRef<Array<{ id: number; name: string }>>([]);
  const performedByOptionsProjectIdRef = useRef<string | null>(null);
  const performedByOptionsLoadingPromiseRef = useRef<Promise<void> | null>(null);
  const fieldNameMapRef = useRef<Map<number, string>>(new Map());
  const fieldNameOptionsRef = useRef<Array<{ id: number; name: string }>>([]);
  const fieldNameOptionsProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isFilterableLogs) {
      performedByUserMapRef.current = new Map();
      performedByOptionsRef.current = [];
      performedByOptionsProjectIdRef.current = null;
      performedByOptionsLoadingPromiseRef.current = null;
      fieldNameMapRef.current = new Map();
      fieldNameOptionsRef.current = [];
      fieldNameOptionsProjectIdRef.current = null;
    }
  }, [isFilterableLogs]);

  const ensurePerformedByOptionsLoaded = useCallback(async () => {
    try {
      if (!isFilterableLogs) return;
      if (!selectedProject) return;
      if (!moduleType) return;

      if (performedByOptionsProjectIdRef.current === selectedProject) return;
      const inFlightLoad = performedByOptionsLoadingPromiseRef.current;
      if (inFlightLoad !== null) {
        await inFlightLoad;
        return;
      }

      performedByOptionsLoadingPromiseRef.current = (async () => {
        const [performedBy, fieldNames] = await Promise.all([
          loadPerformedByOptions(Number(selectedProject)),
          loadFieldNameOptionsFromLogs(selectedProject, moduleType),
        ]);

        performedByUserMapRef.current = performedBy.idToName;
        performedByOptionsRef.current = performedBy.options;
        performedByOptionsProjectIdRef.current = selectedProject;
        fieldNameMapRef.current = fieldNames.idToName;
        fieldNameOptionsRef.current = fieldNames.options;
        fieldNameOptionsProjectIdRef.current = selectedProject;
      })();

      await performedByOptionsLoadingPromiseRef.current;
    } finally {
      performedByOptionsLoadingPromiseRef.current = null;
    }
  }, [isFilterableLogs, selectedProject, moduleType]);

  // Apply a freshly loaded Field Name list to the refs the row renderer and
  // filter payload read from, and hand the options back to the dropdown.
  const applyFieldNameLoad = useCallback((load: FieldNameLoad): IdNameOption[] => {
    fieldNameMapRef.current = load.idToName;
    fieldNameOptionsRef.current = load.options;
    fieldNameOptionsProjectIdRef.current = selectedProject;
    return load.options;
  }, [selectedProject]);

  const customFieldValuesLoader = useCallback(async (
    field: CustomAttibute,
    projectId: number
  ): Promise<Array<{ id: number; name: string }> | null> => {
    try {
      if (field.id === SystemAttributeEnum.PERFORMED_BY) {
        await ensurePerformedByOptionsLoaded();
        return performedByOptionsRef.current;
      }

      if (field.id === USER_LOG_FIELD_NAME_FIELD_ID) {
        // Source the field metadata from userEntityFieldsMap (via ref so the
        // callback doesn't churn); fall back to a fresh fetch when empty.
        const cached = Array.from(userEntityFieldsMapRef.current.values());
        const userFields = cached.length
          ? cached
          : await fetchModuleFields(selectedProject, SystemAttributeEnum.USER_MODULE);
        return applyFieldNameLoad(buildFieldNameOptions(userFields));
      }

      const fieldNameModuleId = FIELD_NAME_MODULE_BY_FIELD_ID.get(field.id);
      if (fieldNameModuleId !== undefined) {
        const moduleFields = await fetchModuleFields(selectedProject, fieldNameModuleId);
        return applyFieldNameLoad(buildFieldNameOptions(moduleFields));
      }

      if (field.id === ACTIVITY_LOG_FIELD_NAME_FIELD_ID) {
        const activityLoad = await loadActivityFieldNameOptions(selectedProject);
        if (!activityLoad) return [];
        return applyFieldNameLoad(activityLoad);
      }

      if (field.id === ACTIVITY_LOG_ACTIVITY_NAME_FIELD_ID) {
        return await loadActivityNameOptions(projectId);
      }

      if (EVENT_FIELD_IDS.has(field.id)) {
        return [
          { id: 1, name: 'Created' },
          { id: 2, name: 'Updated' },
        ];
      }

      return null;
    } catch {
      return [];
    }
  }, [ensurePerformedByOptionsLoaded, selectedProject, applyFieldNameLoad]);

  // Show error notification
  const showErrorSnackBar = useCallback((message?: string) => {
    const errorMsg = message || 'Unable to fetch data. Please try again.';
    setError(errorMsg);
    setTimeout(() => setError(null), 5000);
  }, []);

  useEffect(() => {
    const fetchUserFields = async () => {
      try {
        if (!isUserLogs || !selectedProject) return;
        const projectIdNumber = Number(selectedProject);
        if (!Number.isFinite(projectIdNumber)) return;
        const response = await settingsService.getFieldDetails(projectIdNumber, SystemAttributeEnum.USER_MODULE);
        if (response?.statusCode === 200 && Array.isArray(response.responseData)) {
          const map = new Map<number, CustomAttibute>();
          response.responseData.forEach((field: CustomAttibute) => {
            if (field?.id != null) {
              map.set(field.id, field);
            }
          });
          setUserEntityFieldsMap(map);
        }
      } catch {
        setUserEntityFieldsMap(new Map());
      }
    };

    fetchUserFields();
  }, [isUserLogs, selectedProject]);

  // Backend now applies filters server-side via the POST endpoint, so the grid
  // shows the API response as-is. Client-side filtering would re-filter already
  // filtered data and hide valid rows.
  const filteredRowData = rowData;

  const handleOpenFilterModal = useCallback(() => {
    void ensurePerformedByOptionsLoaded();
    setIsFilterModalOpen(true);
  }, [ensurePerformedByOptionsLoaded]);

  const refetchLogs = useCallback(async (filters: EntityLogsFilterRule[] | null) => {
    if (!selectedProject || !moduleType) return;
    const projectIdNumber = Number(selectedProject);
    if (!Number.isFinite(projectIdNumber)) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await getEntityLogs({
        projectId: projectIdNumber,
        moduleType,
        pageSize,
        pageNumber: PAGE_TO_FETCH,
        ...(filters?.length ? { filters } : {}),
      });

      if (response.statusCode >= 400) {
        throw new Error(response.message || 'An error occurred while fetching logs');
      }

      const data = response.responseData;
      setTotalDataCount(data?.totalCount || 0);
      setRowData(Array.isArray(data?.response) ? data.response : []);
      setPageNumber(data?.response?.length ? 2 : 1);
    } catch {
      setRowData([]);
      showErrorSnackBar();
    } finally {
      setIsLoading(false);
      setApiCallCompleted(true);
    }
  }, [selectedProject, moduleType, pageSize, showErrorSnackBar]);

  const handleApplyFilters = useCallback(async (filters: FilterResult[]) => {
    // Flip the loading flag BEFORE awaiting so the spinner overlay paints in
    // the same render that closes the modal, even if the request is fast.
    setIsLoading(true);

    const normalized = filters?.length ? filters : null;
    const count = normalized?.length || 0;
    setHasActiveFilters(count > 0);
    setActiveFiltersCount(count);

    const payloadFilters: EntityLogsFilterRule[] | null = normalized
      ? normalized.map((f) => ({
          entityFieldId: f.entityFieldId,
          operatorId: f.operatorId,
          value: f.value ?? null,
          fromValue: f.fromValue ?? null,
          toValue: f.toValue ?? null,
        }))
      : null;

    // Mirror to the ref so paginated load-more requests pick up the same set.
    activeFiltersRef.current = payloadFilters;

    void refetchLogs(payloadFilters);
  }, [refetchLogs]);

  const handleClearFilters = useCallback(() => {
    setIsLoading(true);
    setHasActiveFilters(false);
    setActiveFiltersCount(0);
    setIsFilterModalOpen(false);
    advanceFilterRef.current?.clear();
    activeFiltersRef.current = null;
    void refetchLogs(null);
  }, [refetchLogs]);

  // Fetch entity logs
  const fetchEntityLogs = useCallback(async (pageToFetch: number, isLoadMore = false) => {

    if (!moduleType || !selectedProject) return;

    if (selectedProject === 'null' || selectedProject === 'undefined' || selectedProject.trim() === '') {
      showErrorSnackBar('Invalid project ID. Please select a valid project.');
      setApiCallCompleted(true);
      return;
    }

    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    // Snapshot the active filters at request start; if they change during the
    // await (apply / clear) we discard this response to avoid mixing pages.
    const filtersAtRequestStart = activeFiltersRef.current;

    try {
      const response = await getEntityLogs({
        projectId: Number(selectedProject),
        moduleType,
        pageSize,
        pageNumber: pageToFetch,
        ...(filtersAtRequestStart?.length ? { filters: filtersAtRequestStart } : {}),
      });

      if (response.statusCode >= 400) {
        throw new Error(response.message || 'An error occurred while fetching logs');
      }

      // Drop stale load-more responses if the user applied or cleared filters
      // while this request was in flight.
      if (isLoadMore && activeFiltersRef.current !== filtersAtRequestStart) {
        return;
      }

      const data = response.responseData;

      if (!isLoadMore) {
        setTotalDataCount(data.totalCount || 0);
      }

      if (data?.response) {
        if (!isLoadMore) {
          setRowData(data.response);
        } else {
          setRowData(prev => [...prev, ...data.response]);
        }
      }

      // Update page number AFTER successful fetch
      if (data?.response?.length) {
        setPageNumber(pageToFetch + 1);
      }

    } catch (err: any) {
      // Silently fail and show empty grid
      if (!isLoadMore) {
        setRowData([]);
      }
    } finally {
      if (isLoadMore) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
      setApiCallCompleted(true);
    }
  }, [moduleType, selectedProject, pageSize, showErrorSnackBar]);

  // Load more handler. Blocks while either a load-more or a full refetch
  // (apply/clear) is in flight so we don't mix pages from different filter
  // states or fire two concurrent paginations.
  const onLoadMoreClick = useCallback(() => {
    if (rowData.length < totalDataCount && !isLoadingMore && !isLoading) {
      fetchEntityLogs(pageNumber, true);
    }
  }, [rowData.length, totalDataCount, isLoadingMore, isLoading, pageNumber, fetchEntityLogs]);

  // Initial load effect
  useEffect(() => {
    if (moduleName && router.isReady && isClient && !hasInitialized) {
      // Handle direct URL access - try to get project from localStorage
      let projectId = selectedProject;
      
      if (!projectId) {
        // This handles the case when directly accessing the URL
        const projectValue = localStorage.getItem('selectedProject');
        
        if (projectValue && projectValue !== 'null' && projectValue !== 'undefined') {
          try {
            const parsed = JSON.parse(projectValue);
            if (parsed && (typeof parsed === 'string' || typeof parsed === 'number')) {
              projectId = parsed.toString();
              setSelectedProject(projectId);
            }
          } catch {
            if (projectValue !== 'null' && projectValue !== 'undefined') {
              projectId = projectValue;
              setSelectedProject(projectId);
            }
          }
        }
        
        if (!projectId) {
          setError('No project selected. Please refresh the page or select a project.');
          setIsLoading(false);
          setApiCallCompleted(true);
          return;
        }
      }
      
      // Ensure we have both project ID and module type
      if (projectId && moduleType !== undefined && moduleType !== null) {
        setRowData([]);
        setTotalDataCount(0);
        setPageNumber(1);
        setHasInitialized(true);
        setApiCallCompleted(false);
        
        // Use the actual values for the API call to ensure they're available
        getEntityLogs({
          projectId: Number(projectId),
          moduleType,
          pageSize,
          pageNumber: PAGE_TO_FETCH,
        }).then(response => {
          if (response.statusCode >= 400) {
            throw new Error(response.message || 'An error occurred while fetching logs');
          }

          const data = response.responseData;
          setTotalDataCount(data.totalCount || 0);

          if (data?.response) {
            setRowData(data.response);
          }

          // Update page number after successful fetch
          if (data?.response?.length) {
            setPageNumber(2); // Set to 2 for next page
          }
          
          setIsLoading(false);
          setApiCallCompleted(true);
        }).catch(err => {
          setRowData([]);
          setIsLoading(false);
          setApiCallCompleted(true);
          showErrorSnackBar();
        });
      } else {
        setError('Missing required data. Please navigate from the menu.');
        setIsLoading(false);
        setApiCallCompleted(true);
      }
    }
  }, [moduleName, router.isReady, selectedProject, isClient, moduleType, hasInitialized, pageSize, showErrorSnackBar]);


  // Reset initialization when route changes
  useEffect(() => {
    setHasInitialized(false);
    setRowData([]);
    setTotalDataCount(0);
    // Clear any filters carried over from a previous module so paginated
    // requests on the new module don't accidentally forward them.
    activeFiltersRef.current = null;
    setPageNumber(1);
    setError(null);
    setApiCallCompleted(false);
  }, [moduleName]);


  // Grid ready handler
  const onGridReady = useCallback((params: GridReadyEvent) => {
    console.log('Grid ready, setting gridApi:', params.api);
    setGridApi(params.api);
    // Apply any pending search filter through handleSearch
    if (searchTerm) {
      // We'll call handleSearch in the useEffect that depends on gridApi and searchTerm
    }
  }, [searchTerm]);


  // These search handlers are no longer needed as search is now handled by Redux
  // and the LogsDataGrid component listens to changes in the Redux store directly

  // For handling Enter key press - immediate search
  const handleSearch = () => {
    if (gridApi) {
      gridApi.setQuickFilter(searchTerm);
    }
  };
  
  // Apply search filter when gridApi becomes available or searchTerm changes
  useEffect(() => {
    if (gridApi && searchTerm !== undefined) {
      handleSearch();
    }
  }, [gridApi, searchTerm]);


  // Show loading until localStorage is available and router is ready
  if (!router.isReady || !isClient || !apiCallCompleted) {
    return (
      <Layout disableNavigation={true}>
        <Head>
          <title>Loading... | 1Channel</title>
        </Head>
        <TailwindPageLayout>
          <div className="h-full w-full overflow-auto">
            <Spinner customLoadingName="Loading Logs.." />
          </div>
        </TailwindPageLayout>
      </Layout>
    );
  }


  // Show error if no project selected
  if (!selectedProject || error) {
    return (
      <Layout disableNavigation={true}>
        <Head>
          <title>Error | 1Channel</title>
        </Head>
        <TailwindPageLayout>
          <div className="h-full w-full overflow-auto">
            <div className="flex flex-col items-center justify-center min-h-[40vh]">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {error || 'No Project Selected'}
              </h2>
              <p className="text-gray-600 text-center max-w-md">
                {error || 'Please select a project from your dashboard first, then return to view entity logs.'}
              </p>
              <button 
                onClick={() => router.push('/')}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </TailwindPageLayout>
      </Layout>
    );
  }


  const restrictedUserAttributeTypeIds = [
    CustomAttributeTypeEnum.IMAGE,
    CustomAttributeTypeEnum.HEADER_TEXT,
    CustomAttributeTypeEnum.NORMAL_TEXT,
    CustomAttributeTypeEnum.PAGE_SEPARATOR,
    CustomAttributeTypeEnum.DOCUMENT_UPLOAD,
    CustomAttributeTypeEnum.AUDIO_VIDEO,
    CustomAttributeTypeEnum.DATA_LIST,
    CustomAttributeTypeEnum.QR_CODE_SCANNER,
    CustomAttributeTypeEnum.DATE_TIME,
    CustomAttributeTypeEnum.OTP_VALIDATION,
    CustomAttributeTypeEnum.RADIO,
    CustomAttributeTypeEnum.CALCULATED_FIELD,
    CustomAttributeTypeEnum.REFERENCE_DOCUMENTS,
    CustomAttributeTypeEnum.TIME_DURATION,
  ];

  return (
    <Layout disableNavigation={true}>
      <Head>
        <title>{title} | 1Channel</title>
      </Head>
      <TailwindPageLayout
        header={
          <LogsHeader
            pageHeading={title}
            handleSearch={handleSearch}
            onOpenFilterModal={isFilterableLogs ? handleOpenFilterModal : undefined}
            hasActiveFilters={hasActiveFilters}
            activeFiltersCount={activeFiltersCount}
            onClearFilters={handleClearFilters}
          />
        }
      >
        <div className="relative h-full w-full overflow-auto">
          {isLoading && rowData.length === 0 ? (
            <Spinner customLoadingName="Loading Logs.." />
          ) : (
            <>
              <LogsDataGrid
                logs={filteredRowData}
                loading={isLoading}
                onLoadMore={onLoadMoreClick}
                isLoadingMore={isLoadingMore}
                totalCount={totalDataCount}
                currentCount={filteredRowData.length}
                onGridReady={onGridReady}
                entityName={singularEntityName}
              />
              {isLoading && (
                <div className="absolute inset-0 z-10">
                  <Spinner blur customLoadingName="Loading Logs.." />
                </div>
              )}
            </>
          )}
        </div>
      </TailwindPageLayout>

      {currentFilterConfig && (
        <AdvanceFilter
          ref={advanceFilterRef}
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          onApply={handleApplyFilters}
          onClear={handleClearFilters}
          moduleId={currentFilterConfig.moduleId}
          serialKeyId={currentFilterConfig.serialKeyId}
          title="Filters"
          restrictedAttributeIds={restrictedUserAttributeTypeIds}
          entityFieldsOverride={currentFilterConfig.entityFieldsOverride}
          customFieldValuesLoader={customFieldValuesLoader}
          operatorOverridesByFieldId={operatorOverridesByFieldId as any}
        />
      )}
    </Layout>
  );

};

export default EntityLogsPage;

// Required for static export with dynamic routes
export async function getStaticPaths() {
  // Pre-generate paths for all supported module types
  const modules = ['customers', 'opportunities', 'contacts', 'activities', 'users'];
  
  const paths = modules.map((moduleName) => ({
    params: { moduleName },
  }));

  return {
    paths,
    fallback: false, // Return 404 for paths not in the list
  };
}

export async function getStaticProps({ params }: { params: { moduleName: string } }) {
  return {
    props: {
      moduleName: params.moduleName,
    },
  };
}
