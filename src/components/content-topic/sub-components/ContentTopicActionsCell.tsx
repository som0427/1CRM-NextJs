import React from "react";
import EditActionButton from "../../common/buttons/action-button/EditActionButton";
import SequenceActionButton from "../../common/buttons/action-button/SequenceActionButton";
import { createActionQueue, createPlaceholder, useActionCellProtection } from "../../common/utils/actionQueue";

interface ContentTopicActionsCellProps {
  data: {
    id: number;
    topicName: string;
  };
  onEdit?: (id: number) => void;
  onSequence?: (id: number, topicName: string) => void;
}

const ContentTopicActionsCell: React.FC<ContentTopicActionsCellProps> = ({
  data,
  onEdit,
  onSequence,
}) => {
  const { containerRef, renderKey } = useActionCellProtection();

  if (!data) return null;

  const queue = createActionQueue();

  // Edit button
  if (onEdit) {
    queue.add(
      <EditActionButton
        key="edit"
        id={data.id}
        onEdit={onEdit}
        variant="new"
        className="w-6 h-6"
      />,
      true
    );
  } else {
    queue.add(createPlaceholder("edit-placeholder"), false);
  }

  // Sequence button
  if (onSequence) {
    queue.add(
      <SequenceActionButton
        key="sequence"
        id={data.id}
        topicName={data.topicName}
        onSequence={onSequence}
        className="w-6 h-6"
      />,
      true
    );
  } else {
    queue.add(createPlaceholder("sequence-placeholder"), false);
  }

  return (
    <div ref={containerRef} key={renderKey} className="flex justify-center items-center w-full h-full gap-[8px]">
      {queue.getActions()}
    </div>
  );
};

export default ContentTopicActionsCell;
