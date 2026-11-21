import React from 'react';
import CallActionButton from '../../common/buttons/action-button/CallActionButton';
import EditActionButton from '../../common/buttons/action-button/EditActionButton';
import DashboardActionButton from '../../common/buttons/action-button/DashboardActionButton';

interface CustomerActionsCellRendererProps {
  params: any;
  onCustomerView: (customerId: number) => void;
  onCustomerEdit: (customerId: number) => void;
  onCustomerDashboard?: (customerId: number) => void;
}

const CustomerActionsCellRenderer: React.FC<CustomerActionsCellRendererProps> = ({
  params,
  onCustomerView,
  onCustomerEdit,
  onCustomerDashboard
}) => {
  const data = params.data;
  if (!data) {
    return null;
  }

  // Handler for action buttons
  const handleAction = (action: string) => {
    const customerId = data.id;
    if (!customerId) return;

    switch (action) {
      case 'view':
        onCustomerView(customerId);
        break;
      case 'edit':
        onCustomerEdit(customerId);
        break;
      case 'dashboard':
        if (onCustomerDashboard) {
          onCustomerDashboard(customerId);
        }
        break;
    }
  };

  return (
    <div className="flex items-center justify-center">
      <CallActionButton 
        id={params.data.id}
        onCall={() => handleAction('view')}
        className="space-between-icon"
      />
      <EditActionButton 
        id={params.data.id}
        variant='new'
        onEdit={() => handleAction('edit')}
        className="space-between-icon"
      />
      {onCustomerDashboard && (
        <DashboardActionButton 
          id={params.data.id}
          onDashboard={() => handleAction('dashboard')}
        />
      )}
    </div>
  );
};

export default CustomerActionsCellRenderer;
