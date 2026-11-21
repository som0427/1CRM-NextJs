import apiClient from '../api/apiClient';
import { 
  IntegrationsResponse, 
  IntegrationConfigRequest, 
  IntegrationConfigResponse,
  ConfiguredIntegration,
  AvailableIntegrationNormalized,
  IntegrationsApiResponse,
  ConfiguredApp,
  AvailableIntegration,
  ConfigFieldsApiResponse,
  SaveConfigurationRequest,
  SaveConfigurationResponse,
  GetConfigurationDetailsResponse
} from '../models/integrations/integrationsModels';
import { getProjectId } from '../storage/sharedStorage';

// Define API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

class IntegrationsService {
  
  async getIntegrations(projectId: number): Promise<IntegrationsResponse> {
    const response: IntegrationsApiResponse = await apiClient.get(
      `${API_BASE_URL}/setting/api/integration/getAvailableIntegrationAndConfiguredApp?projectId=${projectId}`);
    
    // Transform API response to match component interface
    const configured: ConfiguredIntegration[] = response.responseData.configuredApp.map((app: ConfiguredApp) => ({
      id: app.appId.toString(),
      name: app.appName,
      description: `${app.appName} integration`,
      logo: app.logo,
      status: 'active' as const,
      lastEdited: app.lastEdited,
      category: 'Integration',
      isConfigured: true as const,
      allowEdit: app.allowEdit === 1,
      integrationType: app.integrationType
    }));

    const available: AvailableIntegrationNormalized[] = response.responseData.availableIntegration.map((integration: AvailableIntegration) => ({
      id: integration.id.toString(),
      name: integration.appName,
      description: integration.appDescription,
      logo: integration.logoImage,
      status: 'inactive' as const,
      category: 'Integration',
      isConfigured: false as const,
      allowEdit: integration.allowEdit === 1,
      displayOrder: integration.displayOrder,
      integrationType: integration.integrationType
    }));

    return {
      configured,
      available
    };
  }

  async fetchConfigFields(appId: number): Promise<ConfigFieldsApiResponse> {
    return apiClient.get(
      `${API_BASE_URL}/setting/api/integration/fetchConfigField?appId=${appId}`);
  }

  async saveConfiguration(requestData: SaveConfigurationRequest): Promise<SaveConfigurationResponse> {
    return apiClient.post(
      `${API_BASE_URL}/setting/api/integration/addEditConfiguration`,
      requestData
    );
  }

  async getConfigurationDetails(appId: number, projectId: number): Promise<GetConfigurationDetailsResponse> {
    return apiClient.get(
      `${API_BASE_URL}/setting/api/integration/getConfigurationDetails?appId=${appId}&projectId=${projectId}`
    );
  }


}

export const integrationsService = new IntegrationsService();
