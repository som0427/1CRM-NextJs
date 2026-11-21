import React from "react";
import PageHeading from "../common/PageHeading";
import SearchBar from "../common/SearchBar";
import ViewToggle from "../common/buttons/ViewToggle";
import DownloadButton from "../common/buttons/DownloadButton";
import UserProfileButtons from "../common/buttons/UserProfileButtons";
import AddButton from "../common/buttons/AddButton";
import MenuDropdown from "../common/buttons/MenuDropdown";

import { useCustomer } from '../../contexts/CustomerContext';

const CustomerHeader: React.FC = () => {
  const {
    pageHeading,
    searchTerm,
    setSearchTerm,
    handleSearch,
    viewMode,
    setViewMode,
    setLoading,
    setNeedsListRefresh,
    gridDataLoaded,
    exporting,
    exportOpportunities,
    selectedView,
    setSelectedView,
    handleOpenAddModal,
    handleOpenFilterModal,
    hasActiveFilters,
    activeFiltersCount,
    handleClearFilters,
  } = useCustomer();

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
            exportEntities={exportOpportunities}
          />
          <UserProfileButtons
            selectedView={selectedView}
            setSelectedView={setSelectedView}
            setLoading={setLoading}
            setNeedsListRefresh={setNeedsListRefresh}
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

export default CustomerHeader;
