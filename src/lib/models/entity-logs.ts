export interface EntityLogDetails {
  response: EntityLogData[];
  totalCount: number;
}

export interface EntityLogData {
  serialNo: string;
  fieldName: string;
  oldValue: string;
  newValue: string;
  performedBy: string;
  dateTime: string;
  event: 0 | 1 | 2; // 0: Deleted, 1: Created, 2: Updated
}

export enum SystemModules {
	CONTACT = 1,
	COMPANY_OR_CUSTOMER = 2,
	OPPORTUNITY = 3,
	USER = 5,
	DATE_TIME = 7,
	APPROVAL = 8,
	ACTIVITY = 100,
	PRODUCTS = 4
}
