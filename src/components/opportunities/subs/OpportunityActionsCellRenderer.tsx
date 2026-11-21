import React from 'react';
import { useRouter } from 'next/router';
import CallActionButton from '../../common/buttons/action-button/CallActionButton';
import EditActionButton from '../../common/buttons/action-button/EditActionButton';
import DashboardActionButton from '../../common/buttons/action-button/DashboardActionButton';

interface OpportunityActionsCellRendererProps {
  params: any;
  onOpportunityView: (opportunity: any) => void;
  onOpportunityEdit: (opportunity: any) => void;
  onOpportunityDashboard?: (opportunity: any) => void;
}

const OpportunityActionsCellRenderer: React.FC<OpportunityActionsCellRendererProps> = ({
  params,
  onOpportunityView,
  onOpportunityEdit,
  onOpportunityDashboard
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
        if (onOpportunityView) {
          onOpportunityView(data);
        }
        break;
      case 'edit':
        if (onOpportunityEdit) {
          onOpportunityEdit(data);
        }
        break;
      case 'dashboard':
        // Navigate to opportunity dashboard page
        router.push(`/opportunity-dashboard/${data.id}`);
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

export default OpportunityActionsCellRenderer;
