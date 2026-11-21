/**
 * Type definitions for navigation menu items and structures
 */

export interface SubMenuItem {
  title: string;
  page: string;
  menuId: number;
  icon?: string;
  bullet?: string;
  submenu?: SubMenuItem[];
  section?: string;
  parentMenuId?: number;
  hasChild?: number;
  menuPermission?: any[];
  parentMenu?: any;
  singularName?: string;
  pruralName?: string;
  defaultMenuName?: string;
}

export interface MenuItem {
  title?: string;
  name?: string; // Added name property for alternative API formats
  page?: string;
  root?: boolean;
  icon?: string;
  bullet?: string;
  menuId?: number;
  submenu?: SubMenuItem[];
  section?: string;
  parentMenuId?: number;
  hasChild?: number;
  menuPermission?: any[];
  parentMenu?: any;
  singularName?: string;
  pruralName?: string;
  defaultMenuName?: string;
}

export interface UserData {
  id?: string | number;
  name?: string;
  email?: string;
  role?: string;
  selectedProjectId?: string | number;
  projectId?: string | number;
  selectedProject?: {
    id: string | number;
    [key: string]: any;
  };
  [key: string]: any;
}
