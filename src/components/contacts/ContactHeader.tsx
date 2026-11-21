import React from "react";
import PageHeading from "../common/PageHeading";
import SearchBar from "../common/SearchBar";
import DownloadButton from "../common/buttons/DownloadButton";
import UserProfileButtons from "../common/buttons/UserProfileButtons";
import AddButton from "../common/buttons/AddButton";

import { useContacts } from '../../contexts/ContactContext';

const ContactHeader: React.FC = () => {
  const {
    pageHeading,
    searchTerm,
    setSearchTerm,
    handleSearch,
    setLoading,
    setNeedsListRefresh,
    exporting,
    exportContacts,
    selectedView,
    setSelectedView,
    handleOpenAddModal,
  } = useContacts();

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
          <UserProfileButtons
            selectedView={selectedView}
            setSelectedView={setSelectedView}
            setLoading={setLoading}
            setNeedsListRefresh={() => {}}
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

export default ContactHeader;
