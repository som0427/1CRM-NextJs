import PageHeading from "../common/PageHeading";
import AddButton from "../common/buttons/AddButton";
import SearchBar from "../common/SearchBar";
import React from "react";

interface ContentTopicHeaderProps {
  pageHeading?: string;
  handleOpenAddModal: () => void;
  searchText: string;
  setSearchText: (val: string) => void;
}

const ContentTopicHeader: React.FC<ContentTopicHeaderProps> = ({
  pageHeading = "Content Topic",
  handleOpenAddModal,
  searchText,
  setSearchText,
}) => {
  return (
    <div className="flex flex-col space-y-4 bg-white py-4 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <PageHeading heading={pageHeading} />
        </div>
        <div className="flex items-center gap-4">
          <SearchBar
            searchTerm={searchText}
            setSearchTerm={setSearchText}
            handleSearch={() => {}}
            variant="expandable"
          />
          <AddButton pageHeading={pageHeading} handleOpenAddModal={handleOpenAddModal} variant="plus" />
        </div>
      </div>
    </div>
  );
};

export default ContentTopicHeader;
