import React, { FC } from 'react';
import { useSnackbar } from 'notistack';
import AddForm from './AddForm';
import EditForm from './EditForm';

interface UserAddEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onError?: (message: string) => void;
  userId?: number | string | null;
  serialNo?: string | null;
  isEditing?: boolean;
}

const UserAddEditForm: FC<UserAddEditFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
  userId,
  serialNo,
  isEditing = false,
}) => {
  const { enqueueSnackbar } = useSnackbar();

  const handleSuccess = () => {
    const message = isEditing ? 'User updated successfully' : 'User added successfully';
    enqueueSnackbar(message, { variant: 'success' });
    onSuccess?.();
    onClose();
  };

  const handleError = (message: string) => {
    enqueueSnackbar(message || 'Unable to save user', { variant: 'error' });
    onError?.(message);
  };

  // AddForm uses TwinModal internally
  if (!isEditing) {
    return (
      <AddForm
        open={isOpen}
        onClose={onClose}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    );
  }

  // EditForm now also uses TwinModal internally
  // Only render when open to ensure fresh mount with correct initial state
  if (!isOpen) return null;

  return (
    <EditForm
      open={isOpen}
      onClose={onClose}
      onSuccess={handleSuccess}
      onError={handleError}
      userId={userId ?? undefined}
      serialNo={serialNo ?? undefined}
    />
  );
};

export default UserAddEditForm;
