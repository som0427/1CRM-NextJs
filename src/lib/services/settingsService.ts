/**
 * Settings Service
 * 
 * This service handles API calls related to settings and configuration
 * including the settings assistant data.
 */

import { BehaviorSubject, Observable } from 'rxjs';
import authService from './authService';
import { getUserData } from '../storage/sharedStorage';
import { SettingsMenuItem, SettingsApiResponse } from '../models/SettingsAssistant';
import apiClient from '../api/apiClient';
import { companiesModel } from '../models/companies.model';
import { GeneralResponse } from '../models/general-response.model';
import { AttributePayload } from '../models/attributes/attribute.model';
import { StdLookupAttribute } from '../models/std-lookup-attribute.model';
import { UserLocalizationService } from './userLocalizationService';

// Storage key for caching settings data
const SETTINGS_ASSISTANT_DATA_KEY = 'settings_assistant_data';

/**
 * Settings Service class
 */
class SettingsService {
 
  private settingsMenuSubject: BehaviorSubject<SettingsMenuItem[] | null>;
  public settingsMenu: Observable<SettingsMenuItem[] | null>;

  constructor() {
    // Initialize with stored settings data, if available
    let storedSettings: SettingsMenuItem[] | null = null;

    if (typeof window !== 'undefined') {
      try {
        const settingsDataStr = sessionStorage.getItem(SETTINGS_ASSISTANT_DATA_KEY);
        
        if (settingsDataStr) {
          console.log('Found stored settings assistant data in session storage');
          storedSettings = JSON.parse(settingsDataStr);
        }
      } catch (e) {
        console.error('Error loading stored settings data:', e);
        storedSettings = null;
      }
    }

    this.settingsMenuSubject = new BehaviorSubject<SettingsMenuItem[] | null>(storedSettings);
    this.settingsMenu = this.settingsMenuSubject.asObservable();
  }

