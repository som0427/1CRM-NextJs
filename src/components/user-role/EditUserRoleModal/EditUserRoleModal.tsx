import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../ui/tailwind';
import styles from '@/styles/addEditForm.module.css';
import { useSnackbar } from 'notistack';
import { MenuData, MenuType, SelectedMenus } from '../../../lib/models/menu.model';
import { getProjectId } from '../../../lib/storage/sharedStorage';
import menuService from '../../../lib/services/menuService';
import userRoleService from '../../../lib/services/userRoleService';
import MenuTreeView from '../subs/MenuTreeView';

interface EditUserRoleModalProps {
  isOpen: boolean;
  roleId: number;
  initialRoleName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

// Types copied to mirror AddUserRoleModal behavior
interface CRMPermissionValue {
  upload?: ("Bulk Add" | "Bulk Edit" | "Bulk Upload")[];
  all?: ("Add" | "Edit" | "View")[];
  team?: ("Add" | "Edit" | "View")[];
  self?: ("Add" | "Edit" | "View")[];
}

type CRMPermissionsMap = Record<number, CRMPermissionValue>;

const EditUserRoleModal: React.FC<EditUserRoleModalProps> = ({ isOpen, roleId, initialRoleName = '', onClose, onSuccess }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [activeTab, setActiveTab] = useState<MenuType>(MenuType.WEB_PORTAL);
  const [roleName, setRoleName] = useState<string>(initialRoleName);
  const [selectedMenus, setSelectedMenus] = useState<SelectedMenus>({ webPortal: [], mobileApp: [], reportBuilder: [] });
  const [menuData, setMenuData] = useState<Record<MenuType, MenuData[]>>({
    [MenuType.WEB_PORTAL]: [],
    [MenuType.MOBILE_APP]: [],
    [MenuType.REPORT_BUILDER]: [],
  });
  const [loadingMenus, setLoadingMenus] = useState<Record<MenuType, boolean>>({
    [MenuType.WEB_PORTAL]: false,
    [MenuType.MOBILE_APP]: false,
    [MenuType.REPORT_BUILDER]: false,
  });
  const [loading, setLoading] = useState(false);
  const [crmPermissions, setCrmPermissions] = useState<CRMPermissionsMap>({});
  const projectId = getProjectId() || 618;
  // Avoid unwanted slide animation on initial open
  const [animateTabs, setAnimateTabs] = useState(false);

  const tabs = [MenuType.WEB_PORTAL, MenuType.MOBILE_APP, MenuType.REPORT_BUILDER];

  const getTabIndex = (tabType: MenuType) => (tabType === MenuType.WEB_PORTAL ? 0 : tabType === MenuType.MOBILE_APP ? 1 : 2);
  const currentTabIndex = getTabIndex(activeTab);

  const handleTabChange = (tabType: MenuType) => setActiveTab(tabType);

  useEffect(() => {
    if (!isOpen) return;
    // load all three with roleId
    // Always start from Web Portal tab when opening edit
    setActiveTab(MenuType.WEB_PORTAL);
    // Disable animation for initial layout to avoid right-to-left flicker
    setAnimateTabs(false);
    const loadFor = async (menuType: MenuType) => {
      setLoadingMenus(prev => ({ ...prev, [menuType]: true }));
      try {
        const res = await menuService.getMenusByType(menuType, projectId, roleId);
        const data = res && Array.isArray((res as any).responseData) ? (res as any).responseData as any[] : [];
        setMenuData(prev => ({ ...prev, [menuType]: data as unknown as MenuData[] }));
        // try to pre-populate selections from API flags if present
        prefillSelectionsFromApi(menuType, data);
      } catch (e) {
        console.error('Error loading menus for edit:', e);
        setMenuData(prev => ({ ...prev, [menuType]: [] }));
      } finally {
        setLoadingMenus(prev => ({ ...prev, [menuType]: false }));
      }
    };
    loadFor(MenuType.WEB_PORTAL);
    loadFor(MenuType.MOBILE_APP);
    loadFor(MenuType.REPORT_BUILDER);
    setRoleName(initialRoleName);
    // Re-enable animation on next tick
    const t = setTimeout(() => setAnimateTabs(true), 50);
    return () => clearTimeout(t);
  }, [isOpen, roleId, projectId, initialRoleName]);

  const prefillSelectionsFromApi = (menuType: MenuType, items: any[]) => {
    // Use menuPermission from API (if present) to determine checked state and detailed permissions.
    const selected: number[] = [];
    const perms: CRMPermissionsMap = {};

    const applyPermissionEntry = (target: any, entry: any) => {
      const p = target || {};
      const tabType: number | undefined = entry?.tabType;
      // Only map ATS buckets for tabType 1,2,3
      if (tabType === 1 || tabType === 2 || tabType === 3) {
        const bucket = tabType === 1 ? 'all' : tabType === 2 ? 'team' : 'self';
        const curr = (p as any)[bucket] ? ([...(p as any)[bucket]] as string[]) : [];
        if (entry.viewAccess === 1 && !curr.includes('View')) curr.push('View');
        if (entry.editAccess === 1 && !curr.includes('Edit')) curr.push('Edit');
        if (entry.addAccess === 1 && !curr.includes('Add')) curr.push('Add');
        (p as any)[bucket] = curr as any;
      }
      // Upload flags if present
      const upload: string[] = (p.upload || []) as string[];
      if (entry.bulkUploadAccess === 1 && !upload.includes('Bulk Upload')) upload.push('Bulk Upload');
      if (entry.uploadAddProductFormAccess === 1 && !upload.includes('Bulk Add')) upload.push('Bulk Add');
      if (entry.uploadEditProductFormAccess === 1 && !upload.includes('Bulk Edit')) upload.push('Bulk Edit');
      if (upload.length) p.upload = upload as any;
      return p;
    };

    // Define which menus have select dropdowns per tab
    const webAtsIds = [608, 610, 611];
    const webUploadOnlyIds = [614, 623];
    const mobileAtsIds = [1, 2, 3, 4];
    const uploadOnlyIds = webUploadOnlyIds;
    const dropdownIds = new Set<number>([
      ...(menuType === MenuType.WEB_PORTAL ? webAtsIds : []),
      ...(menuType === MenuType.WEB_PORTAL ? webUploadOnlyIds : []),
      ...(menuType === MenuType.MOBILE_APP ? mobileAtsIds : []),
    ]);

    const hasAnyAccess = (entry: any) => {
      if (!entry || typeof entry !== 'object') return false;
      const flags = [
        entry.viewAccess,
        entry.editAccess,
        entry.addAccess,
        entry.deleteAccess,
        entry.bulkUploadAccess,
        entry.uploadAddProductFormAccess,
        entry.uploadEditProductFormAccess,
      ];
      return flags.some(v => Number(v) === 1);
    };

    const visit = (nodes: any[]) => {
      for (const n of nodes) {
        const id = Number(n.menuId);
        // Prefer menuPermission-like structures; for Report Builder, use reportBuilderPermission
        const rawPerm = (menuType === MenuType.REPORT_BUILDER)
          ? (n.reportBuilderPermission || n.reportBuilderPermissions)
          : (n.menuPermission || n.menuPermissions || n.permissionList || n.permissions);
        const mpArray = Array.isArray(rawPerm) ? rawPerm : (rawPerm && typeof rawPerm === 'object' ? [rawPerm] : []);
        const hasMenuPermission = mpArray.length > 0;

        if (menuType === MenuType.REPORT_BUILDER) {
          // Report Builder: no dropdowns; select iff reportBuilderPermission is non-empty.
          if (hasMenuPermission && !selected.includes(id)) selected.push(id);
          // No mapping into ATS/upload for RB.
        } else if (dropdownIds.has(id)) {
          // Menus with selects: select if menuPermission is non-empty; map ATS/Upload values
          if (hasMenuPermission && !selected.includes(id)) selected.push(id);
          if (hasMenuPermission) {
            let p = perms[id] || {};
            mpArray.forEach((entry: any) => {
              // Upload-only direct mapping
              if (uploadOnlyIds.includes(id)) {
                const upload: string[] = (p.upload || []) as string[];
                if (Number(entry.addAccess) === 1 && !upload.includes('Bulk Add')) upload.push('Bulk Add');
                if (Number(entry.editAccess) === 1 && !upload.includes('Bulk Edit')) upload.push('Bulk Edit');
                if (Number(entry.bulkUploadAccess) === 1 && !upload.includes('Bulk Upload')) upload.push('Bulk Upload');
                if (upload.length) p.upload = upload as any;
              }
              // ATS mapping for tabType 1,2,3
              p = applyPermissionEntry(p, entry);
            });
            perms[id] = p;
          }
        } else {
          // Menus without selects: select only if menuPermission is non-empty; do not map ATS/upload
          if (hasMenuPermission && !selected.includes(id)) selected.push(id);
        }

        if (Array.isArray(n.children) && n.children.length) visit(n.children);
      }
    };
    visit(items);

    setSelectedMenus(prev => ({
      ...prev,
      [menuType === MenuType.WEB_PORTAL ? 'webPortal' : menuType === MenuType.MOBILE_APP ? 'mobileApp' : 'reportBuilder']:
        selected,
    } as any));

    setCrmPermissions(prev => ({ ...prev, ...perms }));
  };

  const handleMenuSelectionChange = (menuType: MenuType, ids: number[]) => {
    setSelectedMenus(prev => ({
      ...prev,
      [menuType === MenuType.WEB_PORTAL ? 'webPortal' : menuType === MenuType.MOBILE_APP ? 'mobileApp' : 'reportBuilder']:
        ids,
    } as any));
  };

  const getCurrentTabDataForType = (tabType: MenuType) => ({
    data: menuData[tabType],
    selected: tabType === MenuType.WEB_PORTAL ? selectedMenus.webPortal : tabType === MenuType.MOBILE_APP ? selectedMenus.mobileApp : selectedMenus.reportBuilder,
    loading: loadingMenus[tabType],
  });

  const getButtonText = () => (loading ? 'Processing...' : activeTab === MenuType.REPORT_BUILDER ? 'Save' : 'Next');

  const handleNext = async () => {
    if (!roleName.trim()) return;
    const currentIndex = getTabIndex(activeTab);
    if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
    else await handleSubmit();
  };

  const handleBack = () => {
    const currentIndex = getTabIndex(activeTab);
    if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
  };

  const handleCancel = () => {
    onClose();
  };

  const handleSubmit = async () => {
    if (!roleName.trim()) return;
    setLoading(true);
    try {
      const has = (arr: (string | undefined)[] | undefined, value: string) => Array.isArray(arr) && arr.includes(value);
      const crmIds = [608, 610, 611];
      const uploadOnlyIds = [614, 623];
      const atsIds = [1, 2, 3, 4];

      const webPortalMenuList: any[] = [];
      for (const id of selectedMenus.webPortal) {
        if (crmIds.includes(id)) {
          const p = crmPermissions[id] || {};
          const upload = (p.upload as string[] | undefined) || [];
          const addUpload = has(upload, 'Bulk Add') || has(upload, 'Bulk Upload') ? 1 : 0;
          const editUpload = has(upload, 'Bulk Edit') || has(upload, 'Bulk Upload') ? 1 : 0;
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
          if (!triples.some(t => t.arr && t.arr.length > 0)) {
            webPortalMenuList.push({ menuId: id, viewAccess: 0, editAccess: 0, addAccess: 0, deleteAccess: 0 });
          }
        } else if (uploadOnlyIds.includes(id)) {
          const p = crmPermissions[id] || {};
          const upload = (p.upload as string[] | undefined) || [];
          const addAccess = has(upload, 'Bulk Add') || has(upload, 'Bulk Upload') ? 1 : 0;
          const editAccess = has(upload, 'Bulk Edit') || has(upload, 'Bulk Upload') ? 1 : 0;
          webPortalMenuList.push({ menuId: id, viewAccess: 0, editAccess, addAccess, deleteAccess: 0 });
        } else {
          webPortalMenuList.push({ menuId: id, viewAccess: 0, editAccess: 0, addAccess: 0, deleteAccess: 0 });
        }
      }

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
            mobileMenuList.push({ menuId: id, viewAccess: 0, editAccess: 0, addAccess: 0, deleteAccess: 0, tabType: 1 });
          }
        } else if (id === 5) {
          mobileMenuList.push({ menuId: id, viewAccess: 0, addAccess: 0, editAccess: 0, deleteAccess: 0 });
        } else {
          mobileMenuList.push({ menuId: id, viewAccess: 0, editAccess: 0, addAccess: 0, deleteAccess: 0 });
        }
      }

