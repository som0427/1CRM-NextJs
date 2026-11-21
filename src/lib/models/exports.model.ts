export interface ExportsApiResponse {
  statusCode: number;
  message: string;
  responseData: ExportsApiItem[];
}

export interface ExportsApiItem {
  projectId: number;
  exportedById: number;
  exportedByName: string;
  daysUntilExpiration: string; // e.g. "4" or "3"
  exportTimestamp: string; // e.g. "10 October, 2025 at 05:56 AM"
  reportName: string; // e.g. "Detailed Activity Report - QR Code Details"
  dateRange: string; // e.g. "08 Oct 25 - 09 Oct 25"
  status: number; // 1=Completed, 2=In Progress, 0=Failed (assumption)
  filePath: string; // S3 key or absolute URL
}

export type ExportStatus = 'Completed' | 'In Progress' | 'Failed';

export interface ExportItem {
  exportedBy: string;
  exportedAt: string;
  expiresIn: string; // e.g. "4 days"
  report: string;
  dateRange: string;
  status: ExportStatus;
  filePath: string;
}

export const mapExportStatus = (status: number): ExportStatus => {
  if (status === 1) return 'Completed';
  if (status === 0) return 'In Progress';
  return 'Failed';
};
