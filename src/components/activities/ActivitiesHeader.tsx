import React from "react";
import PageHeading from "../common/PageHeading";
import SearchBar from "../common/SearchBar";
import AddButton from "../common/buttons/AddButton";
import MenuDropdown from "../common/buttons/MenuDropdown";
import UserProfileButtons from "../common/buttons/UserProfileButtons";
import ActivityTypeToggle from "../common/buttons/ActivityTypeToggle";
import DateRangePicker from "../common/DateRangePicker";

import { useActivities } from '../../contexts/ActivitiesContext';

interface ActivitiesHeaderProps {
  activeTab: "performed" | "planned";
  setActiveTab: (tab: "performed" | "planned") => void;
}

const ActivitiesHeader: React.FC<ActivitiesHeaderProps> = ({ activeTab, setActiveTab }) => {
  const {
    pageHeading,
    searchTerm,
    setSearchTerm,
    handleSearch,
    setLoading,
    setNeedsListRefresh,
    selectedView,
    setSelectedView,
    handleOpenAddModal,
    handleOpenFilterModal,
    hasActiveFilters,
    activeFiltersCount,
    handleClearFilters,
    startDate,
    endDate,
    handleDateRangeChange,
  } = useActivities();

  return (
    <div className="flex flex-col space-y-4 bg-white py-4 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <PageHeading heading={pageHeading} />
        </div>
        <div className="flex items-center space-x-3 px-2">
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onDateRangeChange={handleDateRangeChange}
            maxDays={30}
          />
          
          <SearchBar
            searchTerm={searchTerm}
            border="gray"
            variant="expandable"
            setSearchTerm={setSearchTerm}
            handleSearch={handleSearch}
          />
          <div className="flex items-center space-x-3">
            <MenuDropdown 
              onClick={handleOpenFilterModal}
              hasActiveFilters={hasActiveFilters}
              activeFiltersCount={activeFiltersCount}
              onClear={handleClearFilters}
            />

            <ActivityTypeToggle
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />

            <UserProfileButtons
              selectedView={selectedView}
              setSelectedView={setSelectedView}
              setLoading={setLoading}
              setNeedsListRefresh={setNeedsListRefresh}
            />
            <AddButton
              pageHeading="Activity"
              handleOpenAddModal={handleOpenAddModal}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ActivitiesHeader;