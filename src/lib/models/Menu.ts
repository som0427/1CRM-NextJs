/**
 * Menu item model for application navigation
 */
export interface MenuItem {
  title: string;
  page?: string;
  path?: string;
  url?: string;
  route?: string;
  link?: string;
  icon?: string;
  root?: boolean;
  section?: boolean;
  bullet?: string;
  menuId?: number;
  submenu?: MenuItem[];
}

/**
 * Project model for multi-tenant applications
 */
export interface Project {
  id: number;            // Used by Next.js (we normalize to this)
  projectId?: number;    // Used by API response
  name: string;          // Used by Next.js (we normalize to this)
  projectName?: string;  // Used by API response
  code?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  active?: number;
  projectLogoImage?: string;
  logicalName?: string;
  // Add any other properties from the API that might be needed
  [key: string]: any;    // Allow other properties for flexibility with API response
}
