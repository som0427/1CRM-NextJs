// Product data model - matching API response structure
export interface ProductData {
  id: string | number;
  productId?: number;
  projectId?: number;
  serialNo?: string | null;
  productName?: string;
  price?: number;
  status?: number;
  // Allow for additional fields
  [key: string]: any;
}

// Product edit model for API operations
export interface ProductEditModel {
  id?: string | number;
  productId?: string | number;
  serialNo?: string;
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  sku?: string;
  type?: string;
  status?: string;
  data?: any[];
  // Allow for dynamic custom fields
  [key: string]: any;
}