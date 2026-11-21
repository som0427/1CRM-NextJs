import React from 'react';
import ActivitiesDataGrid from './ActivitiesDataGrid';
import { useActivities } from '../../contexts/ActivitiesContext';

interface PerformedActivitiesListProps {
  searchText?: string;
  onActivityView?: (activityId: number) => void;
  onActivityEdit?: (activityId: number, activityModuleType: number, activityName?: string) => void;
}

const PerformedActivitiesList: React.FC<PerformedActivitiesListProps> = ({
  searchText,
  onActivityView,
  onActivityEdit,
}) => {
  const { 
    performedActivitiesColumnDefs, 
    activitiesData, 
    gridDataLoaded 
  } = useActivities();

  const showNoData = gridDataLoaded && (!Array.isArray(activitiesData) || activitiesData.length === 0);

  if (showNoData) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-500 mb-4">No activities found</div>
        <p className="text-gray-400">Try changing your filter settings or date range</p>
      </div>
    );
  }

  return (
    <ActivitiesDataGrid
      activities={activitiesData}
      loading={!gridDataLoaded}
      searchText={searchText}
      columnDefs={performedActivitiesColumnDefs}
      onActivityView={onActivityView}
      onActivityEdit={onActivityEdit}
    />
  );
};

export default PerformedActivitiesList;