  /**
   * Get settings assistant data
   */
  public async getSettingsAssistantData(projectId: number): Promise<SettingsMenuItem[]> {
    try {
      
      // First check if we have cached data and return that if valid
      if (typeof window !== 'undefined') {
        const cachedDataStr = sessionStorage.getItem(SETTINGS_ASSISTANT_DATA_KEY);
        if (cachedDataStr) {
          try {
            const cachedData = JSON.parse(cachedDataStr) as SettingsMenuItem[];
            if (cachedData && cachedData.length > 0) {
              return cachedData;
            }
          } catch (e) {
            console.error('Error parsing cached settings data:', e);
            // Continue to fetch fresh data if parsing fails
          }
        }
      }
      
      const userData = getUserData();
      
      const token = userData?.token;
      
      if (!token) {
        console.error('SettingsService: No authentication token available');
        throw new Error('No authentication token available');
      }

      const endpoint = `/setting/api/configuration/assistant?projectId=${projectId}`;
      
      const data = await apiClient.get<SettingsApiResponse>(endpoint);

      
      if (data.statusCode === 200 && data.responseData) {
        // Store the retrieved data only in session storage
        if (typeof window !== 'undefined') {
          const settingsDataStr = JSON.stringify(data.responseData);
          sessionStorage.setItem(SETTINGS_ASSISTANT_DATA_KEY, settingsDataStr);
        }
        
        // Update the BehaviorSubject with the new data
        this.settingsMenuSubject.next(data.responseData);
        return data.responseData;
      } else {
        throw new Error(`API returned error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error fetching settings assistant data:', error);
      // Return empty array on error
      return [];
    }
  }

  /**
   * Clear settings data (useful on logout)
   */
  public clearSettingsData(): void {
  
    this.settingsMenuSubject.next(null);
  }

  /**
   * Get form fields for any module
   * @param projectId The project ID
   * @param moduleType The module type (1 for Contact, etc.)
   */
  public async getFormFields(projectId: number, moduleType: number): Promise<any[]> {
    console.log(`Getting form fields for project ID: ${projectId}, module type: ${moduleType}`);
    
    try {
      const userData = getUserData();
      const token = userData?.token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const endpoint = `/transactions/api/customType/getFields?projectId=${projectId}&moduleType=${moduleType}`;
      
      // Use apiClient.get instead of direct fetch call
      const data = await apiClient.get<any>(endpoint);

      console.log('API response:', data);
      
      // Check different possible response structures
      if (data.statusCode === 200) {
        let fieldsData;
        
        if (Array.isArray(data.responseData)) {
          // Direct array in responseData
          fieldsData = data.responseData;
        } else if (data.responseData && data.responseData.data && Array.isArray(data.responseData.data)) {
          // Nested data array
          fieldsData = data.responseData.data;
        } else if (data.data && Array.isArray(data.data)) {
          // Direct data property
          fieldsData = data.data;
        } else {
          console.warn('Unexpected API response structure:', data);
          return [];
        }
        
        // Filter out inactive fields (status === 1)
        const activeFields = fieldsData.filter((field: any) => field.status === 1);
        
        // Sort fields by displayOrder
        const sortedFields = activeFields.sort((a: any, b: any) => {
          const orderA = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        });
        console.log('Sorted form fields by displayOrder:', sortedFields);
        return sortedFields;
      } else {
        console.error('API returned error status:', data);
        throw new Error(`API returned error: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Error fetching form fields for module type ${moduleType}:`, error);
      // Return empty array on error
      return [];
    }
  }

  getLocalization(projectId: number): Promise<{responseData: any, statusCode: number, message: string}> {
    return apiClient.get(process.env.NEXT_PUBLIC_API_URL + '/setting/api/projects/' + projectId);
  }
  getSupportSettingDetails(projectId: number): Promise<{responseData: any, statusCode: number, message: string}> {
    return apiClient.get(process.env.NEXT_PUBLIC_API_URL + '/setting/api/projects/getSupportSettingDetails?projectId=' + projectId);
  }

  getFieldVisibilitySettings(projectId: number, moduleType: number, filterByRole: boolean = false, signal?: AbortSignal): Promise<{responseData: any[], statusCode: number, message: string}> {
    return apiClient.get(process.env.NEXT_PUBLIC_API_URL + '/setting/api/fields/getFieldVisibilitySettings?projectId=' + projectId + '&moduleType=' + moduleType + '&filterByRole='+filterByRole, {
      signal,
    });
  }
  getAllAttributeTypes(moduleType: number, signal?: AbortSignal): Promise<{responseData: any[], statusCode: number, message: string}> {
    return apiClient.get(process.env.NEXT_PUBLIC_API_URL + '/setting/api/customType/getAllAttributeTypes?moduleType=' + moduleType, {
      signal,
    });
  }

  getFieldDetails(projectId: number, moduleType: number, signal?: AbortSignal): Promise<{responseData: any[], statusCode: number, message: string}> {
    return apiClient.get('/setting/api/customType/getFieldsInSetting?projectId=' + projectId + '&moduleType=' + moduleType, {
      signal,
    });
  }

  getStdLookupForAttributeTypes(attributeTypeId: number, typeName: string, signal?: AbortSignal): Promise<StdLookupAttribute[]> {
    return apiClient.post(
      process.env.NEXT_PUBLIC_API_URL + '/setting/api/customType/getStdLookupForAttributeTypes',
      { id: attributeTypeId, typename: typeName },
      {signal}
    );
  }

  sequenceFields(sequenceOrder: Array<{ id: number; attributeName: string; displayOrder: number }>): Promise<{responseData: any, statusCode: number, message: string}> {
    return apiClient.post(process.env.NEXT_PUBLIC_API_URL + '/setting/api/customType/sequenceFields', sequenceOrder);
  }

  getLinkedDataListDetails(projectId: number, moduleType: number): Promise<{responseData: any[], statusCode: number, message: string}> {
    return apiClient.get(process.env.NEXT_PUBLIC_API_URL + '/transactions/api/customType/getLinkedDataList?projectId=' + projectId + '&moduleType=' + moduleType);
  }
  getAttribLookup(attribId: number): Promise<{responseData: any[], statusCode: number, message: string}> {
    return apiClient.get(process.env.NEXT_PUBLIC_API_URL + '/setting/api/customType/getAttribLookupValues?attributeId=' + attribId);
  }

  getCustomDateAttribute(attribId: number, signal?: AbortSignal): Promise<{responseData: any, statusCode: number, message: string}> {
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL + '/setting/api/customType/getCustomDateAttributes?attributeId=' + attribId,
      { signal },
    );
  }

  getDataListLookupValues(attribId: number, signal?: AbortSignal): Promise<{responseData: any, statusCode: number, message: string}> {
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL + '/setting/api/customType/getDataListLookupValues?attributeId=' + attribId,
      { signal },
    );
  }
  getFieldRelation(attributeId: number, attributeLookupId: number): Promise<{responseData: any, statusCode: number, message: string}> {
    return apiClient.get(process.env.NEXT_PUBLIC_API_URL + '/setting/api/customType/getChildAttributes?attributeId=' + attributeId + '&attributeLookupId=' + attributeLookupId)
  }
  addCustomAttribute(payload: AttributePayload, signal?: AbortSignal): Promise<{responseData: any, statusCode: number, message: string}> {
    const requestBody: AttributePayload = {
      ...payload,
      userTime: payload.userTime || UserLocalizationService.getUserTime(),
      transTimeZone: payload.transTimeZone || UserLocalizationService.getUserTimeZoneCode(),
    };

    return apiClient.post(
      process.env.NEXT_PUBLIC_API_URL + '/setting/api/customType/addCustomAttribute',
      requestBody,
      { signal },
    );
  }

  editCustomAttribute(payload: AttributePayload, signal?: AbortSignal): Promise<{responseData: any, statusCode: number, message: string}> {
    const requestBody: AttributePayload = {
      ...payload,
      userTime: payload.userTime || UserLocalizationService.getUserTime(),
      transTimeZone: payload.transTimeZone || UserLocalizationService.getUserTimeZoneCode(),
    };

    return apiClient.post(
      process.env.NEXT_PUBLIC_API_URL + '/setting/api/customType/editCustomAttribute',
      requestBody,
      { signal },
    );
  }

  getdynamicFieldNames(projectId: number, signal?: AbortSignal): Promise<GeneralResponse<any>>{

    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL + '/setting/api/projects/'+projectId+'/dynamicFieldNames',
      { signal },
    );
  }

  /**
   * Get roles for a project
   * @param projectId - The project ID
   */
  getUserRoles(projectId: number, signal?: AbortSignal): Promise<{responseData: any[], statusCode: number, message: string}> {
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL + '/setting/api/roles?projectId=' + projectId,
      { signal }
    );
  }

  /**
   * Save field visibility settings for an attribute
   * @param payload - Field visibility settings payload
   */
  saveFieldVisibilitySettings(payload: {
    projectId: number;
    moduleType: number;
    attributeId: number;
    attributeTypeId: number;
    fieldVisibilityConfig: Array<{
      projectId: number;
      roleId: number;
      moduleType: number;
      fieldVisibility: any;
      attributeId: number;
      parentDataListId?: number | null;
      value?: any | null;
    }>;
  }): Promise<{responseData: any, statusCode: number, message: string}> {
    return apiClient.post(
      process.env.NEXT_PUBLIC_API_URL + '/setting/api/fields/addEditFieldVisibilitySettings',
      payload
    );
  }

  /**
   * Get countries list for address fields
   */
  getCountries(): Promise<{responseData: any[], statusCode: number, message: string}> {
    return apiClient.get(process.env.NEXT_PUBLIC_API_URL + '/setting/api/address/countries');
  }

  /**
   * Get states for a country
   * @param countryId - The country ID
   */
  getStates(countryId: number): Promise<{responseData: any[], statusCode: number, message: string}> {
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL + '/setting/api/address/states?countryId=' + countryId
    );
  }

  /**
   * Get cities for a state
   * @param stateId - The state ID
   */
  getCities(stateId: number): Promise<{responseData: any[], statusCode: number, message: string}> {
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL + '/setting/api/address/cities?stateId=' + stateId
    );
  }

  /**
   * Get module names for a project
   * Returns moduleId and singularName for each module
   * @param projectId - The project ID
   */
  getModuleNames(projectId: number): Promise<{responseData: Array<{moduleId: number; singularName: string; pluralName: string; opportunityEnabled: boolean}>, statusCode: number, message: string}> {
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL + '/setting/api/projects/' + projectId + '/moduleNames'
    );
  }
  getLinkedFieldDetails(projectId: number, moduleType: number, signal?: AbortSignal): Promise<{responseData: any[], statusCode: number, message: string}> {
    return apiClient.get(process.env.NEXT_PUBLIC_API_URL+'/setting/api/customType/getLinkedFieldList?projectId=' + projectId + '&moduleType=' + moduleType, {
      signal,
    });
  }
}

// Create a singleton instance
const settingsService = new SettingsService();
export default settingsService;
