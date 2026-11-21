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
    <div className="flex items-center justify-center w-full h-full gap-2">
      {onEdit && (
        <EditActionButton
          id={workflowId}
          onEdit={onEdit}
          variant="new"
          className="space-between-icon"
        />
      )}
      {onOpen && (
        <DashboardActionButton
          id={workflowId}
          onDashboard={onOpen}
        />
      )}
    </div>
  );
};

export default WorkflowActionsCell;
