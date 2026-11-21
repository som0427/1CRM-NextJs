import { getProjectId } from '../storage/sharedStorage';
import apiClient from '../api/apiClient';

/**
 * Service for fetching entity dashboard data
 */
class ContactDashboardService {
  // Future implementation methods can be added as needed
  /**
   * Get the baseURL and All Api endpoints
   */

  private moduleId = 1;
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

  private projectId = getProjectId() || 0;
  private contactInfoEndpoint = `${this.baseUrl}/reportsfetcher/api/contact/dashboard/getContacts`;
  private companiesEndpoint = `${this.baseUrl}/reportsfetcher/api/contact/dashboard/getCompanyInfo`;
  private opportunityEndpoint = `${this.baseUrl}/reportsfetcher/api/contact/dashboard/getOpportunities`;
  private activitiesEndpoint = `${this.baseUrl}/reportsfetcher/api/contact/dashboard/getActivities`;
  private performActivityEndpoint = `${this.baseUrl}/transactions/api/activities/fetchPerformWebActivities`;

  /**
   * Fetch entity info data for dashboard using entityId and ProjectId
   * @param entityId The ID of the entity
   * @returns Promise with the entity info data
   */
  async fetchEntityInfoData(entityId: string) {
    try {
      if (!this.projectId) {
        throw new Error('Project ID not found in storage');
      }
      
      const endpoint = `${this.contactInfoEndpoint}?projectId=${this.projectId}&contactId=${entityId}`;
      // Use apiClient which automatically handles authentication headers
      const response = await apiClient.get(endpoint);
      
      return response;
    } catch (error: any) {
      console.error(`Error fetching dashboard data for entity type contact:`, error);
      throw new Error(error.message || `Failed to fetch dashboard data for entity type contact`);
    }
  }

  
  /**
   * Fetch companies data for a specific contact
   * @param contactId The ID of the contact
   * @returns Promise with the companies data
   */
  async fetchCompaniesForContact(contactId: string) {
    try {
      if (!this.projectId) {
        throw new Error('Project ID not found in storage');
      }
      
      const endpoint = `${this.companiesEndpoint}?projectId=${this.projectId}&contactId=${contactId}`;
      
      // Use apiClient which handles authentication headers automatically
      const response = await apiClient.get(endpoint);
      
      return response;
    } catch (error: any) {
      console.error(`Error fetching companies data for contact ${contactId}:`, error);
      throw new Error(error.message || `Failed to fetch companies data for contact ${contactId}`);
    }
  }

  /**
   * Fetch contacts data for a specific contact
   * @param contactId The ID of the contact
   * @returns Promise with the contacts data
   */
  async fetchOpportunityForContact(contactId: string) {
    try {
      if (!this.projectId) {
        throw new Error('Project ID not found in storage');
      }
      
      const endpoint = `${this.opportunityEndpoint}?projectId=${this.projectId}&contactId=${contactId}`;
      
      // Use apiClient which handles authentication headers automatically
      const response = await apiClient.get(endpoint);
      
      return response;
    
    } catch (error: any) {
      console.error(`Error fetching opportunity data for contact ${contactId}:`, error);
      throw new Error(error.message || `Failed to fetch opportunity data for contact ${contactId}`);
    }
  }

  /**
   * Fetch activities data for a specific contact
   * @param contactId The ID of the contact
   * @returns Promise with the activities data
   */
  async fetchActivitiesForContact(contactId: string) {
    try {
      if (!this.projectId) {
        throw new Error('Project ID not found in storage');
      }
      
      const endpoint = `${this.activitiesEndpoint}?projectId=${this.projectId}&contactId=${contactId}`;
      
      // Use apiClient which handles authentication headers automatically
      const response = await apiClient.get(endpoint);
      
      return response;

    } catch (error: any) {
      console.error(`Error fetching activities data for contact ${contactId}:`, error);
      throw new Error(error.message || `Failed to fetch activities data for contact ${contactId}`);
    }
  }
/**
 * Fetch Perform activities data for a specific contact
 * @param contactId 
 * @param activityId 
 * @returns 
 */
  async fetchActivityToBePerformed(contactId: string) {
    try {
      if (!this.projectId) {
        throw new Error('Project ID not found in storage');
      }
      
      const endpoint = `${this.performActivityEndpoint}?projectId=${this.projectId}&moduleRecordId=${contactId}&moduleId=${this.moduleId}`;
      
      // Use apiClient which handles authentication headers automatically
      const response = await apiClient.get(endpoint);
      
      return response;
    } catch (error: any) {
      console.error(`Error fetching activities data for contact ${contactId}:`, error);
      throw new Error(error.message || `Failed to fetch activities data for contact ${contactId}`);
    }
  }

  /**
   * Fetch mock dashboard data for insights section
   * @param entityId The ID of the entity
   * @returns Promise with structured mock data
   */
  async fetchMockDashboardData(entityId: string) {
    // Create entity type name for better display
    const entityType = 'contact';
    
    // Return structured mock data that follows the same format as API response
    return {
      name: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${entityId}`,
      insights: {
        totalValue: '00,000,000',
        valueLabel: 'Order Value Till Date',
        statistics: [
          { value: 'xx', label: 'Orders' },
          { value: 'xxxx', label: 'Avg. Order Value' },
          { value: 'xx', label: 'Avg. Monthly Orders' },
          { value: 'xx', label: 'Days Since Last Order' }
        ],
        topProducts: [
          'Product A', 'Product B'
        ]
      }
      // Other mock data removed as they aren't used by InsightsSection
    };
  }
}

const contactDashboardService = new ContactDashboardService();
export default contactDashboardService;
