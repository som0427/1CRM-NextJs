import apiClient from './apiClient';
import { ExportReport } from '../models/export-report-model';

class PointsBalanceReportService {
  getPointsBalanceReport(
    projectId: number
  ): Promise<{ responseData: any; statusCode: number; message: string }> {
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL +
        '/reportsfetcher/api/pointbalancereport?projectId=' +
        projectId
    );
  }

  generateReport(
    exportReportPayload: Partial<ExportReport>
  ): Promise<{ responseData: any; statusCode: number; message: string }> {
    return apiClient.post(
      process.env.NEXT_PUBLIC_API_URL + '/reportsfetcher/api/export-data/generate-csv-report',
      exportReportPayload
    );
  }
}

const pointsBalanceReportService = new PointsBalanceReportService();
export default pointsBalanceReportService;
