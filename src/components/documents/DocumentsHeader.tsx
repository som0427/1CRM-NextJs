import React from 'react';
import { Search, Download, Plus, FolderPlus } from 'lucide-react';
import PageHeading from '../common/PageHeading';
import SearchBar from '../common/SearchBar';
import { setSearchTerm } from '@/store/contentDeckSlice';
import AddButton from '../common/buttons/AddButton';
import DownloadButton from '../common/buttons/DownloadButton';

interface DocumentsHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSearch: () => void;
  onExport: () => void;
  onCreateFolder: () => void;
  onUploadDocument: () => void;
  exporting: boolean;
  pageHeading: string;
}

const DocumentsHeader: React.FC<DocumentsHeaderProps> = ({
  searchTerm,
  onSearchChange,
  onSearch,
  onExport,
  onCreateFolder,
  onUploadDocument,
  exporting,
  pageHeading
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };



  return (
    <div className="flex flex-col space-y-4 bg-white py-4 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <PageHeading heading={pageHeading} />
        </div>
        <div className="flex items-center gap-4">
          <SearchBar
            searchTerm={searchTerm}
            border="blue"
            variant="expandable"
            setSearchTerm={onSearchChange}
            handleSearch={onSearch}
          />
          
          <AddButton
            pageHeading={pageHeading}
            handleOpenAddModal={onCreateFolder}
            variant="folder"
          />
          <AddButton
            pageHeading={pageHeading}
            handleOpenAddModal={onUploadDocument}
            variant="document"
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentsHeader;
