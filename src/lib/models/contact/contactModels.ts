// Contact data model - updated for flexible API response structure
export interface ContactData {
  id: string | number;
  serialNo?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  type?: string;
  status?: string;
  // Allow for dynamic custom fields
  [key: string]: any;
}


