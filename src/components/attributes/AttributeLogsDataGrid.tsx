import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridApi, GridOptions, GridReadyEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import AGGridPagination from '@/components/common/AGGridPagination';
import Spinner from '@/components/common/Spinner';
import { getAttributeFieldValidationLabel } from '@/lib/constants/AttributeFieldValidation.constant';
import type { SettingLog } from '@/lib/models/setting-log';
import apiClient from '@/lib/services/apiClient';
import type { GeneralResponse } from '@/lib/services/entityLogsService';
import styles from './AttributeLogsDataGrid.module.css';
import NoRecordsFound from '../common/NoRecordsFound';

interface AttributeLogsDataGridProps {
  searchTerm?: string;
  projectId: number;
  moduleType: number;
}

type AttributeLogEvent = 'Created' | 'Updated' | 'Deleted';

interface AttributeLogRow {
  id: string;
  fieldType: string;
  fieldName: string;
  fieldValidation: string;
  oldValue: string;
  newValue: string;
  performedBy: string;
  dateTime: string;
  event: AttributeLogEvent;
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const LOGS_ENDPOINT = '/setting/api/settings-logs/getSettingLogs';
const API_PAGE_SIZE = 10000;
const API_PAGE_NUMBER = 1;
const UI_PAGE_SIZE = 20;
const API_IMAGE_URL = (process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL || '').replace(/\/$/, '');
const BOOLEAN_FLAG_FIELDS = new Set(
  [
    'Show Option Preselected',
    'Show In Portal',
    'Add Data List Dependent Fields',
    'OTP Validation',
    'Add Validation',
    'Allow Browsing',
    'Has Unique Values',
    'Allow Previous Form',
    'Mandatory Flag',
    'Show Options Alphabetically',
    'Decimal Flag'
  ].map((label) => label.toLowerCase())
);

const eventBadgeClasses: Record<AttributeLogEvent, { bg: string; text: string }> = {
  Created: { bg: 'bg-blue-50', text: 'text-blue-600' },
  Updated: { bg: 'bg-amber-100', text: 'text-amber-700' },
  Deleted: { bg: 'bg-red-50', text: 'text-red-600' }
};

const AttributeLogsDataGrid: React.FC<AttributeLogsDataGridProps> = ({
  searchTerm,
  projectId,
  moduleType
}) => {
  const [logs, setLogs] = useState<AttributeLogRow[]>([]);
  const gridRef = useRef<AgGridReact<AttributeLogRow>>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [rowData, setRowData] = useState<AttributeLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentPageSize, setCurrentPageSize] = useState(UI_PAGE_SIZE);
  const [valuesModal, setValuesModal] = useState<{
    open: boolean;
    title: string;
    values: string[];
  }>({
    open: false,
    title: '',
    values: []
  });

  const normalizeEvent = useCallback((eventValue: SettingLog['event']): AttributeLogEvent => {
    if (typeof eventValue === 'number') {
      if (eventValue === 0) return 'Deleted';
      if (eventValue === 1) return 'Created';
      return 'Updated';
    }

    const normalized = (eventValue || '').toString().toLowerCase();
    if (normalized === 'created') return 'Created';
    if (normalized === 'deleted') return 'Deleted';
    return 'Updated';
  }, []);

  const mapApiLogToRow = useCallback((log: SettingLog): AttributeLogRow => {
    return {
      id: (log.id ?? log.attributeId ?? `${log.fieldName}-${log.dateTime}`).toString(),
      fieldType: log.fieldType || '-',
      fieldName: log.fieldName || '-',
      fieldValidation: getAttributeFieldValidationLabel(log.fieldValidationType),
      oldValue: log.oldValue || '-',
      newValue: log.newValue || '-',
      performedBy: log.createdBy || log.roleName || '-',
      dateTime: log.dateTime || '-',
      event: normalizeEvent(log.event)
    };
  }, [normalizeEvent]);

