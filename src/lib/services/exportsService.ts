import apiClient from './apiClient';
import { ExportsApiResponse, ExportItem, mapExportStatus } from '../models/exports.model';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function getExports(projectId: number): Promise<ExportItem[]> {
  try {
    // Using full URL as provided by requirement. apiClient will respect absolute paths.
    const url = `${BASE_URL}/reportsfetcher/api/getDownloadedReportData`;
    const response = await apiClient.get<ExportsApiResponse>(url, { projectId });

    if (response && Array.isArray(response.responseData)) {
      return response.responseData.map((item) => {
        const daysStr = item.daysUntilExpiration ?? '';
        const daysNum = Number(daysStr);
        const expiresIn = isNaN(daysNum) ? '' : `${daysNum} day${daysNum === 1 ? '' : 's'}`;

        return {
          exportedBy: item.exportedByName ?? '',
          exportedAt: item.exportTimestamp ?? '',
          expiresIn,
          report: item.reportName ?? '',
          dateRange: item.dateRange ?? '',
          status: mapExportStatus(item.status ?? 0),
          filePath: item.filePath ?? '',
        } as ExportItem;
      });
    }

    return [];
  } catch (error) {
    console.error('Error fetching exports:', error);
    return [];
  }
}

const exportsService = {
  getExports,
};

export default exportsService;
