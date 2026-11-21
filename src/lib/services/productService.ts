/**
 * Product Service
 * 
 * This service handles API calls related to products including
 * product lookup, search, and data management.
 */

import { ProductEditModel } from '../models/product.model';
import apiClient from '../api/apiClient';
import { UserLocalizationService } from './userLocalizationService';

class ProductService {
  /**
   * 
   * @param projectId 
   * @param lookupId 
   */
  getCustomerProduct(projectId: any, lookupId: number) {
    throw new Error('Method not implemented.');
  }

  /**
   * 
   * @param productId 
   * @param projectId 
   * @returns 
   */
  getParticularProduct(id: number, projectId: number): Promise<{responseData: ProductEditModel[], statusCode: number, message: string}> {
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL + '/transactions/api/product/getProduct?projectId=' + projectId + '&productId=' + id);
  }

  /**
   * @param addDataValues 
   * @returns 
   */
  addEditProduct(addDataValues): Promise<{responseData: any, statusCode: number, message: string}> {
      addDataValues.transTimeZone = UserLocalizationService.getUserTimeZoneCode();
      return apiClient.post(
        process.env.NEXT_PUBLIC_API_URL + '/transactions/api/product/addEditProduct', addDataValues)
    }

  /**
   * Fetch products from the API
   * @param projectId Project ID
   * @returns Array of product items
   */

  getProducts(projectId:number) : Promise<{responseData: any, statusCode: number, message: string}> {
    return apiClient.post(process.env.NEXT_PUBLIC_API_URL + '/transactions/api/product/getProductLookup?projectId='+projectId, []);
  }
 
  getProductswithFilters(projectId:number, filters: any[] = []) : Promise<{responseData: any, statusCode: number, message: string}> {
    return apiClient.post(process.env.NEXT_PUBLIC_API_URL + '/transactions/api/product/getProductLookup?projectId='+projectId, filters);
  }

 
}

// Create a singleton instance
const productService = new ProductService();
export default productService;