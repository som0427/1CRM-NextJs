import React, { useState } from 'react';
import { Integration, ConfiguredIntegration, AvailableIntegrationNormalized } from '@/lib/models/integrations/integrationsModels';

interface IntegrationCardProps {
  integration: Integration;
  onEdit?: (integration: ConfiguredIntegration) => void;
  onConfigure?: (integration: AvailableIntegrationNormalized) => void;
  onRemove?: (integrationId: string) => void;
  isLoading?: boolean;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  integration,
  onEdit,
  onConfigure,
  onRemove,
  isLoading = false
}) => {
  const isConfigured = integration.isConfigured;
  const [expanded, setExpanded] = useState(false);
  const description = integration.description || '';
  const maxChars = 100;
  const isLong = description.length > maxChars;

  return (
    <div className="bg-white border border-blue-200 rounded-lg p-2 shadow-md hover:shadow-xl transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* Integration Logo */}
          <div className="w-24 h-24 rounded-lg flex items-center justify-center flex-shrink-0">
            {integration.logo ? (
              <img 
                src={integration.logo} 
                alt={`${integration.name} logo`}
                className="w-24 h-24 object-contain"
                onError={(e) => {
                  // Fallback to text if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <span className={`text-lg font-semibold text-gray-600 ${integration.logo ? 'hidden' : ''}`}>
              {integration.name.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Integration Details */}
          <div className="flex-1 min-w-0 pt-2">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {integration.name}
              </h3>
              {isConfigured && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  integration.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {integration.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              )}
            </div>
            
            {isConfigured && (integration as ConfiguredIntegration).lastEdited && (
              <p className="text-xs text-gray-500 mb-2">
                Last Edited: {(integration as ConfiguredIntegration).lastEdited}
              </p>
            )}
            
            <p className="text-sm text-gray-600">
              {expanded ? description : (isLong ? description.slice(0, maxChars).trimEnd() : description)}
              {!expanded && isLong ? '...' : ''}
              {isLong && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="inline text-xs italic font-medium text-blue-600 hover:text-blue-700 focus:outline-none"
                    aria-expanded={expanded}
                  >
                    {expanded ? 'Less' : 'More'}
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-2 flex-shrink-0">
          {isConfigured ? (
            <button
              onClick={() => onEdit?.(integration as ConfiguredIntegration)}
              
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={() => onConfigure?.(integration as AvailableIntegrationNormalized)}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 border border-transparent rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
              ) : null}
              Configure
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegrationCard;