import React from "react";
import PageHeading from "../common/PageHeading";
import SearchBar from "../common/SearchBar";
import ViewToggle from "../common/buttons/ViewToggle";
import DownloadButton from "../common/buttons/DownloadButton";
import UserProfileButtons from "../common/buttons/UserProfileButtons";
import AddButton from "../common/buttons/AddButton";
import MenuDropdown from "../common/buttons/MenuDropdown";

import { useOpportunities } from '../../contexts/OpportunitiesContext';

const OpportunitiesHeader: React.FC = () => {
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
  } = useOpportunities();

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
          <div className="flex items-center gap-4">
            {/*<MenuDropdown />*/}
            <ViewToggle
              viewMode={viewMode}
              setViewMode={setViewMode}
              setLoading={setLoading}
              setNeedsListRefresh={setNeedsListRefresh}
              gridDataLoaded={gridDataLoaded}
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
    </div>
  );
}

export default OpportunitiesHeader;
