import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import styles from '@/styles/generalSettings.module.css';
import { generalSettingService } from '@/lib/services/generalSettingsService';
import { ContactSettingsData } from '@/lib/models/general-settings/contactSettingsModels';
import { getProjectId } from '@/lib/storage/sharedStorage';

export interface ContactSettingsRef {
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
}

const ContactSettings = forwardRef<ContactSettingsRef, {}>((props, ref) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [contactData, setContactData] = useState<ContactSettingsData | null>(null);
  
  // Toast notification states
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });
  
  // Validation states
  const [errors, setErrors] = useState<{
    singularName?: string;
    pruralName?: string;
    serialKey?: string;
    ownershipFlag?: string;
  }>({});
  
  const [formData, setFormData] = useState({
    singularName: '',
    pruralName: '',
    serialKey: '',
    ownershipFlag: 1,
    id: 0
  });

  // Load contact settings on component mount
  useEffect(() => {
    loadContactSettings();
  }, []);

  // Toast notification function
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    // Auto hide after 5 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  // Validation function
  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    // Required field validations (same as Angular component)
    if (!formData.singularName.trim()) {
      newErrors.singularName = 'Singular name cannot be blank';
    }
    
    if (!formData.pruralName.trim()) {
      newErrors.pruralName = 'Plural cannot be blank';
    }
    
    if (!formData.serialKey.trim()) {
      newErrors.serialKey = 'Serial No. Key cannot be blank';
    }
    
    if (!formData.ownershipFlag) {
      newErrors.ownershipFlag = 'Ownership assignment is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const loadContactSettings = async () => {
    try {
      setLoading(true);
      const projectId = getProjectId();
      if (projectId) {
        const response = await generalSettingService.getContactSettings(projectId);
        if (response.statusCode === 200 && response.responseData) {
          const data = response.responseData;
          setContactData(data);
          
          // Update form data with API response
          setFormData({
            singularName: data.singularName || 'Contact',
            pruralName: data.pruralName || 'Contacts',
            serialKey: data.serialKey || 'CON',
            ownershipFlag: data.ownershipFlag || 3,
            id: data.id || 0
          });
        }
      }
    } catch (error) {
      console.error('Error loading contact settings:', error);
      showToast('Failed to load contact settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showToast('Please fix the validation errors', 'error');
      return;
    }

    try {
      setLoading(true);
      const projectId = getProjectId();
      if (projectId) {
        const saveData = {
          singularName: formData.singularName.trim(),
          pruralName: formData.pruralName.trim(),
          serialKey: formData.serialKey.trim(),
          id: formData.id,
          ownershipFlag: formData.ownershipFlag.toString()
        };
        
        const response = await generalSettingService.updateContactSettings(projectId, saveData);
        if (response.statusCode === 200) {
          // Show success toast with API message
          showToast(response.responseData || 'Contact settings saved successfully', 'success');
          // Reset unsaved changes after successful save
          setHasUnsavedChanges(false);
          // Clear validation errors on successful save
          setErrors({});
        } else {
          // Show error toast with API message
          showToast(response.responseData || 'Failed to save contact settings', 'error');
        }
      }
    } catch (error: any) {
      console.error('Error saving contact settings:', error);
      if (error.response?.status === 409) {
        showToast('Serial key already exists. Please choose a different one.', 'error');
      } else {
        showToast('Failed to save contact settings', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Form input change handlers
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    setHasUnsavedChanges(true);
  };

  const handleCancel = () => {
    if (contactData) {
      // Reset form data to original values from API
      setFormData({
        singularName: contactData.singularName || 'Contact',
        pruralName: contactData.pruralName || 'Contacts',
        serialKey: contactData.serialKey || 'CON',
        ownershipFlag: contactData.ownershipFlag || 3,
        id: contactData.id || 0
      });
    } else {
      // Reset to default values if no API data
      setFormData({
        singularName: 'Contact',
        pruralName: 'Contacts',
        serialKey: 'CON',
        ownershipFlag: 3,
        id: 0
      });
    }
    // Clear validation errors
    setErrors({});
    setHasUnsavedChanges(false);
  };

  // Expose handleSave method, loading state, and unsaved changes to parent component via ref
  useImperativeHandle(ref, () => ({
    handleSave,
    handleCancel,
    isLoading: loading,
    hasUnsavedChanges: hasUnsavedChanges
  }));
  
  return (
    <form className={styles.tabContainer}>
      <div className={styles.tabContent} style={{paddingBottom: '10px'}}>
        
        {/* Singular Name */}
        <div className={styles.tabField}>
          <label htmlFor="singularName">
            Rename Contact? <span className="text-[#F64E60]">*</span>
          </label>
          <div className={styles.fieldInputContainer}>
            <div className="mt-1">
              <div className="relative">
                <input
                  type="text"
                  id="singularName"
                  name="singularName"
                  className={`${styles.input} ${errors.singularName ? 'border-red-500' : ''}`}
                  value={formData.singularName}
                  onChange={(e) => handleInputChange('singularName', e.target.value)}
                  maxLength={25}
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                  {errors.singularName ? (
                      <p className="text-xs text-red-500">{errors.singularName}</p>
                  ) : (
                      <p className={styles.instructionText}>Enter contact name...</p>
                  )}
                  <p className="text-xs text-gray-500">{formData.singularName?.length || 0}/25</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Plural Name */}
        <div className={styles.tabField}>
          <label htmlFor="pruralName">
            What would be the plural? <span className="text-[#F64E60]">*</span>
          </label>
          <div className={styles.fieldInputContainer}>
            <div className="mt-1">
              <div className="relative">
                <input
                  type="text"
                  id="pruralName"
                  name="pruralName"
                  className={`${styles.input} ${errors.pruralName ? 'border-red-500' : ''}`}
                  value={formData.pruralName}
                  onChange={(e) => handleInputChange('pruralName', e.target.value)}
                  maxLength={25}
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                {errors.pruralName ? (
                    <p className="text-xs text-red-500">{errors.pruralName}</p>
                ) : (
                    <p className={styles.instructionText}>Enter plural name...</p>
                )}
                <p className="text-xs text-gray-500">{formData.pruralName?.length || 0}/25</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Ownership Assignment */}
        <div className={styles.tabField}>
          <label>
            Ownership can be assigned to <span className="text-[#F64E60]">*</span>
          </label>
          <div className='flex items-center gap-12'>
            
              <label className="flex items-center cursor-pointer min-w-fit">
                <input
                  type="radio"
                  id="upHierarchy"
                  name="ownership"
                  value={1}
                  checked={formData.ownershipFlag === 1}
                  onChange={(e) => handleInputChange('ownershipFlag', parseInt(e.target.value))}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                
                <span className="ml-2 text-sm text-gray-700">
                  Up in the hierarchy
                </span>
              </label>
              <label className="flex items-center cursor-pointer min-w-fit">
                <input
                  type="radio"
                  id="downHierarchy"
                  name="ownership"
                  value={2}
                  checked={formData.ownershipFlag === 2}
                  onChange={(e) => handleInputChange('ownershipFlag', parseInt(e.target.value))}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                
                <span className="ml-2 text-sm text-gray-700">
                  Down the hierarchy
                </span>
              </label>
              <label className="flex items-center cursor-pointer min-w-fit">
                <input
                  type="radio"
                  id="anyUser"
                  name="ownership"
                  value={3}
                  checked={formData.ownershipFlag === 3}
                  onChange={(e) => handleInputChange('ownershipFlag', parseInt(e.target.value))}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  defaultChecked
                />
                
                <span className="ml-2 text-sm text-gray-700">
                  Any user
                </span>
              </label>
            
            {errors.ownershipFlag && (
              <p className="text-xs text-red-500 mt-1">{errors.ownershipFlag}</p>
            )}
          </div>
        </div>
        
        {/* Serial No. Key */}
        <div className={styles.tabField}>
          <label htmlFor="serialKey">
            Serial No. Key <span className="text-[#F64E60]">*</span>
          </label>
          <div className={styles.fieldInputContainer}>
            <div className="mt-1">
              <div className="relative">
                <input
                  type="text"
                  id="serialKey"
                  name="serialKey"
                  className={`${styles.input} ${errors.serialKey ? 'border-red-500' : ''}`}
                  value={formData.serialKey}
                  onChange={(e) => handleInputChange('serialKey', e.target.value)}
                  maxLength={5}
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                {errors.serialKey ? (
                    <p className="text-xs text-red-500">{errors.serialKey}</p>
                ) : (
                    <div>
                      <p className={styles.instructionText}>1 updates left. Changing the serial no. key will start a background re-index of your project, and may break some external integrations.</p>
                    </div>
                )}
                <p className="text-xs text-gray-500">{formData.serialKey?.length || 0}/5</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* No save/cancel buttons here - they are in the parent component */}
      </div>
      
      {/* Toast Notification */}
      {toast.show && (
        <div 
          className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-lg shadow-lg text-white font-medium transition-all duration-300 ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
          style={{ 
            minWidth: '300px', 
            maxWidth: '500px',
            position: 'fixed',
            zIndex: 9999
          }}
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
      
      {/* Full Page Loader */}
      {loading && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-transparent rounded-lg p-8 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            {/*<p className="text-gray-700 font-medium">Loading...</p>*/}
          </div>
        </div>
      )}
    </form>
  );
});

ContactSettings.displayName = 'ContactSettings';

export default ContactSettings;
