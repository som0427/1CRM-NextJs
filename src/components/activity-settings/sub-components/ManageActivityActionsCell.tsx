import React from "react";
import EditActionButton from "../../common/buttons/action-button/EditActionButton";
import DeleteActionButton from "../../common/buttons/action-button/DeleteActionButton";
import { createActionQueue, createPlaceholder, useActionCellProtection } from "../../common/utils/actionQueue";

interface ManageActivityActionsCellProps {
  data: {
    activityId: number;
    anyTransactionPerformed?: boolean;
    defaultActivity?: number;
    isPayoutIntegrated?: number;
    activityTypeIdentifier?: number;
  };
  onEdit?: (activityId: number) => void;
  onDelete?: (activityId: number) => void;
}

const ManageActivityActionsCell: React.FC<ManageActivityActionsCellProps> = ({
  data,
  onEdit,
  onDelete,
}) => {
  // Hook to protect against DOM manipulation via DevTools
  const { containerRef, renderKey } = useActionCellProtection();

  if (!data) return null;

  // Show delete button if: defaultActivity == 0 && anyTransactionPerformed == false
  const showDelete = data.defaultActivity === 0 && data.anyTransactionPerformed === false;

  // Disable edit button if: isPayoutIntegrated == 0 && activityTypeIdentifier == 6
  const disableEdit = data.isPayoutIntegrated === 0 && data.activityTypeIdentifier === 6;

  // Build actions using priority queue - user can add in any order
  const queue = createActionQueue();

  // Add edit button or placeholder
  if (onEdit) {
    queue.add(
      <EditActionButton
        key="edit"
        id={data.activityId}
        onEdit={onEdit}
        variant="new"
        disabled={disableEdit}
        className="w-6 h-6"
      />,
      true
    );
  } else {
    queue.add(createPlaceholder("edit-placeholder"), false);
  }

  // Add delete button or placeholder
  if (onDelete && showDelete) {
    queue.add(
      <DeleteActionButton key="delete" className="w-6 h-6" id={data.activityId} onClick={onDelete} />,
      true
    );
  } else {
    queue.add(createPlaceholder("delete-placeholder"), false);
  }

  return (
    <div ref={containerRef} key={renderKey} className="flex justify-center items-center w-full h-full gap-[8px]">
      {queue.getActions()}
    </div>
  );
};

export default ManageActivityActionsCell;
