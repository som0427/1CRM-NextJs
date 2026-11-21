/**
 * Models related to customer data and API responses
 */

// Customer data model
export interface CustomerData {
  id: number;
  serialNo?: string;
  name: string;
  type: string;
  category: string;
  owner: string;
  status: string;
  email?: string;
}

// API response model for paginated customer data
export interface CustomerResponse {
  content: CustomerData[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
}

// Pagination model that can be used across the application
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
}
