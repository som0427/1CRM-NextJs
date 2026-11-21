import React, { useState, useEffect, useCallback } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import userRoleService from '@/lib/services/userRoleService';
import { UserRoleData } from '../../lib/models/user-role.model';
import UserRoleDataGrid from '../../components/user-role/UserRoleDataGrid';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import { getProjectId } from '../../lib/storage/sharedStorage';
import { useEntityHeading } from '../../hooks/useEntityHeading';
import UserRoleHeader from '../../components/user-role/UserRoleHeader';
import { UserRoleProvider } from '../../contexts/UserRoleContext';
import AddUserRoleModal from '../../components/user-role/AddEditRole/AddUserRoleModal';
import EditUserRoleModal from '../../components/user-role/EditUserRoleModal/EditUserRoleModal';
import { UserRoleFormWithMenus } from '../../lib/models/menu.model';

const UserRoles: NextPage = () => {
  // State for API data
  const [userRoleListData, setUserRoleListData] = useState<UserRoleData[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [gridDataLoaded, setGridDataLoaded] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [needsListRefresh, setNeedsListRefresh] = useState<boolean>(false);
  const [selectedView, setSelectedView] = useState<"self" | "team" | "all">("self");

  // State for modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUserRole, setEditingUserRole] = useState<UserRoleData | null>(null);

  // Get Project ID from sharedStorage
  const projectId = getProjectId();
  
  // Get entity-specific page heading
  const pageHeading = useEntityHeading('User Roles', 'User Roles');

  // Reference to the grid API
  const [gridApi, setGridApi] = useState<any>(null);
  // const { enqueueSnackbar } = useSnackbar();
  
  // Refit columns when modals open/close (container size/scrollbar may change)
  useEffect(() => {
    if (!gridApi) return;
    const t = setTimeout(() => {
      try {
        gridApi.sizeColumnsToFit();
      } catch {}
    }, 100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddModalOpen, isEditModalOpen, gridApi]);
  
  // Function to fetch user roles from API
  const fetchUserRolesData = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!projectId) {
        setLoading(false);
        return;
      }

      const response = await userRoleService.getUserRoles(projectId);
      console.log('User Roles API Response:', response);

      if (response && response.statusCode === 200 && Array.isArray(response.responseData)) {
        setUserRoleListData(response.responseData);
        setGridDataLoaded(true);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Error fetching user roles:', err);
      console.error('Failed to load user roles');
      setUserRoleListData([]);
      setGridDataLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load user roles on mount
  useEffect(() => {
    fetchUserRolesData();
  }, [fetchUserRolesData]);
  
  // Monitor needsListRefresh state to trigger data refresh when needed
  useEffect(() => {
    if (needsListRefresh) {
      fetchUserRolesData();
      setNeedsListRefresh(false);
    }
  }, [needsListRefresh, fetchUserRolesData]);
  
  // For handling search
  const handleSearch = () => {
    if (gridApi) {
      gridApi.setQuickFilter(searchTerm);
    }
  };

  // Handle user role actions
  const handleEditUserRole = (userRole: UserRoleData) => {
    console.log('Edit user role:', userRole.roleId);
    setEditingUserRole(userRole);
    setIsEditModalOpen(true);
  };

  // Handle add user role
  const handleAddUserRole = async (roleData: UserRoleFormWithMenus) => {
    try {
      setLoading(true);
      // Convert form data to API format
      const apiData = {
        roleName: roleData.roleName,
        active: roleData.active ? 1 : 0,
        webSelectedMenus: roleData.selectedMenus.webPortal,
        mobileSelectedMenus: roleData.selectedMenus.mobileApp,
        reportBuilderMenus: roleData.selectedMenus.reportBuilder
      };
      
      await userRoleService.addUserRole(projectId, apiData);
      console.log('User role added successfully');
      setIsAddModalOpen(false);
      fetchUserRolesData();
    } catch (error) {
      console.error('Error adding user role:', error);
      console.error('Failed to add user role');
    } finally {
      setLoading(false);
    }
  };

  const handleModalSuccess = () => {
    // Trigger a single refresh via the needsListRefresh effect
    setNeedsListRefresh(true);
  };
  
  return (
    <Layout>
      <Head>
        <title>User Roles | 1Channel</title>
      </Head>

      <UserRoleProvider value={{
        pageHeading,
        searchTerm,
        setSearchTerm,
        handleSearch,
        setLoading,
        setNeedsListRefresh,
        gridDataLoaded,
        handleOpenAddModal: () => setIsAddModalOpen(true),
      }}>
        <TailwindPageLayout header={<UserRoleHeader />}>
          <div className="h-full w-full overflow-auto">
            {loading ? (
              <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : userRoleListData.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-500 mb-4">No {pageHeading} found</div>
                <p className="text-gray-400">Try adding a new {pageHeading}</p>
              </div>
            ) : (
              <UserRoleDataGrid
                userRoles={userRoleListData}
                loading={loading}
                onUserRoleEdit={handleEditUserRole}
                searchText={searchTerm}
                onGridReady={(api) => {
                  setGridApi(api);
                  console.log('User role grid ready');
                }}
              />
            )}
          </div>
        </TailwindPageLayout>
      </UserRoleProvider>

      {/* Add User Role Modal */}
      <AddUserRoleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      {/* Edit User Role Modal */}
      {editingUserRole && (
        <EditUserRoleModal
          isOpen={isEditModalOpen}
          roleId={editingUserRole.roleId}
          initialRoleName={editingUserRole.roleName}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </Layout>
  );
};

export default UserRoles;
