import apiClient from './apiClient';
import { UploadLogApiResponse, UploadLogItem, mapStatus } from '../models/upload-log.model';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function getUploadLogs(projectId: number): Promise<UploadLogItem[]> {
  try {
    const url = `${BASE_URL}/upload/api/uploadLog/getUploadLogs`;
    const response = await apiClient.get<UploadLogApiResponse>(url, { projectId });
    
    if (response && response.responseData && Array.isArray(response.responseData)) {
      return response.responseData.map(item => ({
        uploadedBy: item.uploadedBy || '',
        uploadedOn: item.uploadedOn || '',
        records: item.records || 0,
        expiresIn: item.expiresIn || '',
        entity: item.entity || '',
        actionType: item.actionType || '',
        status: mapStatus(item.status || '0'),
        uploadedFileUrl: item.uploadedFileUrl || '',
        responseFileUrl: item.responseFileUrl || ''
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching upload logs:', error);
    return [];
  }
}

const uploadLogService = {
  getUploadLogs
};

export default uploadLogService;