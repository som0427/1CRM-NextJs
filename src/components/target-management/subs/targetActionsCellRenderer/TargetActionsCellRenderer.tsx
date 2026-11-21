import React from 'react';
import EditActionButton from '../../../common/buttons/action-button/EditActionButton';
import UploadActionButton from '../../../common/buttons/action-button/UploadActionButton';

interface TargetActionsCellRendererProps {
  params: any;
  onTargetEdit?: (targetId: number) => void;
  onTargetUpload?: (targetId: number) => void;
}

const TargetActionsCellRenderer: React.FC<TargetActionsCellRendererProps> = ({
  params,
  onTargetEdit,
  onTargetUpload
}) => {
  const data = params.data;
  if (!data) {
    return null;
  }

  const handleAction = (action: 'edit' | 'upload', targetId: number) => {
    if (!targetId) return;

    switch (action) {
      case 'edit':
        if (onTargetEdit) {
          onTargetEdit(targetId);
        }
        break;
      case 'upload':
        if (onTargetUpload) {
          onTargetUpload(targetId);
        }
        break;
    }
  };

  return (
    <div className="flex items-center justify-center w-full h-full">
      <EditActionButton
        id={params.data.id}
        variant="new"
        onEdit={(targetId) => handleAction('edit', targetId)}
        className="space-between-icon"
      />
      <UploadActionButton
        id={params.data.id}
        onClick={(targetId) => handleAction('upload', targetId)}
        className="space-between-icon"
      />
    </div>
  );
};

export default TargetActionsCellRenderer;
