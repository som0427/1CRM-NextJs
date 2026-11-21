import PageHeading from "../common/PageHeading";
import SearchBar from "../common/SearchBar";
import VerticalDivider from "../common/VerticalDivider";
import AddButton from "../common/buttons/AddButton";
import ReorderButton from "../common/buttons/ReorderButton";

import React from "react";

interface ManageActivityHeaderProps {
  pageHeading?: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleSearch: () => void;
  handleOpenAddModal?: () => void;
  onSaveDisplayOrder?: () => void;
  isSavingDisplayOrder?: boolean;
  hideAddButton?: boolean;
}

const ManageActivityHeader: React.FC<ManageActivityHeaderProps> = ({
  pageHeading = "Activities",
  handleOpenAddModal,
  searchTerm,
  setSearchTerm,
  handleSearch,
  onSaveDisplayOrder,
  isSavingDisplayOrder = false,
  hideAddButton = false,
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
            border="blue"
            variant="expandable"
            setSearchTerm={setSearchTerm}
            handleSearch={handleSearch}
          />
          {onSaveDisplayOrder && (
            <ReorderButton onClick={onSaveDisplayOrder} loading={isSavingDisplayOrder} />
          )}
          <VerticalDivider/>
          {!hideAddButton && handleOpenAddModal && (
            <AddButton pageHeading="Add New Activity" handleOpenAddModal={handleOpenAddModal} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageActivityHeader;
