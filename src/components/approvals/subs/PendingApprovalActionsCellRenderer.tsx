import DashboardActionButton from '@/components/common/buttons/action-button/DashboardActionButton';
import React from 'react';

interface PendingApprovalActionsCellRendererProps {
  data?: any;
  value?: any;
  onApprovalView?: (approvalId: number) => void;
}

const PendingApprovalActionsCellRenderer: React.FC<PendingApprovalActionsCellRendererProps> = (props) => {
  const data = props?.data;

  if (!data) {
    return null;
  }

  const handleView = (id: number) => {
    if (props.onApprovalView) {
      props.onApprovalView(id);
    }
  };

  const approvalId = data.id || data.approvalId || 0;

  return (
    <div className="flex justify-center items-center w-full h-full">
      <DashboardActionButton 
        id={approvalId}
        onDashboard={handleView}
      />
    </div>
  );
};

export default PendingApprovalActionsCellRenderer;
