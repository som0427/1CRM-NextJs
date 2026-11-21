import React from 'react';
import { ManageActivitiesModel } from '@/lib/models/activities/manage-activities.model';
import { useActivities } from '@/contexts/ActivitiesContext';
import Spinner from '../common/Spinner';

interface ActivitySelectionModalProps {
  open: boolean;
  onClose: () => void;
  onActivitySelect: (activity: ManageActivitiesModel) => void;
}

const ActivitySelectionModal: React.FC<ActivitySelectionModalProps> = ({
  open,
  onClose,
  onActivitySelect
}) => {
  const { availableActivities, availableActivitiesLoaded } = useActivities();

  const handleActivityClick = (activity: ManageActivitiesModel) => {
    onActivitySelect(activity);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-hidden">
        {!availableActivitiesLoaded ? (
          <div className="flex justify-center items-center py-4">
            <Spinner />
          </div>
        ) : (
          <div className="max-h-40 overflow-y-auto">
            {availableActivities.length === 0 ? (
              <div className="px-4 py-3 text-gray-500 text-sm">
                No activities available
              </div>
            ) : (
              availableActivities
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((activity) => (
                  <button
                    key={activity.activityId}
                    onClick={() => handleActivityClick(activity)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <span className="text-gray-800 text-sm">
                      {activity.activityName}
                    </span>
                  </button>
                ))
            )}
          </div>
        )}
    </div>
  );
};

export default ActivitySelectionModal;