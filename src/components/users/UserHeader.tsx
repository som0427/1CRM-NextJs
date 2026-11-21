import React from "react";
import PageHeading from "../common/PageHeading";
import SearchBar from "../common/SearchBar";
import DownloadButton from "../common/buttons/DownloadButton";
import AddButton from "../common/buttons/AddButton";
import { useUsers } from '../../contexts/UserContext';
import MenuDropdown from "../common/buttons/MenuDropdown";
import VerticalDivider from "../common/VerticalDivider";

const UserHeader: React.FC = () => {
  const {
    pageHeading,
    searchTerm,
    setSearchTerm,
    handleSearch,
    exporting,
    exportUsers,
    handleOpenAddModal,
    handleOpenFilterModal,
    hasActiveFilters,
    activeFiltersCount,
    handleClearFilters,
  } = useUsers();

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

          <MenuDropdown
            onClick={handleOpenFilterModal}
            hasActiveFilters={hasActiveFilters}
            activeFiltersCount={activeFiltersCount}
            onClear={handleClearFilters}
          />

          <DownloadButton
            exporting={exporting}
            exportEntities={exportUsers}
          />
          <VerticalDivider />
          <AddButton
            pageHeading={pageHeading}
            handleOpenAddModal={handleOpenAddModal}
          />
        </div>
      </div>
    </div>
  );
};

export default UserHeader;
