import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/tailwind/dialog';
import { Button } from '../../ui/tailwind';
import styles from '@/styles/addEditForm.module.css';
import { MenuData, MenuType, SelectedMenus } from '../../../lib/models/menu.model';
import userRoleService from '../../../lib/services/userRoleService';
import menuService from '../../../lib/services/menuService';
import { getProjectId } from '../../../lib/storage/sharedStorage';
import { useSnackbar } from 'notistack';
import MenuTreeView from '../subs/MenuTreeView';

interface AddUserRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddUserRoleModal: React.FC<AddUserRoleModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<MenuType>(MenuType.WEB_PORTAL);
  const [roleName, setRoleName] = useState('');
  const [selectedMenus, setSelectedMenus] = useState<SelectedMenus>({
    webPortal: [],
    mobileApp: [],
    reportBuilder: []
  });
  const [menuData, setMenuData] = useState<{
    [MenuType.WEB_PORTAL]: MenuData[];
    [MenuType.MOBILE_APP]: MenuData[];
    [MenuType.REPORT_BUILDER]: MenuData[];
  }>({
    [MenuType.WEB_PORTAL]: [],
    [MenuType.MOBILE_APP]: [],
    [MenuType.REPORT_BUILDER]: []
  });
  const [loadingMenus, setLoadingMenus] = useState<{
    [MenuType.WEB_PORTAL]: boolean;
    [MenuType.MOBILE_APP]: boolean;
    [MenuType.REPORT_BUILDER]: boolean;
  }>({
    [MenuType.WEB_PORTAL]: false,
    [MenuType.MOBILE_APP]: false,
    [MenuType.REPORT_BUILDER]: false
  });
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const projectId = getProjectId() || 618;
  // Avoid unwanted slide animation on initial open
  const [animateTabs, setAnimateTabs] = useState(false);

  // CRM permission selections for special child menus (IDs 608, 610, 611)
  type CRMPermissionValue = {
    upload?: ("Bulk Add" | "Bulk Edit" | "Bulk Upload")[];
    all?: ("Add" | "Edit" | "View")[];
    team?: ("Add" | "Edit" | "View")[];
    self?: ("Add" | "Edit" | "View")[];
  };
  type CRMPermissionsMap = Record<number, CRMPermissionValue>;
  const [crmPermissions, setCrmPermissions] = useState<CRMPermissionsMap>({});

  // Load menu data for each tab
  const loadMenuData = async (menuType: MenuType) => {
    setLoadingMenus(prev => ({ ...prev, [menuType]: true }));
    try {
      console.log(`Loading ${menuType} menus for projectId: ${projectId}`);
      const response = await menuService.getMenusByType(menuType, projectId);
      console.log(`${menuType} API Response:`, response);
      
      if (response && response.responseData && Array.isArray(response.responseData)) {
        console.log(`${menuType} menu items count:`, response.responseData.length);
        setMenuData(prev => ({
          ...prev,
          [menuType]: response.responseData
        }));
      } else {
        console.error(`Invalid ${menuType} response format:`, response);
        setMenuData(prev => ({
          ...prev,
          [menuType]: []
        }));
      }
    } catch (error) {
      console.error(`Error loading ${menuType} menus:`, error);
      setMenuData(prev => ({
        ...prev,
        [menuType]: []
      }));
    } finally {
      setLoadingMenus(prev => ({ ...prev, [menuType]: false }));
    }
  };

  // Load initial data when modal opens
  useEffect(() => {
    if (isOpen) {
      // Always start from Web Portal tab when opening
      setActiveTab(MenuType.WEB_PORTAL);
      // Disable animation for initial layout to avoid right-to-left flicker
      setAnimateTabs(false);
      loadMenuData(MenuType.WEB_PORTAL);
      loadMenuData(MenuType.MOBILE_APP);
      loadMenuData(MenuType.REPORT_BUILDER);
      // Re-enable animation on next tick
      const t = setTimeout(() => setAnimateTabs(true), 50);
      return () => clearTimeout(t);
    }
    // When closed, keep animation disabled so next open starts cleanly
    setAnimateTabs(false);
  }, [isOpen]);

  // Don't render modal if not open
  if (!isOpen) {
    return null;
  }

  // Handle tab change with animation direction
  const handleTabChange = (tabType: MenuType) => {
    setActiveTab(tabType);
  };

  // Handle next button click - navigate to next tab or submit
  const handleNext = async () => {
    if (!roleName.trim()) {
      return;
    }

    const currentIndex = getTabIndex(activeTab);
    
    if (currentIndex < tabs.length - 1) {
      // Move to next tab
      const nextTab = tabs[currentIndex + 1];
      setActiveTab(nextTab);
    } else {
      // On last tab (Report Builder), submit the form
      await handleSubmit();
    }
  };

  // Get button text based on current tab
  const getButtonText = () => {
    if (loading) return 'Processing...';
    
    switch (activeTab) {
      case MenuType.WEB_PORTAL:
      case MenuType.MOBILE_APP:
        return 'Next';
      case MenuType.REPORT_BUILDER:
        return 'Save';
      default:
        return 'Next';
    }
  };

  // Handle back button click - navigate to previous tab
  const handleBack = () => {
    const currentIndex = getTabIndex(activeTab);
    if (currentIndex > 0) {
      const prevTab = tabs[currentIndex - 1];
      setActiveTab(prevTab);
    }
  };

  // Get tab index for animation direction
  const getTabIndex = (tabType: MenuType) => {
    switch (tabType) {
      case MenuType.WEB_PORTAL: return 0;
      case MenuType.MOBILE_APP: return 1;
      case MenuType.REPORT_BUILDER: return 2;
      default: return 0;
    }
  };

  const currentTabIndex = getTabIndex(activeTab);
  const tabs = [MenuType.WEB_PORTAL, MenuType.MOBILE_APP, MenuType.REPORT_BUILDER];

  // Handle menu selection change
  const handleMenuSelectionChange = (menuType: MenuType, selectedIds: number[]) => {
    console.log('[AddUserRoleModal] selection change', { menuType, selectedIdsCount: selectedIds.length, first10: selectedIds.slice(0,10) });
    setSelectedMenus(prev => {
      const next = { ...prev };
      if (menuType === MenuType.WEB_PORTAL) {
        next.webPortal = selectedIds;
      } else if (menuType === MenuType.MOBILE_APP) {
        next.mobileApp = selectedIds;
      } else if (menuType === MenuType.REPORT_BUILDER) {
        next.reportBuilder = selectedIds;
      }
      return next;
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!roleName.trim()) {
      return;
    }

    setLoading(true);
    try {
      // Helpers
      const has = (arr: (string | undefined)[] | undefined, value: string) => Array.isArray(arr) && arr.includes(value);
      const crmIds = [608, 610, 611];
      const uploadOnlyIds = [614, 623];
      const atsIds = [1, 2, 3, 4];

      // Build Web Portal payload
      const webPortalMenuList: any[] = [];
      for (const id of selectedMenus.webPortal) {
        if (crmIds.includes(id)) {
          const p = crmPermissions[id] || {};
          const upload = (p.upload as string[] | undefined) || [];
          const addUpload = has(upload, 'Bulk Add') || has(upload, 'Bulk Upload') ? 1 : 0;
          const editUpload = has(upload, 'Bulk Edit') || has(upload, 'Bulk Upload') ? 1 : 0;
          // All (tabType 1), Team (2), Self (3)
          const triples: Array<{ tabType: number; arr?: string[] }> = [
            { tabType: 1, arr: (p.all as string[] | undefined) },
            { tabType: 2, arr: (p.team as string[] | undefined) },
            { tabType: 3, arr: (p.self as string[] | undefined) },
          ];
          triples.forEach(t => {
            if (t.arr && t.arr.length > 0) {
              webPortalMenuList.push({
                menuId: id,
                viewAccess: has(t.arr, 'View') ? 1 : 0,
                editAccess: has(t.arr, 'Edit') ? 1 : 0,
                addAccess: has(t.arr, 'Add') ? 1 : 0,
                deleteAccess: 0,
                bulkUploadAccess: has(upload, 'Bulk Upload') ? 1 : 0,
                uploadAddProductFormAccess: addUpload,
                uploadEditProductFormAccess: editUpload,
                tabType: t.tabType,
              });
            }
          });
          // If no ATS selected but menu selected, still push a neutral record without tabType (optional)
          if (!triples.some(t => t.arr && t.arr.length > 0)) {
            webPortalMenuList.push({ menuId: id, viewAccess: 0, editAccess: 0, addAccess: 0, deleteAccess: 0 });
          }
        } else if (uploadOnlyIds.includes(id)) {
          const p = crmPermissions[id] || {};
          const upload = (p.upload as string[] | undefined) || [];
          const addAccess = has(upload, 'Bulk Add') || has(upload, 'Bulk Upload') ? 1 : 0;
          const editAccess = has(upload, 'Bulk Edit') || has(upload, 'Bulk Upload') ? 1 : 0;
          webPortalMenuList.push({
            menuId: id,
            viewAccess: 0,
            editAccess,
            addAccess,
            deleteAccess: 0,
          });
        } else {
          // Default selected web menu record with zeros (as per sample payload)
          webPortalMenuList.push({ menuId: id, viewAccess: 0, editAccess: 0, addAccess: 0, deleteAccess: 0 });
        }
      }

      // Build Mobile payload
      const mobileMenuList: any[] = [];
      for (const id of selectedMenus.mobileApp) {
        if (atsIds.includes(id)) {
          const p = crmPermissions[id] || {};
          const triples: Array<{ tabType: number; arr?: string[] }> = [
            { tabType: 1, arr: (p.all as string[] | undefined) },
            { tabType: 2, arr: (p.team as string[] | undefined) },
            { tabType: 3, arr: (p.self as string[] | undefined) },
          ];
          triples.forEach(t => {
            if (t.arr && t.arr.length >= 0) {
              mobileMenuList.push({
                menuId: id,
                viewAccess: has(t.arr, 'View') ? 1 : 0,
                editAccess: has(t.arr, 'Edit') ? 1 : 0,
                addAccess: has(t.arr, 'Add') ? 1 : 0,
                deleteAccess: 0,
                bulkUploadAccess: 0,
                uploadAddProductFormAccess: 0,
                uploadEditProductFormAccess: 0,
                tabType: t.tabType,
              });
            }
          });
          if (!triples.some(t => t.arr && t.arr.length > 0)) {
            // If no specific perms chosen, still include a base record
            mobileMenuList.push({ menuId: id, viewAccess: 0, editAccess: 0, addAccess: 0, deleteAccess: 0, tabType: 1 });
          }
        } else if (id === 5) {
          // Limited parent – include base record (no specific accesses per sample)
          mobileMenuList.push({ menuId: id, viewAccess: 0, addAccess: 0, editAccess: 0, deleteAccess: 0 });
        } else {
          // Default selected mobile menu record; set add/edit to 1 for common actions? Keep zeros to be conservative.
          mobileMenuList.push({ menuId: id, viewAccess: 0, editAccess: 0, addAccess: 0, deleteAccess: 0 });
        }
      }

      // Build Report Builder payload
      const reportBuilderMenuList: any[] = [];
      for (const id of selectedMenus.reportBuilder) {
        // If we had ATS-like selections for RB, map them; otherwise zeros
        reportBuilderMenuList.push({ menuId: id, everyoneAccess: 0, selfAccess: 0, teamAccess: 0 });
      }

      const requestData = {
        roleName: roleName.trim(),
        roleId: null,
        projectId,
        webPortalMenuList,
        mobileMenuList,
        reportBuilderMenuList,
        active: 1,
      };

      const resp = await userRoleService.addUserRole(projectId, requestData);
      if (resp && resp.statusCode === 200) {
        enqueueSnackbar('User role created successfully', { variant: 'success' });
        onSuccess();
        handleCancel();
      } else {
        const msg = resp?.message || 'Failed to create user role';
        enqueueSnackbar(msg, { variant: 'error' });
      }
    } catch (error: any) {
      console.error('Error creating user role:', error);
      const backendMsg = error?.response?.data?.message || error?.message || 'Failed to create user role';
      enqueueSnackbar(backendMsg, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setRoleName('');
    setSelectedMenus({
      webPortal: [],
      mobileApp: [],
      reportBuilder: []
    });
    setCrmPermissions({});
    setActiveTab(MenuType.WEB_PORTAL);
    onClose();
  };

  // Get current tab data
  const getCurrentTabData = () => {
    switch (activeTab) {
      case MenuType.WEB_PORTAL:
        return {
          data: menuData[MenuType.WEB_PORTAL],
          selected: selectedMenus.webPortal,
          loading: loadingMenus[MenuType.WEB_PORTAL]
        };
      case MenuType.MOBILE_APP:
        return {
          data: menuData[MenuType.MOBILE_APP],
          selected: selectedMenus.mobileApp,
          loading: loadingMenus[MenuType.MOBILE_APP]
        };
      case MenuType.REPORT_BUILDER:
        return {
          data: menuData[MenuType.REPORT_BUILDER],
          selected: selectedMenus.reportBuilder,
          loading: loadingMenus[MenuType.REPORT_BUILDER]
        };
      default:
        return {
          data: [],
          selected: [],
          loading: false
        };
    }
  };

  // Get tab data for specific tab type (for animation)
  const getCurrentTabDataForType = (tabType: MenuType) => {
    switch (tabType) {
      case MenuType.WEB_PORTAL:
        return {
          data: menuData[MenuType.WEB_PORTAL],
          selected: selectedMenus.webPortal,
          loading: loadingMenus[MenuType.WEB_PORTAL]
        };
      case MenuType.MOBILE_APP:
        return {
          data: menuData[MenuType.MOBILE_APP],
          selected: selectedMenus.mobileApp,
          loading: loadingMenus[MenuType.MOBILE_APP]
        };
      case MenuType.REPORT_BUILDER:
        return {
          data: menuData[MenuType.REPORT_BUILDER],
          selected: selectedMenus.reportBuilder,
          loading: loadingMenus[MenuType.REPORT_BUILDER]
        };
      default:
        return {
          data: [],
          selected: [],
          loading: false
        };
    }
  };

  const currentTabData = getCurrentTabData();

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] modalBackground p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[600px] min-h-[600px] flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Add New Role</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
          <div className="p-6 space-y-6 flex-shrink-0">
            {/* Role Name Input */}
            <div className="flex items-start space-x-4">
              <label className="text-sm font-medium text-gray-700 w-24 flex-shrink-0 pt-2">
                Role Name
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  id="roleName"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter role name"
                />
                {!roleName.trim() && (
                  <div className="mt-1 text-sm text-orange-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Please fill in this field.
                  </div>
                )}
              </div>
            </div>
            
            {/* Tabs */}
            <div>
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    type="button"
                    onClick={() => handleTabChange(MenuType.WEB_PORTAL)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === MenuType.WEB_PORTAL
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Web Portal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange(MenuType.MOBILE_APP)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === MenuType.MOBILE_APP
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Mobile App
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange(MenuType.REPORT_BUILDER)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === MenuType.REPORT_BUILDER
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Report Builder
                  </button>
                </nav>
              </div>
            </div>
          </div>

          {/* Menu Section - Scrollable area */}
          <div className="flex-1 flex flex-col min-h-0 px-6 overflow-y-auto">
            {/* Hide horizontal overflow for slide animation */}
            <div className="relative overflow-x-hidden overflow-y-auto h-[420px]">
              <div className={`flex ${animateTabs ? 'transition-transform duration-300 ease-in-out' : ''}`} 
                   style={{ transform: `translateX(-${currentTabIndex * 100}%)` }}>
                {tabs.map((tabType, index) => {
                  const tabData = getCurrentTabDataForType(tabType);
                  return (
                    <div key={tabType} className="w-full flex-shrink-0 pr-2">
                      <MenuTreeView
                        menuData={tabData.data}
                        selectedMenuIds={tabData.selected}
                        onSelectionChange={(selectedIds) => handleMenuSelectionChange(tabType, selectedIds)}
                        loading={tabData.loading}
                        crmPermissionNodeIds={[608, 610, 611]}
                        atsPermissionNodeIds={tabType === MenuType.MOBILE_APP ? [1, 2, 3, 4] : []}
                        selectionLimits={tabType === MenuType.MOBILE_APP ? [{ parentId: 5, max: 4 }] : []}
                        initialCRMPermissions={crmPermissions}
                        onCRMPermissionsChange={(perms) => setCrmPermissions(perms)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </form>
        
        {/* Footer - Absolutely positioned at bottom */}
        <div className={styles.formActions}>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
            className={styles.cancelBtn}
          >
            Cancel
          </Button>
          {activeTab !== MenuType.WEB_PORTAL && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={loading}
              className={styles.cancelBtn}
            >
              Back
            </Button>
          )}
          <Button
            type="button"
            disabled={loading || !roleName.trim()}
            className={styles.submitBtn}
            onClick={handleNext}
          >
            {getButtonText()}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddUserRoleModal;
