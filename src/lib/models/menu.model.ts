// Menu data models for user role permissions

export interface MenuPermission {
  // Add specific permission fields as needed
}

export interface ReportBuilderPermission {
  // Add specific report builder permission fields as needed
}

export interface MenuData {
  menuId: number;
  menuName: string;
  parentMenuId: number;
  action: string;
  hasChild: number;
  nodeImage: string | null;
  childMenus: MenuData[];
  menuPermission: MenuPermission[];
  reportBuilderPermission: ReportBuilderPermission[];
  parentMenu: MenuData | null;
  path: string[];
  // Additional fields for UI state
  isSelected?: boolean;
  isExpanded?: boolean;
  level?: number;
  children?: MenuData[];
}

export interface MenuApiResponse {
  statusCode: number;
  message: string;
  responseData: MenuData[];
}

// Tree node interface for the tree structure component
export interface TreeNode extends MenuData {
  isSelected: boolean;
  isExpanded: boolean;
  level: number;
  children: TreeNode[];
  isPartiallySelected?: boolean; // For parent nodes with some children selected
}

// Menu type enum
export enum MenuType {
  WEB_PORTAL = 'web',
  MOBILE_APP = 'mobile',
  REPORT_BUILDER = 'reportBuilder'
}

// Selected menus for role creation/editing
export interface SelectedMenus {
  webPortal: number[];
  mobileApp: number[];
  reportBuilder: number[];
}

// User role form data including menu selections
export interface UserRoleFormWithMenus {
  roleName: string;
  active: boolean;
  selectedMenus: SelectedMenus;
}
