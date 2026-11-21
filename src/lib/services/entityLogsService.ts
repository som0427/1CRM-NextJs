import { EntityLogDetails } from '../models/entity-logs';
import apiClient from './apiClient';

export interface GeneralResponse<T> {
  statusCode: number;
  message: string;
  responseData: T;
}

export interface EntityLogsFilterRule {
  entityFieldId: number;
  operatorId: number;
  value: string | null;
  fromValue: string | null;
  toValue: string | null;
}

export interface EntityLogsRequestBody {
  projectId: number;
  moduleType: number;
  pageSize: number;
  pageNumber: number;
  filters?: EntityLogsFilterRule[];
}

export const getEntityLogs = (body: EntityLogsRequestBody): Promise<GeneralResponse<EntityLogDetails>> => {
  return apiClient.post(
    process.env.NEXT_PUBLIC_API_URL + 
    '/upload/api/entity-logs/getEntityLogs',
    body
  );
};
