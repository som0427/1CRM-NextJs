import React from 'react';
import { useRouter } from 'next/router';
import CallActionButton from '../../common/buttons/action-button/CallActionButton';
import EditActionButton from '../../common/buttons/action-button/EditActionButton';
import DashboardActionButton from '../../common/buttons/action-button/DashboardActionButton';

interface ContactActionsCellRendererProps {
  params: any;
  onContactView: (contact: any) => void;
  onContactEdit: (contact: any) => void;
  onContactDashboard?: (contact: any) => void;
}

const ContactActionsCellRenderer: React.FC<ContactActionsCellRendererProps> = ({
  params,
  onContactView,
  onContactEdit,
  onContactDashboard
}) => {
  const router = useRouter();
  const data = params.data;
  if (!data) {
    return null;
  }

  // Handler for action buttons
  const handleAction = (action: string) => {
    switch (action) {
      case 'view':
        if (onContactView) {
          onContactView(data);
        }
        break;
      case 'edit':
        if (onContactEdit) {
          onContactEdit(data);
        }
        break;
      case 'dashboard':
        // Navigate to contact dashboard page
        router.push(`/contact-dashboard/${data.id}`);
        break;
    }
  };

  return (
    <div 
      className="flex items-center justify-end"
      style={{ 
        width: '100%',
        justifyContent: 'flex-end',
        textAlign: 'right' 
      }}
    >
        <EditActionButton 
          id={params.data.id}
          variant='new'
          onEdit={() => handleAction('edit')}
          className="space-between-icon"
        />
      <DashboardActionButton 
        id={params.data.id}
        onDashboard={() => handleAction('dashboard')}
      />
    </div>
  );
};

export default ContactActionsCellRenderer;
