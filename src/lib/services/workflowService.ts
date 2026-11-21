import apiClient from './apiClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface WorkflowListResponse {
  statusCode: number;
  message: string;
  responseData?: {
    workflowList?: any[];
    workflowTriggerMap?: Record<string, any>;
  };
}

export interface WorkflowDetails {
  id?: number;
  serialNo?: string;
  name?: string;
  workflowDescription?: string;
  entityId?: number;
  triggerId?: number;
  triggerFieldId?: number | null;
  status?: number;
  projectId?: number;
  description?: string | null;
  startDate?: string | null;
  startTime?: string | null;
  startAtAm?: number;
  repeatOn?: string | null;
  repeatFrequency?: string | null;
  endDate?: string | null;
  endTime?: string | null;
  endAtAm?: number;
  repeatedOn?: number[] | null;
}

export interface AddEditNode {
  nodeId?: number;
  workflowId?: number;
  parentNodeId?: number;
  nodeType?: number;
  actionType?: number;
  nodeDetails?: any;
  [key: string]: any;
}

export interface WorkflowResponse {
  statusCode: number;
  message: string;
  responseData?: {
    workflowDetails?: WorkflowDetails;
    workflowStructure?: any;
  };
}

// Workflow Service - All API methods
const getWorkflowList = (projectId: number): Promise<WorkflowListResponse> => {
  return apiClient.get(
    `${API_BASE_URL}/transactions/api/workflows/fetchWorkflows?projectId=${projectId}`
  );
};

const createOrUpdateWorkflow = (editWorkflowData: WorkflowDetails): Promise<WorkflowResponse> => {
  return apiClient.post(
    `${API_BASE_URL}/transactions/api/workflows/createOrUpdateWorkflow`,
    editWorkflowData
  );
};

const addOrEditNode = (addEditNode: AddEditNode) => {
  return apiClient.post(
    `${API_BASE_URL}/transactions/api/workflows/createOrUpdateNode`,
    addEditNode
  );
};

const addNodeInMiddle = (addNode: AddEditNode) => {
  return apiClient.post(
    `${API_BASE_URL}/transactions/api/workflows/addNodeInMiddle`,
    addNode
  );
};

const getActionTypes = () => {
  return apiClient.get(
    `${API_BASE_URL}/transactions/api/workflows/fetchActions`
  );
};

const getWorkflowStructure = (wfId: number) => {
  return apiClient.get(
    `${API_BASE_URL}/transactions/api/workflows/fetchWorkflowStructure?workflowId=${wfId}`
  );
};

const fetchActiveUserList = (projectId: number) => {
  return apiClient.get(
    `${API_BASE_URL}/login/api/users?activeStatus=1&projectId=${projectId}`
  );
};

const fetchNodeDetails = (nodeId: number) => {
  return apiClient.get(
    `${API_BASE_URL}/transactions/api/workflows/fetchNodeDetails?nodeId=${nodeId}`
  );
};

const fetchPreviousConditionNode = (workflowId: number, nodeId: number) => {
  return apiClient.get(
    `${API_BASE_URL}/transactions/api/workflows/fetchPreviousConditionNodeDetails?workflowId=${workflowId}&nodeId=${nodeId}`
  );
};

const updateWorkflowStatus = (wfId: number, wfStatus: boolean) => {
  return apiClient.post(
    `${API_BASE_URL}/transactions/api/workflows/activeOrInactiveWorkflow?workflowId=${wfId}&status=${wfStatus}`,
    null
  );
};

const deleteNode = (nodeId: number, shouldDeleteHierarchy: boolean, keepRightSide: boolean) => {
  return apiClient.delete(
    `${API_BASE_URL}/transactions/api/workflows/deleteNode?nodeId=${nodeId}&shouldDeleteHierarchy=${shouldDeleteHierarchy}&keepRightSide=${keepRightSide}`
  );
};

const getFields = (projectId: number, moduleType: number) => {
  return apiClient.get(
    `${API_BASE_URL}/transactions/api/customType/getFields?projectId=${projectId}&moduleType=${moduleType}`
  );
};

const getApprovalFieldDetail = (projectId: number, moduleType: number) => {
  return apiClient.get(
    `${API_BASE_URL}/transactions/api/workflows/approval/fetchApprovalFieldDetail?projectId=${projectId}&moduleType=${moduleType}`
  );
};

