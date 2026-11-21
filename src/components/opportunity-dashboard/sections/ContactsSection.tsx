import React from 'react';
import { Phone, Mail } from 'lucide-react';

interface Contact {
  contactId: number;
  name: string;
  serialNo?: string;
  phone?: string;
  email?: string;
}

interface ContactsSectionProps {
  contacts: Contact[];
}

const ContactsSection: React.FC<ContactsSectionProps> = ({ contacts }) => {
  return (
    <div className="bg-white rounded-lg">
      {contacts.length === 0 ? (
        <div className="text-center py-6 text-gray-500">No contacts available</div>
      ) : (
        <div className="grid gap-4">
          {contacts.map((contact, index) => (
            <div 
              key={index} 
              className="border border-gray-100 rounded-md p-4 shadow-sm"
            >
              <div className="flex items-center mb-2">
                <h3 className="text-base font-medium">{contact.name}</h3>
                {contact.serialNo && (
                  <span className="text-xs font-medium text-gray-500"> - {contact.serialNo}</span>
                )}
              </div>
              
              <div className="space-y-2">
                {contact.phone && (
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 text-gray-400 mr-2" />
                    <a 
                      href={`tel:${contact.phone}`} 
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {contact.phone}
                    </a>
                  </div>
                )}
                
                {contact.email && (
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 text-gray-400 mr-2" />
                    <a 
                      href={`mailto:${contact.email}`} 
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContactsSection;
