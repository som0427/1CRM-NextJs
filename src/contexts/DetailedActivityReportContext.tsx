import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ColDef, GridApi } from 'ag-grid-community';
import { useSnackbar } from 'notistack';

import detailedActivityReportService from '@/lib/services/detailed-activity-report.service';
import settingsService from '@/lib/services/settingsService';
import activitiesService from '@/lib/services/activitiesService';
import userService from '@/lib/services/userService';
import { getProjectId } from '@/lib/storage/sharedStorage';

interface ActivityOption {
  value: string;
  label: string;
}

interface PerformedByOption {
  value: string;
  label: string;
}

interface ReportTypeOption {
  value: string;
  label: string;
}

interface DetailedActivityReportContextType {
  pageHeading: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleSearch: () => void;
  startDate: string;
  endDate: string;
  defaultStartDate: string;
  defaultEndDate: string;
  reportData: any[];
  loading: boolean;
  gridDataLoaded: boolean;
  columnDefs: ColDef[];
  defaultColDef: ColDef;
  totalCount: number;
  filteredCount: number;
  handleLoadMore: () => void;
  isLoadingMore: boolean;
  exportData: () => Promise<void>;
  exporting: boolean;
  setGridApi: (api: GridApi) => void;
  openFilterModal: () => void;
  closeFilterModal: () => void;
  isFilterModalOpen: boolean;
  activityOptions: ActivityOption[];
  reportTypeOptions: ReportTypeOption[];
  filtersDataLoading: boolean;
  selectedActivityId: string | null;
  selectedActivityLabel: string;
  selectedReportTypeId: string | null;
  performedByOptions: PerformedByOption[];
  selectedPerformedByIds: string[];
  applyFilters: (filters: {
    startDate: string;
    endDate: string;
    activityId: string | null;
    activityLabel?: string;
    performedByIds?: string[];
    reportTypeId?: string | null;
  }) => void;
  clearActivityTypeFilters: () => void;
  hasActiveFilters: boolean;
  activeFiltersCount: number;
  handleViewDetails: (row: any) => void;
  isDetailsModalOpen: boolean;
  closeDetailsModal: () => void;
  selectedRow: any | null;
}

const DetailedActivityReportContext = createContext<DetailedActivityReportContextType | undefined>(undefined);

const getCurrentMonthDateRange = () => {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today);

  const toYyyyMmDd = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    startDate: toYyyyMmDd(startDate),
    endDate: toYyyyMmDd(endDate),
  };
};

const REPORT_TYPE_OPTIONS: ReportTypeOption[] = [
  { value: '1', label: 'Created On' },
  { value: '2', label: 'Updated On' },
];

const TIME_FIELD_SYSTEM_FIELD_ID = -2;
const TIME_ZONE_FIELD_SYSTEM_FIELD_ID = -7;

