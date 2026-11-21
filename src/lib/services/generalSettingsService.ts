/**
 * General Setting Service
 * 
 * This service handles API calls related to general settings
 * including project, customer, contact, and opportunity settings.
 */

import apiClient from '../api/apiClient';
import { ProjectSettingsResponse, RoleItem } from '../models/general-settings/projectSettingsModels';
import { CustomerSettingsResponse } from '../models/general-settings/customerSettingsModels';
import { OpportunitySettingsResponse } from '../models/general-settings/opportunitySettingsModels';
import { ContactSettingsResponse } from '../models/general-settings/contactSettingsModels';
import { SupportSettingsResponse } from '../models/general-settings/supportSettingsModels';
import { LoyaltySettingsResponse } from '../models/general-settings/loyaltySettingsModels';

// Define API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * General Setting Service class
 */
class GeneralSettingService {
  /**
   * Get project settings from the API
   * @param projectId - The project ID to fetch settings for
   * @returns Promise with project settings data
   */
  getProjectSettings(projectId: number): Promise<ProjectSettingsResponse> {
    return apiClient.get(
      `${API_BASE_URL}/setting/api/projects/${projectId}`
    );
  }

  /**
   * Update project settings
   * @param projectId - The project ID to update settings for
   * @param data - The settings data to update
   * @returns Promise with update response
   */
  updateProjectSettings(projectId: number, data: any): Promise<any> {
    return apiClient.post(
      `${API_BASE_URL}/setting/api/projects/${projectId}`,
      data
    );
  }

