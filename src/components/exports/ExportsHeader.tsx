import React from 'react';
import PageHeading from '../common/PageHeading';
import SearchBar from '../common/SearchBar';

interface ExportsHeaderProps {
  pageHeading: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleSearch: () => void;
}

const ExportsHeader: React.FC<ExportsHeaderProps> = ({
  pageHeading,
  searchTerm,
  setSearchTerm,
  handleSearch,
}) => {
  return (
    <div className="flex flex-col space-y-4 bg-white py-4 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <PageHeading heading={pageHeading} />
        </div>
        <div className="flex items-center gap-4">
          <SearchBar
            searchTerm={searchTerm}
            border="gray"
            variant="expandable"
            setSearchTerm={setSearchTerm}
            handleSearch={handleSearch}
          />
        </div>
      </div>
    </div>
  );
};

export default ExportsHeader;
