import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import DailyActivityReportHeader from '@/components/daily-activity-report/DailyActivityReportHeader';
import DailyActivityReportComponent from '@/components/daily-activity-report/DailyActivityReportComponent';
import dailyActivityReportService from '@/lib/services/daily-actitvity-report.service';
import settingsService from '@/lib/services/settingsService';
import { getProjectId } from '@/lib/storage/sharedStorage';
import type { ColDef, GridApi } from 'ag-grid-community';
import ApprovalActionModal from '@/components/common/modals/ApprovalActionModal';
import { useSnackbar } from 'notistack';

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

const DailyActivityReportPage: NextPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [pageHeading] = useState('Daily Activity Report');
  const [searchTerm, setSearchTerm] = useState('');
  const [{ startDate, endDate }, setDateRange] = useState(getCurrentMonthDateRange());
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [gridDataLoaded, setGridDataLoaded] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [exporting, setExporting] = useState(false);
  const [companyName, setCompanyName] = useState('Company');
  const [opportunityName, setOpportunityName] = useState('Opportunity');
  const [contactName, setContactName] = useState('Contact');
  const [columnDefs, setColumnDefs] = useState<ColDef[]>([]);
  const [selectedRow, setSelectedRow] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const pageSize = 10000;

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    resizable: true,
    filter: true,
    flex: 1,
    minWidth: 150,
  }), []);

  useEffect(() => {
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
          headerName: 'Performed By Serial Key',
          field: 'userSerialNo',
          menuTabs: ['filterMenuTab'],
          tooltipField: 'userSerialNo',
        },
        {
          headerName: 'Performed By Name',
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
              setSelectedRow(params.data);
              setIsModalOpen(true);
            }
          },
        },
      ];

      setColumnDefs(columns);
    };

    buildColumns();
  }, [companyName, opportunityName, contactName]);

  const fetchReportData = useCallback(
    async (dateStart: string, dateEnd: string, page: number, isLoadMore = false) => {
      const projectId = getProjectId();

      if (!projectId) {
        console.warn('Project ID not available. Skipping daily activity report fetch.');
        setReportData([]);
        setTotalCount(0);
        setLoading(false);
        setIsLoadingMore(false);
        setGridDataLoaded(true);
        return;
      }

      try {
        if (!isLoadMore) {
          setLoading(true);
          setGridDataLoaded(false);
        } else {
          setIsLoadingMore(true);
        }

        const response = await dailyActivityReportService.getDailyActivityReport(
          projectId,
          dateStart,
          dateEnd,
          pageSize,
          page
        );

        const responseData = (response as any)?.responseData;
        const newData = responseData?.data ?? [];

        if (page === 0) {
          setTotalCount(responseData?.totalCount ?? newData.length ?? 0);
        }

        setReportData((prev) => (isLoadMore ? [...prev, ...newData] : newData));
        setPageNumber(page + 1);
      } catch (error) {
        console.error('Error fetching daily activity report data:', error);
        if (!isLoadMore) {
          setReportData([]);
          setTotalCount(0);
        }
      } finally {
        if (!isLoadMore) {
          setLoading(false);
          setGridDataLoaded(true);
        } else {
          setIsLoadingMore(false);
        }
      }
    },
    [pageSize]
  );

  useEffect(() => {
    fetchReportData(startDate, endDate, 0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const projectId = getProjectId();
    if (!projectId) {
      return;
    }

    const resolveDynamicNames = async () => {
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
        console.error('Error fetching dynamic field names for daily activity report:', error);
      }
    };

    resolveDynamicNames();
  }, []);

  const handleDateRangeChange = useCallback((newStart: string, newEnd: string) => {
    setDateRange({ startDate: newStart, endDate: newEnd });
    setPageNumber(0);
    fetchReportData(newStart, newEnd, 0, false);
  }, [fetchReportData]);

  const handleLoadMore = useCallback(() => {
    if (reportData.length < totalCount && !isLoadingMore) {
      fetchReportData(startDate, endDate, pageNumber, true);
    }
  }, [reportData.length, totalCount, isLoadingMore, fetchReportData, startDate, endDate, pageNumber]);

  const handleSearch = useCallback(() => {
    // Quick filter handled via AG Grid API in the data grid component.
  }, []);

  const exportData = useCallback(async () => {
    const projectId = getProjectId();
    const normalizedProjectId = typeof projectId === 'string' ? Number(projectId) : projectId;

    if (!normalizedProjectId || Number.isNaN(normalizedProjectId)) {
      enqueueSnackbar('Project selection required to export report', {
        variant: 'warning',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 3000,
      });
      return;
    }

    setExporting(true);

    try {
      const payload = {
        projectId: normalizedProjectId,
        reportId: -2,
        startDate,
        endDate,
        moduleType: '',
        reportType: '',
        performedBy: '',
      };

      const response:any = await dailyActivityReportService.generateReport(payload);

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
      console.error('Error exporting daily activity report:', error);
      enqueueSnackbar('Failed to generate report', {
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 3000,
      });
    } finally {
      setExporting(false);
    }
  }, [enqueueSnackbar, endDate, startDate]);

  return (
    <Layout>
      <Head>
        <title>Daily Activity Report | 1Channel</title>
      </Head>

      <TailwindPageLayout
        header={
          <DailyActivityReportHeader
            pageHeading={pageHeading}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            handleSearch={handleSearch}
            startDate={startDate}
            endDate={endDate}
            handleDateRangeChange={handleDateRangeChange}
            exportData={exportData}
            exporting={exporting}
          />
        }
      >
        <div className="flex flex-col h-full">
          <DailyActivityReportComponent
            reportData={reportData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            totalCount={totalCount}
            handleLoadMore={handleLoadMore}
            isLoadingMore={isLoadingMore}
            searchTerm={searchTerm}
            setGridApi={setGridApi}
            loading={loading}
            gridDataLoaded={gridDataLoaded}
            onViewDetails={(row) => {
              setSelectedRow(row);
              setIsModalOpen(true);
            }}
          />
        </div>
      </TailwindPageLayout>

      <ApprovalActionModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </Layout>
  );
};

export default DailyActivityReportPage;
