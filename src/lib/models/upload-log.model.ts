export interface UploadLogApiResponse {
  statusCode: number;
  message: string;
  responseData: UploadLogApiItem[];
}

export interface UploadLogApiItem {
  uploadedBy: string;
  uploadedOn: string;
  records: number;
  expiresIn: string;
  entity: string;
  actionType:string;
  status: string; // "2" | "1" | "0"
  uploadedFileUrl: string;
  responseFileUrl: string;
}

export type UploadLogStatus = 'Completed' | 'In Progress' | 'Failed';

export interface UploadLogItem {
  uploadedBy: string;
  uploadedOn: string;
  records: number;
  expiresIn: string;
  entity: string;
  actionType: string;
  status: UploadLogStatus;
  uploadedFileUrl: string;
  responseFileUrl: string;
}

export const mapStatus = (status: string): UploadLogStatus => {
  if (status === '2') return 'Completed';
  if (status === '1') return 'In Progress';
  return 'Failed';
};
