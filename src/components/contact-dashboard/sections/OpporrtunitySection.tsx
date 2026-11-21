import React from 'react';

interface Opportunity {
  opportunityId: number;
  name: string;
  serialNo?: string;
  winProbability?: string;
  closureDate?: string;
  estimatedRevenue?: string;
  status?: string;
}

interface OpportunitySectionProps {
  opportunities: Opportunity[];
}

const OpportunitySection: React.FC<OpportunitySectionProps> = ({ opportunities }) => {
  const renderInfoItem = (label: string, value: string | React.ReactNode) => (
    <div className="mb-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
  return (
    <div className="bg-white rounded-lg">
      {opportunities.length === 0 ? (
        <div className="text-center py-6 text-gray-500">No opportunities available</div>
      ) : (
        <div className="grid gap-4">
          {opportunities.map((opportunity, index) => (
            <div 
              key={index} 
              className="border border-gray-100 rounded-md p-4 shadow-sm"
            >
              <div className="flex items-center mb-2">
                <h3 className="text-base font-medium">{opportunity.name}</h3>
                {opportunity.serialNo && (
                  <span className="text-xs font-medium text-gray-500"> - {opportunity.serialNo}</span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-2">
                  {opportunity.winProbability && renderInfoItem('Win Probability', opportunity.winProbability)}
                  {opportunity.estimatedRevenue && renderInfoItem('Estimated Revenue', opportunity.estimatedRevenue)}
                </div>
                
                {/* Right Column */}
                <div className="space-y-2">
                  {opportunity.closureDate && renderInfoItem('Closure Date', opportunity.closureDate)}
                  {opportunity.status && renderInfoItem('Status', opportunity.status)}
                </div>
              </div>
            </div>
          ))} 
        </div>
      )}
    </div>
  );
};

export default OpportunitySection;
