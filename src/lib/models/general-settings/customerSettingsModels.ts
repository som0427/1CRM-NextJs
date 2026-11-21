// Customer Settings Models
export interface CustomerSettingsResponse {
  statusCode: number;
  message: string;
  responseData: CustomerSettingsData;
}

export interface CustomerSettingsData {
  userTime: string | null;
  transTimeZone: string | null;
  id: number;
  projectId: number;
  singularName: string;
  pruralName: string;
  serialKey: string;
  serialKeyUpdatedFlag: number;
  sortBy: number;
  enforceLocationCapture: number;
  allowLocationUpdateFromApp?: number;
  allowLocationFromActivity?: number;
  companyOwnerFlag: number;
  chooseCompanyOwnerFlag: number;
  geoFencing: number;
  tolerance: number;
  customerLoginFlag: number;
  customerLoginAccess: CustomerLoginAccess[];
}

export interface CustomerLoginAccess {
  entityFieldId: number;
  value: string;
  roleId: number;
}

export interface CustomerSettingsUpdateRequest {
  projectId: number;
  enforceLocationCapture: number;
  singularName: string;
  pruralName: string;
  id: number;
  sortBy: string;
  chooseCompanyOwnerFlag: string;
  companyOwnerFlag: number;
  allowLocationUpdateFromApp?: number;
  allowLocationFromActivity?: number;
  geoFencing: number;
  tolerance: number;
  serialKey: string;
  customerLoginFlag: number;
  customerLoginAccess: CustomerLoginAccess[];
  userTime: string;
  transTimeZone: string;
}
