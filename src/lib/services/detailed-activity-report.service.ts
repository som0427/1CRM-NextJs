import apiClient from './apiClient';

class DetailedActivityReportService {
  getDetailedActivityReport(
    projectId: number | string,
    startDate: string,
    endDate: string,
    moduleType: string,
    reportType: string,
    performedBy: string,
    pageSize: number,
    pageNumber: number,
  ): Promise<{ responseData: any; statusCode: number; message: string }> {
    const sanitize = (value: unknown) => (value == null ? '' : String(value));
    const buildQuery = [
      `projectId=${sanitize(projectId)}`,
      `startDate=${encodeURIComponent(sanitize(startDate))}`,
      `endDate=${encodeURIComponent(sanitize(endDate))}`,
      `moduleType=${encodeURIComponent(sanitize(moduleType))}`,
      `reportType=${encodeURIComponent(sanitize(reportType))}`,
      `performedBy=${sanitize(performedBy).replace(/\s+/g, '')}`,
      `pageSize=${encodeURIComponent(sanitize(pageSize))}`,
      `pageNumber=${encodeURIComponent(sanitize(pageNumber))}`,
    ].join('&');

    return apiClient.get(
      `${process.env.NEXT_PUBLIC_API_URL}/reportsfetcher/api/detailedactivity?${buildQuery}`,
    );
  }

  generateReport(exportReportTypeData: {
    projectId: number;
    reportId: number;
    startDate: string;
    endDate: string;
    moduleType: string;
    reportType: string;
    performedBy: string;
  }): Promise<{ responseData: any; statusCode: number; message: string }> {
    return apiClient.post(
      `${process.env.NEXT_PUBLIC_API_URL}/reportsfetcher/api/export-data/generate-csv-report`,
      exportReportTypeData,
    );
  }
}

const detailedActivityReportService = new DetailedActivityReportService();

export default detailedActivityReportService;