export const DetailedActivityReportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { enqueueSnackbar } = useSnackbar();

  const allReportDataRef = useRef<any[]>([]);
  const defaultDateRangeRef = useRef(getCurrentMonthDateRange());

  const [pageHeading] = useState('Detailed Activity Report');
  const [searchTerm, setSearchTerm] = useState('');
  const [{ startDate, endDate }, setDateRange] = useState(defaultDateRangeRef.current);
  const [reportDataState, setReportDataState] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [gridDataLoaded, setGridDataLoaded] = useState(false);
  const [rawTotalCount, setRawTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
  const [isDynamicGrid, setIsDynamicGrid] = useState(false);
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);
  const [companyName, setCompanyName] = useState('Company');
  const [opportunityName, setOpportunityName] = useState('Opportunity');
  const [contactName, setContactName] = useState('Contact');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(true);
  const [selectedActivityLabel, setSelectedActivityLabel] = useState<string>('');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [activityApiOptions, setActivityApiOptions] = useState<ActivityOption[]>([]);
  const [activityOptionsLoading, setActivityOptionsLoading] = useState(true);
  const [selectedReportTypeId, setSelectedReportTypeId] = useState<string | null>(null);
  const [performedByOptions, setPerformedByOptions] = useState<PerformedByOption[]>([]);
  const [performedByOptionsLoading, setPerformedByOptionsLoading] = useState(true);
  const [dynamicNamesLoading, setDynamicNamesLoading] = useState(true);
  const [selectedPerformedByIds, setSelectedPerformedByIds] = useState<string[]>([]);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);

  const pageSize = 10000;

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    filter: true,
    flex: 1,
    minWidth: 150,
  }), []);

  const buildDynamicGridStructure = useCallback((attributeDetails: any[], attributeFieldValues: any[]): { columns: ColDef[]; rows: any[] } => {
    if (!Array.isArray(attributeDetails) || !Array.isArray(attributeFieldValues)) {
      return { columns: [], rows: [] };
    }

    const dynamicColumns: ColDef[] = [];

    for (let index = 0; index < attributeDetails.length; index += 1) {
      const detail = attributeDetails[index];

      if (!detail) {
        continue;
      }

      if (index === 0) {
        continue;
      }

      const systemFieldId = detail?.systemFieldId;
      if (systemFieldId === TIME_ZONE_FIELD_SYSTEM_FIELD_ID) {
        continue;
      }

      const fieldKey = `${index}`;
      const headerName = detail?.attributeName || `Column ${dynamicColumns.length + 1}`;
      const column: ColDef = {
        headerName,
        field: fieldKey,
        menuTabs: ['filterMenuTab'],
      };

      const attributeType = detail?.attributeType;

      if (attributeType === 3 || systemFieldId === -3) {
        column.filter = 'agDateColumnFilter';
      }

      if (systemFieldId === -5) {
        column.filter = false;
        column.sortable = false;
      }

      if (systemFieldId === TIME_FIELD_SYSTEM_FIELD_ID) {
        const timeZoneFieldKey = `${index + 1}`;
        column.valueGetter = (params) => {
          const time = params?.data?.[fieldKey];
          const timeZone = params?.data?.[timeZoneFieldKey];
          if (!time && !timeZone) {
            return '';
          }
          return [time, timeZone].filter(Boolean).join(' ');
        };
      }

      if (attributeType === 7) {
        column.comparator = (valueA: any, valueB: any) => {
          const numA = Number(valueA ?? 0);
          const numB = Number(valueB ?? 0);
          if (Number.isNaN(numA) && Number.isNaN(numB)) return 0;
          if (Number.isNaN(numA)) return -1;
          if (Number.isNaN(numB)) return 1;
          return numA - numB;
        };
      }

      dynamicColumns.push(column);
    }

    const dynamicRows = attributeFieldValues.map((row: any, rowIndex: number) => {
      if (Array.isArray(row)) {
        return row.reduce((acc: Record<string, unknown>, value: unknown, index: number) => {
          acc[`${index}`] = value ?? '';
          return acc;
        }, { __rowIndex: rowIndex });
      }

      if (row && typeof row === 'object') {
        return { __rowIndex: rowIndex, ...row };
      }

      return { __rowIndex: rowIndex, value: row };
    });

    return { columns: dynamicColumns, rows: dynamicRows };
  }, []);


  const selectedPerformedByNames = useMemo(() => {
    if (selectedPerformedByIds.length === 0) {
      return [];
    }

    return selectedPerformedByIds
      .map((id) => {
        const optionLabel = performedByOptions.find((option) => option.value === id)?.label ?? '';
        return typeof optionLabel === 'string' ? optionLabel.trim() : '';
      })
      .filter((label) => label.length > 0);
  }, [performedByOptions, selectedPerformedByIds]);

  const filtersDataLoading = useMemo(
    () => activityOptionsLoading || performedByOptionsLoading || dynamicNamesLoading,
    [activityOptionsLoading, performedByOptionsLoading, dynamicNamesLoading],
  );

  const reportData = useMemo(() => {
    if (isDynamicGrid) {
      return reportDataState;
    }

    let filtered = reportDataState;

    if (selectedActivityLabel) {
      filtered = filtered.filter((row) => {
        const type = typeof row?.activityType === 'string' ? row.activityType.trim() : '';
        return type === selectedActivityLabel;
      });
    }

    if (selectedPerformedByNames.length > 0) {
      const normalizedPerformedBy = new Set(
        selectedPerformedByNames
          .map((name) => name.toLowerCase())
          .filter((name) => name.length > 0),
      );

      if (normalizedPerformedBy.size > 0) {
        filtered = filtered.filter((row) => {
          const performerName = typeof row?.performedByName === 'string'
            ? row.performedByName.trim().toLowerCase()
            : '';
          return normalizedPerformedBy.has(performerName);
        });
      }
    }

    return filtered;
  }, [isDynamicGrid, reportDataState, selectedActivityLabel, selectedPerformedByNames]);

  const filteredCount = useMemo(() => reportData.length, [reportData]);

  const activityOptions = useMemo<ActivityOption[]>(() => {
    const manualOptions: ActivityOption[] = [
      { value: '2', label: companyName },
      { value: '3', label: opportunityName },
      { value: '1', label: contactName },
    ].filter((option) => option.label && option.label.trim().length > 0);

    //for maintaining the order of the option as per the api call
    const seen = new Set<string>();
    const orderedOptions: ActivityOption[] = [];

    manualOptions.forEach((option) => {
      const key = option.label.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        orderedOptions.push(option);
      }
    });

    activityApiOptions.forEach((option) => {
      const key = option.label?.trim().toLowerCase();
      if (!key || seen.has(key)) {
        return;
      }
      seen.add(key);
      orderedOptions.push(option);
    });

    return orderedOptions;
  }, [activityApiOptions, companyName, opportunityName, contactName]);

  const handleViewDetails = useCallback((row: any) => {
    if (!row) {
      return;
    }

    setSelectedRow(row);
    setIsDetailsModalOpen(true);
  }, []);

  const createDetailsColumn = useCallback((): ColDef => ({
    headerName: 'Details',
    field: '__details',
    filter: false,
    sortable: false,
    cellRenderer: () => 'View',
    cellClass: 'cursor-pointer select-none',
    cellStyle: { color: '#3699FF', fontWeight: 500 },
    onCellClicked: (params) => {
      if (params?.data) {
        handleViewDetails(params.data);
      }
    },
  }), [handleViewDetails]);

  useEffect(() => {
    if (isDynamicGrid) {
      return;
    }

    const buildColumns = () => {
      const columns: ColDef[] = [
        {
          headerName: 'Date',
          field: 'date',
          menuTabs: ['filterMenuTab'],
          cellClass: 'dateType',
          filter: 'agDateColumnFilter',
        },
        {
          headerName: 'Time',
          field: 'time',
          menuTabs: ['filterMenuTab'],
          valueFormatter: (params) => {
            const time = params?.data?.time || '';
            const timeZone = params?.data?.timeZone || '';
            return `${time}${timeZone ? ` ${timeZone}` : ''}`.trim();
          },
        },
        {
          headerName: 'Time Zone',
          field: 'timeZone',
          menuTabs: ['filterMenuTab'],
          hide: true,
        },
        {
          headerName: 'Activity',
          field: 'activityType',
          menuTabs: ['filterMenuTab'],
        },
        {
          headerName: 'Unique Key',
          field: 'serialNo',
          menuTabs: ['filterMenuTab'],
          tooltipField: 'serialNo',
          filter: false,
          sortable: false,
        },
        {
          headerName: 'Performed By Serial',
          field: 'userSerialNo',
          menuTabs: ['filterMenuTab'],
          tooltipField: 'userSerialNo',
        },
        {
          headerName: 'Name',
          field: 'performedByName',
          menuTabs: ['filterMenuTab'],
          tooltipField: 'performedByName',
        },
        {
          headerName: 'Email ID',
          field: 'performedBy',
          menuTabs: ['filterMenuTab'],
          tooltipField: 'performedBy',
        },
        {
          headerName: `${companyName} Serial Number`,
          field: 'customerSerialNo',
          menuTabs: ['filterMenuTab'],
          tooltipField: 'customerSerialNo',
        },
        {
          headerName: `${companyName} Name`,
          field: 'customerName',
          menuTabs: ['filterMenuTab'],
          tooltipField: 'customerName',
        },
        {
          headerName: `${opportunityName} Serial Number`,
          field: 'opportunitySerialNo',
          menuTabs: ['filterMenuTab'],
        },
        {
          headerName: `${opportunityName} Name`,
          field: 'opportunityName',
          menuTabs: ['filterMenuTab'],
        },
        {
          headerName: `${contactName} Serial Number`,
          field: 'contactSerialNo',
          menuTabs: ['filterMenuTab'],
          tooltipField: 'contactSerialNo',
        },
        {
          headerName: `${contactName} Name`,
          field: 'contactName',
          menuTabs: ['filterMenuTab'],
          tooltipField: 'contactName',
        },
        {
          headerName: 'Location',
          field: 'location',
          filter: false,
          sortable: false,
        },
        {
          headerName: 'Distance from Expected Location (in KM)',
          field: 'distanceFromLocation',
          menuTabs: ['filterMenuTab'],
        },
        {
          headerName: 'Details',
          field: 'details',
          filter: false,
          sortable: false,
          cellRenderer: () => 'View',
          cellClass: 'cursor-pointer select-none',
          cellStyle: { color: '#3699FF', fontWeight: 500 },
          onCellClicked: (params) => {
            if (params?.data) {
              handleViewDetails(params.data);
            }
          },
        },
      ];

      setColumnDefs(columns);
    };

    buildColumns();
  }, [companyName, contactName, handleViewDetails, isDynamicGrid, opportunityName]);

  const resolveProjectId = useCallback((): number | null => {
    const rawProjectId = getProjectId();

    if (rawProjectId == null) {
      return null;
    }

    if (typeof rawProjectId === 'number') {
      return Number.isFinite(rawProjectId) ? rawProjectId : null;
    }

    if (typeof rawProjectId === 'string') {
      const parsed = Number(rawProjectId);
      return Number.isNaN(parsed) ? null : parsed;
    }

    if (typeof rawProjectId === 'object') {
      const candidate = (rawProjectId as Record<string, unknown>).projectId ??
        (rawProjectId as Record<string, unknown>).id ??
        (rawProjectId as Record<string, unknown>).value;

      if (candidate == null) {
        return null;
      }

      if (typeof candidate === 'number') {
        return Number.isFinite(candidate) ? candidate : null;
      }

      if (typeof candidate === 'string') {
        const parsed = Number(candidate);
        return Number.isNaN(parsed) ? null : parsed;
      }
    }

    return null;
  }, []);

  const updateReportData = useCallback((newData: any[], isLoadMore: boolean) => {
    const combinedData = isLoadMore ? [...allReportDataRef.current, ...newData] : newData;
    allReportDataRef.current = combinedData;
    setReportDataState(combinedData);
  }, []);

  const fetchReportData = useCallback(async (
    dateStart: string,
    dateEnd: string,
    page: number,
    isLoadMore = false,
  ) => {
    const projectId = resolveProjectId();

    if (!projectId) {
      if (!isLoadMore) {
        allReportDataRef.current = [];
        setReportDataState([]);
        setRawTotalCount(0);
        setGridDataLoaded(true);
        setLoading(false);
      } else {
        setIsLoadingMore(false);
      }

      enqueueSnackbar('Select a project to view the Detailed Activity Report.', {
        variant: 'warning',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 3000,
      });
      return;
    }

    try {
      if (!isLoadMore) {
        setLoading(true);
        setGridDataLoaded(false);
      } else {
        setIsLoadingMore(true);
      }

      const performedByParam = selectedPerformedByIds
        .map((value) => (value == null ? '' : value.trim()))
        .filter((value) => value.length > 0)
        .join(',');

      const response = await detailedActivityReportService.getDetailedActivityReport(
        projectId,
        dateStart,
        dateEnd,
        selectedActivityId ?? '',
        selectedReportTypeId ?? '',
        performedByParam,
        pageSize,
        page,
      );

      const responseData = (response as any)?.responseData;

      const attributeDetails = Array.isArray(responseData?.attributeDetails)
        ? responseData.attributeDetails
        : null;
      const attributeFieldValues = Array.isArray(responseData?.attributeFieldValues)
        ? responseData.attributeFieldValues
        : null;

      let newData: any[] = [];

      if (attributeDetails && attributeFieldValues) {
        const { columns, rows } = buildDynamicGridStructure(attributeDetails, attributeFieldValues);
        if (!isLoadMore) {
          setColumnDefs([...columns, createDetailsColumn()]);
        }
        newData = rows;
        setIsDynamicGrid(true);
      } else {
        newData = responseData?.data ?? [];
        if (!isLoadMore && !attributeDetails) {
          setIsDynamicGrid(false);
        }
      }

      if (page === 0) {
        setRawTotalCount(responseData?.totalCount ?? newData.length ?? 0);
      }

      updateReportData(newData, isLoadMore);
      setPageNumber(page + 1);
    } catch (error) {
      console.error('Error fetching detailed activity report data:', error);
      if (!isLoadMore) {
        allReportDataRef.current = [];
        setReportDataState([]);
        setRawTotalCount(0);
        enqueueSnackbar('Failed to load detailed activity report data.', {
          variant: 'error',
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          autoHideDuration: 3000,
        });
      }
    } finally {
      if (!isLoadMore) {
        setLoading(false);
        setGridDataLoaded(true);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, [buildDynamicGridStructure, createDetailsColumn, enqueueSnackbar, pageSize, resolveProjectId, selectedActivityId, selectedPerformedByIds, selectedReportTypeId, updateReportData]);

  useEffect(() => {
    if (!hasAppliedFilters) {
      return;
    }

    fetchReportData(startDate, endDate, 0, false);
  }, [fetchReportData, hasAppliedFilters, selectedActivityId, selectedPerformedByIds, selectedReportTypeId, startDate, endDate]);

  const fetchActivityOptions = useCallback(async () => {
    setActivityOptionsLoading(true);
    const projectId = resolveProjectId();

    if (!projectId) {
      setActivityApiOptions([]);
      setActivityOptionsLoading(false);
      return;
    }

    try {
      const response = await activitiesService.getAllActivitiesType(projectId, false);
      const responseData = (response as any)?.responseData ?? [];

      const mapped: ActivityOption[] = responseData
        .map((item: any) => ({
          value: item?.activityId != null ? String(item.activityId) : '',
          label: item?.activityName ?? '',
        }))
        .filter((option: ActivityOption) => option.value && option.label);

      setActivityApiOptions(mapped);
    } catch (error) {
      console.error('Error fetching activity options:', error);
      setActivityApiOptions([]);
    } finally {
      setActivityOptionsLoading(false);
    }
  }, [resolveProjectId]);

  useEffect(() => {
    fetchActivityOptions();
  }, [fetchActivityOptions]);

  const fetchPerformedByOptions = useCallback(async () => {
    setPerformedByOptionsLoading(true);
    const projectId = resolveProjectId();

    if (!projectId) {
      setPerformedByOptions([]);
      setPerformedByOptionsLoading(false);
      return;
    }

    try {
      const response = await userService.getOwnerAndUsersDownHierarchy(projectId);
      const responseData = (response as any)?.responseData ?? [];

      const mapped: PerformedByOption[] = responseData
        .map((item: any) => ({
          value: item?.id != null ? String(item.id) : '',
          label: item?.fullName ?? '',
        }))
        .filter((option: PerformedByOption) => option.value && option.label);

      setPerformedByOptions(mapped);
    } catch (error) {
      console.error('Error fetching performed by options:', error);
      setPerformedByOptions([]);
    } finally {
      setPerformedByOptionsLoading(false);
    }
  }, [resolveProjectId]);

  useEffect(() => {
    fetchPerformedByOptions();
  }, [fetchPerformedByOptions]);

  useEffect(() => {
    const projectId = resolveProjectId();

    if (!projectId) {
      setDynamicNamesLoading(false);
      return;
    }

    const resolveDynamicNames = async () => {
      setDynamicNamesLoading(true);
      try {
        const result: any = await settingsService.getdynamicFieldNames(projectId);
        const responseData = result?.responseData ?? [];

        responseData.forEach((row: any) => {
          if (row.moduleId === 2) {
            setCompanyName(row.singularName || 'Company');
          }
          if (row.moduleId === 3) {
            setOpportunityName(row.singularName || 'Opportunity');
          }
          if (row.moduleId === 1) {
            setContactName(row.singularName || 'Contact');
          }
        });
      } catch (error) {
        console.error('Error fetching dynamic field names for detailed activity report:', error);
      } finally {
        setDynamicNamesLoading(false);
      }
    };

    resolveDynamicNames();
  }, [resolveProjectId]);

  useEffect(() => {
    if (!gridApi) {
      return;
    }

    gridApi.setQuickFilter(searchTerm || '');
  }, [gridApi, searchTerm]);

  const resetReportDataState = useCallback(() => {
    setPageNumber(0);
    allReportDataRef.current = [];
    setReportDataState([]);
    setRawTotalCount(0);
    setGridDataLoaded(false);
    setLoading(true);
  }, []);

  const handleDateRangeChange = useCallback((newStart: string, newEnd: string) => {
    setDateRange({ startDate: newStart, endDate: newEnd });
    resetReportDataState();
  }, [resetReportDataState]);

  const handleLoadMore = useCallback(() => {
    if (allReportDataRef.current.length < rawTotalCount && !isLoadingMore) {
      fetchReportData(startDate, endDate, pageNumber, true);
    }
  }, [fetchReportData, isLoadingMore, pageNumber, rawTotalCount, startDate, endDate]);

  const handleSearch = useCallback(() => {
    if (!gridApi) {
      return;
    }

    gridApi.setQuickFilter(searchTerm || '');
  }, [gridApi, searchTerm]);

  const exportData = useCallback(async () => {
    const projectId = resolveProjectId();

    if (!projectId) {
      enqueueSnackbar('Project selection required to export report', {
        variant: 'warning',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 3000,
      });
      return;
    }

    setExporting(true);

    try {
      const performedByCsv = selectedPerformedByIds
        .map((value) => (value == null ? '' : value.trim()))
        .filter((value) => value.length > 0)
        .join(',');

      const payload = {
        projectId,
        reportId: -2,
        startDate,
        endDate,
        moduleType: '',
        reportType: selectedReportTypeId ?? '',
        performedBy: performedByCsv,
      };

      const response: any = await detailedActivityReportService.generateReport(payload);

      if (response?.statusCode === 200) {
        enqueueSnackbar(response?.responseData || 'Report generation initiated', {
          variant: 'success',
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          autoHideDuration: 3000,
        });
      } else {
        enqueueSnackbar(response?.message || 'Failed to generate report', {
          variant: 'error',
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          autoHideDuration: 3000,
        });
      }
    } catch (error) {
      console.error('Error exporting detailed activity report:', error);
      enqueueSnackbar('Failed to generate report', {
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 3000,
      });
    } finally {
      setExporting(false);
    }
  }, [enqueueSnackbar, endDate, resolveProjectId, selectedPerformedByIds, selectedReportTypeId, startDate]);

  const openFilterModal = useCallback(() => {
    setIsFilterModalOpen(true);
  }, []);

  const closeFilterModal = useCallback(() => {
    setIsFilterModalOpen(false);
  }, []);

  const applyFilters = useCallback((filters: {
    startDate: string;
    endDate: string;
    activityId: string | null;
    activityLabel?: string;
    performedByIds?: string[];
    reportTypeId?: string | null;
  }) => {
    const {
      startDate: newStart,
      endDate: newEnd,
      activityId,
      activityLabel,
      performedByIds = [],
      reportTypeId = null,
    } = filters;

    const dateChanged = newStart !== startDate || newEnd !== endDate;

    const normalizedId = activityId && activityId.trim().length > 0 ? activityId.trim() : null;
    const resolvedLabel = normalizedId
      ? (activityLabel ?? activityOptions.find((option) => option.value === normalizedId)?.label ?? '')
      : '';

    setSelectedActivityId(normalizedId);
    setSelectedActivityLabel(resolvedLabel);

    const normalizedReportTypeId = reportTypeId && reportTypeId.trim().length > 0 ? reportTypeId.trim() : null;
    setSelectedReportTypeId(normalizedId ? normalizedReportTypeId : null);

    const sanitizedPerformedByIds = Array.isArray(performedByIds)
      ? performedByIds
        .map((value) => (value == null ? '' : `${value}`.trim()))
        .filter((value) => value.length > 0)
      : [];

    setSelectedPerformedByIds(sanitizedPerformedByIds);

    if (dateChanged) {
      handleDateRangeChange(newStart, newEnd);
    } else {
      resetReportDataState();
    }

    setIsFilterModalOpen(false);
    setHasAppliedFilters(true);
  }, [activityOptions, endDate, handleDateRangeChange, resetReportDataState, startDate]);

  const clearActivityTypeFilters = useCallback(() => {
    setSelectedActivityId(null);
    setSelectedActivityLabel('');
    setSelectedReportTypeId(null);
    setSelectedPerformedByIds([]);

    const defaultRange = defaultDateRangeRef.current;
    const dateChanged =
      startDate !== defaultRange.startDate ||
      endDate !== defaultRange.endDate;

    if (dateChanged) {
      handleDateRangeChange(defaultRange.startDate, defaultRange.endDate);
    } else {
      resetReportDataState();
    }

    setHasAppliedFilters(true);
  }, [endDate, handleDateRangeChange, resetReportDataState, startDate]);

  const hasActiveFilters = useMemo(() => {
    const defaultRange = defaultDateRangeRef.current;
    const dateChanged =
      startDate !== defaultRange.startDate ||
      endDate !== defaultRange.endDate;

    return (
      Boolean(selectedActivityId) ||
      Boolean(selectedReportTypeId) ||
      selectedPerformedByIds.length > 0 ||
      dateChanged
    );
  }, [endDate, selectedActivityId, selectedReportTypeId, selectedPerformedByIds, startDate]);

  const activeFiltersCount = useMemo(() => {
    const defaultRange = defaultDateRangeRef.current;
    const dateChanged =
      startDate !== defaultRange.startDate ||
      endDate !== defaultRange.endDate;

    return (selectedActivityId ? 1 : 0) +
      (selectedReportTypeId ? 1 : 0) +
      (selectedPerformedByIds.length > 0 ? 1 : 0) +
      (dateChanged ? 1 : 0);
  }, [endDate, selectedActivityId, selectedReportTypeId, selectedPerformedByIds, startDate]);

  const closeDetailsModal = useCallback(() => {
    setIsDetailsModalOpen(false);
    setSelectedRow(null);
  }, []);

  const value = useMemo<DetailedActivityReportContextType>(() => ({
    pageHeading,
    searchTerm,
    setSearchTerm,
    handleSearch,
    startDate,
    endDate,
    defaultStartDate: defaultDateRangeRef.current.startDate,
    defaultEndDate: defaultDateRangeRef.current.endDate,
    reportData,
    loading,
    gridDataLoaded,
    columnDefs,
    defaultColDef,
    totalCount: rawTotalCount,
    filteredCount,
    handleLoadMore,
    isLoadingMore,
    exportData,
    exporting,
    setGridApi,
    openFilterModal,
    closeFilterModal,
    isFilterModalOpen,
    activityOptions,
    reportTypeOptions: REPORT_TYPE_OPTIONS,
    filtersDataLoading,
    performedByOptions,
    selectedActivityId,
    selectedActivityLabel,
    selectedReportTypeId,
    selectedPerformedByIds,
    applyFilters,
    clearActivityTypeFilters,
    hasActiveFilters,
    activeFiltersCount,
    handleViewDetails,
    isDetailsModalOpen,
    closeDetailsModal,
    selectedRow,
  }), [
    activityOptions,
    filtersDataLoading,
    performedByOptions,
    activeFiltersCount,
    applyFilters,
    clearActivityTypeFilters,
    closeDetailsModal,
    closeFilterModal,
    columnDefs,
    defaultColDef,
    endDate,
    exportData,
    exporting,
    filteredCount,
    gridDataLoaded,
    handleLoadMore,
    handleSearch,
    handleViewDetails,
    hasActiveFilters,
    isDetailsModalOpen,
    isFilterModalOpen,
    isLoadingMore,
    loading,
    openFilterModal,
    pageHeading,
    reportData,
    rawTotalCount,
    searchTerm,
    selectedActivityId,
    selectedActivityLabel,
    selectedReportTypeId,
    selectedPerformedByIds,
    selectedRow,
    setGridApi,
    startDate,
  ]);

  return (
    <DetailedActivityReportContext.Provider value={value}>
      {children}
    </DetailedActivityReportContext.Provider>
  );
};

export const useDetailedActivityReport = (): DetailedActivityReportContextType => {
  const context = useContext(DetailedActivityReportContext);

  if (!context) {
    throw new Error('useDetailedActivityReport must be used within a DetailedActivityReportProvider');
  }

  return context;
};
