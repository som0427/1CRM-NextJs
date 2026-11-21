import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { ColDef } from 'ag-grid-community';
import { useSnackbar } from 'notistack';
import detailedPointsReportService from '@/lib/services/detailed-points-report.service';
import { getProjectId, getUserData } from '@/lib/storage/sharedStorage';
import settingsService from '@/lib/services/settingsService';

interface DetailedPointsReportContextType {
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
  defaultColDef: any;
  totalCount: number;
  handleLoadMore: () => void;
  isLoadingMore: boolean;
  exportData: () => void;
  exporting: boolean;
  gridApi: any;
  setGridApi: (api: any) => void;
}

const DetailedPointsReportContext = createContext<DetailedPointsReportContextType | undefined>(undefined);

const getCurrentMonthDateRange = () => {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = new Date(today); // End date is today
  
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

export const DetailedPointsReportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [pageHeading] = useState('Detailed Points Report');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(getCurrentMonthDateRange().startDate);
  const [endDate, setEndDate] = useState(getCurrentMonthDateRange().endDate);
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

  const defaultColDef = {
    sortable: true,
    resizable: true,
    filter: true,
    flex: 1,
    minWidth: 150,
  };

  const handleSearch = useCallback(() => {
    console.log('Searching for:', searchTerm);
  }, [searchTerm]);

  const handleDateRangeChange = useCallback((newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setPageNumber(0);
    fetchReportData(newStartDate, newEndDate, 0, false);
  }, []);

  const fetchReportData = useCallback(async (
    dateStart: string, 
    dateEnd: string, 
    page: number, 
    isLoadMore: boolean = false
  ) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
        setGridDataLoaded(false);
      } else {
        setIsLoadingMore(true);
      }

      const projectId = getProjectId();
      const response = await detailedPointsReportService.getDetailedPointsReport(
        projectId,
        dateStart,
        dateEnd,
        pageSize,
        page
      );

      const responseData = (response as any)?.responseData;
      
      if (responseData && responseData.data) {
        const newData = responseData.data || [];

        if(pageNumber==0){
          setTotalCount(responseData.totalCount || 0);
        }


        if (isLoadMore) {
          setReportData(prev => [...prev, ...newData]);
        } else {
          setReportData(newData);
        }
        
        setPageNumber(page + 1);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      if (!isLoadMore) {
        setReportData([]);
      }
    } finally {
      setLoading(false);
      setGridDataLoaded(true);
      setIsLoadingMore(false);
    }
  }, []);

  const handleLoadMore = useCallback(() => {
    if (reportData.length < totalCount && !isLoadingMore) {
      fetchReportData(startDate, endDate, pageNumber, true);
    }
  }, [reportData.length, totalCount, isLoadingMore, startDate, endDate, pageNumber]);

  const exportData = useCallback(async () => {
    const projectId = getProjectId();
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
        startDate,
        endDate,
        reportId: -11,
        moduleType: '',
        reportType: '',
        performedBy: userData?.id ? `${userData.id}` : '',
      };

      const response = await detailedPointsReportService.generateReport(payload);

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
      console.error('Error exporting detailed points report:', error);
      enqueueSnackbar('Failed to generate report', {
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 3000,
      });
    } finally {
      setExporting(false);
    }
  }, [enqueueSnackbar, endDate, startDate]);

  const getColumnDefForDetailedPointsReport = useCallback(() => {
    try {      

      const columns: ColDef[] = [
        {
          headerName: 'Serial Key',
          field: 'serialNo',
          filter: false,
          sortable: false,
          width: 120,
        },
        {
          headerName: 'Name',
          field: 'entityName',
          filter: true,
        },
        {
          headerName: 'Entity',
          field: 'entityType',
          filter: true,
        },
        {
          headerName: 'Activity Serial Key',
          field: 'activitySerialNo',
          filter: false,
          sortable: false,
          width: 150,
        },
        {
          headerName: 'Activity',
          field: 'activityName',
          filter: true,
        },
        {
          headerName: 'Activity Date',
          field: 'activityDate',
          filter: 'agDateColumnFilter',
          valueFormatter: (params) => {
            if (params.value) {
              const date = new Date(params.value);
              return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
            }
            return '';
          },
        },
        {
          headerName: 'Points Category',
          field: 'pointsCategory',
          filter: true,
        },
        {
          headerName: 'Points',
          field: 'points',
          filter: 'agNumberColumnFilter',
        },
        {
          headerName: 'Points Allocation Date',
          field: 'pointsAllocationDate',
          filter: 'agDateColumnFilter',
          valueFormatter: (params) => {
            if (params.value) {
              const date = new Date(params.value);
              return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
            }
            return '';
          },
        },
        {
          headerName: 'Expiry Date',
          field: 'expiryDate',
          filter: 'agDateColumnFilter',
          valueFormatter: (params) => {
            if (params.value) {
              const date = new Date(params.value);
              return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
            }
            return '';
          },
        },
        {
          headerName: 'Expired On',
          field: 'expiredOnDate',
          filter: 'agDateColumnFilter',
          valueFormatter: (params) => {
            if (params.value) {
              const date = new Date(params.value);
              return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
            }
            return '';
          },
        },
        {
          headerName: 'Balance Points',
          field: 'balancePoints',
          filter: 'agNumberColumnFilter',
        },
        {
          headerName: 'Remarks',
          field: 'remarks',
          filter: true,
        },
      ];

      setColumnDefs(columns);
    } catch (error) {
      console.error('Error fetching dynamic field names:', error);
    }
  }, []);

  useEffect(() => {
    getColumnDefForDetailedPointsReport();
    fetchReportData(startDate, endDate, 0, false);
  }, []);

  const value: DetailedPointsReportContextType = {
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
    <DetailedPointsReportContext.Provider value={value}>
      {children}
    </DetailedPointsReportContext.Provider>
  );
};

export const useDetailedPointsReport = () => {
  const context = useContext(DetailedPointsReportContext);
  if (!context) {
    throw new Error('useDetailedPointsReport must be used within DetailedPointsReportProvider');
  }
  return context;
};