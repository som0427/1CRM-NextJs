import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { integrationsService } from '@/lib/services/integrationsService';
import { 
  IntegrationsResponse, 
  ConfiguredIntegration, 
  AvailableIntegrationNormalized 
} from '@/lib/models/integrations/integrationsModels';
import IntegrationCard from './subs/IntegrationCard';
import IntegrationConfigModal from './subs/IntegrationConfig';
import { getProjectId } from '@/lib/storage/sharedStorage';

export interface IntegrationsMainRef {
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
}

const IntegrationsMain = forwardRef<IntegrationsMainRef, {}>((props, ref) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [integrationsData, setIntegrationsData] = useState<IntegrationsResponse | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  
  // Toast notification states
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });

  // Configuration modal states
  const [configModal, setConfigModal] = useState<{
    isOpen: boolean;
    integrationName: string;
    appId: number;
    isEdit: boolean;
    integrationType: number;
  }>({ isOpen: false, integrationName: '', appId: 0, isEdit: false, integrationType: 4 });

  // Toast notification helper
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  // Fetch integrations data on component mount
  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const projectId = getProjectId();
      if (projectId) {
        const data = await integrationsService.getIntegrations(projectId);
        setIntegrationsData(data);
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
      showToast('Failed to load integrations', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditIntegration = (integration: ConfiguredIntegration) => {
    setConfigModal({
      isOpen: true,
      integrationName: integration.name,
      appId: parseInt(integration.id),
      isEdit: true,
      integrationType: integration.integrationType || 4
    });
  };

  const handleConfigureIntegration = (integration: AvailableIntegrationNormalized) => {
    setConfigModal({
      isOpen: true,
      integrationName: integration.name,
      appId: parseInt(integration.id),
      isEdit: false,
      integrationType: integration.integrationType || 4
    });
  };

  const handleCloseConfigModal = () => {
    setConfigModal({ isOpen: false, integrationName: '', appId: 0, isEdit: false, integrationType: 4 });
  };

  const handleSaveSuccess = async (message: string) => {
    // Show toast message
    showToast(message, 'success');
    
    // Refresh integrations list
    await fetchIntegrations();
  };

  const handleSaveError = (message: string) => {
    // Show error toast
    showToast(message, 'error');
  };



  const handleSave = async () => {
    // For integrations, save is handled per integration
    showToast('All changes saved successfully', 'success');
    setHasUnsavedChanges(false);
  };

  const handleCancel = () => {
    // Refresh data to cancel any unsaved changes
    fetchIntegrations();
    setHasUnsavedChanges(false);
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    handleSave: handleSave,
    handleCancel: handleCancel,
    isLoading: loading,
    hasUnsavedChanges: hasUnsavedChanges
  }));

  if (loading && !integrationsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <>

      <div className="space-y-8">
        {/* Configured Integrations Section */}
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Configured</h2>
          </div>

          {integrationsData?.configured && integrationsData.configured.length > 0 ? (
            <div className="grid grid-cols-1 border border-black-200 bg-gray-50 rounded-xl p-4 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrationsData.configured.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onEdit={handleEditIntegration}
                  isLoading={loading}
                />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Configured Integrations</h3>
                <p className="text-gray-500">
                  You haven't configured any integrations yet. Browse available integrations below to get started.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Available Integrations Section */}
        <div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Available Integrations</h2>
          </div>

          {integrationsData?.available && integrationsData.available.length > 0 ? (
            <div className="grid grid-cols-1 border border-black-200 bg-gray-50 rounded-xl p-4 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrationsData.available.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onConfigure={handleConfigureIntegration}
                  isLoading={loading}
                />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="flex flex-col items-center">
                <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Integrations</h3>
                <p className="text-gray-500">
                  No additional integrations are available at this time.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div 
          className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-lg shadow-lg text-white font-medium z-50 transition-all duration-300 ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
          style={{ minWidth: '300px', maxWidth: '500px' }}
        >
          <div className="flex items-center justify-between">
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(prev => ({ ...prev, show: false }))}
              className="ml-4 text-white hover:text-gray-200 focus:outline-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      <IntegrationConfigModal
        isOpen={configModal.isOpen}
        onClose={handleCloseConfigModal}
        integrationName={configModal.integrationName}
        appId={configModal.appId}
        isEdit={configModal.isEdit}
        integrationType={configModal.integrationType}
        onSaveSuccess={handleSaveSuccess}
        onSaveError={handleSaveError}
      />
    </>
  );
});

IntegrationsMain.displayName = 'IntegrationsMain';

export default IntegrationsMain;
