import React from "react";
import EditActionButton from "../../common/buttons/action-button/EditActionButton";
import CopyActionButton from "../../common/buttons/action-button/CopyActionButton";

interface AppFlowActionsCellProps {
  data: any;
  onFlowEdit?: (id: number) => void;
  onFlowCopy?: (id: number) => void;
}

const AppFlowActionsCell: React.FC<AppFlowActionsCellProps> = ({ 
  data, 
  onFlowEdit,
  onFlowCopy
}) => {
  return (
    <div className="flex justify-center items-center w-full h-full">
      {onFlowEdit && (
        <EditActionButton id={data.id} onEdit={onFlowEdit} variant="new"/>
      )}
      {onFlowCopy && (
        <CopyActionButton id={data.id} onCopy={onFlowCopy} className="-ml-1"/>
      )}
    </div>
  );
};

export default AppFlowActionsCell;