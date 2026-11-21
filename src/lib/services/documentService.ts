import apiClient from '../api/apiClient';
import { AddFolderRequest, DocumentApiResponse } from '../models/document.model';
import { DocumentData } from '../models/document.model';

class DocumentService {

  /**
   * Get All documents with filtering and pagination
   */

  getAllDocuments(projectId: number): Promise<{responseData: DocumentData[], statusCode: number, message: string}> {
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL + '/transactions/api/document/getDocuments?projectId=' + projectId);
  }

  /**
   * Export documents
   */
  exportDocuments(projectId: number, exportType: number, requestBody: any): Promise<{responseData: string, statusCode: number, message: string}> {
    return apiClient.post(
      process.env.NEXT_PUBLIC_API_URL + '/transactions/api/document/exportDocuments', 
      { projectId, exportType, ...requestBody }
    );
  }

  /**
   * Get roles for sharing
   */
  getRoles(projectId: number): Promise<{responseData: any[], statusCode: number, message: string}> {
    return apiClient.get(
        process.env.NEXT_PUBLIC_API_URL + '/setting/api/roles?projectId=' + projectId + '&activeStatus=1'
    );
  }

  /**
   * Get users for sharing
   */
  getUsers(projectId: number): Promise<{responseData: any[], statusCode: number, message: string}> {
    return apiClient.get(
        process.env.NEXT_PUBLIC_API_URL + '/login/api/users?activeStatus=1&projectId=' + projectId
    );
  }

  /**
   * Add or edit folder
   */
  addEditFolder(folderData: AddFolderRequest): Promise<DocumentApiResponse> {
    return apiClient.post(
        process.env.NEXT_PUBLIC_API_URL + '/transactions/api/document/addEditFolders',
        folderData
    );
  }

  /**
   * Add or edit document (file)
   */
  addEditDocument(documentData: FormData): Promise<DocumentApiResponse> {
    // For FormData, we need to use fetch directly to avoid JSON.stringify
    const url = process.env.NEXT_PUBLIC_API_URL + '/transactions/api/document/addEditFiles';
    
    // Get auth token for headers (exclude Content-Type for FormData)
    const token = apiClient.getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Don't set Content-Type - browser will set it automatically for FormData
    
    return fetch(url, {
      method: 'POST',
      headers,
      body: documentData
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    });
  }

  /**
   * Delete file
   */
  deleteFile(projectId: number, fileId: number): Promise<DocumentApiResponse> {
    return apiClient.post(
        process.env.NEXT_PUBLIC_API_URL + `/transactions/api/document/deleteFiles?projectId=${projectId}&fileId=${fileId}`
    );
  }

}

// Create a singleton instance
const documentService = new DocumentService();
export default documentService;