import PageHeading from "../common/PageHeading";
import SearchBar from "../common/SearchBar";
import AddButton from "../common/buttons/AddButton";

import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../store";
import { setSearchTerm } from "../../store/contentDeckSlice";
import DownloadButton from "../common/buttons/DownloadButton";

interface ContentDecksHeaderProps {
  pageHeading?: string;
  handleOpenAddModal: () => void;
}

const ContentDecksHeader: React.FC<ContentDecksHeaderProps> = ({
  pageHeading = "Traingram",
  handleOpenAddModal
}) => {
  const dispatch = useDispatch();
  const searchTerm = useSelector((state: RootState) => state.contentDeck.searchTerm);
  const handleSearch = (term: string) => {
    dispatch(setSearchTerm(term));
  };


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
            setSearchTerm={(term: string) => dispatch(setSearchTerm(term))}
            handleSearch={() => handleSearch(searchTerm)}
          />
          
          {/* <DownloadButton
            exporting={false}
            exportEntities={() => { }}
          /> */}
          <AddButton pageHeading={pageHeading} handleOpenAddModal={handleOpenAddModal}/>
        </div>
      </div>
    </div>
  );
};

export default ContentDecksHeader;
