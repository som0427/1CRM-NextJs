/**
 * User Model
 * 
 * This model matches the structure from the Angular application's User model
 * to ensure consistent login behavior between the applications.
 */
export interface User {
  id?: string | number;
  username?: string;
  password?: string;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  roles?: any[];
  pic?: string;
  fullname?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  occupation?: string;
  companyName?: string;
  phone?: string;
  role?: string; // Required for compatibility with UserData interface
  
  // Project-related properties
  projectId?: number;
  selectedProjectId?: number;
  selectedProject?: {
    id: number;
    name?: string;
    [key: string]: any;
  };
  
  // Additional properties
  userPermissions?: string[];
  isActive?: boolean;
  
  // Allow for any additional properties
  [key: string]: any;
}