const getApprovalFieldDetailForEdit = (projectId: number, moduleType: number, approvalId: number) => {
  return apiClient.get(
    `${API_BASE_URL}/transactions/api/workflows/approval/fetchApprovalFieldDetail?projectId=${projectId}&moduleType=${moduleType}&approvalId=${approvalId}`
  );
};

const getActivityNames = (projectId: number) => {
  return apiClient.get(
    `${API_BASE_URL}/transactions/api/activities/manageActivities/?projectId=${projectId}`
  );
};

const getOperatorList = () => {
  return apiClient.get(
    `${API_BASE_URL}/transactions/api/workflows/fetchConditionOperators`
  );
};

const getActiveRoleList = (projectId: number) => {
  return apiClient.get(
    `${API_BASE_URL}/setting/api/roles/?projectId=${projectId}&activeStatus=1`
  );
};

const getApprovalStatusList = () => {
  return apiClient.get(
    `${API_BASE_URL}/transactions/api/workflows/approval/fetchApprovalStatus`
  );
};

const checkPossibilityOfApprovalActionDeletion = (approvalActionId: number) => {
  return apiClient.get(
    `${API_BASE_URL}/transactions/api/workflows/canDeleteApprovalAction?approvalActionId=${approvalActionId}`
  );
};

const fetchApprovalNodeListUpHierarchy = (workflowId: number, nodeId: number) => {
  return apiClient.get(
    `${API_BASE_URL}/transactions/api/workflows/fetchApprovalNodeListUpHierarchy?workflowId=${workflowId}&nodeId=${nodeId}`
  );
};

const getModuleFieldsByParentNodeId = (projectId: number, parentNodeId: number, workflowId: number) => {
  return apiClient.get(
    `${API_BASE_URL}/transactions/api/workflows/fetchEntityFieldForDateTimeWorkFlow?projectId=${projectId}&nodeId=${parentNodeId}&workflowId=${workflowId}`
  );
};

const fetchCustomOperatorOptions = (operatorId: number) => {
  return apiClient.get(
    `${API_BASE_URL}/transactions/api/workflows/fetchCustomOperatorOptions?operatorId=${operatorId}`
  );
};

const fetchModuleFields = (projectId: number, moduleType: number) => {
  return apiClient.get(
    `${API_BASE_URL}/transactions/api/workflows/fetchModuleFields?projectId=${projectId}&moduleType=${moduleType}`
  );
};

const getFieldRelation = (attributeId: number, attributeLookupId: number) => {
  return apiClient.get(
    `${API_BASE_URL}/setting/api/customType/getChildAttributes?attributeId=${attributeId}&attributeLookupId=${attributeLookupId}`
  );
};

const fetchNotificationSendToOptions = (workflowId: number, nodeId: number, projectId: number) => {
  return apiClient.get(
    `${API_BASE_URL}/transactions/api/workflows/fetchNotificationSendToOptions?workflowId=${workflowId}&nodeId=${nodeId}&projectId=${projectId}`
  );
};

const fetchApprovalPlaceholder = (workflowId: number, nodeId: number) => {
  return apiClient.get(
    `${API_BASE_URL}/transactions/api/workflows/fetchApprovalForPlaceholder?workflowId=${workflowId}&nodeId=${nodeId}`
  );
};

const workflowService = {
  getWorkflowList,
  createOrUpdateWorkflow,
  addOrEditNode,
  addNodeInMiddle,
  getActionTypes,
  getWorkflowStructure,
  fetchActiveUserList,
  fetchNodeDetails,
  fetchPreviousConditionNode,
  updateWorkflowStatus,
  deleteNode,
  getFields,
  getApprovalFieldDetail,
  getApprovalFieldDetailForEdit,
  getActivityNames,
  getOperatorList,
  getActiveRoleList,
  getApprovalStatusList,
  checkPossibilityOfApprovalActionDeletion,
  fetchApprovalNodeListUpHierarchy,
  getModuleFieldsByParentNodeId,
  fetchCustomOperatorOptions,
  fetchModuleFields,
  getFieldRelation,
  fetchNotificationSendToOptions,
  fetchApprovalPlaceholder,
};

export default workflowService;
