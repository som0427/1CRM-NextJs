import apiClient from './apiClient';
import { UserLocalizationService } from './userLocalizationService';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';

export interface UserListItem {
  userId?: number;
  id?: number;
  serialNo?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  workEmail?: string;
  email?: string;
  mobileNumber?: string;
  phone?: string;
  roleId?: number;
  roleName?: string;
  reportsTo?: number;
  reportsToName?: string;
  activeStatus?: number;
  status?: string;
  data?: any[];
  [key: string]: any;
}

class UserManagementService {
  /**
   * Fetch users with paging. This endpoint does not need self/team filters.
   */
  getAllUsers(
    projectId: number,
    pageNumber: number,
    pageSize: number,
    isFirstAdvanceSearch: boolean = true,
    advanceSearch: any = null,
  ): Promise<{ responseData: any; statusCode: number; message: string }> {
    // Determine if we have valid filters
    const hasValidFilters = advanceSearch && Array.isArray(advanceSearch) && advanceSearch.length > 0;
    
    // When filters exist: isFirstAdvanceSearch=false, use POST
    // When no filters: isFirstAdvanceSearch=true, use GET
    if (hasValidFilters) {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/login/api/users/getAll?projectId=${projectId}&pageSize=${pageSize}&pageNumber=${pageNumber}&isFirstAdvanceSearch=false`;
      return apiClient.post(url, advanceSearch);
    }
    
    // No filters - use GET with isFirstAdvanceSearch=true
    const url = `${process.env.NEXT_PUBLIC_API_URL}/login/api/users/getAll?projectId=${projectId}&pageSize=${pageSize}&pageNumber=${pageNumber}&isFirstAdvanceSearch=true`;
    return apiClient.get(url);
  }

  getUser(
    projectId: number,
    userId: number,
  ): Promise<{ responseData: any; statusCode: number; message: string }> {
    // Matches Angular getUserDetail: /login/api/users/{userId}?projectId={projectId}
    const url = `${process.env.NEXT_PUBLIC_API_URL}/login/api/users/${userId}?projectId=${projectId}`;
    return apiClient.get(url);
  }

  /**
   * Fetch a single user's custom attribute values (matches legacy Angular endpoint)
   */
  getUserWithAttributes(
    projectId: number,
    userId: number,
  ): Promise<{ responseData: any; statusCode: number; message: string }> {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/login/api/users/getOne/${userId}?projectId=${projectId}`;
    return apiClient.get(url);
  }

  addEditUser(payload: any): Promise<{ responseData: any; statusCode: number; message: string }> {
    const body = {
      ...payload,
      transTimeZone: UserLocalizationService.getUserTimeZoneCode(),
    };
    return apiClient.post(`${process.env.NEXT_PUBLIC_API_URL}/login/api/users/addEditUser`, body);
  }

  /**
   * Save user data with customAttributeValues (legacy-compatible endpoint)
   */
  saveUserData(payload: any): Promise<{ responseData: any; statusCode: number; message: string }> {
    const body = {
      ...payload,
      transTimeZone: UserLocalizationService.getUserTimeZoneCode(),
    };
    return apiClient.post(`${process.env.NEXT_PUBLIC_API_URL}/login/api/users`, body);
  }

  exportUsers(
    projectId: number,
    viewMode: number,
    data: any = null,
    moduleType: number = SystemAttributeEnum.USER_MODULE,
    reportId: number = SystemAttributeEnum.USER_SERIAL_KEY_ID,
  ): Promise<{ statusCode: number; message: string; responseData: string }> {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/reportsfetcher/api/export-data/generate-entity-report?projectId=${projectId}&moduleType=${moduleType}&reportId=${reportId}&viewMode=${viewMode}`;
    return apiClient.post(url, data);
  }
}

const userManagementService = new UserManagementService();
export default userManagementService;
