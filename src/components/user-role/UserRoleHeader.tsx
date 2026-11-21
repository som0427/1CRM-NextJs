import React from "react";
import PageHeading from "../common/PageHeading";
import SearchBar from "../common/SearchBar";
import AddButton from "../common/buttons/AddButton";

import { useUserRoles } from '../../contexts/UserRoleContext';

const UserRoleHeader: React.FC = () => {
  const {
    pageHeading,
    searchTerm,
    setSearchTerm,
    handleSearch,
    handleOpenAddModal,
  } = useUserRoles();

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
          
          <AddButton
            pageHeading={pageHeading}
            handleOpenAddModal={handleOpenAddModal}
          />
        </div>
      </div>
    </div>
  );
}

export default UserRoleHeader;
