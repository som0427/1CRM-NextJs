import React, { useState, useEffect, useRef } from 'react';
import InsightsSection from './sections/InsightsSection';
import ActivitiesSection from './sections/ActivitiesSection';
import CustomerInfoSection from './sections/CustomerInfoSection';
import ContactsSection from './sections/ContactsSection';
import InfoSection from './sections/InfoSection';
import oppDashboardService from '@/lib/services/oppDashboardService';
import { Button } from '../ui/tailwind/Button';
import { Plus } from 'lucide-react';
import { getEntityHeading } from '@/lib/storage/sharedStorage';
import ExpandCollapseIcon from '../ui/icons/ExpandCollapseIcon';

// Define interfaces for API responses
interface ApiResponse<T> {
  statusCode: number;
  message: string;
  responseData: T;
}

// Define interface for dashboard data
interface DashboardResponse {
  name?: string;
  serialNo?: string;
  insights?: any;
  activities?: any[];
  customerInfo?: any;
  contacts?: any[];
}

interface OppDashboardProps {
  entityId: string;
  initialData?: any; // Optional initial data that might be passed from parent
}

const OppDashboard: React.FC<OppDashboardProps> = ({ entityId, initialData }) => {
  // State variables for component
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states for different sections
  const [entityName, setEntityName] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [insightsData, setInsightsData] = useState<any>(null);
  const [activitiesData, setActivitiesData] = useState<any[]>([]);
  const [activityToBePerformedData, setActivityToBePerformedData] = useState<any[]>([]);
  const [customerInfoData, setCustomerInfoData] = useState<any>(null);
  const [contactsData, setContactsData] = useState<any[]>([]);
  const [completeEntityInfo, setCompleteEntityInfo] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // State for section expand/collapse
  const [isCustomerExpanded, setIsCustomerExpanded] = useState<boolean>(true);
  const [isContactsExpanded, setIsContactsExpanded] = useState<boolean>(true);

  const customerHeading = getEntityHeading('Customer', 'Customer');
  const contactHeading = getEntityHeading('Contacts', 'Contacts');
  const oppHeading = getEntityHeading('Opportunities', 'Opportunities');
  
  // Effect to load data when component mounts or entityId changes
  useEffect(() => {
    // Skip if entityId is not available
    if (!entityId) return;
    
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // If we have initialData, use it instead of making API calls
        if (initialData) {
          processInitialData(initialData);
          setLoading(false);
          return;
        }
        
        // Fetch entity data first
        await fetchOpportunityInfoData();
        await fetchCompaniesForOpportunity();
        await fetchContactsForOpportunity();
        await fetchActivitiesForOpportunity();
        await fetchActivityToBePerformed();
        
        // Then fetch mock data
        await fetchMockData();
        
        setLoading(false);
      } catch (err: any) {
        console.error('Error loading entity dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data');
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [entityId, initialData]);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Toggle dropdown menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Handle activity selection
  const handleActivitySelect = (activity: any) => {
    console.log('Selected activity:', activity);
    // TODO: Add implementation for when an activity is selected
    setIsMenuOpen(false);
  };
  
  // Process initial data if provided
  const processInitialData = (data: any) => {
    if (!data) return;
    
    setEntityName(data.entityName || '');
    setSerialNumber(data.serialNo || '');
    
    // Set section data if available
    if (data.data) {
      setInsightsData(data.data.insights || null);
      setActivitiesData(data.data.activities || []);
      setCustomerInfoData(data.data.customerInfo || null);
      setContactsData(data.data.contacts || []);
      
      // Store the complete entity info from initial data
      setCompleteEntityInfo(data.data);
    }
  };
  
  // Fetch opportunity info data using the oppDashboardService
  const fetchOpportunityInfoData = async () => {
    try {
      
      // Use the service to fetch data for the specific entity type
      const apiResponse = await oppDashboardService.fetchEntityInfoData(entityId);
      
      console.log(`Entity data response for type opportunity:`, apiResponse);
      
      // Extract the actual dashboard data from the API response
      // API typically returns { statusCode, message, responseData }
      let entityInfo: DashboardResponse;
      
      // Check if response follows standard API format
      const typedResponse = apiResponse as Partial<ApiResponse<DashboardResponse>>;
      
      if (typedResponse.responseData) {
        // Standard API response format with responseData property
        entityInfo = typedResponse.responseData;
      }
        
      // Process and set the data
      setEntityName(entityInfo?.name || '');
      setSerialNumber(entityInfo?.serialNo || '');
      
      // Store the complete entityInfo object
      setCompleteEntityInfo(entityInfo);
      
    } catch (error) {
      console.error(`Error fetching entity data for type opportunity:`, error);
      throw error; // Re-throw for the parent catch block
    }
  };

   // Fetch opportunity info data using the oppDashboardService
   const fetchCompaniesForOpportunity = async () => {
    try {
      // Fetch companies data for this opportunity
      const companiesResponse = await oppDashboardService.fetchCompaniesForOpportunity(entityId);
      
      // Extract company data from the API response
      let companiesData: any[] = [];
      
      // Check if response follows standard API format
      const typedCompaniesResponse = companiesResponse as Partial<ApiResponse<any>>;
      
      if (typedCompaniesResponse.responseData) {
        // Standard API response format with responseData property
        companiesData = typedCompaniesResponse.responseData;
      }
      
      // Set the customer info data with the fetched companies
      setCustomerInfoData(companiesData);
    } catch (companyError) {
      console.error('Error fetching companies for opportunity:', companyError);
      // Handle the error but don't fail the entire operation
    }
      
  };


   // Fetch opportunity info data using the oppDashboardService
   const fetchContactsForOpportunity = async () => {
    try {
      // Fetch contacts data for this opportunity
      const contactsResponse = await oppDashboardService.fetchContactsForOpportunity(entityId);
      
      // Extract contact data from the API response
      let contactsData: any[] = [];
      
      // Check if response follows standard API format
      const typedContactsResponse = contactsResponse as Partial<ApiResponse<any>>;
      
      if (typedContactsResponse.responseData) {
        // Standard API response format with responseData property
        contactsData = typedContactsResponse.responseData;
      }
      
      // Set the customer info data with the fetched companies
      setContactsData(contactsData);
    } catch (companyError) {
      console.error('Error fetching companies for opportunity:', companyError);
      // Handle the error but don't fail the entire operation
    }
      
  };

   // Fetch opportunity info data using the oppDashboardService
   const fetchActivitiesForOpportunity = async () => {
    try {
      // Fetch activities data for this opportunity
      const activitiesResponse = await oppDashboardService.fetchActivitiesForOpportunity(entityId);
      
      // Extract activity data from the API response
      let activitiesData: any[] = [];
      
      // Check if response follows standard API format
      const typedActivitiesResponse = activitiesResponse as Partial<ApiResponse<any>>;
      
      if (typedActivitiesResponse.responseData) {
        // Standard API response format with responseData property
        activitiesData = typedActivitiesResponse.responseData;
      }
      
      // Set the customer info data with the fetched companies
      setActivitiesData(activitiesData);
    } catch (companyError) {
      console.error('Error fetching companies for opportunity:', companyError);
      // Handle the error but don't fail the entire operation
    }
      
  };

  const fetchActivityToBePerformed = async () => {
    try {
      // Fetch activity data for this opportunity
      const activityToBePerformedResponse = await oppDashboardService.fetchActivityToBePerformed(entityId);
      
      // Extract activity data from the API response
      let fetchedActivityToBePerformedData: any[] = [];
      
      // Check if response follows standard API format
      const typedActivityResponse = activityToBePerformedResponse as Partial<ApiResponse<any>>;
      
      if (typedActivityResponse.responseData) {
        // Standard API response format with responseData property
        fetchedActivityToBePerformedData = typedActivityResponse.responseData || [];
      } else {
        // Handle case where response is in a different format
        fetchedActivityToBePerformedData = activityToBePerformedResponse as any[] || [];
      }
      
      // Update state with fetched activity data
      setActivityToBePerformedData(fetchedActivityToBePerformedData);
    } catch (activityError) {
      console.error('Error fetching activity to be performed for opportunity:', activityError);
      // Handle the error but don't fail the entire operation
    }
  };

  
  // Fetch mock data for testing using the service
  const fetchMockData = async () => {
    try {
      // Determine mock entity type ID based on entityTypeId or derive from entityType
      let mockTypeId = 3;
      
      
      
      // Use the service to get mock data
      const mockData = await oppDashboardService.fetchMockDashboardData(entityId);
      
      // Get entity type name from service
      const mockEntityTypeName = 'opportunity';

      // Process and set the mock data
      setInsightsData(mockData.insights);
     // setActivitiesData(mockData.activities);
    // setContactsData(mockData.contacts);
    } catch (error) {
      console.error('Error generating mock data:', error);
      throw error; // Re-throw for the parent catch block
    }
  };
  
  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error: {error}
      </div>
    );
  }
  
  // Render dashboard content
  return (
    <div className="bg-white rounded-lg">
      {/* Header with entity name and type */}
      <div className="pb-6 flex justify-between items-center">
        <h1 className="text-xl font-medium text-gray-800 flex items-center">
          <span>{entityName}</span>
          <span className="text-gray-500 text-md ml-2">- {serialNumber}</span>
        </h1>
        <div className="relative" ref={menuRef}>
          <Button 
            size="sm" 
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full h-10 px-3 py-3 flex items-center justify-center shadow-sm"
            onClick={toggleMenu}
          >
            <Plus className="h-4 w-4" />
          </Button>
          
          {/* Dropdown menu */}
          {isMenuOpen && activityToBePerformedData.length > 0 && (
            <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
              <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                {activityToBePerformedData.map((activity) => (
                  <button
                    key={activity.activityId}
                    className="text-left w-full px-4 py-2 text-sm text-black-500 hover:bg-blue-50 hover:text-blue-700"
                    role="menuitem"
                    onClick={() => handleActivitySelect(activity)}
                  >
                    {activity.activityName}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Main content with three-column layout */}
      <div className="flex flex-col md:flex-row">
        <div className="w-full md:basis-[30%] pr-4 border-r border-gray-200 ">
          {/* Left column - Insights */}
          <div className="mb-6">
            <h2 className="text-lg font-medium text-blue-600 mb-3">Insights</h2>
            <InsightsSection data={insightsData} />
          </div>
          
          {/* Info Section at the bottom */}
          <div className="p-4 border-t border-gray-200">
            <h2 className="text-lg font-medium text-blue-600 mb-3">{entityName} Info</h2>
            <InfoSection info={completeEntityInfo} />
          </div>
        </div>
        
        {/* Middle column - Activities */}
        <div className="w-full md:basis-[40%] pl-4 pr-4 border-r border-gray-200">
          <h2 className="text-lg font-medium text-blue-600 mb-3">Activities</h2>
          <ActivitiesSection activities={activitiesData} />
        </div>
        
        {/* Right column - Customer & Contacts */}
        <div className="w-full md:basis-[30%] pl-4">
          {/* Customer Info */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-medium text-blue-600">{customerHeading}</h2>
              <ExpandCollapseIcon 
                isExpanded={isCustomerExpanded}
                onClick={() => setIsCustomerExpanded(!isCustomerExpanded)}
              />
            </div>
            {isCustomerExpanded && <CustomerInfoSection customerInfo={customerInfoData} />}
          </div>
          
          {/* Contacts */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-medium text-blue-600">{contactHeading}</h2>
              <ExpandCollapseIcon 
                isExpanded={isContactsExpanded}
                onClick={() => setIsContactsExpanded(!isContactsExpanded)}
              />
            </div>
            {isContactsExpanded && <ContactsSection contacts={contactsData} />}
          </div>
        </div>
      </div>
      
      
    </div>
  );
};

export default OppDashboard;
