import React from 'react';
import { useRouter } from 'next/router';
import EditActionButton from '../../common/buttons/action-button/EditActionButton';

interface ContactActionsCellRendererProps {
  params: any;
  onProductEdit: (contact: any) => void;
}

const ContactActionsCellRenderer: React.FC<ContactActionsCellRendererProps> = ({
  params,
  onProductEdit,
}) => {
  const router = useRouter();
  const data = params.data;
  if (!data) {
    return null;
  }

  // Handler for action buttons
  const handleAction = (action: string) => {
    switch (action) {
      case 'edit':
        if (onProductEdit) {
          onProductEdit(data);
        }
        break;
    }
  };

  return (
    <div 
      className="flex items-center justify-end pr-2"
      style={{ 
        width: '100%',
        justifyContent: 'flex-end',
        textAlign: 'right' 
      }}
    >
        <EditActionButton 
          id={params.data.id}
          variant='new'
          onEdit={() => handleAction('edit')}
          className="space-between-icon"
        />
    </div>
  );
};

export default ContactActionsCellRenderer;
