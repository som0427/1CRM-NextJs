import React from 'react';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, MoveHorizontal } from 'lucide-react';


interface Activity {
  activityId: number;
  name: string;
  status: string;
  winProbability: string; // This is a string in the interface but we'll parse it for comparisons
  estimatedRevenue: string;
  description: string;
  contacts: any[];
  images: any[];
  timeZone: string;
  activityDate: string;
  activityDoneBy: string;
  activityDoneByInitials: string;
  actTypeId: number;
  activityTypeName: string;
  serialNo: string;
}

interface ActivitiesSectionProps {
  activities: Activity[];
}

// Remove duplicate function
// Helper function to determine background color class based on status
const getBadgeColorClass = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'won':
      return 'bg-green-100 text-green-500 border border-green-600'; // Green background for 'Won'
    case 'loss':
      return 'bg-red-100 text-red-500 border border-red-600'; // Red background for 'Loss'
    default:
      return 'bg-blue-100 text-blue-500 border border-blue-600'; // Blue background for other statuses
  }
};

// Helper function to determine background color class based on status
const getStatusColorClass = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'won':
      return 'bg-green-100'; // Green background for 'Won'
    case 'loss':
      return 'bg-red-100'; // Red background for 'Loss'
    default:
      return 'bg-blue-100'; // Blue background for other statuses
  }
};

// Helper function to determine text color class based on status
const getStatusTextColorClass = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'won':
      return 'text-green-500'; // Green text for 'Won'
    case 'loss':
      return 'text-red-500'; // Red text for 'Loss'
    default:
      return 'text-blue-500'; // Blue text for other statuses
  }
};

const ActivitiesSection: React.FC<ActivitiesSectionProps> = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">No activities available</div>;
  }

  return (
    
      <div className="flex flex-col space-y-4">
        {activities.map((activity, index) => (
          <div key={activity.activityId} className="relative pl-8">
            {/* Timeline connector line */}
            {index !== activities.length - 1 && (
              <div className="absolute left-3 top-6 w-0.5 h-full bg-gray-200"></div>
            )}
            
            <div className="flex items-start">
              {/* Timeline icon/avatar */}
              <div className={`absolute left-0 w-6 h-6 mt-1 rounded-full flex items-center justify-center ${getBadgeColorClass(activity.status)}`}>
                <div className="flex items-center justify-center h-full w-full text-xs font-medium">
                  {activity.activityDoneByInitials}
                </div>
              </div>
              
              <div className="w-full">
                {/* Header content */}
                <div className="flex w-full justify-between items-center mb-1">
                  <div className={`text-sm font-medium ${getStatusTextColorClass(activity.status)}`}>
                    {activity.name} : {activity.serialNo}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {(() => {
                      // Get current and previous win probability
                      const currentWinProb = parseFloat(activity.winProbability);
                      const prevWinProb = index > 0 ? parseFloat(activities[index - 1].winProbability) : null;
                      
                      // Determine icon and color based on comparison
                      let icon;
                      let bgColorClass = 'bg-blue-100';
                      let textColorClass = 'text-blue-500';
                      
                      if (index === 0 || prevWinProb === null) {
                        // First record or no previous value - show horizontal arrows
                        icon = <MoveHorizontal className="w-3 h-3 text-blue-500" />;
                      } else if (currentWinProb > prevWinProb) {
                        // Increased win probability
                        icon = <ArrowUp className="w-3 h-3 text-green-500" />;
                        bgColorClass = 'bg-green-100';
                        textColorClass = 'text-green-500';
                      } else if (currentWinProb < prevWinProb) {
                        // Decreased win probability
                        icon = <ArrowDown className="w-3 h-3 text-red-500" />;
                        bgColorClass = 'bg-red-100';
                        textColorClass = 'text-red-500';
                      } else {
                        // Same win probability
                        icon = <MoveHorizontal className="w-3 h-3 text-blue-500" />;
                      }
                      
                      return (
                        <div className={`flex items-center ${bgColorClass} px-3 py-1 rounded-md`}>
                          {icon}
                          <span className={`text-sm ${textColorClass} ml-1`}>{Math.abs(currentWinProb)}%</span>
                        </div>
                      );
                    })()}
                    
                    <div className={`flex items-center px-3 py-1 rounded-md ${getStatusColorClass(activity.status)}`}>
                      <span className={`text-sm ${getStatusTextColorClass(activity.status)}`}>{activity.status}</span>
                    </div>
                  </div>
                </div>
                
                {/* Body content */}
                <div className="text-xs text-gray-500">
                  {activity.activityDate.split(' ')[0]} {activity.timeZone}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    
  );
};

export default ActivitiesSection;
