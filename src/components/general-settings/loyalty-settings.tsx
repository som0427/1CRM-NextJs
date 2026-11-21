import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useForm } from 'react-hook-form';
import styles from '@/styles/generalSettings.module.css';
import { generalSettingService } from '@/lib/services/generalSettingsService';
import { LoyaltySettingsData, redemptionOptions } from '@/lib/models/general-settings/loyaltySettingsModels';
import { getProjectId } from '@/lib/storage/sharedStorage';
import Select from '../common/input-fields/Select';

export interface LoyaltySettingsRef {
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
}

interface LoyaltyFormData {
  maxRedeemablePercentage: number;
  allowRedemption: number;
  minMembershipAgeDays: number;
}

const LoyaltySettings = forwardRef<LoyaltySettingsRef, {}>((_, ref) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [loyaltyData, setLoyaltyData] = useState<LoyaltySettingsData | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);

  // React Hook Form setup
  const { control, watch, reset, setValue } = useForm<LoyaltyFormData>({
    defaultValues: {
      maxRedeemablePercentage: 100,
      allowRedemption: 1,
      minMembershipAgeDays: 0
    }
  });

  // Watch form values
  const formData = watch();

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
    maxRedeemablePercentage?: string;
    allowRedemption?: string;
    minMembershipAgeDays?: string;
  }>({});

  // Load loyalty settings on component mount
  useEffect(() => {
    loadLoyaltySettings();
  }, []);

  const loadLoyaltySettings = async () => {
    try {
      setLoading(true);
      const projectId = getProjectId();
      if (projectId) {
        const response = await generalSettingService.getLoyaltySettings(projectId);
        if (response.statusCode === 200 && response.responseData) {
          const data = response.responseData;
          setLoyaltyData(data);
          reset({
            maxRedeemablePercentage: data.maxRedeemablePercentage ?? 100,
            allowRedemption: data.allowRedemption ?? 1,
            minMembershipAgeDays: data.minMembershipAgeDays ?? 0
          });
        }
      }
    } catch (error) {
      console.error('Error loading loyalty settings:', error);
      showToast('Failed to load loyalty settings', 'error');
    } finally {
      setLoading(false);
      setHasUnsavedChanges(false);
      setIsInitialLoad(false);
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (formData.maxRedeemablePercentage < 0 || formData.maxRedeemablePercentage > 100) {
      newErrors.maxRedeemablePercentage = 'Percentage must be between 0 and 100';
    }

    if (!formData.allowRedemption) {
      newErrors.allowRedemption = 'Please select a redemption option';
    }

    if (formData.minMembershipAgeDays < 0) {
      newErrors.minMembershipAgeDays = 'Days cannot be negative';
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
          maxRedeemablePercentage: formData.maxRedeemablePercentage,
          allowRedemption: formData.allowRedemption,
          minMembershipAgeDays: formData.minMembershipAgeDays
        };
        const response = await generalSettingService.updateLoyaltySettings(projectId, saveData);
        if (response.statusCode === 200) {
          // responseData is an object, use message or default string for toast
          showToast(response.message || 'Loyalty settings saved successfully', 'success');
          // Update local state with saved data
          if (response.responseData) {
            setLoyaltyData(response.responseData);
          }
          setHasUnsavedChanges(false);
          setErrors({});
        } else {
          showToast(response.message || 'Failed to save loyalty settings', 'error');
        }
      }
    } catch (error: any) {
      console.error('Error saving loyalty settings:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save loyalty settings';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values from API
    if (loyaltyData) {
      reset({
        maxRedeemablePercentage: loyaltyData.maxRedeemablePercentage ?? 100,
        allowRedemption: loyaltyData.allowRedemption ?? 1,
        minMembershipAgeDays: loyaltyData.minMembershipAgeDays ?? 0
      });
    } else {
      // Reset to default values if no API data
      reset({
        maxRedeemablePercentage: 100,
        allowRedemption: 1,
        minMembershipAgeDays: 0
      });
    }
    // Clear validation errors
    setErrors({});
    setHasUnsavedChanges(false);
  };

  // Form input change handlers
  const handleInputChange = (field: keyof LoyaltyFormData, value: any) => {
    setValue(field, value);
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
      <div className={styles.tabContent} style={{ paddingBottom: '10px' }}>
        {/* Section Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Redemption Rules</h2>
          <p className="text-sm text-black-500 italic">
             <span className="text-red-500">*</span>
             Following settings will be applicable only where 1Channel standard loyalty SDK is used.
          </p>
        </div>

        {/* Maximum Redeemable Percentage */}
        <div className={styles.tabField}>
          <label>Maximum redeemable percentage of balance</label>
          <div className={styles.fieldInputContainer}>
            <div className="mt-1">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.maxRedeemablePercentage ?? ''}
                  id="maxRedeemablePercentage"
                  name="maxRedeemablePercentage"
                  onChange={(e) => handleInputChange('maxRedeemablePercentage', e.target.value === '' ? '' : parseInt(e.target.value))}
                  onKeyDown={(e) => {
                    if (['.', 'e', 'E', '+', '-'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                      handleInputChange('maxRedeemablePercentage', 0);
                    }
                  }}
                  className={`${styles.input} ${errors.maxRedeemablePercentage ? 'border-red-500' : ''}`}
                  style={{ width: '120px' }}
                  min={0}
                  max={100}
                  placeholder="0"
                />
                <span className="text-blue-500 font-medium">%</span>
              </div>
              {errors.maxRedeemablePercentage && (
                <p className="text-xs text-red-500 mt-1">{errors.maxRedeemablePercentage}</p>
              )}
            </div>
          </div>
        </div>

        {/* Allow Redemption */}
        <div className={styles.tabField}>
          <label>Allow redemption</label>
          <div className={styles.fieldInputContainer}>
            <div className="mt-1">
              <Select
                name="allowRedemption"
                control={control}
                options={redemptionOptions}
                placeholder="Select option..."
                maxWidth="w-[200px]"
                onChange={() => {
                  if (!isInitialLoad) {
                    setHasUnsavedChanges(true);
                  }
                }}
              />
              {errors.allowRedemption && (
                <p className="text-xs text-red-500 mt-1">{errors.allowRedemption}</p>
              )}
            </div>
          </div>
        </div>

        {/* Minimum Membership Age */}
        <div className={styles.tabField}>
          <label>Minimum membership age before redemption</label>
          <div className={styles.fieldInputContainer}>
            <div className="mt-1">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.minMembershipAgeDays ?? ''}
                  id="minMembershipAgeDays"
                  name="minMembershipAgeDays"
                  onChange={(e) => handleInputChange('minMembershipAgeDays', e.target.value === '' ? '' : parseInt(e.target.value))}
                  onKeyDown={(e) => {
                    if (['.', 'e', 'E', '+', '-'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onBlur={(e) => {
                    if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                      handleInputChange('minMembershipAgeDays', 0);
                    }
                  }}
                  className={`${styles.input} ${errors.minMembershipAgeDays ? 'border-red-500' : ''}`}
                  style={{ width: '120px' }}
                  min={0}
                  placeholder="0"
                />
                <span className="text-blue-500 font-medium">Days</span>
              </div>
              {errors.minMembershipAgeDays && (
                <p className="text-xs text-red-500 mt-1">{errors.minMembershipAgeDays}</p>
              )}
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

LoyaltySettings.displayName = 'LoyaltySettings';

export default LoyaltySettings;
