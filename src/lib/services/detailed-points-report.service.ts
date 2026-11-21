import apiClient from "./apiClient";
import { ExportReport } from '../models/export-report-model';

class DetailedPointsReportService{


    getDetailedPointsReport(projectId: number, startDate: string, endDate: string,pageSize:number,pageNumber:number){
        return apiClient.get(process.env.NEXT_PUBLIC_API_URL +'/reportsfetcher/api/detailedpoints?projectId='+projectId+'&startDate='+startDate+'&endDate='+endDate+'&pageSize='+pageSize+'&pageNumber='+pageNumber)
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



  const detailedPointsReportService = new DetailedPointsReportService();
export default detailedPointsReportService;