  /**
   * Upload system logo
   * @param projectId - The project ID
   * @param moduleType - Module type identifier (5 for system logo)
   * @param file - The image file to upload
   * @returns Promise with upload response
   */
  async uploadSystemLogo(projectId: number, moduleType: number, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('image', file); // API expects 'image' parameter
    formData.append('projectId', projectId.toString());
    formData.append('moduleType', moduleType.toString());
    
    // Use direct fetch call to avoid JSON.stringify on FormData
    const token = localStorage.getItem('authToken');
    const headers = {
      'Authorization': token ? `Bearer ${token}` : ''
      // Note: Do NOT set Content-Type for FormData - browser will set it automatically with boundary
    };
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/transactions/api/customType/uploadFieldImage`,
        {
          method: 'POST',
          headers,
          body: formData
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error uploading file: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error uploading system logo:', error);
      throw error;
    }
  }

  /**
   * Get customer settings from the API
   * @param projectId - The project ID to fetch customer settings for
   * @returns Promise with customer settings data
   */
  getCustomerSettings(projectId: number): Promise<CustomerSettingsResponse> {
    return apiClient.post(
      `${API_BASE_URL}/setting/api/company/getCompanySettings`,
      { projectId }
    );
  }

  /**
   * Update customer settings
   * @param projectId - The project ID to update settings for
   * @param data - The customer settings data to update
   * @returns Promise with update response
   */
  updateCustomerSettings(projectId: number, data: any): Promise<any> {
    // Add current timestamp and timezone
    const now = new Date();
    const userTime = now.toISOString().slice(0, 19).replace('T', ' ');
    const transTimeZone = 'IST';
    
    return apiClient.post(
      `${API_BASE_URL}/setting/api/company/saveCompanySettings`,
      { 
        projectId, 
        ...data,
        userTime,
        transTimeZone
      }
    );
  }

  /**
   * Get entity fields for customer login
   * @param projectId - The project ID
   * @returns Promise with entity fields data
   */
  getEntityFields(projectId: number): Promise<{statusCode: number; message: string; responseData: any[]}> {
    return apiClient.get(
      `${API_BASE_URL}/transactions/api/customType/getFields?projectId=${projectId}&moduleType=2`
    );
  }

  /**
   * Get users/roles for customer login
   * @param projectId - The project ID
   * @returns Promise with users data
   */
  getUsers(projectId: number): Promise<{statusCode: number; message: string; responseData: any[]}> {
    return apiClient.get(
      `${API_BASE_URL}/login/api/users?activeStatus=1&projectId=${projectId}`
    );
  }

  /**
   * Get roles for the project
   * @param projectId - The project ID to fetch roles for
   * @returns Promise with roles data
   */
  getRoles(projectId: number): Promise<{statusCode: number; message: string; responseData: RoleItem[]}> {
    return apiClient.get(
      `${API_BASE_URL}/setting/api/roles/?projectId=${projectId}&activeStatus=1`
    );
  }

  /**
   * Get opportunity settings from the API
   * @param projectId - The project ID to fetch opportunity settings for
   * @returns Promise with opportunity settings data
   */
  getOpportunitySettings(projectId: number): Promise<OpportunitySettingsResponse> {
    return apiClient.post(
      `${API_BASE_URL}/setting/api/opportunity/getOpportunitySetting`,
      { projectId }
    );
  }

  /**
   * Update opportunity settings
   * @param projectId - The project ID to update settings for
   * @param data - The opportunity settings data to update
   * @returns Promise with update response
   */
  updateOpportunitySettings(projectId: number, data: any): Promise<any> {
    // Add current timestamp and timezone
    const now = new Date();
    const userTime = now.toISOString().slice(0, 19).replace('T', ' ');
    const transTimeZone = 'IST';
    
    return apiClient.post(
      `${API_BASE_URL}/setting/api/opportunity/addUpdateOpportunitySetting`,
      { 
        projectId, 
        ...data,
        userTime,
        transTimeZone
      }
    );
  }

  /**
   * Get contact settings from the API
   * @param projectId - The project ID to fetch contact settings for
   * @returns Promise with contact settings data
   */
  getContactSettings(projectId: number): Promise<ContactSettingsResponse> {
    return apiClient.get(
      `${API_BASE_URL}/setting/api/contact/getContactSetting?projectId=${projectId}`
    );
  }

  /**
   * Update contact settings
   * @param projectId - The project ID to update settings for
   * @param data - The contact settings data to update
   * @returns Promise with update response
   */
  updateContactSettings(projectId: number, data: any): Promise<any> {
    // Add current timestamp and timezone
    const now = new Date();
    const userTime = now.toISOString().slice(0, 19).replace('T', ' ');
    const transTimeZone = 'IST';
    
    return apiClient.post(
      `${API_BASE_URL}/setting/api/contact/addUpdateContactSetting`,
      { 
        projectId, 
        ...data,
        userTime,
        transTimeZone
      }
    );
  }

  /**
   * Get support settings from the API
   * @param projectId - The project ID to fetch support settings for
   * @returns Promise with support settings data
   */
  getSupportSettings(projectId: number): Promise<SupportSettingsResponse> {
    return apiClient.get(
      `${API_BASE_URL}/setting/api/projects/getSupportSettingDetails?projectId=${projectId}`
    );
  }

  /**
   * Update support settings
   * @param projectId - The project ID to update settings for
   * @param data - The support settings data to update
   * @returns Promise with update response
   */
  updateSupportSettings(projectId: number, data: any): Promise<any> {
    // Add current timestamp and timezone
    const now = new Date();
    const userTime = now.toISOString().slice(0, 19).replace('T', ' ');
    const transTimeZone = 'IST';
    
    return apiClient.post(
      `${API_BASE_URL}/setting/api/projects/addUpdateSupportSetting`,
      { 
        projectId, 
        ...data,
        userTime,
        transTimeZone
      }
    );
  }

  /**
   * Get theme settings from the API
   * @param projectId - The project ID to fetch theme settings for
   * @returns Promise with theme settings data
   */
  getThemeSettings(projectId: number): Promise<any> {
    return apiClient.get(
      `${API_BASE_URL}/setting/api/theme?projectId=${projectId}`
    );
  }

  /**
   * Update theme settings
   * @body data - The theme settings data to update
   * @returns Promise with update response
   */
  updateThemeSettings(data: any): Promise<any> {
    return apiClient.post(
      `${API_BASE_URL}/setting/api/theme`,
      data
    );
  }

  /**
   * Get loyalty settings from the API
   * @param projectId - The project ID to fetch loyalty settings for
   * @returns Promise with loyalty settings data
   */
  getLoyaltySettings(projectId: number): Promise<LoyaltySettingsResponse> {
    return apiClient.get(
      `${API_BASE_URL}/setting/api/loyalty/getLoyaltySetting?projectId=${projectId}`

    );
  }

  /**
   * Update loyalty settings
   * @param projectId - The project ID to update settings for
   * @param data - The loyalty settings data to update
   * @returns Promise with update response
   */
  updateLoyaltySettings(projectId: number, data: any): Promise<any> {
    // Add current timestamp and timezone
    const now = new Date();
    const userTime = now.toISOString().slice(0, 19).replace('T', ' ');
    const transTimeZone = 'IST';

    return apiClient.post(
    `${API_BASE_URL}/setting/api/loyalty/addUpdateLoyaltySetting`,

      {
        projectId,
        ...data,
        userTime,
        transTimeZone
      }
    );
  }
}

export const generalSettingService = new GeneralSettingService();
export default generalSettingService;
