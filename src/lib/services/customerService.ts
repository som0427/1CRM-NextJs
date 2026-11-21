/**
 * Customer Service
 * 
 * This service handles API calls related to customers including
 * grid view data and customer management.
 */

import apiClient from "../api/apiClient";
import { companiesModel } from "../models/companies.model";
import { UserLocalizationService } from './userLocalizationService';

// Customer data interfaces
export interface CustomerData {
  id?: number;
  companyId?: number; // API may return companyId instead of id
  serialNo?: string;
  name?: string;
  companyName?: string; // API may return companyName instead of name
  type?: string;
  companyType?: string; // API may return companyType instead of type
  category?: string;
  companyCategory?: string; // API may return companyCategory instead of category
  owner?: string;
  ownerName?: string; // API may return ownerName instead of owner
  status?: string;
  companyStatus?: string; // API may return companyStatus instead of status
  email?: string;
  companyEmail?: string; // API may return companyEmail instead of email
}

export interface CustomerResponse {
  content: CustomerData[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
}

export interface CustomerEditModel {
  id?: number;
  name: string;
  email?: string;
  type?: string;
  category?: string;
  status?: string;
  // Add other fields as needed for customer edit/create operations
}

export interface CustomerGridViewModel {
  id: number;
  name: string;
  type: string;
  category: string;
  owner: string;
  status: string;
  // Additional fields needed for grid view
}

export interface CustomerContactModel {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  // Additional fields for contacts
}

/**
 * Customer Service class
 */
class CustomerService {
  getCustomersFilter(projectId: number, customerView: number, pageNumber: number, pageSize: number,includeSelf:boolean = false, data = null): Promise<{responseData: any, statusCode: number, message: string}> {
    return apiClient.post(process.env.NEXT_PUBLIC_API_URL + '/transactions/api/company/v3/getCompanyLookupSelfOrTeam?projectId='+projectId+'&customerView='+customerView+'&pageNumber='+pageNumber+'&pageSize='+pageSize+'&includeSelf='+includeSelf, data);
  }
  getTotalCountOfCompany(projectId:number, viewMode:number, includeSelf = false): Promise<{responseData: any, statusCode: number, message: string}> {
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL + '/transactions/api/company/v3/getCompanyLookupBasedOnCustomerViewCount?projectId='+projectId+'&customerView='+viewMode+'&includeSelf='+includeSelf);
}

  /**
   * Get company ID and name for dropdowns/selectors
   * @param projectId - Project ID
   * @param moduleType - Module type
   * @param customerView - Customer view (default 3)
   * @returns Promise with company list data
   */
  getCompanyIdName(projectId: number, moduleType: number, customerView: number = 3): Promise<{responseData: companiesModel[], statusCode: number, message: string}> {
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL + '/transactions/api/company/getCompanyIdName?projectId=' + projectId + '&moduleType=' + moduleType + '&customerView=' + customerView);
  }

  addEditCustomer(addDataValues): Promise<{responseData: any, statusCode: number, message: string}> {
    addDataValues.transTimeZone = UserLocalizationService.getUserTimeZoneCode();
    return apiClient.post(
      process.env.NEXT_PUBLIC_API_URL + '/transactions/api/company/addEditCompany', addDataValues)
  }

  addCustomer(addDataValues): Promise<{responseData: any, statusCode: number, message: string}> {
    addDataValues.transTimeZone = UserLocalizationService.getUserTimeZoneCode();
    return apiClient.post(
      process.env.NEXT_PUBLIC_API_URL + '/transactions/api/company/addEditCustomer', addDataValues)
  }

  updateCustomer(updateDataValues): Promise<{responseData: any, statusCode: number, message: string}> {
    updateDataValues.transTimeZone = UserLocalizationService.getUserTimeZoneCode();
    return apiClient.post(
      process.env.NEXT_PUBLIC_API_URL + '/transactions/api/company/addEditCustomer', updateDataValues)
  }

  getParticularCustomer(id: number, projectId: number): Promise<{responseData: any, statusCode: number, message: string}> {
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL + '/transactions/api/company/getCompany?projectId=' + projectId + '&companyId=' + id);
  }

  /**
   * Export customers data
   * @param projectId - Project ID
   * @param viewMode - 1 for table view, 2 for grid view
   * @param moduleType - Module type (4 for customers)
   * @param reportId - Report ID (-5 for customers)
   * @returns Promise with API response containing status and message
   */
  exportCustomers(projectId: number, viewMode: number, data: any = null, moduleType: number = 4, reportId: number = -5): Promise<{statusCode: number, message: string, responseData: string}> {
    return apiClient.post(
      process.env.NEXT_PUBLIC_API_URL + '/reportsfetcher/api/export-data/generate-entity-report?projectId=' + 
      projectId + '&moduleType=' + moduleType + '&reportId=' + reportId + '&viewMode=' + viewMode,
      data
    );
  }
}

/**
 * Mock data for development and testing
 * Kept separate from service for clean code organization
 */
export const mockCustomers: CustomerData[] = [
  { id: 1, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'A', owner: 'Vaibhav', status: 'Active' },
  { id: 2, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'B', owner: 'Vaibhav', status: 'Active' },
  { id: 3, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'C', owner: 'Vaibhav', status: 'Active' },
  { id: 4, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'A', owner: 'Vaibhav', status: 'Active' },
  { id: 5, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'C', owner: 'Vaibhav', status: 'Inactive' },
  { id: 6, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'C', owner: 'Vaibhav', status: 'Active' },
  { id: 7, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'C', owner: 'Vaibhav', status: 'Active' },
  { id: 8, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'C', owner: 'Vaibhav', status: 'Active' },
  { id: 9, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'C', owner: 'Vaibhav', status: 'Active' },
  { id: 10, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'A', owner: 'Vaibhav', status: 'Active' },
  { id: 11, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'A', owner: 'Vaibhav', status: 'Active' },
  { id: 12, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'B', owner: 'Vaibhav', status: 'Active' },
  { id: 13, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'C', owner: 'Vaibhav', status: 'Active' },
  { id: 14, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'A', owner: 'Vaibhav', status: 'Active' },
  { id: 15, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'C', owner: 'Vaibhav', status: 'Inactive' },
  { id: 16, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'C', owner: 'Vaibhav', status: 'Active' },
  { id: 17, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'C', owner: 'Vaibhav', status: 'Active' },
  { id: 18, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'C', owner: 'Vaibhav', status: 'Active' },
  { id: 19, serialNo: '(Serial No)', name: '(Customer Name)', type: '(Customer Type)', category: 'C', owner: 'Vaibhav', status: 'Active' },
];

// Create a singleton instance
const customerService = new CustomerService();
export default customerService;
