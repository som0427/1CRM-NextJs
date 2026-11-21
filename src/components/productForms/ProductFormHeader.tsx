import React from 'react';
import PageHeading from '../common/PageHeading';
import SearchBar from '../common/SearchBar';
import AddButton from '../common/buttons/AddButton';
import DownloadButton from '../common/buttons/DownloadButton';
import ReorderButton from '../common/buttons/ReorderButton';
import VerticalDivider from '../common/VerticalDivider';
import { useProductForms } from '@/contexts/ProductFormContext';

const ProductFormHeader: React.FC = () => {
  const {
    pageHeading,
    searchTerm,
    setSearchTerm,
    handleSearch,
    exporting,
    exportEntities,
    handleOpenAddModal,
    handleSaveDisplayOrder,
    isSavingDisplayOrder
  } = useProductForms();

  return (
    <div className="flex flex-col space-y-4 rounded-lg bg-white py-4">
      <div className="flex items-center justify-between">
        <PageHeading heading={pageHeading} />
        <div className="flex items-center gap-4">
          <SearchBar
            searchTerm={searchTerm}
            border="gray"
            variant="expandable"
            setSearchTerm={setSearchTerm}
            handleSearch={handleSearch}
          />
          <ReorderButton
            onClick={handleSaveDisplayOrder}
            loading={isSavingDisplayOrder}
          />
          <VerticalDivider />
          <AddButton pageHeading={pageHeading} handleOpenAddModal={handleOpenAddModal} />
        </div>
      </div>
    </div>
  );
};

export default ProductFormHeader;
