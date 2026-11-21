// API Response Interface
export interface DocumentApiData {
  id: number;
  projectId: number;
  type: number; // 0 = folder, 1 = document
  name: string;
  path: string[];
  filePath: string;
  shareWith: number; // 1 = user, 2 = roles
  accessIds: string;
  heirarchyIds: string;
  fileSize: string | null;
  parentId: number | null;
  status: number; // 1 = active, 0 = inactive
  displayOrder: number;
}

// Normalized Interface for UI
export interface DocumentData {
  id: number;
  name: string;
  type: 'folder' | 'document';
  sharedWith: string;
  status: 'Active' | 'Inactive';
  size?: string;
  modifiedDate?: string;
  owner?: string;
  parentId?: number | null;
  level: number;
  isExpanded?: boolean;
  displayOrder: number;
  accessIds: string;
  filePath: string;
  path: string;
  actions?: string;
}

export interface DocumentResponse {
  content: DocumentData[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

export interface DocumentTreeNode extends DocumentData {
  isExpanded: boolean;
  children: DocumentTreeNode[];
}

export interface DocumentFilter {
  searchTerm?: string;
  status?: string;
  type?: 'folder' | 'document' | 'all';
  sharedWith?: string;
}

export interface DocumentExportRequest {
  advanceSearch?: any;
  isFirstAdvSearch?: boolean;
}

// Add/Edit Folder Request Interface
export interface AddFolderRequest {
  projectId: number;
  parentId: number;
  name: string;
  shareWith: number; // 0 = None, 1 = Selected Role, 2 = Selected User
  accessIds: string; // Comma-separated IDs
  heirarchyIds: string;
  filePath: string;
  isActive: number; // 1 = active, 0 = inactive
  type: number; // 0 = folder, 1 = document
  displayOrder: number;
}

// Add/Edit File Request Interface
export interface AddFileRequest {
  projectId: number;
  parentId: number;
  name: string;
  shareWith: number; // 0 = None, 1 = Selected Role, 2 = Selected User
  accessIds: string; // Comma-separated IDs
  heirarchyIds: string;
  filePath: string;
  isActive: number; // 1 = active, 0 = inactive
  type: number; // 0 = folder, 1 = document
  displayOrder: number;
  fileData?: File; // Optional file data for file uploads
}

// API response model for document operations
export interface DocumentApiResponse<T = any> {
  statusCode: number;
  message: string;
  responseData: T;
}

// Pagination model
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
}