import React from 'react';
import { User, Users, Target, Phone } from 'lucide-react';

// Define types for company info
type CompanyContact = {
  contactId?: number;
  name: string;
  designation?: string;
  phone?: string;
  initials?: string;
  serialNo?: string;
};

type CustomAttribute = {
  companyId?: number;
  systemAttribId?: number | null;
  customAttribId?: number;
  attribName: string;
  value: string;
  attributeType?: number;
};

type CompanyData = {
  projectId?: number;
  companyId?: number;
  name: string;
  customAttributeValues?: CustomAttribute[];
  serialNo?: string;
  ivrCall?: number;
  callerIdDetails?: {
    key: string;
    value: string;
  };
};

type CompanyInfo = {
  openOpportunities?: number;
  estimatedRevenue?: number;
  companyData?: CompanyData;
  contacts?: CompanyContact[];
  serialNo?: string;
};

interface CustomerInfoProps {
  customerInfo: CompanyInfo | CompanyInfo[];
}

const CustomerInfoSection: React.FC<CustomerInfoProps> = ({ customerInfo }) => {
  if (!customerInfo) {
    return <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">No customer information available</div>;
  }

  // Function to render user avatar for contacts
  const renderContactAvatar = (contact: { name: string, initials?: string }, index: number) => {
    // Use either provided initials or extract from name
    const displayInitials = contact.initials || contact.name.substring(0, 2);
    
    return (
      <div 
        key={index}
        className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center 
                  text-gray-700 text-xs font-medium border border-white"
        style={{ backgroundColor: getAvatarColor(displayInitials) }}
        title={contact.name}
      >
        {displayInitials}
      </div>
    );
  };
  
  // Function to generate consistent color based on user initials
  const getAvatarColor = (initials: string) => {
    const colors = [
      '#E9F3FF', // light blue
      '#FFEEE9', // light red
      '#E9FFEF', // light green
      '#FFF9E9', // light yellow
      '#F9E9FF', // light purple
    ];
    
    // Simple hash function to get consistent colors for same initials
    const hash = initials.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    return colors[hash % colors.length];
  };
  
  // Function to render a single company card
  const renderCompanyCard = (company: CompanyInfo, index: number) => {
    const { companyData, contacts, openOpportunities, estimatedRevenue } = company;

    return (
      <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-4">
        <div className="space-y-3">
          {/* Company name and serial number */}
          {companyData && (
            <div className="flex justify-between items-center">
              <p className="text-base font-medium">{companyData.name}</p>
              {companyData.serialNo && (
                <span className="text-xs text-gray-500">{companyData.serialNo}</span>
              )}
            </div>
          )}
          {/* Custom Attributes - Display only important attributes */}
          {companyData?.customAttributeValues && (
            <div className="mt-2">
              {companyData.customAttributeValues
                .filter(attr => attr.value && ['Address', 'Mobile Number', 'Owner'].includes(attr.attribName))
                .map((attr, attrIndex) => {
                  const icon = attr.attribName === 'Address' ? 
                    <Target className="h-4 w-4 text-blue-500 mr-2" /> :
                    attr.attribName === 'Mobile Number' ? 
                    <Phone className="h-4 w-4 text-blue-500 mr-2" /> :
                    <User className="h-4 w-4 text-blue-500 mr-2" />;
                  
                  return (
                    <div key={attrIndex} className="flex items-center mt-2">
                      {icon}
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">{attr.attribName === 'Mobile Number' ? 'Phone' : attr.attribName}:</span> {attr.value}
                      </p>
                    </div>
                  );
                })}
            </div>
          )}
          
          {/* Contacts/Users */}
          {contacts && contacts.length > 0 && (
            <div>
              <div className="flex items-center mb-2">
                <Users className="h-4 w-4 text-blue-500 mr-2" />
                <p className="text-sm font-medium">Contacts ({contacts.length})</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {contacts.map((contact, contactIndex) => renderContactAvatar(contact, contactIndex))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Handle both single company and array of companies
  const companyInfoArray = Array.isArray(customerInfo) ? customerInfo : [customerInfo];
  
  return (
    <div className="space-y-4">
      {companyInfoArray.map((company, index) => renderCompanyCard(company, index))}
    </div>
  );
};

export default CustomerInfoSection;
