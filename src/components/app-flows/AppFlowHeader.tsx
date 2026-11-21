import PageHeading from "../common/PageHeading";
import SearchBar from "../common/SearchBar";
import AddButton from "../common/buttons/AddButton";

import React from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../store";
import { setSearchTerm } from "../../store/appflowSlice";

interface AppFlowHeaderProps {
  pageHeading?: string;
  handleOpenAddModal: () => void;
}

const AppFlowHeader: React.FC<AppFlowHeaderProps> = ({
  pageHeading = "App Flows",
  handleOpenAddModal
}) => {
  const dispatch = useDispatch();
  const searchTerm = useSelector((state: RootState) => state.appflow.searchTerm);
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
          <AddButton pageHeading={pageHeading} handleOpenAddModal={handleOpenAddModal} variant="plus"/>
        </div>
      </div>
    </div>
  );
};

export default AppFlowHeader;