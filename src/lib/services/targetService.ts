import apiClient from "../api/apiClient";
import { GeneralResponse } from "../models/general-response.model";
import { TargetModel } from "../models/targets/target.model";

/**
 * Target Service class
 */
class TargetService {
  getAllTargets(projectId: number): Promise<GeneralResponse<TargetModel[]>> {
    return apiClient.get<GeneralResponse<TargetModel[]>>(
      process.env.NEXT_PUBLIC_API_URL + '/transactions/api/targets/getTargets?projectId=' + projectId
    );
  }

  getActivities(projectId: number): Promise<any> {
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL +
        '/transactions/api/activities/manageActivities/?projectId=' +
        projectId +
        '&isAdminPage=false'
    );
  }

  getProductFormSetting(productFormId: number): Promise<any> {
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL + '/setting/api/productForm/getSetting/' + productFormId
    );
  }

  getTargetDetails(projectId: number, targetId: number): Promise<any> {
    const params = new URLSearchParams({
      projectId: projectId.toString(),
      targetId: targetId.toString()
    });
    return apiClient.get(
      `${process.env.NEXT_PUBLIC_API_URL}/transactions/api/targets/getTargetsSettingsDetails?${params.toString()}`
    );
  }

  saveTarget(payload: any): Promise<any> {
    return apiClient.post(
      process.env.NEXT_PUBLIC_API_URL + '/transactions/api/targets/addEditTargets',
      payload
    );
  }
}
// Create a singleton instance
const targetService = new TargetService();
export default targetService;
