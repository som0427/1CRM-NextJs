import React from "react";
import EditActionButton from "@/components/common/buttons/action-button/EditActionButton";
import DashboardActionButton from "@/components/common/buttons/action-button/DashboardActionButton";

interface WorkflowActionsCellProps {
  data?: any;
  onEdit?: (workflowId: number) => void;
  onOpen?: (workflowId: number) => void;
}

const WorkflowActionsCell: React.FC<WorkflowActionsCellProps> = ({
  data,
  onEdit,
  onOpen,
}) => {
  const workflowId = data?.id ?? data?.workflowId ?? 0;

  if (!workflowId) {
    return null;
  }

  return (
    <div className="flex items-center justify-center w-full h-full" style={{ gap: '8px' }}>
      {onEdit && (
        <EditActionButton
          id={workflowId}
          onEdit={onEdit}
          variant="new"
          className="-mx-2"
        />
      )}
      {onOpen && (
        <DashboardActionButton
          id={workflowId}
          onDashboard={onOpen}
          className="-mx-2"
        />
      )}
    </div>
  );
};

export default WorkflowActionsCell;
