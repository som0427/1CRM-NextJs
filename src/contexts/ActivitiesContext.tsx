import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import { ColDef } from 'ag-grid-community';
import settingsService from '../lib/services/settingsService';
import activitiesService from '../lib/services/activitiesService';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import { getProjectId } from '@/lib/storage/sharedStorage';
import { UserLocalizationService } from '@/lib/services/userLocalizationService';
import { ManageActivitiesModel } from '@/lib/models/activities/manage-activities.model';

// Helper function to get current month date range (30 days from month start)
const getCurrentMonthDateRange = () => {
  const today = new Date();
  // Start from the first day of current month
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  // End date is 29 days after month start (30 days total)
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 29); // 30 days total
  
  // Format dates to YYYY-MM-DD without timezone issues
  const formatDateToString = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return {
    startDate: formatDateToString(startDate),
    endDate: formatDateToString(endDate)
  };
};

// Helper function to validate date range (max 30 days)
const validateDateRange = (start: string, end: string): boolean => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 30;
};

// Interface for dynamic field names
interface DynamicFieldNames {
  companyName: string;
  opportunityName: string;
}

// Function to fetch dynamic field names
export const fetchDynamicFieldNames = async (projectId: number): Promise<DynamicFieldNames> => {
  try {
    const result: any = await settingsService.getdynamicFieldNames(projectId);
    let companyName = 'Customer';
    let opportunityName = 'Lead';
    
    if (result.statusCode === 200 && result.responseData) {
      result.responseData.forEach((row: any) => {
        if (row.moduleId === SystemAttributeEnum.COMPANY_MODULE) {
          companyName = row.singularName;
        }
        if (row.moduleId === SystemAttributeEnum.OPPORTUNITY_MODULE) {
          opportunityName = row.singularName;
        }
      });
    }
    
    return { companyName, opportunityName };
  } catch (error) {
    console.error('Error fetching dynamic field names:', error);
    return { companyName: 'Customer', opportunityName: 'Lead' };
  }
};

