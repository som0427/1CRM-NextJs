// Point Category data model - matching API response structure
export interface PointCategoryData {
  id: number; // same as pointCategoryId for grid id
  pointCategoryId: number;
  name: string;
  pointCategoryType: string; // "CREDIT" or "DEBIT"
  description?: string;
  status: number; // 1 for active, 0 for inactive
  // Allow for additional fields
  [key: string]: any;
}

// API Response structure
export interface PointCategoryApiResponse {
  statusCode: number;
  message: string;
  responseData: PointCategoryApiData[];
}

// API Data structure (raw from API)
export interface PointCategoryApiData {
  name: string;
  pointCategoryId: number;
  pointCategoryType: string;
  description?: string;
  status: number;
}

// Add Point Category request model
export interface AddPointCategoryRequest {
  projectId: number;
  name: string;
  description: string;
  status: number;
  pointCategoryType: "CREDIT" | "DEBIT";
}

// Edit Point Category request model (extends Add with pointCategoryId)
export interface EditPointCategoryRequest extends AddPointCategoryRequest {
  pointCategoryId: number;
}

// Optional edit model placeholder (for future use)
export interface PointCategoryEditModel {
  pointCategoryId: number;
  name?: string;
  pointCategoryType?: string;
  description?: string;
  status?: number;
  [key: string]: any;
}
