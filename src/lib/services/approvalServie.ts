import apiClient from "./apiClient";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Interfaces for approval update payload
export interface CustomAttributeValue {
  attributeId: number;
  parentLinkedDatalistAttribId: number | null;
  value: Array<{ name: string; id?: number }>;
  productFormData?: Array<{
    formMasterId: number;
    value: Array<{ id: number; name: string | number }>;
  }>;
  productFormSummaryDiscountData?: {
    value: string;
    percent: string;
  };
}

export interface ActivityRequestDTO {
  activityId: number;
  appVersion?: string | null;
  deviceInfo?: string | null;
  gps?: string | null;
  isActive: number;
  projectId: number;
  moduleType: number;
  userTime: string;
  transTimeZone: string;
  customAttributeValues: CustomAttributeValue[];
}

export interface CompanyRequestDTO {
  companyId: number;
  appVersion?: string | null;
  deviceInfo?: string | null;
  gps?: string | null;
  isActive: number;
  projectId: number;
  moduleType: number;
  userTime: string;
  transTimeZone: string;
  customAttributeValues: CustomAttributeValue[];
}

export interface ContactRequestDTO {
  contactId: number;
  appVersion?: string | null;
  deviceInfo?: string | null;
  gps?: string | null;
  isActive: number;
  projectId: number;
  userTime: string;
  transTimeZone: string;
  customAttributeValues: CustomAttributeValue[];
}

export interface OpportunityRequestDTO {
  opportunityId: number;
  appVersion?: string | null;
  deviceInfo?: string | null;
  gps?: string | null;
  isActive: number;
  projectId: number;
  transTimeZone: string;
  customAttributeValues: CustomAttributeValue[];
}

export interface ApprovalUpdatePayload {
  approvalId: number;
  approvalAction: number;
  approvalRemarks: string | null;
  projectId: number;
  allowEditing: number; // 1 if advanceSetting enabled, 0 otherwise
  activityRequestDTO?: ActivityRequestDTO;
  companyRequestDTO?: CompanyRequestDTO;
  contactRequestDTO?: ContactRequestDTO;
  opportunityRequestDTO?: OpportunityRequestDTO;
}

class ApprovalService{
    getAllPendingApproval(projectId:Number): Promise<{responseData: any[], statusCode: number, message: string}>
    {
      return apiClient.get(API_BASE_URL+'/transactions/api/approvals/pending?projectId=' + projectId);
    }

    getAllCompletedApproval(projectId:Number): Promise<{responseData: any[], statusCode: number, message: string}>
    {
      return apiClient.get(API_BASE_URL+'/transactions/api/approvals/completed?projectId=' + projectId);
    }

    // Get action options for a specific approval
    getActionOptions(projectId: number, approvalId: number): Promise<{responseData: any[], statusCode: number, message: string}>
    {
      return apiClient.get(API_BASE_URL+`/transactions/api/approvals/fetchActionOptions?projectId=${projectId}&approvalId=${approvalId}`);
    }

    // Get field visibility config for approval
    getApprovalFieldVisibilityConfig(projectId: number, moduleType:number, approvalId: number): Promise<{responseData: any[], statusCode: number, message: string}>
    {
      return apiClient.get(API_BASE_URL+`/transactions/api/workflows/approval/fetchApprovalFieldDetail?projectId=${projectId}&moduleType=${moduleType}&approvalId=${approvalId}`);
    }

    // Submit approval update with form data (matching Angular API)
    updateApproval(payload: ApprovalUpdatePayload): Promise<{responseData: any, statusCode: number, message: string}>
    {
      return apiClient.post(API_BASE_URL+'/transactions/api/approvals/update', payload);
    }

    // Legacy: Submit approval action without form data (approve/reject/etc)
    submitApprovalAction(payload: {
      approvalId: number;
      actionId: number;
      remarks?: string;
      entityData?: any;
    }): Promise<{responseData: any, statusCode: number, message: string}>
    {
      return apiClient.post(API_BASE_URL+'/transactions/api/approvals/action', payload);
    }
}

const approvalService = new ApprovalService();
export default approvalService;