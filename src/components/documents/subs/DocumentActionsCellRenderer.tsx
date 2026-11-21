import React from 'react';
import { Edit2, Trash2, Download, Share, Eye } from 'lucide-react';
import EditActionButton from '@/components/common/buttons/action-button/EditActionButton';
import DownloadActionButton from '@/components/common/buttons/action-button/DownloadActionButton';

interface DocumentActionsCellRendererProps {
  params: any;
  onDocumentView?: (document: any) => void;
  onDocumentEdit: (document: any) => void;
  onDocumentDelete: (document: any) => void;
  onDocumentDownload: (document: any) => void;
  onDocumentShare: (document: any) => void;
}

const DocumentActionsCellRenderer: React.FC<DocumentActionsCellRendererProps> = ({
  params,
  onDocumentView,
  onDocumentEdit,
  onDocumentDelete,
  onDocumentDownload,
  onDocumentShare
}) => {
  const data = params.data;
  if (!data) {
    return null;
  }

  const isFolder = data.type === 'folder';

  // Handler for action buttons
  const handleAction = (action: string) => {
    switch (action) {
      case 'edit':
        if (onDocumentEdit) {
          onDocumentEdit(data);
        }
        break;
      case 'delete':
        if (onDocumentDelete) {
          onDocumentDelete(data);
        }
        break;
      case 'download':
        if (onDocumentDownload) {
          onDocumentDownload(data);
        }
        break;
      case 'share':
        if (onDocumentShare) {
          onDocumentShare(data);
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
      {/* Edit Button */}
      <EditActionButton 
          id={params.data.id}
          variant='new'
          onEdit={() => handleAction('edit')}
          className="space-between-icon"
        />

      {/* Download Button - Only for documents, not folders */}
      {!isFolder && (
        <DownloadActionButton 
        id={params.data.id}
        onClick={() => handleAction('download')}
        className="space-between-icon"
      />
      )}
    </div>
  );
};

export default DocumentActionsCellRenderer;
