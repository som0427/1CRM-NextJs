/**
 * Community Service
 * 
 * This service handles API calls related to community settings
 */

import apiClient, { apiRequest, getAuthHeaders } from '../api/apiClient';
import { CommunitySettingsResponse, RolesResponse } from '../models/community/community-settings.model';

// Define API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Community Service class
 */
class CommunityService {
  /**
   * Get community posts list
   */
  async getCommunity(projectId: number) {
    // Use the explicit endpoint provided for community posts
    return apiClient.get(
      `${API_BASE_URL}/transactions/api/community-post/getPosts?projectId=${projectId}`
    );
  }

  /**
   * Save a community post (multipart/form-data)
   * Endpoint example:
   * https://endpoints-backend.api.qa.postgres.assistive.site/retailitynew/transactions/api/community-post/savePost?projectId=618
   *
   * Expected FormData fields:
   * - projectId (number)
   * - title (string)
   * - description (string)
   * - tag (number)
   * - thumbnail (File) and optional thumbnailFilename, thumbnailFileExtension
   * - attachment (File) and optional attachmentFilename, attachmentFileExtension
   * - moduleType (number) [5]
   * - postedBy (string | number)
   */
  async saveCommunityPost(projectId: number, formData: FormData): Promise<any> {
    const url = `${API_BASE_URL}/transactions/api/community-post/savePost?projectId=${projectId}`;
    // Use apiRequest directly so we don't JSON.stringify FormData
    const authHeaders = getAuthHeaders();
    // Remove JSON content-type if present; the browser will set multipart boundary automatically
    // Typescript: coerce to a mutable record
    const headers: Record<string, string> = { ...(authHeaders as Record<string, string>) };
    if ('Content-Type' in headers) delete headers['Content-Type'];
    headers['Accept'] = headers['Accept'] || 'application/json, text/plain, */*';

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      try {
        const err = text ? JSON.parse(text) : {};
        throw new Error(err.message || 'Failed to save community post');
      } catch {
        throw new Error(text || 'Failed to save community post');
      }
    }

    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }

  /**
   * Get community settings from the API
   * @param projectId - The project ID to fetch community settings for
   * @returns Promise with community settings data
   */
  getCommunitySettings(projectId: number): Promise<CommunitySettingsResponse> {
    return apiClient.get(
      `${API_BASE_URL}/setting/api/communities/getCommunitiesSettings?projectId=${projectId}`
    );
  }

  /**
   * Get roles for the project
   * @param projectId - The project ID to fetch roles for
   * @returns Promise with roles data
   */
  getRoles(projectId: number): Promise<RolesResponse> {
    return apiClient.get(
      `${API_BASE_URL}/setting/api/roles?projectId=${projectId}&activeStatus=1`
    );
  }

  /**
   * Delete a community post
   */
  deletePost(projectId: number, postId: number): Promise<any> {
    return apiClient.get(
      `${API_BASE_URL}/transactions/api/community-post/deletePost?projectId=${projectId}&postId=${postId}`
    );
  }

  /**
   * Download a community post (returns a URL in responseData)
   */
  downloadPost(projectId: number, postId: number): Promise<any> {
    return apiClient.get(
      `${API_BASE_URL}/transactions/api/community-post/downloadPost?projectId=${projectId}&postId=${postId}`
    );
  }

  /**
   * Save community settings
   * @param projectId - The project ID to save settings for
   * @param data - The community settings data to save
   * @returns Promise with save response
   */
  updateCommunitySettings(projectId: number, data: any): Promise<any> {
    return apiClient.post(
      `${API_BASE_URL}/setting/api/communities/saveCommunitiesSettings?projectId=${projectId}`,
      data
    );
  }
}

export const communityService = new CommunityService();
export default communityService;