import apiClient from "../services/apiClient";

export interface AppFlowData {
  id: number;
  flowName: string;
  flowType: string;
  roleName: string;
  createdBy: string;
  createdOn: string;
  status: number;
}

export interface AppFlowStep {
  id: number;
  name: string;
  description: string;
  sequence: number;
  type?: string;
  config?: any;
}

export interface AppFlowDetail {
  id: number;
  flowName: string;
  flowType: string;
  roleName: string;
  status: number;
  steps: AppFlowStep[];
  metadata?: any;
  createdBy: string;
  createdOn: string;
}

// Fetch all app flows
export async function fetchAppFlows(projectId?: number): Promise<AppFlowData[]> {
  try {

    const endpoint  = `/transactions/api/appflow?projectId=${projectId}`;
    
    const response = await apiClient.get<{ responseData: AppFlowData[], statusCode: number, message: string }>(
      `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`
    );
    
    if (response.statusCode === 200 && response.responseData) {
      return response.responseData;
    }
    return [];
  } catch (error) {
    console.error('Error fetching app flows:', error);
    throw error;
  }
}

// Fetch single app flow details
export async function fetchAppFlowById(flowId: number, projectId?: number): Promise<AppFlowDetail | null> {
  try {
    const endpoint = projectId 
      ? `/appflow/api/flows/${flowId}?projectId=${projectId}`
      : `/appflow/api/flows/${flowId}`;
    
    const response = await apiClient.get<{ responseData: AppFlowDetail, statusCode: number, message: string }>(
      `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`
    );
    
    if (response.statusCode === 200 && response.responseData) {
      return response.responseData;
    }
    return null;
  } catch (error) {
    console.error('Error fetching app flow details:', error);
    return null;
  }
}

// Create or Update app flow
export async function createUpdateAppFlow(payload: {
  id?: number;
  flowName: string;
  flowType: string;
  roleName: string;
  status: number;
  steps?: AppFlowStep[];
  projectId?: number;
}): Promise<AppFlowDetail> {
  try {
    const isUpdate = !!payload.id;
    const endpoint = isUpdate 
      ? `/appflow/api/flows/${payload.id}`
      : '/appflow/api/flows';
    
    const method = isUpdate ? 'put' : 'post';
    
    const response = await apiClient[method]<{ responseData: AppFlowDetail, statusCode: number, message: string }>(
      `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
      payload
    );
    
    if (response.statusCode === 200 || response.statusCode === 201) {
      return response.responseData;
    }
    throw new Error(response.message || `Failed to ${isUpdate ? 'update' : 'create'} app flow`);
  } catch (error) {
    console.error(`Error ${payload.id ? 'updating' : 'creating'} app flow:`, error);
    throw error;
  }
}