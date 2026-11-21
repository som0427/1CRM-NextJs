/**
 * Support Settings Models
 * 
 * TypeScript interfaces for support settings API requests and responses
 */

export interface OptionItem {
  value: string | number;
  label: string;
}

export const dayOptions: OptionItem[] = [
  { value: 1, label: 'Sunday' },
  { value: 2, label: 'Monday' },
  { value: 3, label: 'Tuesday' },
  { value: 4, label: 'Wednesday' },
  { value: 5, label: 'Thursday' },
  { value: 6, label: 'Friday' },
  { value: 7, label: 'Saturday' }
];


export interface SupportSettingsData {
  id: number;
  projectId: number;
  enableChatSupport: number;
  tollFreeNumber: string;
  supportEmail: string;
  fromDay: number;
  toDay: number;
  fromTime: string;
  toTime: string;
}

export interface SupportSettingsResponse {
  statusCode: number;
  message: string;
  responseData: SupportSettingsData;
}

export interface SupportSettingsUpdateRequest {
  projectId: number;
  enableChatSupport: number;
  tollFreeNumber: string;
  supportEmail: string;
  fromDay: number;
  toDay: number;
  fromTime: string;
  toTime: string;
  userTime: string;
  transTimeZone: string;
}