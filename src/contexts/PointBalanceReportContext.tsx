import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ColDef } from 'ag-grid-community';
import { useSnackbar } from 'notistack';
import pointsBalanceReportService from '@/lib/services/point-balance-report.service';
import { getProjectId, getUserData } from '@/lib/storage/sharedStorage';

interface PointBalanceReportContextType {
  pageHeading: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleSearch: () => void;
  startDate: string;
  endDate: string;
  handleDateRangeChange: (startDate: string, endDate: string) => void;
  reportData: any[];
  loading: boolean;
  gridDataLoaded: boolean;
  columnDefs: ColDef[];
  defaultColDef: ColDef;
  totalCount: number;
  handleLoadMore: () => void;
  isLoadingMore: boolean;
  exportData: () => Promise<void>;
  exporting: boolean;
  gridApi: any;
  setGridApi: (api: any) => void;
}

const PointBalanceReportContext = createContext<PointBalanceReportContextType | undefined>(undefined);

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

export const PointBalanceReportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { enqueueSnackbar } = useSnackbar();

  const [pageHeading] = useState('Point Balance Report');
  const [searchTerm, setSearchTerm] = useState('');
  const [{ startDate, endDate }, setDateRange] = useState(getCurrentMonthDateRange());
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [gridDataLoaded, setGridDataLoaded] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [gridApi, setGridApi] = useState<any>(null);
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);

  const pageSize = 10000;

  const resolveProjectId = useCallback((): number | null => {
    const rawProjectId = getProjectId();

    const normalise = (value: unknown): number | null => {
      if (value == null) return null;
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
      }
      if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : parsed;
      }
      if (typeof value === 'object') {
        const candidate = (value as Record<string, unknown>).projectId ??
          (value as Record<string, unknown>).id ??
          (value as Record<string, unknown>).value;
        return normalise(candidate);
      }
      return null;
    };

    const resolved = normalise(rawProjectId);
    if (resolved !== null) return resolved;

    if (typeof window !== 'undefined') {
      const fallback = window.localStorage.getItem('selectedProject') ??
        window.sessionStorage.getItem('selectedProject');
      if (fallback) {
        try {
          return normalise(JSON.parse(fallback));
        } catch {
          return normalise(fallback);
        }
      }
    }

    return null;
  }, []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    filter: true,
    flex: 1,
    minWidth: 150,
  }), []);

  const handleSearch = useCallback(() => {
    console.log('Searching for:', searchTerm);
  }, [searchTerm]);

  const fetchReportData = useCallback(
    async () => {
      const projectId = resolveProjectId();

      if (!projectId) {
        setReportData([]);
        setTotalCount(0);
        setLoading(false);
        setGridDataLoaded(true);
        enqueueSnackbar('Select a project to view the Point Balance Report.', {
          variant: 'warning',
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          autoHideDuration: 3000,
        });
        return;
      }

      try {
        setLoading(true);
        setGridDataLoaded(false);

        console.log('Fetching point balance report', { projectId });

        const response = await pointsBalanceReportService.getPointsBalanceReport(
          projectId
        );

        const responseData = (response as any)?.responseData;
        const newData = responseData?.data ?? [];

        setTotalCount(responseData?.totalCount ?? newData.length ?? 0);
        setReportData(newData);
      } catch (error) {
        console.error('Error fetching point balance report data:', error);
        setReportData([]);
        setTotalCount(0);
        enqueueSnackbar('Failed to load point balance report data.', {
          variant: 'error',
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          autoHideDuration: 3000,
        });
      } finally {
        setLoading(false);
        setGridDataLoaded(true);
      }
    },
    [enqueueSnackbar, resolveProjectId]
  );

  const handleDateRangeChange = useCallback((_newStart: string, _newEnd: string) => {
    // Date range is no longer used for this report
  }, []);

  const handleLoadMore = useCallback(() => {
    // Pagination is no longer used for this report
  }, []);

  const exportData = useCallback(async () => {
    const projectId = resolveProjectId();
    const userData = getUserData();

    if (!projectId) {
      enqueueSnackbar('Project selection required to export report', {
        variant: 'warning',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 3000,
      });
      return;
    }

    try {
      setExporting(true);

      const payload = {
        projectId,
        reportId: -10,
        moduleType: '',
        reportType: '',
        performedBy: userData?.id ? `${userData.id}` : '',
      };

      const response = await pointsBalanceReportService.generateReport(payload);

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
      console.error('Error exporting point balance report:', error);
      enqueueSnackbar('Failed to generate report', {
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 3000,
      });
    } finally {
      setExporting(false);
    }
  }, [enqueueSnackbar, resolveProjectId]);

  const initializeColumnDefs = useCallback(() => {
    const columns: ColDef[] = [
      {
        headerName: 'Serial Key',
        field: 'serialNo',
        menuTabs: ['filterMenuTab'],
        tooltipField: 'serialNo',
        filter: false,
        sortable: false,
      },
      {
        headerName: 'Name',
        field: 'entityName',
        menuTabs: ['filterMenuTab'],
      },
      {
        headerName: 'Mobile Number',
        field: 'entityMobileNumber',
        menuTabs: ['filterMenuTab'],
      },
      {
        headerName: 'E-mail ID',
        field: 'entityEmail',
        menuTabs: ['filterMenuTab'],
      },
      {
        headerName: 'Points Earned',
        field: 'totalPointsEarned',
        menuTabs: ['filterMenuTab'],
        filter: 'agNumberColumnFilter',
      },
      {
        headerName: 'Points Redeemed',
        field: 'totalPointsRedeemed',
        menuTabs: ['filterMenuTab'],
        filter: 'agNumberColumnFilter',
      },
      {
        headerName: 'Points Balance',
        field: 'currentPointsBalance',
        menuTabs: ['filterMenuTab'],
        filter: 'agNumberColumnFilter',
      },
      {
        headerName: 'Owner Serial Key',
        field: 'entityOwnerSerialNo',
        menuTabs: ['filterMenuTab'],
        tooltipField: 'entityOwnerSerialNo',
        filter: false,
        sortable: false,
      },
      {
        headerName: 'Owner Name',
        field: 'entityOwnerName',
        menuTabs: ['filterMenuTab'],
      },
      {
        headerName: 'L1 Reporting Head',
        field: 'ownerReportingHeadName',
        menuTabs: ['filterMenuTab'],
      },
    ];

    setColumnDefs(columns);
  }, []);

  useEffect(() => {
    initializeColumnDefs();
  }, [initializeColumnDefs]);

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: PointBalanceReportContextType = {
    pageHeading,
    searchTerm,
    setSearchTerm,
    handleSearch,
    startDate,
    endDate,
    handleDateRangeChange,
    reportData,
    loading,
    gridDataLoaded,
    columnDefs,
    defaultColDef,
    totalCount,
    handleLoadMore,
    isLoadingMore,
    exportData,
    exporting,
    gridApi,
    setGridApi,
  };

  return (
    <PointBalanceReportContext.Provider value={value}>
      {children}
    </PointBalanceReportContext.Provider>
  );
};

export const usePointBalanceReport = () => {
  const context = useContext(PointBalanceReportContext);
  if (!context) {
    throw new Error('usePointBalanceReport must be used within PointBalanceReportProvider');
  }
  return context;
};
