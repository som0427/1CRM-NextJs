import React from 'react';

interface InsightsSectionProps {
  data: {
    totalValue: string;
    valueLabel: string;
    statistics: Array<{
      value: string;
      label: string;
    }>;
    topProducts: string[];
  };
}

const InsightsSection: React.FC<InsightsSectionProps> = ({ data }) => {
  const { totalValue, valueLabel, statistics, topProducts } = data;

  return (
    <div className="rounded-lg overflow-hidden">
      
      {/* Main Value Card */}
      <div className="bg-green-100 p-4 rounded-lg mb-4 text-center">
        <p className="text-2xl text-green-600">{totalValue}</p>
        <p className="text-sm text-green-500">{valueLabel}</p>
      </div>
      
      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {statistics.map((stat, index) => (
          <div key={index} className="bg-blue-100 p-3 rounded-lg text-center">
            <p className="text-lg text-blue-600">{stat.value}</p>
            <p className="text-xs text-blue-500">{stat.label}</p>
          </div>
        ))}
      </div>
      
      {/* Top Products */}
      <div className="bg-yellow-100 rounded-lg p-4">
        <h3 className="text-sm font-medium text-yellow-800 mb-3">Top Products</h3>
        <ul className="space-y-1">
          {topProducts.map((product, index) => (
            <li key={index} className="text-sm text-yellow-500 hover:text-yellow-600 cursor-pointer">
              {product}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default InsightsSection;
