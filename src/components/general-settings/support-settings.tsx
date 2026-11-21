import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import styles from '@/styles/generalSettings.module.css';
import { generalSettingService } from '@/lib/services/generalSettingsService';
import { SupportSettingsData, dayOptions } from '@/lib/models/general-settings/supportSettingsModels';
import TimePicker from '@/components/ui/time-picker';
import { getProjectId } from '@/lib/storage/sharedStorage';

export interface SupportSettingsRef {
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
}

const SupportSettings = forwardRef<SupportSettingsRef, {}>((props, ref) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [supportData, setSupportData] = useState<SupportSettingsData | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  
  // Toast notification state
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    show: false,
    message: '',
    type: 'success'
  });

  // Validation states
  const [errors, setErrors] = useState<{
    tollFreeNumber?: string;
    supportEmail?: string;
    fromDay?: string;
    toDay?: string;
    fromTime?: string;
    toTime?: string;
  }>({});
  
  const [formData, setFormData] = useState({
    enableChatSupport: 0,
    tollFreeNumber: '',
    supportEmail: '',
    fromDay: 1,
    toDay: 1,
    fromTime: '',
    toTime: ''
  });

  // Load support settings on component mount
  useEffect(() => {
    loadSupportSettings();
  }, []);

  const loadSupportSettings = async () => {
    try {
      setLoading(true);
      const projectId = getProjectId();
      if (projectId) {
        const response = await generalSettingService.getSupportSettings(projectId);
        if (response.statusCode === 200 && response.responseData) {
          const data = response.responseData;
          setSupportData(data);
          
          // Update form data with API response
          setFormData({
            enableChatSupport: data.enableChatSupport || 0,
            tollFreeNumber: data.tollFreeNumber || '',
            supportEmail: data.supportEmail || '',
            fromDay: data.fromDay || 1,
            toDay: data.toDay || 1,
            fromTime: data.fromTime || '',
            toTime: data.toTime || ''
          });
          
          // Reset unsaved changes after loading data
          setHasUnsavedChanges(false);
          setIsInitialLoad(false);
        }
      }
    } catch (error) {
      console.error('Error loading support settings:', error);
      showToast('Failed to load support settings', 'error');
    } finally {
      setLoading(false);
      // Ensure unsaved changes is false after data loading
      setHasUnsavedChanges(false);
      setIsInitialLoad(false);
    }
  };

  // Helper function to convert time string to minutes for comparison
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    
    const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!timeMatch) return 0;
    
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const period = timeMatch[3].toUpperCase();
    
    // Convert to 24-hour format
    if (period === 'AM' && hours === 12) {
      hours = 0;
    } else if (period === 'PM' && hours !== 12) {
      hours += 12;
    }
    
    return hours * 60 + minutes;
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (!formData.tollFreeNumber.trim()) {
      newErrors.tollFreeNumber = 'Toll free number cannot be blank';
    } else if (formData.tollFreeNumber.length < 10 || formData.tollFreeNumber.length > 11) {
      newErrors.tollFreeNumber = 'Toll free number must be 10-11 digits';
    }
    
    if (!formData.supportEmail.trim()) {
      newErrors.supportEmail = 'Support email cannot be blank';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.supportEmail)) {
      newErrors.supportEmail = 'Please enter a valid email address';
    }
    
    if (!formData.fromTime.trim()) {
      newErrors.fromTime = 'From time is required';
    }
    
    if (!formData.toTime.trim()) {
      newErrors.toTime = 'To time is required';
    }
    
    // Validate time comparison if both times are provided
    if (formData.fromTime.trim() && formData.toTime.trim()) {
      const fromMinutes = timeToMinutes(formData.fromTime);
      const toMinutes = timeToMinutes(formData.toTime);
      
      if (fromMinutes >= toMinutes) {
        newErrors.fromTime = 'From time must be earlier than To time';
        newErrors.toTime = 'To time must be later than From time';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showToast('Please fix the validation errors', 'error');
      return;
    }
    if (!hasUnsavedChanges) {
      return;
    }

    try {
      setLoading(true);
      const projectId = getProjectId();
      if (projectId) {
        const saveData = {
          enableChatSupport: formData.enableChatSupport,
          tollFreeNumber: formData.tollFreeNumber.trim(),
          supportEmail: formData.supportEmail.trim(),
          fromDay: formData.fromDay,
          toDay: formData.toDay,
          fromTime: formData.fromTime.trim(),
          toTime: formData.toTime.trim()
        };
        
        const response = await generalSettingService.updateSupportSettings(projectId, saveData);
        if (response.statusCode === 200) {
          // Show success toast with API message
          showToast(response.responseData || 'Support settings saved successfully', 'success');
          // Reset unsaved changes after successful save
          setHasUnsavedChanges(false);
          // Clear validation errors on successful save
          setErrors({});
        } else {
          showToast(response.responseData || 'Failed to save support settings', 'error');
        }
      }
    } catch (error: any) {
      console.error('Error saving support settings:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save support settings';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values from API
    if (supportData) {
      setFormData({
        enableChatSupport: supportData.enableChatSupport || 0,
        tollFreeNumber: supportData.tollFreeNumber || '',
        supportEmail: supportData.supportEmail || '',
        fromDay: supportData.fromDay || 1,
        toDay: supportData.toDay || 1,
        fromTime: supportData.fromTime || '',
        toTime: supportData.toTime || ''
      });
    } else {
      // Reset to default values if no API data
      setFormData({
        enableChatSupport: 0,
        tollFreeNumber: '',
        supportEmail: '',
        fromDay: 1,
        toDay: 1,
        fromTime: '',
        toTime: ''
      });
    }
    // Clear validation errors
    setErrors({});
    setHasUnsavedChanges(false);
  };

  // Form input change handlers
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Only set unsaved changes if not during initial load
    if (!isInitialLoad) {
      setHasUnsavedChanges(true);
    }
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
        {/* Enable Chat Support */}
        <div className={styles.tabField}>
          <label>Enable Chat Support</label>
          <div className={styles.fieldInputContainer}>
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  id="enableChatSupport"
                  name="enableChatSupport"
                  className="hidden peer"
                  checked={formData.enableChatSupport === 1}
                  onChange={(e) => handleInputChange('enableChatSupport', e.target.checked ? 1 : 0)}
                />
                <div className="w-5 h-5 rounded border border-gray-400 flex items-center justify-center transition-colors peer-checked:bg-blue-500 peer-checked:border-blue-500 relative">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 16 16"
                  >
                    <path d="M3 8l3 3L13 3" />
                  </svg>
                </div>
                <span className="ml-2 text-sm text-gray-700">Yes</span>
              </label>
            </div>
            <p className={styles.instructionText}>Tick this if you want to show 1Channel chat support</p>
          </div>
        </div>

        {/* Toll Free Number */}
        <div className={styles.tabField}>
          <label>
            Toll Free Number <span className="text-[#F64E60]">*</span>
          </label>
          <div className={styles.fieldInputContainer}>
            <div className="mt-1">
              <div className="relative">
                <input
                  type="text"
                  value={formData.tollFreeNumber}
                  id="tollFreeNumber"
                  name="tollFreeNumber"
                  onChange={(e) => handleInputChange('tollFreeNumber', e.target.value)}
                  className={`${styles.input} ${errors.tollFreeNumber ? 'border-red-500' : ''}`}
                  placeholder="Enter toll free number"
                  maxLength={11}
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                  {errors.tollFreeNumber ? (
                      <p className="text-xs text-red-500">{errors.tollFreeNumber}</p>
                  ) : (
                      <p className={styles.instructionText}>Enter a 10-11 digit Toll Free support number. Leave blank if not required</p>
                  )}
                  <p className="text-xs text-gray-500">{formData.tollFreeNumber.length || 0}/11</p>
              </div>
            </div>
          </div>
        </div>

        {/* Support Email */}
        <div className={styles.tabField}>
          <label>
            Support Email <span className="text-[#F64E60]">*</span>
          </label>
          <div className={styles.fieldInputContainer}>
            <div className="mt-1">
              <div className="relative">
                <input
                  type="email"
                  value={formData.supportEmail}
                  id="supportEmail"
                  name="supportEmail"
                  onChange={(e) => handleInputChange('supportEmail', e.target.value)}
                  className={`${styles.input} ${errors.supportEmail ? 'border-red-500' : ''}`}
                  placeholder="Enter the support email here"
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                  {errors.supportEmail ? (
                      <p className="text-xs text-red-500">{errors.supportEmail}</p>
                  ) : (
                      <p className={styles.instructionText}>Enter the support email here, with a valid email format. Leave blank if not required.</p>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Support Timings */}
        <div className={styles.tabField}>
          <label>
            Support Timings <span className="text-[#F64E60]">*</span>
          </label>
          <div className={styles.fieldInputContainer}>
            <div className="grid grid-cols-2 gap-6">
              {/* From section */}
              <div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">From Day</label>
                  <select
                    value={formData.fromDay}
                    id="fromDay"
                    name="fromDay"
                    onChange={(e) => handleInputChange('fromDay', parseInt(e.target.value))}
                    className={`${styles.select} ${errors.fromDay ? 'border-red-500' : ''}`}
                  >
                    {dayOptions.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">From Time</label>
                  <TimePicker
                    value={formData.fromTime}
                    onChange={(value) => handleInputChange('fromTime', value)}
                    hasError={!!errors.fromTime}
                    id="fromTime"
                    name="fromTime"
                  />
                  {errors.fromTime && (
                    <p className="text-xs text-red-500 mt-1">{errors.fromTime}</p>
                  )}
                </div>
              </div>
              
              {/* To section */}
              <div>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">To Day</label>
                  <select
                    value={formData.toDay}
                    id="toDay"
                    name="toDay"
                    onChange={(e) => handleInputChange('toDay', parseInt(e.target.value))}
                    className={`${styles.select} ${errors.toDay ? 'border-red-500' : ''}`}
                  >
                    {dayOptions.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">To Time</label>
                  <TimePicker
                    value={formData.toTime}
                    onChange={(value) => handleInputChange('toTime', value)}
                    hasError={!!errors.toTime}
                    id="toTime"
                    name="toTime"
                  />
                  {errors.toTime && (
                    <p className="text-xs text-red-500 mt-1">{errors.toTime}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div 
          className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-lg shadow-lg text-white font-medium z-50 transition-all duration-300 ${
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
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-transparent p-8 rounded-lg flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          </div>
        </div>
      )}
      </form>
  );
});

SupportSettings.displayName = 'SupportSettings';

export default SupportSettings;
