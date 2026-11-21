/**
 * Contact Settings Models
 * 
 * This file contains TypeScript interfaces and types for contact settings
 * API requests and responses.
 */

export interface ContactSettingsData {
  id: number;
  projectId: number;
  singularName: string;
  pruralName: string;
  ownershipFlag: number;
  serialKey: string;
  serialKeyUpdatedFlag: number;
  createdBy: number;
  updatedBy: number;
}

export interface ContactSettingsResponse {
  statusCode: number;
  message: string;
  responseData: ContactSettingsData;
}

export interface ContactSettingsUpdateRequest {
  projectId: number;
  singularName: string;
  pruralName: string;
  id: number;
  ownershipFlag: string;
  serialKey: string;
  userTime: string;
  transTimeZone: string;
}