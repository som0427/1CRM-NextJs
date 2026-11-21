/**
 * Contact Service
 * 
 * This service handles API calls related to contacts including
 * contact lookup, search, and data management.
 */

import { ContactEditModel } from '../models/contact/contactEdit.model';
import apiClient from '../api/apiClient';
import { UserLocalizationService } from './userLocalizationService';
import { ContactDetailModel } from '../models/contact/contacts-detail.model';

class ContactService {

  /**
   * 
   * @param contactId 
   * @param projectId 
   * @returns 
   */
  getParticularContact(id: number, projectId: number): Promise<{responseData: ContactEditModel[], statusCode: number, message: string}> {
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL + '/transactions/api/contact/getContact?projectId=' + projectId + '&contactId=' + id);
  }

  /**
   * @param addDataValues 
   * @returns 
   */
  addEditContact(addDataValues): Promise<{responseData: any, statusCode: number, message: string}> {
      addDataValues.transTimeZone = UserLocalizationService.getUserTimeZoneCode();
      return apiClient.post(
        process.env.NEXT_PUBLIC_API_URL + '/transactions/api/contact/addEditContact', addDataValues)
    }

  /**
   * Fetch contacts from the API
   * @param projectId Project ID
   * @param contactView View type: 1 = Self, 2 = Team, 3 = All (defaults to 1)
   * @returns Array of contact items
   */

  getContacts(projectId:number, viewType:number) : Promise<{responseData: any, statusCode: number, message: string}> {
    return apiClient.post(process.env.NEXT_PUBLIC_API_URL + '/transactions/api/contact/getContactLookupSelfOrTeam?projectId='+projectId+'&contactView='+viewType);
  }
  getCustomerContact(projectId: number,companyId:string|number):
  Promise<{responseData: ContactDetailModel[], statusCode: number, message: string}>{ 
    return apiClient.get(
      process.env.NEXT_PUBLIC_API_URL + '/transactions/api/contact/getCustomerContacts?projectId='+ projectId+'&companyId='+companyId);

  }
 
}

// Create a singleton instance
const contactService = new ContactService();
export default contactService;