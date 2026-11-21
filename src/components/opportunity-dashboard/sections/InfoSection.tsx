import React from 'react';
import { MapPin } from 'lucide-react';

interface InfoSectionProps {
  info: {
    name?: string;
    status?: string;
    winProbability?: string;
    estimatedRevenue?: string;
    closureDate?: string;
    serialNo?: string;
    [key: string]: any; // For other dynamic fields
  };
}

const InfoSection: React.FC<InfoSectionProps> = ({ info }) => {
  // Helper function to render a label-value pair
  const renderInfoItem = (label: string, value: string | React.ReactNode) => (
    <div className="mb-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );

  // Check if info is null or undefined
  if (!info) {
    return <div className="bg-white rounded-lg p-4">No information available</div>;
  }

  return (
    <div className="bg-white rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-2">
          {info?.name && renderInfoItem('Name', info.name)}
          {info?.status && renderInfoItem('Status', info.status)}
          {info?.winProbability && renderInfoItem('Win Probability', `${info.winProbability}%`)}
        </div>
        
        {/* Right Column */}
        <div className="space-y-2">
          {info?.estimatedRevenue && renderInfoItem('Estimated Revenue', `$${info.estimatedRevenue}`)}
          {info?.closureDate && renderInfoItem('Closure Date', info.closureDate)}
          {info?.serialNo && renderInfoItem('Serial No', info.serialNo)}
        </div>
      </div>
    </div>
  );
};

export default InfoSection;
