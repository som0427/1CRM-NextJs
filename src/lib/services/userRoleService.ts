import apiClient from './apiClient';
import { UserRoleApiResponse, UserRoleData, UserRoleRequestData } from '../models/user-role.model';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

class UserRoleService {
  // Get all user roles
  async getUserRoles(projectId: number, signal?: AbortSignal): Promise<UserRoleApiResponse> {
    try {
      return apiClient.get(
        process.env.NEXT_PUBLIC_API_URL + '/setting/api/roles/?projectId=' + projectId,
        { signal }
      );
    } catch (error) {
      console.error('Error fetching user roles:', error);
      throw error;
    }
  }

  // Add new user role
  async addUserRole(projectId: number, roleData: UserRoleRequestData): Promise<any> {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/setting/api/roles`, {
        ...roleData,
        projectId
      });
      return response;
    } catch (error) {
      console.error('Error adding user role:', error);
      throw error;
    }
  }

  // Update user role
  async updateUserRole(projectId: number, roleId: number, roleData: UserRoleRequestData): Promise<any> {
    try {
      // Backend expects POST to the same endpoint with roleId in body
      const response = await apiClient.post(`${API_BASE_URL}/setting/api/roles`, {
        ...roleData,
        roleId,
        projectId
      });
      return response;
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

}

const userRoleService = new UserRoleService();
export default userRoleService;