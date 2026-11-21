import { getProjectId } from '../storage/sharedStorage';
import apiClient from '../api/apiClient';

/**
 * Service for fetching entity dashboard data
 */
class OppDashboardService {
  /**
   * Get the baseURL and All Api endpoints
   */

  private moduleId = 3;
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || '';

  private projectId = getProjectId() || 0;
  private oppInfoEndpoint = `${this.baseUrl}/reportsfetcher/api/opportunity/dashboard/getOpportunityInfo`;
  private companiesEndpoint = `${this.baseUrl}/reportsfetcher/api/opportunity/dashboard/getCompanies`;
  private contactsEndpoint = `${this.baseUrl}/reportsfetcher/api/opportunity/dashboard/getContacts`;
  private activitiesEndpoint = `${this.baseUrl}/reportsfetcher/api/opportunity/dashboard/getActivities`;
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
      
      const endpoint = `${this.oppInfoEndpoint}?projectId=${this.projectId}&opportunityId=${entityId}`;
      // Use apiClient which automatically handles authentication headers
      const response = await apiClient.get(endpoint);
      
      return response;
    } catch (error: any) {
      console.error(`Error fetching dashboard data for entity type opportunity:`, error);
      throw new Error(error.message || `Failed to fetch dashboard data for entity type opportunity`);
    }
  }

  
  /**
   * Fetch companies data for a specific opportunity
   * @param opportunityId The ID of the opportunity
   * @returns Promise with the companies data
   */
  async fetchCompaniesForOpportunity(opportunityId: string) {
    try {
      if (!this.projectId) {
        throw new Error('Project ID not found in storage');
      }
      
      const endpoint = `${this.companiesEndpoint}?projectId=${this.projectId}&opportunityId=${opportunityId}`;
      
      // Use apiClient which handles authentication headers automatically
      const response = await apiClient.get(endpoint);
      
      return response;
    } catch (error: any) {
      console.error(`Error fetching companies data for opportunity ${opportunityId}:`, error);
      throw new Error(error.message || `Failed to fetch companies data for opportunity ${opportunityId}`);
    }
  }

  /**
   * Fetch contacts data for a specific opportunity
   * @param opportunityId The ID of the opportunity
   * @returns Promise with the contacts data
   */
  async fetchContactsForOpportunity(opportunityId: string) {
    try {
      if (!this.projectId) {
        throw new Error('Project ID not found in storage');
      }
      
      const endpoint = `${this.contactsEndpoint}?projectId=${this.projectId}&opportunityId=${opportunityId}`;
      
      // Use apiClient which handles authentication headers automatically
      const response = await apiClient.get(endpoint);
      
      return response;
    
    } catch (error: any) {
      console.error(`Error fetching contacts data for opportunity ${opportunityId}:`, error);
      throw new Error(error.message || `Failed to fetch contacts data for opportunity ${opportunityId}`);
    }
  }

  /**
   * Fetch activities data for a specific opportunity
   * @param opportunityId The ID of the opportunity
   * @returns Promise with the activities data
   */
  async fetchActivitiesForOpportunity(opportunityId: string) {
    try {
      if (!this.projectId) {
        throw new Error('Project ID not found in storage');
      }
      
      const endpoint = `${this.activitiesEndpoint}?projectId=${this.projectId}&opportunityId=${opportunityId}`;
      
      // Use apiClient which handles authentication headers automatically
      const response = await apiClient.get(endpoint);
      
      return response;

    } catch (error: any) {
      console.error(`Error fetching activities data for opportunity ${opportunityId}:`, error);
      throw new Error(error.message || `Failed to fetch activities data for opportunity ${opportunityId}`);
    }
  }
/**
 * Fetch Perform activities data for a specific opportunity
 * @param opportunityId 
 * @param activityId 
 * @returns 
 */
  async fetchActivityToBePerformed(opportunityId: string) {
    try {
      if (!this.projectId) {
        throw new Error('Project ID not found in storage');
      }
      
      const endpoint = `${this.performActivityEndpoint}?projectId=${this.projectId}&moduleRecordId=${opportunityId}&moduleId=${this.moduleId}`;
      
      // Use apiClient which handles authentication headers automatically
      const response = await apiClient.get(endpoint);
      
      return response;
    } catch (error: any) {
      console.error(`Error fetching activities data for opportunity ${opportunityId}:`, error);
      throw new Error(error.message || `Failed to fetch activities data for opportunity ${opportunityId}`);
    }
  }

  async fetchMockDashboardData(entityId: string) {
    // Create entity type name for better display
    const entityType = 'opportunity';
    
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
      },
      activities: [
        {
          id: '1',
          type: 'planned',
          action: 'Follow Up',
          date: '30-Apr-2023',
          users: ['VP']
        },
        {
          id: '2',
          type: entityType,
          action: `Created - ${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${entityId}`,
          reference: entityType === 'opportunity' ? `OPP${entityId}` : `${entityType}${entityId}`,
          date: '25-May-2023',
          time: '03:34 AM',
          users: ['VP']
        }
      ],
      customerInfo: {
        name: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${entityId}`,
        reference: entityType === 'opportunity' ? `OPP${entityId}` : `${entityType}${entityId}`,
        price: '75,000',
        date: '22-Jul-2020',
        users: ['SA', 'VP', 'YS']
      },
      contacts: [
        {
          name: 'Sagartan Saha',
          title: 'CEO',
          phone: '8904967230'
        },
        {
          name: 'Vaibhav Sharma',
          title: 'Product Manager',
          phone: '8904967655'
        }
      ],
      info: {
        createdBy: 'Vaibhav Sharma',
        createdOn: '19 Aug 2023 10:00 AM',
        location: 'View on Maps',
        owner: 'Vaibhav Sharma',
        company: 'Type Real Estate',
        address: 'Flat 800, Living Viva Phase V, Gurugram Pin 800',
        category: 'Ref',
        expected: 'INR 98,000'
      }
    };
  }
}

const oppDashboardService = new OppDashboardService();
export default oppDashboardService;
