// Opportunity Settings Models
export interface OpportunitySettingsResponse {
  statusCode: number;
  message: string;
  responseData: OpportunitySettingsData;
}

export interface OpportunitySettingsData {
  userTime: string | null;
  transTimeZone: string | null;
  projectId: number;
  singularName: string;
  pruralName: string;
  enforceLiveLocCapture: number;
  allowLocationUpdateFromApp?: number;
  allowLocationFromActivity?: number;
  showOpportunityTabInCustomerApp?: number;
  enableOpportunityFeature: number;
  serialKey: string;
  serialKeyUpdatedFlag: number;
  opportunityOwnerFlag: number;
  customerOwnerUserFlag: number;
  customerOwnerUpHierarchyFlag: number;
  customerOwnerDownHierarchyFlag: number;
  customerOwnerAnyUserFlag: number;
  updatedBy: number;
}

export interface OpportunitySettingsFormData {
  enableOpportunityFeature: boolean;
  enforceLiveLocCapture: boolean;
  allowLocationUpdateFromApp?: boolean;
  allowLocationFromActivity?: boolean;
  showOpportunityTabInCustomerApp?: boolean;
  singularName: string;
  pruralName: string;
  serialKey: string;
  opportunityOwnerFlag: number;
  customerOwnerUserFlag: boolean;
  customerOwnerUpHierarchyFlag: boolean;
  customerOwnerDownHierarchyFlag: boolean;
  customerOwnerAnyUserFlag: boolean;
}
