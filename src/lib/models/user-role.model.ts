// User Role data model - matches API response structure
export interface UserRoleData {
  roleId: number;
  roleName: string;
  active: number;
  userCount: number;
  webSelectedMenus: any[];
  mobileSelectedMenus: any[];
}

// User Role API response interface
export interface UserRoleApiResponse {
  statusCode: number;
  message: string;
  responseData: UserRoleData[];
}

// User Role form data for add/edit operations
export interface UserRoleFormData {
  roleName: string;
  active: boolean;
  webSelectedMenus?: any[];
  mobileSelectedMenus?: any[];
}

// User Role request data for API calls
export interface UserRoleRequestData {
  roleName: string;
  active: number;
  webSelectedMenus?: any[];
  mobileSelectedMenus?: any[];
}