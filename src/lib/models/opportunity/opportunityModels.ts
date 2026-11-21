export interface OpportunityData {
  id: number;
  serialNo: string;
  name: string;
  value: number;
  customer: string;
  stage: string;
  probability: number;
  expectedCloseDate: string;
  owner: string;
  status: string;
  contacts?: any | null; // Optional contacts property for API integration
}

// API response model for paginated opportunity data
export interface OpportunityResponse {
  content: OpportunityData[];
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
