/**
 * Opportunity Service
 * 
 * This service handles API calls related to opportunities including
 * grid view data and opportunity management.
 */

import { OpportunityEditModel } from '../models/opportunity/opportunityEdit.model';
import apiClient from '../api/apiClient';
import { OpportunityGridViewModel } from '../models/opportunity/opportunity-grid-view/opportunity-grid-view.model';
import { UserLocalizationService } from './userLocalizationService';
import { OpportunityContactModel } from '../models/opportunity/opportunityContact.model';
import { opportunitiesLookupModel } from '../models/opportunity/opportunitiesLookup.model';

/**
 * Opportunity Service class
 */
class OpportunityService {

  getOpportunitiesFilter(projectId:number, opportunityView:number,pageNumber:number,pageSize:number,data=null) : Promise<{responseData: any, statusCode: number, message: string}> {
    return apiClient.post(process.env.NEXT_PUBLIC_API_URL + '/transactions/api/opportunity/getOpportunityLookupSelfOrTeam?projectId='+projectId+'&opportunityView='+opportunityView+'&pageNumber='+pageNumber+'&pageSize='+pageSize,data);
  }

  getOpportunityGridViewData(projectId: any, viewType: number) : Promise<{responseData: OpportunityGridViewModel[], statusCode: number, message: string}> {
    return apiClient.post(process.env.NEXT_PUBLIC_API_URL + '/transactions/api/opportunity/getOpportunityGridViewSelfOrTeam?projectId=' + projectId + '&opportunityView=' + viewType);
  }

  addEditOpportunity(addDataValues): Promise<{responseData: any, statusCode: number, message: string}> {
    addDataValues.transTimeZone = UserLocalizationService.getUserTimeZoneCode();
    return apiClient.post(
      process.env.NEXT_PUBLIC_API_URL + '/transactions/api/opportunity/addEditOpportunity', addDataValues)
  }

  getParticularOpportunity(id: number, projectId: number): Promise<{responseData: any[], statusCode: number, message: string}> {
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL + '/transactions/api/opportunity/getOpportunity?projectId=' + projectId + '&opportunityId=' + id);
  }

  getUserContacts(projectId: number): Promise<{responseData: OpportunityContactModel[], statusCode: number, message: string}> {
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL + '/transactions/api/contact/getCustomerContacts?projectId=' + projectId);

  }
  
  getCustomerContact(projectId: number,companyId:string|number): Promise<{responseData: OpportunityContactModel[], statusCode: number, message: string}> { 
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL + '/transactions/api/contact/getCustomerContacts?projectId='+ projectId+'&companyId='+companyId);

  }

  /**
   * Export opportunities data
   * @param projectId - Project ID
   * @param viewMode - 1 for table view, 2 for grid view
   * @param moduleType - Module type (3 for opportunities)
   * @param reportId - Report ID (-4 for opportunities)
   * @returns Promise with API response containing status and message
   */
  exportOpportunities(projectId: number, viewMode: number, data: any = null, moduleType: number = 3, reportId: number = -4): Promise<{statusCode: number, message: string, responseData: string}> {
    return apiClient.post(
      process.env.NEXT_PUBLIC_API_URL + '/reportsfetcher/api/export-data/generate-entity-report?projectId=' + 
      projectId + '&moduleType=' + moduleType + '&reportId=' + reportId + '&viewMode=' + viewMode,
      data
    );
  }

 
  updateOpportunityStatus(data: {
    projectId: number;
    opportunityId: Number;
    attributeId: Number;
    lookupValueId: string;
    }): Promise<{responseData: any, statusCode: number, message: string}> {
      return apiClient.post(
        process.env.NEXT_PUBLIC_API_URL + '/transactions/api/opportunity/updateOpportunityAttributeValue',
        data
      );
    }
    getAllOpportunityDetails(companyId: number,projectId: number, teamFlag: boolean = false, projectFlag: boolean = false):Promise<{statusCode: number, message: string, responseData: opportunitiesLookupModel[]}> {
      return apiClient.get(
        process.env.NEXT_PUBLIC_API_URL+ '/transactions/api/opportunity/getOpportunityLookup?projectId=' + projectId + '&companyId=' + companyId + "&teamFlag=" + teamFlag + "&projectFlag=" + projectFlag)
    }
}

// Create a singleton instance
const opportunityService = new OpportunityService();
export default opportunityService;
