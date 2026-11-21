import React, { useState } from 'react';
import { CustomAttributeTypeEnum } from '../../lib/constants/CustomAttributeTypeEnum.constant';
import FileViewerModal from './FileViewerModal';

interface FileViewerCellRendererProps {
  value: string; // The file path
  data: any; // The row data
  colDef: any; // The column definition
  attributeType: CustomAttributeTypeEnum.IMAGE | CustomAttributeTypeEnum.AUDIO_VIDEO | CustomAttributeTypeEnum.DOCUMENT_UPLOAD;
}

const FileViewerCellRenderer: React.FC<FileViewerCellRendererProps> = ({
  value,
  attributeType
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Don't render anything if no value
  if (!value || value.trim() === '') {
    return <span className="text-gray-400 text-sm">{value}</span>;
  }

  const handleViewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Open modal for all file types
    setIsModalOpen(true);
  };
  
  const handleDownload = () => {
    const baseUrl = process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL || '';
    
    // Check if there are comma-separated paths
    const paths = value.split(',').map(path => path.trim()).filter(path => path.length > 0);
    
    if (paths.length > 1) {
      // Sequential download for multiple files
      paths.forEach((path, index) => {
        setTimeout(() => {
          const fullUrl = `${baseUrl}${path}`;
          const fileName = path.split('/').pop() || `file_${index + 1}`;
          
          const link = document.createElement('a');
          link.href = fullUrl;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, index * 500); // 500ms delay between downloads
      });
    } else {
      // Single file download
      const fullUrl = `${baseUrl}${value}`;
      const fileName = getFileName();
      
      const link = document.createElement('a');
      link.href = fullUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };
  // Get file name from path
  function getFileName():string{
    return value.split('/').pop() || 'Unknown File';
  };

  return (
    <>
      <button
        onClick={handleViewClick}
        className="text-sm font-medium cursor-pointer bg-transparent border-none p-0 hover:opacity-80"
        style={{ color: '#3699FF' }}
        title={`Click to view: ${getFileName()}`}
      >
        View
      </button>
      
      {/* Show modal for all file types */}
      <FileViewerModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        filePath={value}
        fileName={getFileName()}
        fileType={attributeType}
      />
    </>
  );
};

export default FileViewerCellRenderer;
