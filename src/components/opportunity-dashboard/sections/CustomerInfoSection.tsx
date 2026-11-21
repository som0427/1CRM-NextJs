import React from 'react';
import { User, Users, Calendar, DollarSign, Target, Clipboard, Phone, Mail, Currency, ShoppingCart, CurrencyIcon, IndianRupeeIcon, CreditCard, CreditCardIcon } from 'lucide-react';

interface CustomerInfoProps {
  customerInfo: {
    openOpportunities?: number;
    estimatedRevenue?: number;
    companyData?: {
      projectId?: number;
      companyId?: number;
      name: string;
      customAttributeValues?: Array<{
        companyId?: number;
        systemAttribId?: number | null;
        customAttribId?: number;
        attribName: string;
        value: string;
        attributeType?: number;
      }>;
      serialNo?: string;
      ivrCall?: number;
      callerIdDetails?: {
        key: string;
        value: string;
      };
    };
    contacts?: Array<{
      contactId?: number;
      name: string;
      designation?: string;
      phone?: string;
      initials?: string;
      serialNo?: string;
    }>;
  };
}

const CustomerInfoSection: React.FC<CustomerInfoProps> = ({ customerInfo }) => {
  if (!customerInfo) {
    return <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">No customer information available</div>;
  }

  const { companyData, contacts, openOpportunities, estimatedRevenue } = customerInfo;
  
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
  
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      <div className="space-y-3">
        {/* Company name and serial number */}
        {companyData && (
          <div>
            <p className="text-base font-medium">{companyData.name}</p>
          </div>
        )}

        {/* Open Opportunity */}
        {openOpportunities && (
          <div className="flex -space-x-2">
            <ShoppingCart className="h-4 w-4 text-blue-500 mr-6" />
            <p className="text-sm text-gray-500 font-medium">{openOpportunities}   Open Opportunity{openOpportunities === 1 ? '' : 's'}</p>
          </div>
        )}

        {/* Open Opportunity */}
        {estimatedRevenue && (
          <div className="flex -space-x-2">
            <DollarSign className="h-4 w-4 text-blue-500 mr-6" />
            <p className="text-sm text-gray-500 font-medium">{estimatedRevenue}</p>
          </div>
        )}
        
        {/* Custom Attributes }
        {companyData?.customAttributeValues && companyData.customAttributeValues.map((attr, index) => (
          <div key={index}>
            <p className="text-sm text-gray-500">{attr.attribName}</p>
            <p className="text-base">{attr.value}</p>
          </div>
        ))}
          */}
        
        {/* Contacts/Users */}
        {contacts && contacts.length > 0 && (
          <div className="flex -space-x-2">
            <User className="h-4 w-4 text-blue-500 mr-4 mt-2" />
            {contacts.map((contact, index) => renderContactAvatar(contact, index))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerInfoSection;
