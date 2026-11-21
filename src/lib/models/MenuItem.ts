/**
 * MenuItem Model
 * 
 * This model matches the structure from the Angular application's MenuItem model
 * to ensure consistent menu behavior between applications.
 */
export interface MenuItem {
  title: string;
  root?: boolean;
  icon?: string;
  svg?: string;
  bullet?: string;
  page?: string;
  menuId?: number;
  roles?: string[];
  permissionId?: number;
  submenu?: MenuItem[];
  [key: string]: any;
}
