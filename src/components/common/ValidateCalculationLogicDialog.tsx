import React from 'react';
import AlertDialog from '@/components/common/AlertDialog';

interface ValidateCalculationLogicDialogProps {
  open: boolean;
  onClose: () => void;
}

const ValidateCalculationLogicDialog: React.FC<ValidateCalculationLogicDialogProps> = ({ open, onClose }) => {
  return (
    <AlertDialog
      open={open}
      onClose={onClose}
      title="Alert"
      message="Please validate calculation logic."
      buttons={[
        {
          label: 'Ok',
          onClick: onClose,
          variant: 'ghost',
        },
      ]}
      size="md"
      closeOnBackdropClick={false}
    />
  );
};

export default ValidateCalculationLogicDialog;