      const reportBuilderMenuList: any[] = [];
      for (const id of selectedMenus.reportBuilder) {
        reportBuilderMenuList.push({ menuId: id, everyoneAccess: 0, selfAccess: 0, teamAccess: 0 });
      }

      const requestData = {
        roleName: roleName.trim(),
        roleId,
        projectId,
        webPortalMenuList,
        mobileMenuList,
        reportBuilderMenuList,
        active: 1,
      } as any;

      const resp = await userRoleService.updateUserRole(projectId, roleId, requestData);
      if (resp && resp.statusCode === 200) {
        enqueueSnackbar('User role updated successfully', { variant: 'success' });
        onSuccess();
        onClose();
      } else {
        const msg = resp?.message || 'Failed to update user role';
        enqueueSnackbar(msg, { variant: 'error' });
      }
    } catch (e) {
      console.error('Error updating user role:', e);
      enqueueSnackbar('Failed to update user role', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const currentTabData = useMemo(() => ({
    data: menuData[activeTab],
    selected: activeTab === MenuType.WEB_PORTAL ? selectedMenus.webPortal : activeTab === MenuType.MOBILE_APP ? selectedMenus.mobileApp : selectedMenus.reportBuilder,
    loading: loadingMenus[activeTab],
  }), [menuData, selectedMenus, loadingMenus, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] modalBackground p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[600px] min-h-[600px] flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Edit Role</h2>
        </div>

        <div className="p-6 space-y-6 flex-shrink-0">
          {/* Role Name Input */}
          <div className="flex items-start space-x-4">
            <label className="text-sm font-medium text-gray-700 w-24 flex-shrink-0 pt-2">Role Name</label>
            <div className="flex-1">
              <input
                type="text"
                id="roleName"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter role name"
              />
            </div>
          </div>

          {/* Tabs */}
          <div>
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button type="button" onClick={() => handleTabChange(MenuType.WEB_PORTAL)} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === MenuType.WEB_PORTAL ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Web Portal</button>
                <button type="button" onClick={() => handleTabChange(MenuType.MOBILE_APP)} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === MenuType.MOBILE_APP ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Mobile App</button>
                <button type="button" onClick={() => handleTabChange(MenuType.REPORT_BUILDER)} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === MenuType.REPORT_BUILDER ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Report Builder</button>
              </nav>
            </div>
          </div>
        </div>

        {/* Menu Section */}
        <div className="flex-1 flex flex-col min-h-0 px-6 overflow-y-auto">
          <div className="relative overflow-x-hidden overflow-y-auto h-[420px]">
            <div className={`flex ${animateTabs ? 'transition-transform duration-300 ease-in-out' : ''}`} style={{ transform: `translateX(-${currentTabIndex * 100}%)` }}>
              {tabs.map((tabType) => {
                const tabData = getCurrentTabDataForType(tabType);
                return (
                  <div key={tabType} className="w-full flex-shrink-0 pr-2">
                    <MenuTreeView
                      menuData={tabData.data}
                      selectedMenuIds={tabData.selected}
                      onSelectionChange={(ids) => handleMenuSelectionChange(tabType, ids)}
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

        {/* Footer */}
        <div className={styles.formActions}>
          
          <Button type="button" variant="outline" onClick={handleCancel} disabled={loading} className={styles.cancelBtn}>Cancel</Button>
          
          {activeTab !== MenuType.WEB_PORTAL && (
            <Button type="button" variant="outline" onClick={handleBack} disabled={loading} className={styles.cancelBtn}>Back</Button>
          )}

          <Button type="button" disabled={loading || !roleName.trim()} className={styles.submitBtn} onClick={handleNext}>{getButtonText()}</Button>
        </div>
      </div>
    </div>
  );
};

export default EditUserRoleModal;
