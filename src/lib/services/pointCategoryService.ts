/**
 * Point Category Service
 * 
 * This service handles API calls related to point categories
 */

import apiClient from '../api/apiClient';
import { PointCategoryApiResponse, AddPointCategoryRequest, EditPointCategoryRequest } from '../models/point-category/point-category.model';

// Define API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Point Category Service class
 */
class PointCategoryService {
  /**
   * Get point categories list
   * @param projectId - The project ID to fetch point categories for
   * @returns Promise with point categories data
   */
  async getPointCategories(projectId: number): Promise<PointCategoryApiResponse> {
    return apiClient.get(
      `${API_BASE_URL}/loyalty/api/loyalty/points/v1/fetchPointCategories?projectId=${projectId}`
    );
  }

  /**
   * Add/Edit a point category
   * @param data - The point category data to create/edit
   * @returns Promise with create response
   */
  async addEditPointCategory(data: AddPointCategoryRequest | EditPointCategoryRequest): Promise<any> {
    return apiClient.post(
      `${API_BASE_URL}/loyalty/api/loyalty/points/v1/addEditPointCategory`,
      data
    );
  }

  /**
   * Update a point category (placeholder for future implementation)
   * @param projectId - The project ID
   * @param pointCategoryId - The point category ID to update
   * @param data - The point category data to update
   * @returns Promise with update response
   */
  async updatePointCategory(projectId: number, pointCategoryId: number, data: any): Promise<any> {
    // This endpoint would need to be implemented on the backend
    return apiClient.put(
      `${API_BASE_URL}/loyalty/api/loyalty/points/v1/updatePointCategory?projectId=${projectId}&pointCategoryId=${pointCategoryId}`,
      data
    );
  }

  /**
   * Delete a point category (placeholder for future implementation)
   * @param projectId - The project ID
   * @param pointCategoryId - The point category ID to delete
   * @returns Promise with delete response
   */
  async deletePointCategory(projectId: number, pointCategoryId: number): Promise<any> {
    // This endpoint would need to be implemented on the backend
    return apiClient.delete(
      `${API_BASE_URL}/loyalty/api/loyalty/points/v1/deletePointCategory?projectId=${projectId}&pointCategoryId=${pointCategoryId}`
    );
  }
}

export const pointCategoryService = new PointCategoryService();
export default pointCategoryService;
