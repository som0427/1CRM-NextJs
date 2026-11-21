import fetchWithAuth from '../utils/fetchWithAuth';

/**
 * AppIntegration service that mirrors the Angular AppIntegrationService
 */
export const appIntegrationApi = {
  /**
   * Get configuration details
   * @param projectId Project ID
   * @param appId App ID
   * @returns Promise with response
   */
  getConfigurationDetails: async (projectId: number, appId: number) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    const url = `${API_URL}/setting/api/integration/getConfigurationDetails?projectId=${projectId}&appId=${appId}`;
    
    const response = await fetchWithAuth(url);
    return response.json();
  },
  
  /**
   * Agent manual dial
   * @param url URL for the API
   * @param paramsDetail Parameters for the request
   * @returns Promise with response
   */
  agentManualDial: async (url: string, paramsDetail: any) => {
    // Build query string from params
    const queryParams = new URLSearchParams();
    Object.keys(paramsDetail).forEach(key => {
      queryParams.append(key, paramsDetail[key]);
    });
    
    // Append query parameters to URL
    const fullUrl = `${url}?${queryParams.toString()}`;
    
    const response = await fetchWithAuth(fullUrl);
    return response.json();
  },
  
  /**
   * Get configured and available integration app details
   * @param projectId Project ID
   * @returns Promise with response
   */
  getConfiguredAndAvailableIntegrationAppDetails: async (projectId: number) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL;
    const url = `${API_URL}/setting/api/integration/getAvailableIntegrationAndConfiguredApp?projectId=${projectId}`;
    
    const response = await fetchWithAuth(url);
    return response.json();
  }
};

export default appIntegrationApi;
