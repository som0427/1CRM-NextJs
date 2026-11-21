import React from "react";
import PageHeading from "@/components/common/PageHeading";
import SearchBar from "@/components/common/SearchBar";
import AddButton from "@/components/common/buttons/AddButton";

interface WorkflowsHeaderProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSearch: () => void;
  onAdd?: () => void;
}

const WorkflowsHeader: React.FC<WorkflowsHeaderProps> = ({
  searchTerm,
  onSearchTermChange,
  onSearch,
  onAdd
}) => {
  return (
    <div className="flex flex-col space-y-4 bg-white py-4 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <PageHeading heading="Workflows" />
        </div>
        <div className="flex items-center gap-4">
          <SearchBar
            searchTerm={searchTerm}
            setSearchTerm={onSearchTermChange}
            handleSearch={onSearch}
            border="blue"
            variant="expandable"
          />
          <AddButton
            pageHeading="Workflows"
            handleOpenAddModal={onAdd || (() => {})}
            variant="plus"
          />
        </div>
      </div>
    </div>
  );
};

export default WorkflowsHeader;