  const fetchLogs = useCallback(async () => {
    if (projectId === undefined || projectId === null || moduleType === undefined || moduleType === null) {
      setLogs([]);
      setCurrentPage(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!API_BASE_URL) {
        throw new Error('Missing API base URL');
      }

      const requestUrl = `${API_BASE_URL}${LOGS_ENDPOINT}?projectId=${projectId}&moduleType=${moduleType}&pageSize=${API_PAGE_SIZE}&pageNumber=${API_PAGE_NUMBER}`;

      const response = await apiClient.get<
        GeneralResponse<SettingLog[] | { response: SettingLog[]; totalCount?: number }>
      >(requestUrl);

      if (response.statusCode >= 400) {
        throw new Error(response.message || 'Unable to load logs');
      }

      const payload = response.responseData;
      const rawRows = Array.isArray(payload) ? payload : payload?.response || [];
      const normalizedRows = rawRows.map(mapApiLogToRow);

      setLogs(normalizedRows);
      setCurrentPage(0);
    } catch (apiError) {
      console.error('Failed to fetch attribute logs', apiError);
      setLogs([]);
      setError('Unable to load logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [projectId, moduleType, mapApiLogToRow]);

  useEffect(() => {
    setLogs([]);
    setCurrentPage(0);
    setCurrentPageSize(UI_PAGE_SIZE);
    if (projectId !== undefined && projectId !== null && moduleType !== undefined && moduleType !== null) {
      fetchLogs();
    }
  }, [projectId, moduleType, fetchLogs]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm]);

  const filteredLogs = useMemo(() => {
    const query = (searchTerm || '').toLowerCase();
    if (!query) {
      return logs;
    }

    return logs.filter((log) =>
      Object.values(log).some((value) =>
        (value ?? '').toString().toLowerCase().includes(query)
      )
    );
  }, [searchTerm, logs]);

  useEffect(() => {
    setRowData(filteredLogs);
  }, [filteredLogs]);

  useEffect(() => {
    if (!gridApi) return;
    gridApi.setQuickFilter((searchTerm || '').toLowerCase());
    gridApi.paginationGoToFirstPage();
    setCurrentPage(0);
  }, [searchTerm, gridApi]);

  useEffect(() => {
    if (!gridApi) return;
    gridApi.paginationSetPageSize(currentPageSize);
    gridApi.paginationGoToFirstPage();
  }, [currentPageSize, gridApi]);

  useEffect(() => {
    if (!gridApi) return;
    if (loading) {
      gridApi.hideOverlay();
      return;
    }
    if (!rowData.length) {
      gridApi.showNoRowsOverlay();
    } else {
      gridApi.hideOverlay();
      gridApi.sizeColumnsToFit();
    }
  }, [loading, rowData, gridApi]);

  useEffect(() => {
    const handleResize = () => {
      if (gridApi) {
        gridApi.sizeColumnsToFit();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [gridApi]);

  useEffect(() => {
    if (!gridApi) return;
    const filteredCount = rowData.length;
    const maxPageIndex = Math.max(0, Math.ceil(filteredCount / currentPageSize) - 1);
    const safePage = Math.min(currentPage, maxPageIndex);
    if (safePage !== currentPage) {
      setCurrentPage(safePage);
      gridApi.paginationGoToPage(safePage);
    }
  }, [rowData, currentPageSize, currentPage, gridApi]);

  const renderTextCell = useCallback((params: { value: string }) => {
    const value = params.value || '-';
    return (
      <div className="flex h-full items-center justify-center overflow-hidden">
        <span className="inline-flex max-w-full truncate text-center text-sm text-gray-800" title={value}>
          {value}
        </span>
      </div>
    );
  }, []);

  const handleOpenValuesModal = useCallback(
    (fieldName: string, columnLabel: 'Old Value' | 'New Value', rawValue: string) => {
      const values =
        rawValue
          ?.split(/[\n,]/)
          ?.map((val) => val.trim())
          ?.filter((val) => val) || [];

      setValuesModal({
        open: true,
        title: fieldName || 'Values',
        values
      });
    },
    []
  );

  const formatBooleanFlagValue = useCallback((fieldName: string | undefined, rawValue: string): string => {
    if (!fieldName) {
      return rawValue;
    }
    const normalizedField = fieldName.trim().toLowerCase();
    if (!BOOLEAN_FLAG_FIELDS.has(normalizedField)) {
      return rawValue;
    }
    const trimmedValue = rawValue.trim();
    if (trimmedValue === '0') {
      return 'Disabled';
    }
    if (trimmedValue === '1') {
      return 'Enabled';
    }
    return rawValue;
  }, []);

const renderValueCell = useCallback(
  (params: any, columnLabel: 'Old Value' | 'New Value') => {
    const rawValue = params.value || '-';
    const fieldType = params?.data?.fieldValidation || '';
    const formattedValue = formatBooleanFlagValue(fieldType, rawValue);

    const isSelectField = fieldType.includes('Lookup Values');
    const isReferenceDocument = fieldType.includes('Reference Document URL');

    let content;

    if (isSelectField && rawValue !== '-') {
      content = (
        <button
          type="button"
          className={`${styles.valuesButton} bg-transparent text-sm font-semibold focus-visible:outline-none focus-visible:ring-0`}
          onClick={(e) => {
            e.preventDefault();
            handleOpenValuesModal(
              params?.data?.fieldName || 'Values',
              columnLabel,
              rawValue
            );
          }}
        >
          Values Updated
        </button>
      );
    } else if (isReferenceDocument && rawValue !== '-') {
      content = (
        <button
          type="button"
          className={`${styles.valuesButton} bg-transparent text-sm font-semibold focus-visible:outline-none focus-visible:ring-0`}
          onClick={(e) => {
            e.preventDefault();
            window.open(API_IMAGE_URL +"/" + rawValue, '_blank');
          }}
        >
          View
        </button>
      );
    } else {
      content = (
        <span
          className="inline-flex max-w-full truncate text-center text-sm text-gray-800"
          title={formattedValue}
        >
          {formattedValue}
        </span>
      );
    }

    return (
      <div className="flex h-full w-full items-center justify-center">
        {content}
      </div>
    );
  },
  [handleOpenValuesModal, formatBooleanFlagValue]
);

  const renderEventCell = useCallback((params: { value: AttributeLogEvent }) => {
    const value = params.value || 'Updated';
    const styling = eventBadgeClasses[value] || eventBadgeClasses.Updated;
    return (
      <div className="flex h-full items-center justify-center">
        <span
          className={`inline-flex max-w-full items-center justify-center rounded-full px-4 py-1 text-sm font-semibold ${styling.bg} ${styling.text} whitespace-nowrap shadow-sm`}
          title={value}
        >
          {value}
        </span>
      </div>
    );
  }, []);

  const columnDefs = useMemo<ColDef<AttributeLogRow>[]>(() => {
    return [
      {
        headerName: 'Field Type',
        field: 'fieldType',
        flex: 1,
        minWidth: 140,
        sortable: true,
        cellRenderer: renderTextCell
      },
      {
        headerName: 'Field Name',
        field: 'fieldName',
        flex: 1,
        minWidth: 140,
        sortable: true,
        cellRenderer: renderTextCell
      },
      {
        headerName: 'Field Validation',
        field: 'fieldValidation',
        flex: 1,
        minWidth: 140,
        sortable: true,
        cellRenderer: renderTextCell
      },
      {
        headerName: 'Old Value',
        field: 'oldValue',
        flex: 1,
        minWidth: 140,
        sortable: true,
        cellRenderer: (params: any) => renderValueCell(params, 'Old Value')
      },
      {
        headerName: 'New Value',
        field: 'newValue',
        flex: 1,
        minWidth: 140,
        sortable: true,
        cellRenderer: (params: any) => renderValueCell(params, 'New Value')
      },
      {
        headerName: 'Performed By',
        field: 'performedBy',
        flex: 1,
        minWidth: 150,
        sortable: true,
        cellRenderer: renderTextCell
      },
      {
        headerName: 'Date-Time',
        field: 'dateTime',
        flex: 1,
        minWidth: 150,
        sortable: true,
        cellRenderer: renderTextCell
      },
      {
        headerName: 'Event',
        field: 'event',
        width: 140,
        minWidth: 120,
        suppressSizeToFit: true,
        cellRenderer: renderEventCell,
        sortable: true,
        filter: true
      }
    ];
  }, [renderTextCell, renderEventCell, renderValueCell]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    minWidth: 130,
    floatingFilter: false,
    suppressMenu: false,
    menuTabs: ['filterMenuTab', 'generalMenuTab', 'columnsMenuTab'],
    suppressMovable: true,
    cellClass: 'text-sm text-gray-800'
  }), []);

  const gridOptions = useMemo<GridOptions<AttributeLogRow>>(() => ({
    pagination: true,
    paginationPageSize: currentPageSize,
    paginationPageSizeSelector: [20, 50, 100, 500],
    suppressPaginationPanel: true,
    animateRows: true,
    domLayout: 'normal',
    rowHeight: 48,
    headerHeight: 48,
    suppressColumnVirtualisation: false,
    onGridSizeChanged: (params) => {
      params.api.sizeColumnsToFit();
    },
    onPaginationChanged: (event) => {
      if (!event.api) {
        return;
      }
      const newPage = event.api.paginationGetCurrentPage();
      if (newPage !== currentPage) {
        setCurrentPage(newPage);
      }
    }
  }), [currentPageSize, currentPage]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    params.api.setRowData(rowData);
    params.api.paginationSetPageSize(currentPageSize);
    params.api.paginationGoToPage(currentPage);
    setTimeout(() => {
      params.api.sizeColumnsToFit();
    }, 100);
  }, [rowData, currentPageSize, currentPage]);

  const noRowsOverlayComponent = useMemo(() => {
    return () => (
      <div className="ag-overlay-no-rows-center flex flex-col items-center justify-center p-4 text-center text-sm text-gray-500">
        {searchTerm ? 'No logs matched your search.' : 'No logs available yet.'}
      </div>
    );
  }, [searchTerm]);

  if (loading) {
    return <Spinner />;
  }

  if (logs.length === 0) {
    return <NoRecordsFound heading="Logs" />;
  }

  return (
    <div className="flex w-full flex-col grid-height-190">
      <div className={`flex-1 w-full ag-theme-alpine`}>
        <div className="relative h-full w-full">
          <AgGridReact<AttributeLogRow>
            ref={gridRef}
            gridOptions={gridOptions}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            onGridReady={onGridReady}
            className={`${styles.attributeLogsGrid} h-full w-full`}
            enableCellTextSelection={false}
            noRowsOverlayComponent={noRowsOverlayComponent}
            suppressDragLeaveHidesColumns={true}
            suppressRowClickSelection={true}
          />
        </div>

          <AGGridPagination
            gridApi={gridApi}
            totalItems={rowData.length}
            currentPage={currentPage}
            currentPageSize={currentPageSize}
            setCurrentPage={setCurrentPage}
            setCurrentPageSize={setCurrentPageSize}
            pageSizeOptions={[20, 50, 100, 500]}
          />
      </div>

      {valuesModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <p className="text-base font-semibold text-gray-900">{valuesModal.title}</p>
              </div>
              <button
                type="button"
                className="text-gray-400 transition hover:text-gray-600"
                onClick={() => setValuesModal((prev) => ({ ...prev, open: false }))}
                aria-label="Close"
              >
                <img
                  src="/svg/icons/general/dismiss-circle.svg"
                  alt="Close modal"
                  className="h-6 w-6"
                />
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-4">
                <div className="text-sm font-medium text-gray-600">Options</div>
                <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
                  {valuesModal.values.length ? (
                    <ul>
                      {valuesModal.values.map((val, index) => (
                        <li
                          key={`${val}-${index}`}
                          className="border-b border-gray-200 px-4 py-2 text-sm text-gray-800 last:border-b-0"
                        >
                          {val}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-8 text-center text-sm text-gray-500">No values available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttributeLogsDataGrid;
