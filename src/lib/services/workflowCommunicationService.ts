// Workflow Communication Service - Functional React version
// Manages shared workflow state: trigger map, entity list, workflow details

import { SystemModules } from '@/lib/models/entity-logs';

// Types
export interface EntityList {
  id: number;
  entityName: string;
  isActivity: boolean;
  isActive: boolean;
  allowForCustomer?: boolean;
  allowForOpportunity?: boolean;
}

export interface WorkflowDetails {
  id?: number;
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

export interface Node {
  id?: number;
  type?: string;
  children?: Node[];
  [key: string]: any;
}

export interface ActivityEntity {
  activityId: number;
  activityName: string;
  allowForCompanies: number;
  allowForOpportunities: number;
  active: number;
}

export interface SingularNames {
  customers?: string;
  opportunities?: string;
  contacts?: string;
  Customers?: string;
  Opportunities?: string;
  Contacts?: string;
  [key: string]: string | undefined;
}

// State storage
let wfDetails: WorkflowDetails | null = null;
let tree: Node[] | null = null;
let triggerMap: Map<number, { key: number; value: string }[]> | null = null;
let entityList: EntityList[] | null = null;
let activityEntityList: ActivityEntity[] | null = null;
let isOpportunityDisable: boolean = false;

// Email body templates
export const email_body_prefix: string = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title></title><style>p{margin: 0.1rem 0 !important;}.ql-indent-1{padding-left: 3em;}.ql-indent-2{padding-left: 6em;}.ql-indent-3{padding-left: 9em;}.ql-indent-4{padding-left: 12em;}.ql-indent-5{padding-left: 15em;}.ql-indent-6{padding-left: 18em;}.ql-indent-7{padding-left: 21em;}.ql-indent-8{padding-left: 24em;}.ql-size-small{font-size: .75em;}.ql-size-large{font-size: 1.5em;}.ql-size-huge{font-size: 2.5em;}.ql-font-serif{font-family: Georgia,Times New Roman,serif;}.ql-font-monospace{font-family: Monaco,Courier New,monospace;}.ql-align-center{text-align: center;}.ql-align-right{text-align: right;}.ql-align-justify{text-align: justify;}</style></head><body>';
export const email_body_postfix: string = '</body></html>';

// Getters
export const getWorkflowDetails = (): WorkflowDetails | null => wfDetails;
export const getTree = (): Node[] | null => tree;
export const getTriggerMap = (): Map<number, { key: number; value: string }[]> | null => triggerMap;
export const getEntityList = (): EntityList[] | null => entityList;
export const getActivityEntityList = (): ActivityEntity[] | null => activityEntityList;
export const getIsOpportunityDisable = (): boolean => isOpportunityDisable;

// Setters
export const setWorkflowDetails = (details: WorkflowDetails): void => {
  wfDetails = details;
};

export const setTree = (newTree: Node[]): void => {
  tree = newTree;
};

export const setTriggerMap = (workflowTriggerMap: any): void => {
  triggerMap = new Map();
  for (const property in workflowTriggerMap) {
    triggerMap.set(+property, workflowTriggerMap[property]);
  }
};

export const setEntityList = (
  singularNames: SingularNames,
  activityList: ActivityEntity[]
): void => {
  // Support both capitalized and lowercase keys for compatibility
  const customers = singularNames.Customers || singularNames.customers;
  const opportunities = singularNames.Opportunities || singularNames.opportunities;
  const contacts = singularNames.Contacts || singularNames.contacts;

  isOpportunityDisable = opportunities === undefined;
  
  entityList = [
    {
      id: SystemModules.COMPANY_OR_CUSTOMER,
      entityName: customers === undefined ? 'Customer' : customers,
      isActivity: false,
      isActive: customers !== undefined,
    },
    {
      id: SystemModules.OPPORTUNITY,
      entityName: opportunities === undefined ? 'Opportunity' : opportunities,
      isActivity: false,
      isActive: opportunities !== undefined,
    },
    {
      id: SystemModules.CONTACT,
      entityName: contacts === undefined ? 'Contact' : contacts,
      isActivity: false,
      isActive: contacts !== undefined,
    },
    {
      id: SystemModules.DATE_TIME,
      entityName: 'Date Time',
      isActivity: false,
      isActive: true,
    },
    {
      id: SystemModules.USER,
      entityName: 'User',
      isActivity: false,
      isActive: true,
    },
  ];

  activityEntityList = activityList;
  
  activityList.forEach((x) => {
    entityList!.push({
      id: x.activityId,
      entityName: x.activityName,
      isActivity: true,
      isActive: x.active === 1,
      allowForCustomer: x.allowForCompanies === 1,
      allowForOpportunity: x.allowForOpportunities === 1,
    });
  });
};

// Destroy all state
export const destroyAll = (): void => {
  tree = null;
  wfDetails = null;
  triggerMap = null;
  entityList = null;
  activityEntityList = null;
  isOpportunityDisable = false;
};

// Export as default object for convenience
const workflowCommunicationService = {
  // Getters
  getWorkflowDetails,
  getTree,
  getTriggerMap,
  getEntityList,
  getActivityEntityList,
  getIsOpportunityDisable,
  
  // Setters
  setWorkflowDetails,
  setTree,
  setTriggerMap,
  setEntityList,
  
  // Cleanup
  destroyAll,
  
  // Constants
  email_body_prefix,
  email_body_postfix,
};

export default workflowCommunicationService;
