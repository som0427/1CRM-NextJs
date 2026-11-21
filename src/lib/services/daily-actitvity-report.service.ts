import apiClient from "./apiClient";

class DailyActivityReport {
  getDailyActivityReport(projectId: number, startDate: string, endDate: string, pageSize: number, pageNumber: number): Promise<{ responseData: any; statusCode: number; message: string }> {
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL +
        '/reportsfetcher/api/dailyactivity?projectId=' +
        projectId +
        '&startDate=' +
        startDate +
        '&endDate=' +
        endDate +
        '&pageSize=' +
        pageSize +
        '&pageNumber=' +
        pageNumber
    );
  }

  generateReport(exportReportTypeData: { projectId: number; reportId: number; startDate: string; endDate: string; moduleType: string; reportType: string; performedBy: string }):Promise<{ responseData: any; statusCode: number; message: string }> {
    return apiClient.post(
      process.env.NEXT_PUBLIC_API_URL + '/reportsfetcher/api/export-data/generate-csv-report',
      exportReportTypeData
    );
  }
}

const dailyActivityReport = new DailyActivityReport();
export default dailyActivityReport;
