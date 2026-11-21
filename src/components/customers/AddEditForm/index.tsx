import { FC, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/tailwind/dialog";
import { Button } from "../../ui/tailwind";
import { X } from 'lucide-react';
import AddForm from './AddForm';
import EditForm from './EditForm';

interface CustomerAddEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  customerId?: any;
  isEditing?: boolean;
  source?: 'self' | 'team' | 'all';
}

const CustomerAddEditForm: FC<CustomerAddEditFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customerId,
  isEditing = false,
  source = 'self'
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        
        {isEditing ? (
          <EditForm
            onCancel={onClose}
            onSuccess={handleSuccess}
            isLoading={isLoading}
            source={source}
            companyId={customerId}
            isEditAllowed={true}
          />
        ) : (
          <AddForm
            onCancel={onClose}
            onSuccess={handleSuccess}
            isLoading={isLoading}
            source={source}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomerAddEditForm;
