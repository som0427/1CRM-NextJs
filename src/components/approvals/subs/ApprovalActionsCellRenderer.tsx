import EyeButton from '@/components/common/buttons/action-button/EyeButton';
import React from 'react';

interface ApprovalActionsCellRendererProps {
  data?: any;
  value?: any;
  onApprovalView?: (approvalId: number) => void;
}

const ApprovalActionsCellRenderer: React.FC<ApprovalActionsCellRendererProps> = (props) => {
  const data = props?.data;
  const onApprovalView = props?.onApprovalView;
  
  if (!data) {
    return null;
  }

  const handleView = (id: number) => {
    if (onApprovalView) {
      onApprovalView(id);
    }
  };

  const approvalId = data.id || data.approvalId || 0;

  return (
    <div className="flex justify-center items-center w-full h-full">
      <EyeButton 
        id={approvalId}
        onView={handleView}
      />
    </div>
  );
};

export default ApprovalActionsCellRenderer;