// Create dynamic column definitions for performed activities
export const createPerformedActivitiesColumnDefs = (companyName: string, opportunityName: string): ColDef[] => [
  {
    headerName: 'Serial No.',
    field: 'serialNo',
    sortable: false,
    filter: true,
    width: 120,
  },
  {
    headerName: 'Activity Name',
    field: 'activityName',
    sortable: false,
    filter: true,
    flex: 2,
  },
  {
    headerName: companyName,
    field: 'company',
    sortable: false,
    filter: true,
    flex: 1.5,
  },
  {
    headerName: opportunityName,
    field: 'opportunity',
    sortable: false,
    filter: true,
    flex: 1.5,
  },
  {
    headerName: 'Performed by',
    field: 'owner',
    sortable: false,
    filter: true,
    flex: 1.5,
  },
  {
    headerName: 'Activity Date-Time',
    field: 'activityDateTime',
    minWidth: 200,
    sortable: false,
    filter: true,
    flex: 1.5,
    valueFormatter: (params) => {
      // Format date-time to AM/PM format
      if (params.value) {
        const date = new Date(params.value);
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
      return '';
    },
  },
  {
    headerName: 'Type',
    field: 'type',
    sortable: false,
    filter: true,
    flex: 1,
    cellRenderer: (params: any) => {
      const isUnplanned = params.data.planId === null || params.data.planId === 0;
      const type = isUnplanned ? 'Unplanned' : 'Planned';
      const badgeClass = isUnplanned
        ? 'inline-block px-3 py-1 rounded-full text-sm font-medium unplanned-status'
        : 'inline-block px-3 py-1 rounded-full text-sm font-medium planned-status';
      return (
        <div className="w-full h-full flex items-center justify-center">
          <span className={badgeClass}>{type}</span>
        </div>
      );
    },
    filterValueGetter: (params) => {
      return (params.data.planId === null || params.data.planId === 0) ? 'Unplanned' : 'Planned';
    },
    valueGetter: (params) => {
      return (params.data.planId === null || params.data.planId === 0) ? 'Unplanned' : 'Planned';
    }
    
  },
];

// Create dynamic column definitions for planned activities
export const createPlannedActivitiesColumnDefs = (companyName: string, opportunityName: string): ColDef[] => [
  {
    headerName: 'Serial No.',
    field: 'serialNo',
    sortable: false,
    filter: true,
    width: 120,
  },
  {
    headerName: 'Activity Name',
    field: 'activityName',
    sortable: false,
    filter: true,
    flex: 2,
  },
  {
    headerName: companyName,
    field: 'company',
    sortable: false,
    filter: true,
    flex: 1.5,
  },
  {
    headerName: opportunityName,
    field: 'opportunity',
    sortable: false,
    filter: true,
    flex: 1.5,
  },
  {
    headerName: 'Owner',
    field: 'owner',
    sortable: false,
    filter: true,
    flex: 1.5,
  },
  {
    headerName: 'Activity Date-Time',
    field: 'activityDateTime',
    minWidth: 300,
    sortable: false,
    filter: true,
    flex: 2,
    cellStyle: { whiteSpace: 'nowrap', textOverflow: 'clip', overflow: 'visible' },
    tooltipField: 'activityDateTime',
    valueFormatter: (params) => {
      // Format date-time to AM/PM format
      if (params.value) {
        return UserLocalizationService.formatToAmPm(params.value);
      }
      return '';
    },
  },
  {
    headerName: 'Status',
    field: 'status',
    sortable: false,
    filter: true,
    flex: 1,
    cellRenderer: (params: any) => {
      const isOverdue = params?.data?.status === 2;
      if (isOverdue) {
        return (
          <div className="w-full h-full flex items-center justify-center">
            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium overdue-status">Overdue</span>
          </div>
        );
      }
      return '';
    },
    filterValueGetter: (params) => {
      return params.data?.status === 2 ? 'Overdue' : '';
    },
    valueGetter: (params) => {
      return params.data?.status === 2 ? 'Overdue' : '';
    }
  },
];

// Default column definition
export const getDefaultColDef = (): ColDef => ({
  resizable: true,
  sortable: false,
  filter: true,
  minWidth: 100,
});

interface ActivitiesContextType {
  pageHeading: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleSearch: () => void;
  setLoading: (loading: boolean) => void;
  setNeedsListRefresh: (refresh: boolean) => void;
  gridDataLoaded: boolean;
  activeTab: 'performed' | 'planned';
  selectedView: "self" | "team" | "all";
  setSelectedView: (view: "self" | "team" | "all") => void;
  handleOpenAddModal: () => void;
  handleOpenFilterModal: () => void;
  hasActiveFilters: boolean;
  activeFiltersCount: number;
  handleClearFilters: () => void;
  performedActivitiesColumnDefs: ColDef[];
  plannedActivitiesColumnDefs: ColDef[];
  defaultColDef: ColDef;
  companyName: string;
  opportunityName: string;
  columnDefsLoaded: boolean;
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  handleDateRangeChange: (start: string, end: string) => void;
  activitiesData: any[];
  fetchActivities: () => void;
  totalCount: number;
  // Load More controls
  handleLoadMore: () => Promise<void>;
  isLoadingMore: boolean;
  currentCount: number;
  // Available activities for selection
  availableActivities: ManageActivitiesModel[];
  availableActivitiesLoaded: boolean;
}

const ActivitiesContext = createContext<ActivitiesContextType | undefined>(undefined);

// Enhanced ActivitiesProvider that manages dynamic field names

export const ActivitiesProvider: React.FC<{
  children: ReactNode;
  value: Omit<ActivitiesContextType, 'companyName' | 'opportunityName' | 'columnDefsLoaded' | 'performedActivitiesColumnDefs' | 'plannedActivitiesColumnDefs' | 'startDate' | 'endDate' | 'setStartDate' | 'setEndDate' | 'handleDateRangeChange' | 'activitiesData' | 'fetchActivities' | 'handleLoadMore' | 'isLoadingMore' | 'currentCount' | 'totalCount' | 'availableActivities' | 'availableActivitiesLoaded'>;
  refreshActivitiesRef?: React.MutableRefObject<(() => void) | null>;
}> 
= ({ children, value, refreshActivitiesRef }) => {
  const [companyName, setCompanyName] = useState<string>('Customer');
  const [opportunityName, setOpportunityName] = useState<string>('Lead');
  const [columnDefsLoaded, setColumnDefsLoaded] = useState<boolean>(false);
  const [activitiesData, setActivitiesData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(0);
  const [pageSize] = useState<number>(10000);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [availableActivities, setAvailableActivities] = useState<ManageActivitiesModel[]>([]);
  const [availableActivitiesLoaded, setAvailableActivitiesLoaded] = useState<boolean>(false);
  const defaultColDef = useMemo(() => getDefaultColDef(), []);
  // Flag to skip the next auto-fetch effect when we've already fetched manually (e.g., on tab change)
  const skipNextFetchRef = useRef(false);
  // Track if initial load has happened to prevent duplicate API calls
  const initialLoadRef = useRef(false);
  // Bump when user clicks Apply in date picker
  const [dateApplyVersion, setDateApplyVersion] = useState<number>(0);
  // Guard: ensure Apply triggers exactly one fetch per version
  const lastHandledDateApplyVersionRef = useRef<number>(0);
  
  // Initialize date range with current month
  const currentMonth = getCurrentMonthDateRange();
  const [startDate, setStartDate] = useState<string>(currentMonth.startDate);
  const [endDate, setEndDate] = useState<string>(currentMonth.endDate);
  
  const projectId = getProjectId() || 0;

  // Map selectedView to activityView (1=self, 2=team, 3=all)
  const activityView = useMemo(() => {
    switch (value.selectedView) {
      case 'self':
        return 1;
      case 'team':
        return 2;
      case 'all':
        return 3;
      default:
        return 1;
    }
  }, [value.selectedView]);


  // Fetch dynamic field names on component mount
  useEffect(() => {
    const loadDynamicFieldNames = async () => {
      try {
        const { companyName: fetchedCompanyName, opportunityName: fetchedOpportunityName } = 
          await fetchDynamicFieldNames(projectId);
        
        setCompanyName(fetchedCompanyName);
        setOpportunityName(fetchedOpportunityName);
        setColumnDefsLoaded(true);
      } catch (error) {
        console.error('Error loading dynamic field names:', error);
        setColumnDefsLoaded(true); // Still set to true to show default columns
      }
    };

    loadDynamicFieldNames();
  }, [projectId]);

  // Fetch available activities on component mount
  useEffect(() => {
    const loadAvailableActivities = async () => {
      if (!projectId) return;
      
      try {
        const response = await activitiesService.getAllActivities(projectId);
        if (response.statusCode === 200) {
          setAvailableActivities(response.responseData.filter(r => r.active === 1));
        }
        setAvailableActivitiesLoaded(true);
      } catch (error) {
        console.error('Error loading available activities:', error);
        setAvailableActivitiesLoaded(true);
      }
    };

    loadAvailableActivities();
  }, [projectId]);

  // Create column definitions based on dynamic field names
  const performedActivitiesColumnDefs = useMemo(() => 
    createPerformedActivitiesColumnDefs(companyName, opportunityName), 
    [companyName, opportunityName]
  );
  
  const plannedActivitiesColumnDefs = useMemo(() => 
    createPlannedActivitiesColumnDefs(companyName, opportunityName), 
    [companyName, opportunityName]
  );

  // Fetch activities from API with specific dates and pagination
  const fetchActivitiesWithDates = async (
    start: string,
    end: string,
    pageSizeArg: number = pageSize,
    pageNo: number = 0,
    append: boolean = false
  ) => {
    // Show global loading spinner for initial loads/refetches (not for load more)
    if (!append) {
      try { value.setLoading(true); } catch {}
    }
    try {
      const response = value.activeTab === 'planned'
        ? await activitiesService.getPlannedUnperformedActivityBasedOnPagination(
            projectId,
            activityView,
            start,
            end,
            pageSizeArg,
            pageNo,
          )
        : await activitiesService.getActivityFilterbasedOnPagination(
            projectId,
            activityView, // activityView - 1=self, 2=team, 3=all
            start,
            end,
            pageSizeArg, // pageSize
            pageNo, // pageNumber
            {} // advanceFilterPayload
          );
      // Expected response shape:
      const payload = (response as any);
      const rows = payload?.responseData?.data ?? [];
      setActivitiesData(prev => {
        const next = Array.isArray(rows) ? rows : [];
        return append ? [...prev, ...next] : next;
      });
      // Set totalCount only on initial fetch (page 0). Do not update on Load More.
      if (pageNo === 0) {
        const apiTotal = payload?.responseData?.totalCount;
        if (typeof apiTotal === 'number') {
          setTotalCount(apiTotal);
        }
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      if (!append) {
        try { value.setLoading(false); } catch {}
      }
    }
  };

  // Date range change handler invoked on Apply from the picker
  const handleDateRangeChange = (start: string, end: string) => {
    // Prevent general effect duplication and let the dedicated Apply effect drive the fetch
    skipNextFetchRef.current = true;
    setStartDate(start);
    setEndDate(end);
    setDateApplyVersion((v) => v + 1);
  };

  // Effect to handle Apply clicks in an organized way: reset page and fetch once
  useEffect(() => {
    if (dateApplyVersion === 0) return; // skip initial mount
    if (!projectId || !startDate || !endDate) return;
    // Guard against accidental double-invocation (e.g., dev/StrictMode, rerenders)
    if (lastHandledDateApplyVersionRef.current === dateApplyVersion) return;
    lastHandledDateApplyVersionRef.current = dateApplyVersion;
    setPageNumber(0);
    fetchActivitiesWithDates(startDate, endDate, pageSize, 0, false);
  }, [dateApplyVersion, projectId, startDate, endDate, pageSize]);

  // Fetch activities from API
  const fetchActivities = async () => {
    setPageNumber(0);
    await fetchActivitiesWithDates(startDate, endDate, pageSize, 0, false);
  };

  // Expose fetchActivities to parent via ref
  useEffect(() => {
    if (refreshActivitiesRef) {
      refreshActivitiesRef.current = fetchActivities;
    }
  }, [refreshActivitiesRef, startDate, endDate]);

  // Load More handler
  const handleLoadMore = async () => {
    // Guard: nothing to do if already fully loaded or busy
    if (isLoadingMore) return;
    const current = activitiesData.length;
    if (totalCount && current >= totalCount) return;
    setIsLoadingMore(true);
    try {
      const nextPage = pageNumber + 1;
      await fetchActivitiesWithDates(startDate, endDate, pageSize, nextPage, true);
      setPageNumber(nextPage);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // On tab change (planned or performed), reset date range to current month and page number
  useEffect(() => {
    if (!initialLoadRef.current) {
      // On first load, mark as loaded and perform initial fetch
      initialLoadRef.current = true;
      const current = getCurrentMonthDateRange();
      setStartDate(current.startDate);
      setEndDate(current.endDate);
      setPageNumber(0);
      if (projectId) {
        fetchActivitiesWithDates(current.startDate, current.endDate, pageSize, 0, false);
      }
      return;
    }
    
    // On subsequent tab changes, reset date range and fetch
    const current = getCurrentMonthDateRange();
    skipNextFetchRef.current = true;
    setStartDate(current.startDate);
    setEndDate(current.endDate);
    setPageNumber(0);
    if (projectId) {
      fetchActivitiesWithDates(current.startDate, current.endDate, pageSize, 0, false);
    }
  }, [value.activeTab]);

  // Track if view change effect has run at least once (to skip initial mount)
  const viewChangeInitialRef = useRef(false);
  
  // On view change (self/team/all), fetch with current date range and page reset
  useEffect(() => {
    // Skip the very first render - the tab change effect handles initial load
    if (!viewChangeInitialRef.current) {
      viewChangeInitialRef.current = true;
      return;
    }
    if (!projectId || !initialLoadRef.current) return; // Skip if not loaded yet
    // Avoid duplicate call from the general fetch effect when activityView updates
    skipNextFetchRef.current = true;
    setPageNumber(0);
    fetchActivitiesWithDates(startDate, endDate, pageSize, 0, false);
  }, [value.selectedView]);

  const contextValue: ActivitiesContextType = {
    ...value,
    companyName,
    opportunityName,
    columnDefsLoaded,
    performedActivitiesColumnDefs,
    plannedActivitiesColumnDefs,
    defaultColDef,
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    handleDateRangeChange,
    activitiesData,
    fetchActivities,
    totalCount,
    handleLoadMore,
    isLoadingMore,
    currentCount: activitiesData.length,
    availableActivities,
    availableActivitiesLoaded,
  };

  return (
    <ActivitiesContext.Provider value={contextValue}>
      {children}
    </ActivitiesContext.Provider>
  );
};

export const useActivities = () => {
  const context = useContext(ActivitiesContext);
  if (!context) {
    throw new Error('useActivities must be used within an ActivitiesProvider');
  }
  return context;
};