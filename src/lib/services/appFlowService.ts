import apiClient from './apiClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface AppFlowPayload {
  projectId: number;
  flowId?: string | number | null;
  flowName: string;
  roleId: string;
  status: string;
  profile: any[];
  homeScreen: null;
  cardView: null;
}

interface AppFlowResponse {
  statusCode: number;
  message: string;
  responseData?: any;
}

class AppFlowService {
  /**
   * Create a new app flow
   */
  async createAppFlow(payload: AppFlowPayload): Promise<AppFlowResponse> {
    try {
      const response = await apiClient.post<AppFlowResponse>(
        `${API_BASE_URL}/appflow/api/create`,
        payload
      );
      return response;
    } catch (error) {
      console.error('Error creating app flow:', error);
      throw error;
    }
  }

  /**
   * Update an existing app flow
   */
  async updateAppFlow(payload: AppFlowPayload): Promise<AppFlowResponse> {
    try {
      const response = await apiClient.post<AppFlowResponse>(
        `${API_BASE_URL}/appflow/api/update`,
        payload
      );
      return response;
    } catch (error) {
      console.error('Error updating app flow:', error);
      throw error;
    }
  }
}

const appFlowService = new AppFlowService();
export default appFlowService;
