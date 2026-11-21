import React from 'react';
import { useRouter } from 'next/router';
import EditActionButton from '../../common/buttons/action-button/EditActionButton';

interface UserRoleActionsCellRendererProps {
  // AG Grid React will pass `data` and other properties directly to the component
  data?: any;
  onUserRoleEdit?: (userRole: any) => void;
  // Keep `params` optional for backward compatibility when used as a function renderer
  params?: any;
}

const UserRoleActionsCellRenderer: React.FC<UserRoleActionsCellRendererProps> = (props) => {
  const { onUserRoleEdit } = props;
  const router = useRouter();
  const data = props.data || props.params?.data;
  if (!data) {
    return null;
  }

  // Handler for action buttons
  const handleAction = (action: string) => {
    switch (action) {
      case 'edit':
        if (onUserRoleEdit) {
          onUserRoleEdit(data);
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
          id={data.roleId ?? data.id}
          variant='new'
          onEdit={() => handleAction('edit')}
          className="space-between-icon"
        />
    </div>
  );
};

export default UserRoleActionsCellRenderer;
