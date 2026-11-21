import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import { getProjectId } from '../../lib/storage/sharedStorage';
import { useEntityHeading } from '../../hooks/useEntityHeading';
import UserHeader from '@/components/users/UserHeader';
import { UserProvider } from '@/contexts/UserContext';
import UserDataGrid, { UserGridItem } from '@/components/users/UserDataGrid';
import userManagementService from '@/lib/services/userManagementService';
import UserAddEditForm from '@/components/users/AddEditForm';
import { useSnackbar } from 'notistack';
import UserFilter, { UserFilterRef } from '@/components/users/UserFilter';
import NoRecordsFound from '@/components/common/NoRecordsFound';
import Spinner from '@/components/common/Spinner';

const defaultPageSize = 20;

const Users: NextPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState<UserGridItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [gridDataLoaded, setGridDataLoaded] = useState<boolean>(false);
  const [dynamicColumns, setDynamicColumns] = useState<{ field: string; headerName: string; attributeType?: number }[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | string | null>(null);
  const [editingSerialNo, setEditingSerialNo] = useState<string | null>(null);
  const [needsListRefresh, setNeedsListRefresh] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentPageSize, setCurrentPageSize] = useState(defaultPageSize);
  const [currentCount, setCurrentCount] = useState(0);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  const [currentAdvanceSearchRequest, setCurrentAdvanceSearchRequest] = useState<any[] | null>(null);

  const projectId = getProjectId() || 0;
  const pageHeading = useEntityHeading('Users', 'Users');
  const pageNumber = useRef<number>(1);
  const userFilterRef = useRef<UserFilterRef>(null);

  const transformRow = useCallback((item: any, index: number): UserGridItem => {
    const fullName = item.fullName || `${item.firstName || ''} ${item.lastName || ''}`.trim();
    return {
      ...item,
      id: item.userId || item.id || index,
      serialNo: item.serialNo || item.userSerialNo || `${index + 1}`,
      name: fullName || item.name || 'N/A',
      email: item.workEmail || item.email,
      mobile: item.mobileNumber || item.phone,
      role: item.roleName || item.role,
      status: item.activeStatus === 0 || item.status === 'Inactive' ? 'Inactive' : item.status || 'Active',
      raw: item,
    };
  }, []);

  // Fetch all users without any self/team/all filter, with paging and optional advance search
  const fetchAllUsers = useCallback(async ({ isLoadMore = false, filters, existingCount = 0 }: { isLoadMore?: boolean; filters?: any[] | null; existingCount?: number } = {}) => {
    if (!projectId) return;

    const nextPageNumber = isLoadMore ? pageNumber.current + 1 : 1;
    // Use filters if explicitly passed, otherwise fall back to currentAdvanceSearchRequest
    // If filters is explicitly null, use null (clear filters case)
    const advanceSearch = filters !== undefined ? filters : currentAdvanceSearchRequest;
    // isFirstAdvanceSearch: false when filters are applied, true when no filters (initial load)
    const hasFilters = advanceSearch && Array.isArray(advanceSearch) && advanceSearch.length > 0;
    const isFirstAdvanceSearch = !hasFilters;

    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
      setGridDataLoaded(false);
      setUsers([]);
      setTotalCount(null);
      setCurrentCount(0);
      setCurrentPage(0);
      pageNumber.current = 1;
    }

    try {
      const resp = await userManagementService.getAllUsers(
        projectId,
        nextPageNumber,
        currentPageSize,
        isFirstAdvanceSearch,
        advanceSearch || null,
      );
      const attributeDetails = resp?.responseData?.attributeDetails;
      if (Array.isArray(attributeDetails) && attributeDetails.length > 0) {
        const cols = attributeDetails.map((attr: any, idx: number) => {
          const rawField = attr?.attributeIdentifierName || attr?.attributeName || `col_${idx}`;
          const normalizedField = String(rawField).replace(/\s+/g, '_').replace(/\W+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
          return {
            field: normalizedField || `col_${idx}`,
            headerName: (attr?.attributeName || rawField || `Column ${idx + 1}`).toString().trim(),
            attributeType: attr?.attributeType?.id,
          };
        });
        setDynamicColumns(cols);
      } else {
        setDynamicColumns([]);
      }
      const rawCandidates = [
        resp?.responseData?.data,
        resp?.responseData?.fieldValues,
        resp?.responseData,
      ].find(Array.isArray) || [];

      if (resp?.statusCode === 200 && Array.isArray(rawCandidates)) {
        const baseIndexStart = isLoadMore ? existingCount : 0;
        const firstRow = rawCandidates[0];
        const rows = Array.isArray(firstRow) && !firstRow.find?.((cell: any) => typeof cell === 'object')
          ? (() => {
              // Response is an array of arrays; map columns to usable fields using attributeDetails if available
              const attrCount = Array.isArray(attributeDetails) ? attributeDetails.length : 0;
              const offset = attrCount > 0 ? Math.max(0, firstRow.length - attrCount) : 0;
              const findAttrIndex = (name: string) => {
                if (!Array.isArray(attributeDetails)) return -1;
                const idx = attributeDetails.findIndex(
                  (attr: any) => (attr?.attributeName || '').toString().trim().toLowerCase() === name.toLowerCase(),
                );
                return idx >= 0 ? idx + offset : -1;
              };

              const serialIdx = findAttrIndex('Serial No.') !== -1 ? findAttrIndex('Serial No.') : findAttrIndex('Serial No');
              const nameIdx = findAttrIndex('Name');
              const statusIdx = findAttrIndex('Status');

              return rawCandidates.map((row: any[], idx: number) => {
                const id = row[0] ?? idx;
                const serialNo = serialIdx >= 0 ? row[serialIdx] : row[offset] ?? row[1];
                const fullName = nameIdx >= 0 ? row[nameIdx] : row[offset + 1] ?? '';
                const status = statusIdx >= 0 ? row[statusIdx] : row[row.length - 1];

                const base: any = {
                  id,
                  userSerialNo: serialNo,
                  fullName,
                  status,
                };

                if (Array.isArray(attributeDetails)) {
                  attributeDetails.forEach((attr: any, attrIdx: number) => {
                    const value = row[offset + attrIdx];
                    const fieldKey = (attr?.attributeIdentifierName || attr?.attributeName || `col_${attrIdx}`)
                      .replace(/\s+/g, '_')
                      .replace(/\W+/g, '_')
                      .replace(/_+/g, '_')
                      .replace(/^_|_$/g, '');
                    base[fieldKey] = value;
                    const attrName = (attr?.attributeName || '').toString().trim().toLowerCase();
                    if (attrName === 'name' || attrName === 'full name') {
                      base.fullName = value;
                      base.name = value;
                    }
                    if (attrName.startsWith('serial')) {
                      base.serialNo = value;
                    }
                    if (attrName === 'status') {
                      base.status = value;
                    }
                  });
                }

                return transformRow(base, baseIndexStart + idx);
              });
            })()
          : rawCandidates.map((item: any, idx: number) => transformRow(item, baseIndexStart + idx));

        setUsers(prev => (isLoadMore ? [...prev, ...rows] : rows));
        setCurrentCount(prev => (isLoadMore ? prev + rows.length : rows.length));
        setGridDataLoaded(true);
      } else {
        if (!isLoadMore) setUsers([]);
        setGridDataLoaded(false);
      }

      if (resp?.responseData?.totalCount !== undefined) {
        setTotalCount(resp.responseData.totalCount);
      }
      pageNumber.current = nextPageNumber;

      if (filters && filters.length > 0) {
        setCurrentAdvanceSearchRequest(filters);
        setHasActiveFilters(true);
        setActiveFiltersCount(filters.length);
      } else if (advanceSearch && advanceSearch.length > 0) {
        setHasActiveFilters(true);
        setActiveFiltersCount(advanceSearch.length);
      } else {
        setHasActiveFilters(false);
        setActiveFiltersCount(0);
        setCurrentAdvanceSearchRequest(null);
      }
    } catch (err) {
      if (!isLoadMore) {
        setUsers([]);
        setGridDataLoaded(false);
      }
      enqueueSnackbar('Failed to load users', { variant: 'error' });
    } finally {
      if (isLoadMore) {
        setIsLoadingMore(false);
      } else {
        setLoading(false);
      }
      if (needsListRefresh) setNeedsListRefresh(false);
    }
  }, [projectId, currentPageSize, transformRow, enqueueSnackbar, needsListRefresh, currentAdvanceSearchRequest]);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  useEffect(() => {
    if (needsListRefresh) {
      fetchAllUsers();
    }
  }, [needsListRefresh, fetchAllUsers]);

  const handleLoadMore = () => {
    if (isLoadingMore) return;
    if (totalCount !== null && users.length >= totalCount) return;
    fetchAllUsers({ isLoadMore: true, existingCount: users.length });
  };

  const handleSearch = () => {
    // Quick filter handled inside grid
  };

  const exportUsers = async () => {
    if (!projectId) return;
    try {
      setExporting(true);
      const resp = await userManagementService.exportUsers(projectId, 1, { advanceSearch: null, isFirstAdvSearch: false });
      if (resp && resp.statusCode === 200) {
        enqueueSnackbar(resp.responseData || 'Report generated successfully', { variant: 'success' });
      } else {
        enqueueSnackbar('Report generated successfully', { variant: 'success' });
      }
    } catch (err) {
      enqueueSnackbar('Failed to generate report', { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleOpenAddModal = () => setIsAddModalOpen(true);
  const handleCloseAddModal = () => setIsAddModalOpen(false);

  const handleOpenEditModal = (user: UserGridItem) => {
    setEditingUserId(user?.id ?? null);
    setEditingSerialNo(user?.serialNo ?? null);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUserId(null);
    setEditingSerialNo(null);
  };

  const handleOpenFilterModal = () => setIsFilterModalOpen(true);

  const handleApplyFilters = async (filters: any[] | null) => {
    await fetchAllUsers({ filters: filters && filters.length > 0 ? filters : null });
  };

  const handleClearFilters = async () => {
    setCurrentAdvanceSearchRequest(null);
    setHasActiveFilters(false);
    setActiveFiltersCount(0);
    setIsFilterModalOpen(false);
    userFilterRef.current?.clear();
    await fetchAllUsers({ filters: null });
  };

  return (
    <Layout>
      <Head>
        <title>{pageHeading} | 1Channel</title>
      </Head>
      <UserProvider value={{
        pageHeading,
        searchTerm,
        setSearchTerm,
        handleSearch,
        setLoading,
        setNeedsListRefresh,
        gridDataLoaded,
        exporting,
        exportUsers,
        handleOpenAddModal,
        handleLoadMore,
        isLoadingMore,
        totalCount,
        currentCount,
        currentPage,
        setCurrentPage,
        currentPageSize,
        setCurrentPageSize,
        handleOpenFilterModal,
        hasActiveFilters,
        activeFiltersCount,
        handleClearFilters,
      }}>
        <TailwindPageLayout header={<UserHeader />}> 
          <div className="h-full w-full overflow-auto">
            {loading ? (
              <Spinner customLoadingName="Loading Users.." />
            ) : users.length === 0 ? (
              <NoRecordsFound heading="Users" />
            ) : (
              <UserDataGrid
                users={users}
                loading={loading}
                onUserEdit={handleOpenEditModal}
                searchText={searchTerm}
                totalCount={totalCount}
                currentCount={currentCount}
                handleLoadMore={handleLoadMore}
                isLoadingMore={isLoadingMore}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                currentPageSize={currentPageSize}
                setCurrentPageSize={setCurrentPageSize}
                dynamicColumns={dynamicColumns}
                onGridReady={() => console.log('User grid ready')}
              />
            )}
          </div>
        </TailwindPageLayout>
      </UserProvider>

      <UserAddEditForm
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSuccess={() => {
          setNeedsListRefresh(true);
          fetchAllUsers();
        }}
        isEditing={false}
      />

      <UserAddEditForm
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSuccess={() => {
          setNeedsListRefresh(true);
          fetchAllUsers();
        }}
        userId={editingUserId ?? undefined}
        serialNo={editingSerialNo ?? undefined}
        isEditing={true}
      />

      <UserFilter
        ref={userFilterRef}
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />
    </Layout>
  );
};

export default Users;
