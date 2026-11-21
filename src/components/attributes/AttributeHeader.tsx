import PageHeading from "../common/PageHeading";
import SearchBar from "../common/SearchBar";
import AddButton from "../common/buttons/AddButton";
import ReorderButton from "../common/buttons/ReorderButton";
import SettingToggle from "../common/buttons/SettingToggle";
import VerticalDivider from "../common/VerticalDivider";

import React from "react";

interface AttributeHeaderProps {
  pageHeading?: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleSearch: () => void;
  activeTab: 'fields' | 'logs' | 'setting';
  setActiveTab: (tab: 'setting' | 'logs') => void;
  handleOpenAddModal?: () => void;
  hasLogs?: boolean;
  hasSetting?: boolean;
  onSaveDisplayOrder?: () => void;
  isSavingDisplayOrder?: boolean;
  hideAddButton?: boolean;
}

const AttributeHeader: React.FC<AttributeHeaderProps> = ({
  pageHeading,
  handleOpenAddModal,
  searchTerm,
  setSearchTerm,
  handleSearch,
  activeTab,
  setActiveTab,
  hasLogs = true,
  hasSetting = false,
  onSaveDisplayOrder,
  isSavingDisplayOrder = false,
  hideAddButton = false,
}) => {


  return (
    <div className="flex flex-col space-y-4 bg-white py-4 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <PageHeading heading={pageHeading} />
        </div>
        <div className="flex items-center gap-4">
          {/* Hide search bar when Setting tab is active */}
          {activeTab !== 'setting' && (
            <SearchBar
              searchTerm={searchTerm}
              border="blue"
              variant="expandable"
              setSearchTerm={setSearchTerm}
              handleSearch={handleSearch}
            />
          )}
          {activeTab === "fields" && onSaveDisplayOrder ? (
            <ReorderButton onClick={onSaveDisplayOrder} loading={isSavingDisplayOrder} />
          ) : null}
          {hasLogs || hasSetting ? <SettingToggle activeTab={activeTab} hasLogs={hasLogs} hasSetting={hasSetting} setActiveTab={setActiveTab} /> : ""}
          {/* Hide vertical divider and add button when Setting tab is active */}
          {activeTab !== 'setting' && (hasLogs || hasSetting) && !hideAddButton && handleOpenAddModal && (
            <VerticalDivider />
          )}
          {activeTab !== 'setting' && !hideAddButton && handleOpenAddModal && (
            <AddButton pageHeading="Add New Attribute" handleOpenAddModal={handleOpenAddModal}/>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttributeHeader;
