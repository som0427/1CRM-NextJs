import React from "react";
import PageHeading from "../common/PageHeading";
import SearchBar from "../common/SearchBar";
import DownloadButton from "../common/buttons/DownloadButton";
import UserProfileButtons from "../common/buttons/UserProfileButtons";
import AddButton from "../common/buttons/AddButton";

import { useProducts } from '../../contexts/ProductContext';
import MenuDropdown from "../common/buttons/MenuDropdown";

const ProductHeader: React.FC = () => {
  const {
    pageHeading,
    searchTerm,
    setSearchTerm,
    handleSearch,
    exporting,
    exportProducts,
    handleOpenAddModal,
    handleOpenFilterModal,
    hasActiveFilters,
    activeFiltersCount,
    handleClearFilters,
  } = useProducts();


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
          {/*<DownloadButton
            exporting={exporting}
            exportEntities={exportProducts}
          />*/}
          <AddButton
            pageHeading={pageHeading}
            handleOpenAddModal={handleOpenAddModal}
          />
        </div>
      </div>
    </div>
  );
}

export default ProductHeader;