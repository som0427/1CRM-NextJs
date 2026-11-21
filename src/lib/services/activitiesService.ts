import { ManageActivitiesModel } from "../models/activities/manage-activities.model";
import { AttributeIdTypeValueModel } from "../models/attributeIdTypeValue.model";
import apiClient from "./apiClient";
import { UserLocalizationService } from "./userLocalizationService";


class ActivitiesService {

    getActivityFilterbasedOnPagination(projectId: number, viewMode, startDate, endDate, pageSize: number, pageNumber: number, advanceFilterPayload) {
        return apiClient.post(process.env.NEXT_PUBLIC_API_URL + '/transactions/api/activities/v1/getActivityLookupView?projectId=' + projectId +
            '&activityView=' + viewMode + '&startDate=' + startDate + '&endDate=' + endDate + '&pageSize=' + pageSize + '&pageNumber=' + pageNumber, advanceFilterPayload);
    }

    getPlannedUnperformedActivityBasedOnPagination(projectId: number, viewMode, startDate, endDate, pageSize: number, pageNumber: number) {
        return apiClient.get(
            process.env.NEXT_PUBLIC_API_URL + '/transactions/api/activities/v1/getUnperformedPlannedActivityLookupView?projectId=' + projectId + '&activityView=' + viewMode + '&startDate=' + startDate + '&endDate=' + endDate + '&pageSize=' + pageSize + '&pageNumber=' + pageNumber,);

    }
    getAllActivitiesType(projectId: number,isAdminPage:boolean=false): Promise<{ responseData: ManageActivitiesModel[]; statusCode: number; message: string }>{
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL +'/transactions/api/activities/manageActivities/?projectId='+projectId+'&isAdminPage='+isAdminPage);
  }
   getAllActivities(projectId: number,isAdminPage:boolean=false):Promise<{responseData: ManageActivitiesModel[], statusCode: number, message: string}>{
        return apiClient.get(
          process.env.NEXT_PUBLIC_API_URL +'/transactions/api/activities/manageActivities/?projectId='+projectId+'&isAdminPage='+isAdminPage);
      }

    getActivityLookup(moduleType: number, projectId: number, companyId: number, opportunityId: number)
        : Promise<{ responseData: AttributeIdTypeValueModel[], statusCode: number, message: string }> {

        if (opportunityId != null) {

            return apiClient.get(
                process.env.NEXT_PUBLIC_API_URL + '/transactions/api/activities/getActivityLookup?projectId=' + projectId + '&moduleType=' + moduleType + '&companyId=' + companyId + '&opportunityId=' + opportunityId)

        } else {
            return apiClient.get(
                process.env.NEXT_PUBLIC_API_URL + '/transactions/api/activities/getActivityLookup?projectId=' + projectId + '&moduleType=' + moduleType + '&companyId=' + companyId)
        }
    }
    addEditActivity(addDataValues): Promise<{responseData: any, statusCode: number, message: string}> {
        addDataValues.transTimeZone = UserLocalizationService.getUserTimeZoneCode();
        return apiClient.post(
        process.env.NEXT_PUBLIC_API_URL+'/transactions/api/activities/addEditActivity', addDataValues)
    }

    updateSequence(payload: Array<{ key: number; activityName: string; value: number }>): Promise<{ responseData: any; statusCode: number; message: string }> {
        return apiClient.post(
            process.env.NEXT_PUBLIC_API_URL + '/transactions/api/activities/manageActivities/updateSequence', payload
        );
    }

    deleteActivity(projectId: number, activityId: number): Promise<{ responseData: any; statusCode: number; message: string }> {
        return apiClient.delete(
            process.env.NEXT_PUBLIC_API_URL + `/transactions/api/activities/manageActivities/?projectId=${projectId}&activityId=${activityId}`
        );
    }

    getActivitySettings(activityId: number, projectId: number, signal?: AbortSignal): Promise<{ responseData: any; statusCode: number; message: string }> {
        return apiClient.get(
            process.env.NEXT_PUBLIC_API_URL + `/setting/api/activities/manageActivities/settings/${activityId}?projectId=${projectId}`,
            { signal }
        );
    }

    saveActivity(activityData: any): Promise<{ responseData: { activityId: number }; statusCode: number; message: string }> {
        const requestBody = {
            ...activityData,
            userTime: activityData.userTime || UserLocalizationService.getUserTime(),
            transTimeZone: activityData.transTimeZone || UserLocalizationService.getUserTimeZoneCode(),
        }
        return apiClient.post(
            process.env.NEXT_PUBLIC_API_URL + '/setting/api/activities/manageActivities/settings',
            requestBody
        );
    }
    getParticularActivityDetail(projectId: number, id: number):Promise<{ responseData: any; statusCode: number; message: string }>{
        return apiClient.get(
        process.env.NEXT_PUBLIC_API_URL +  '/transactions/api/activities/getActivity?projectId='+projectId+'&activityId='+id);
      
    }
}
   
    
const activitiesService = new ActivitiesService();
export default activitiesService;