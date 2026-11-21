import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Select from "react-select";
import styles from '@/styles/generalSettings.module.css';
import { generalSettingService } from '@/lib/services/generalSettingsService';
import { ProjectSettingsData, RoleItem } from '@/lib/models/general-settings/projectSettingsModels';
import { getProjectId, getModuleSingularName } from '@/lib/storage/sharedStorage';

export interface ProjectSettingsRef {
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
}

const ProjectSettings = forwardRef<ProjectSettingsRef, {}>((props, ref) => {
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [settings, setSettings] = useState<ProjectSettingsData | null>(null);
  
  const [error, setError] = useState<string>('');

  // System Logo states
  const [logoUploading, setLogoUploading] = useState<boolean>(false);
  const [logoError, setLogoError] = useState<string>('');
  const [logoSuccess, setLogoSuccess] = useState<boolean>(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFileName, setLogoFileName] = useState('');
  
  // Carousel Image states
  const [carouselImageError, setCarouselImageError] = useState<string>('');
  
  // Initial values reference for change detection
  const initialValuesRef = useRef<any>(null);

  // Module singular names
  const [moduleSingularNames, setModuleSingularNames] = useState<{
    Customers?: string;
    Contacts?: string;
    Opportunities?: string;
  }>({});

  // Carousel Images states
  const [carouselImages, setCarouselImages] = useState<Array<{
    id: string;
    url: string;
    hyperlink: string;
    displayTo: number[];
    fileName: string;
  }>>([]);

  // Roles state
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [carouselImageUploading, setCarouselImageUploading] = useState<boolean>(false);
  const [carouselImageSuccess, setCarouselImageSuccess] = useState<boolean>(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Toast notification states
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });

  // Load form with react-hook-form
  const { register, handleSubmit, setValue, getValues, watch, trigger, reset, formState: { errors, isDirty } } = useForm<{
    systemName: string;
    systemId: string;
    country: string;
    timeZone: string;
    language: string;
    systemLogo: string;
    carouselImages: boolean;
    targetUsers: boolean;
    targetCustomers: boolean;
    targetOpportunities: boolean;
    multipleDeviceLogin: boolean;
  }>({});

  // Watch the carouselImages checkbox to conditionally show/hide upload functionality
  const showCarouselUpload = watch('carouselImages');
  
  // Track carousel and logo changes separately (since they're not part of the main form)
  const [otherChanges, setOtherChanges] = useState(false);
  
  // Combined unsaved changes detection
  useEffect(() => {
    setHasUnsavedChanges(isDirty || otherChanges);
  }, [isDirty, otherChanges]);

  // Hidden file input reference
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const carouselFileInputRef = React.useRef<HTMLInputElement>(null);

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError('');
    setLogoSuccess(false);

    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (40KB = 40 * 1024 bytes)
    const maxSize = 40 * 1024;
    if (file.size > maxSize) {
      setLogoError(`File size exceeds 40KB. Current size: ${(file.size / 1024).toFixed(1)}KB`);
      return;
    }

    // Validate image dimensions
    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = async () => {
      try {
        if (img.height > 100) {
          setLogoError(`Image height exceeds 100px. Current height: ${img.height}px`);
          return;
        }

        // All validations passed, upload the file
        setLogoUploading(true);
        const projectId = getProjectId();

        // Module type 5 is for system logo
        const response = await generalSettingService.uploadSystemLogo(projectId, 5, file);

        if (response.statusCode === 200 && response.responseData) {
          setLogoUrl(response.responseData.path);
          // Store the file name for form submission
          setLogoFileName(response.responseData.name);
          // Set the value in the form
          setValue('systemLogo', response.responseData.name);
          setLogoSuccess(true);
        } else {
          throw new Error('Invalid response from upload API');
        }
      } catch (error) {
        console.error('Error uploading logo:', error);
        setLogoError('Failed to upload logo. Please try again.');
      } finally {
        setLogoUploading(false);
        URL.revokeObjectURL(img.src); // Clean up the object URL
      }
    };

    img.onerror = () => {
      setLogoError('Failed to load image. The file might be corrupted or not a valid image.');
      URL.revokeObjectURL(img.src); // Clean up the object URL
    };
  };

  // Effect to handle click outside dropdown to close it
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const target = event.target as HTMLElement;
        if (!target.closest('.dropdown-container')) {
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  // Fetch roles
  const fetchRoles = async () => {
    try {
      const projectId = getProjectId();
      const response = await generalSettingService.getRoles(projectId);

      if (response.statusCode === 200 && response.responseData) {
        setRoles(response.responseData);
      } else {
        console.error('Failed to load roles', response);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  // Fetch roles when component mounts
  useEffect(() => {
    fetchRoles();
  }, []);

  // Fetch project settings
  const fetchProjectSettings = async () => {
    setLoading(true);
    try {
      const projectId = getProjectId();
      const response = await generalSettingService.getProjectSettings(projectId);

      if (response.statusCode === 200) {
        setSettings(response.responseData);

        // Set form values
        setValue('systemName', response.responseData.systemName);
        setValue('systemId', response.responseData.systemId);
        setValue('country', String(response.responseData.selectedCountryId));
        setValue('timeZone', String(response.responseData.selectedTimeZoneId));
        setValue('language', String(response.responseData.selectedLanguageId));
        setValue('carouselImages', response.responseData.selectCarouselFlag === 1);
        setValue('targetUsers', response.responseData.userTargetFlag === 1);
        setValue('targetCustomers', response.responseData.customerTargetFlag === 1);
        setValue('targetOpportunities', response.responseData.opportunityTargetFlag === 1);
        setValue('multipleDeviceLogin', response.responseData.restrictMultiDeviceLogin === 1);

        // Set logo preview and filename (for save payload) from API
        setLogoUrl(response.responseData.fullSystemLogo || '');
        setLogoFileName(response.responseData.systemLogo || '');

        // Hydrate carousel images from API so they appear in the UI
        const incomingCarousel = Array.isArray(response.responseData.carouselDetails)
          ? response.responseData.carouselDetails
          : [];
        setCarouselImages(
          incomingCarousel.map((item: any, index: number) => ({
            id: String(item.id ?? `carousel_${Date.now()}_${index}`),
            url: item.imagePath || '',
            fileName: (item.imagePath ? String(item.imagePath).split('/').pop() : '') || '',
            hyperlink: item.hyperlink || '',
            displayTo: Array.isArray(item.userRoles) ? item.userRoles : []
          }))
        );
      } else {
        setError('Failed to load project settings');
      }
    } catch (error) {
      console.error('Error fetching project settings:', error);
      setError('Failed to load project settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch project settings data when component mounts
  useEffect(() => {
    fetchProjectSettings();
  }, [setValue]);

  // Get role name by ID
  const getRoleNameById = (roleId: number): string => {
    const role = roles.find(r => r.roleId === roleId);
    return role ? role.roleName : 'Unknown';
  };

  // Load module singular names
  useEffect(() => {
    const singularNames = getModuleSingularName();
    if (singularNames && typeof singularNames === 'object') {
      setModuleSingularNames(singularNames);
    }
  }, []);

  const saveSettings = async () => {
    try {
      const isValid = await trigger();
      if (!isValid) {
        console.error('Form validation failed');
        return;
      }

      setLoading(true);
      const projectId = getProjectId();
      const data = getValues();

      // Transform form data to match API expectations
      const formData = {
        systemName: data.systemName,
        systemId: data.systemId,
        selectedCountryId: parseInt(data.country),
        selectedTimeZoneId: parseInt(data.timeZone),
        selectedLanguageId: parseInt(data.language),
        projectId: projectId,
        selectCarouselFlag: data.carouselImages ? 1 : 0,
        userTargetFlag: data.targetUsers ? 1 : 0,
        customerTargetFlag: data.targetCustomers ? 1 : 0,
        opportunityTargetFlag: data.targetOpportunities ? 1 : 0,
        restrictMultiDeviceLogin: data.multipleDeviceLogin ? 1 : 0,
        systemLogo: logoFileName || settings?.systemLogo || null,
        carouselDetails: carouselImages.length > 0 ? carouselImages.map(img => ({
          imagePath: img.url,
          hyperlink: img.hyperlink || '',
          userRoles: img.displayTo,
          hyperlinkError: false
        })) : []
      };

      console.log('Saving project settings:', formData);
      const response = await generalSettingService.updateProjectSettings(projectId, formData);

      if (response.statusCode === 200) {
        // Show success toast with API message
        showToast(response.message || 'Settings saved successfully', 'success');
        // Reset unsaved changes after successful save
        setHasUnsavedChanges(false);
        // Update initial values to current values
        initialValuesRef.current = getValues();
      } else {
        // Show error toast with API message
        showToast(response.message || 'Failed to save settings', 'error');
      }
    } catch (error) {
      console.error('Error saving project settings:', error);
      showToast('Failed to save settings. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Expose handleSave, handleCancel, loading state, and unsaved changes to parent component via ref
  useImperativeHandle(ref, () => ({
    handleSave,
    handleCancel,
    isLoading: loading,
    hasUnsavedChanges: hasUnsavedChanges
  }));

  const handleSave = handleSubmit(saveSettings);

  // Handle carousel image upload
  const handleCarouselImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear previous error/success messages
    setCarouselImageError('');
    setCarouselImageSuccess(false);
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size (1MB = 1 * 1024 * 1024 bytes)
    const maxSize = 1 * 1024 * 1024;
    if (file.size > maxSize) {
      setCarouselImageError(`File size exceeds 1MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      return;
    }
    
    // Check if maximum number of images (5) is reached
    if (carouselImages.length >= 5) {
      setCarouselImageError('Maximum 5 images allowed. Please remove an existing image first.');
      return;
    }
    
    try {
      // All validations passed, upload the file
      setCarouselImageUploading(true);
      const projectId = getProjectId();
      
      // Module type 6 is for carousel images
      const response = await generalSettingService.uploadSystemLogo(projectId, 5, file);
      
      if (response.statusCode === 200 && response.responseData) {
        // Generate a unique ID for this image
        const imageId = `carousel_${Date.now()}`;
        
        // Add the new image to the state
        setCarouselImages(prev => [...prev, {
          id: imageId,
          url: response.responseData.path,
          fileName: response.responseData.name,
          hyperlink: '',
          // If we have roles, use the first role ID, otherwise use empty array
          displayTo: roles.length > 0 ? [roles[0].roleId] : []
        }]);
        
        setCarouselImageSuccess(true);
        
        // Reset the file input
        if (carouselFileInputRef.current) {
          carouselFileInputRef.current.value = '';
        }
      } else {
        throw new Error('Invalid response from upload API');
      }
    } catch (error) {
      console.error('Error uploading carousel image:', error);
      setCarouselImageError('Failed to upload image. Please try again.');
    } finally {
      setCarouselImageUploading(false);
    }
  };
  
  // Update carousel image field (hyperlink or displayTo)
  const updateCarouselImage = (id: string, field: 'hyperlink', value: string) => {
    setCarouselImages(prev => prev.map(img => 
      img.id === id ? { ...img, [field]: value } : img
    ));
  };
  
  // Update carousel image display targets
  const updateCarouselDisplayTargets = (id: string, targets: number[]) => {
    setCarouselImages(prev => prev.map(img => 
      img.id === id ? { ...img, displayTo: targets } : img
    ));
  };
  
  // Handle display target checkbox change
  const handleDisplayTargetChange = (id: string, targetId: number, isChecked: boolean) => {
    setCarouselImages(prev => prev.map(img => {
      if (img.id === id) {
        return {
          ...img,
          displayTo: isChecked
            ? [...img.displayTo, targetId]
            : img.displayTo.filter(t => t !== targetId)
        };
      }
      return img;
    }));
  };
  
  // Remove a carousel image
  const removeCarouselImage = (id: string) => {
    setCarouselImages(prev => prev.filter(img => img.id !== id));
  };

  const handleCancel = () => {
    // Reset all form data to original values from API
    if (settings) {
      // Reset form values to original API data
      setValue('systemName', settings.systemName);
      setValue('systemId', settings.systemId);
      setValue('country', String(settings.selectedCountryId));
      setValue('timeZone', String(settings.selectedTimeZoneId));
      setValue('language', String(settings.selectedLanguageId));
      setValue('carouselImages', settings.selectCarouselFlag === 1);
      setValue('targetUsers', settings.userTargetFlag === 1);
      setValue('targetCustomers', settings.customerTargetFlag === 1);
      setValue('targetOpportunities', settings.opportunityTargetFlag === 1);
      setValue('multipleDeviceLogin', settings.restrictMultiDeviceLogin === 1);

      // Reset logo data to original values
      setLogoUrl(settings.fullSystemLogo || '');
      setLogoFileName(settings.systemLogo || '');
      setLogoError('');
      setLogoSuccess(false);

      // Reset carousel images to original API data
      const originalCarousel = Array.isArray(settings.carouselDetails)
        ? settings.carouselDetails
        : [];
      setCarouselImages(
        originalCarousel.map((item: any, index: number) => ({
          id: String(item.id ?? `carousel_${Date.now()}_${index}`),
          url: item.imagePath || '',
          fileName: (item.imagePath ? String(item.imagePath).split('/').pop() : '') || '',
          hyperlink: item.hyperlink || '',
          displayTo: Array.isArray(item.userRoles) ? item.userRoles : []
        }))
      );

      // Reset carousel upload states
      setCarouselImageError('');
      setCarouselImageSuccess(false);
      setCarouselImageUploading(false);

      // Clear any validation errors
      setError('');

      // Reset unsaved changes flag
      setHasUnsavedChanges(false);
      setOtherChanges(false);

      // Show confirmation toast
    /*  showToast('All changes have been cancelled and form reset to original values', 'success');*/
    }
  };
  
  // Toast notification function
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    // Auto hide after 5 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  return (
    <form onSubmit={handleSave} className={styles.tabContainer}>
        {loading && (
          <div className="flex justify-center items-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-2">Loading settings...</span>
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <div className={styles.tabContent} style={{paddingBottom: '100px'}}>
            {/* Country */}
            <div className={styles.tabField}>
                <label>
                    Country <span className="text-[#F64E60]">*</span>
                </label>
                <div className={styles.fieldInputContainer}>
                    <select
                        id="country"
                        {...register('country')}
                        className={styles.select}
                        disabled={loading}
                        defaultValue={settings?.selectedCountryId}
                    >
                        {!settings?.countryList?.length && <option value="">Loading countries...</option>}
                        {settings?.countryList?.map((country) => (
                            <option key={country.id} value={country.id} selected={country.id === settings?.selectedCountryId}>
                                {country.name}
                            </option>
                        ))}
                    </select>
                    <p className={styles.instructionText}>Select country...</p>
                </div>
            </div>
            
            {/* Time Zone */}
            <div className={styles.tabField}>
                <label>
                    Time Zone <span className="text-[#F64E60]">*</span>
                </label>
                <div className={styles.fieldInputContainer}>
                    <select
                        id="timeZone"
                        {...register('timeZone')}
                        className={styles.select}
                        disabled={loading}
                        defaultValue={settings?.selectedTimeZoneId}
                    >
                        {!settings?.timeZoneList?.length && <option value="">Loading time zones...</option>}
                        {settings?.timeZoneList?.map((timezone) => (
                            <option key={timezone.id} value={timezone.id} selected={timezone.id === settings?.selectedTimeZoneId}>
                                {timezone.name}
                            </option>
                        ))}
                    </select>
                    <p className={styles.instructionText}>Select time zone...</p>
                </div>
            </div>

            {/* Language */}
            <div className={styles.tabField}>
                <label>
                    Language <span className="text-[#F64E60]">*</span>
                </label>
                <div className={styles.fieldInputContainer}>
                    <select
                        id="language"
                        {...register('language')}
                        className={styles.select}
                        disabled={loading}
                        defaultValue={settings?.selectedLanguageId}
                    >
                        {!settings?.languageList?.length && <option value="">Loading languages...</option>}
                        {settings?.languageList?.map((language) => (
                            <option key={language.id} value={language.id} selected={language.id === settings?.selectedLanguageId}>
                                {language.name}
                            </option>
                        ))}
                    </select>
                    <p className={styles.instructionText}>Select language...</p>
                </div>
            </div>

            {/* System Name */}
            <div className={styles.tabField}>
                <label>
                    System Name <span className="text-[#F64E60]">*</span>
                </label>
                <div className={styles.fieldInputContainer}>
                  <div className="mt-1">
                    <div className="relative">
                      <input
                          id="systemName"
                          {...register('systemName')}
                          type="text"
                          className={styles.input}
                          disabled={loading}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                        {errors.systemName ? (
                            <p className="text-xs text-red-500">System name should not be blank.</p>
                        ) : (
                            <p className={styles.instructionText}>Enter system name...</p>
                        )}
                        <p className="text-xs text-gray-500">{watch('systemName')?.length || 0}/75</p>
                    </div>
                  </div>
                </div>
            </div>
            
            {/* System ID */}
            <div className={styles.tabField}>
                <label>
                    System ID <span className="text-[#F64E60]">*</span>
                </label>
                <div className={styles.fieldInputContainer}>
                  <div className="mt-1">
                    <div className="relative">
                      <input
                        id="systemId"
                        {...register('systemId')}
                        type="text"
                        className={styles.input}
                        disabled={loading}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                        {errors.systemId ? (
                            <p className="text-xs text-red-500">System Id should not be blank.</p>
                        ) : (
                            <p className={styles.instructionText}>Enter system Id...</p>
                        )}
                        <p className="text-xs text-gray-500">{watch('systemId')?.length || 0}/75</p>
                    </div>
                  </div>
                </div>
            </div>

            {/* System Logo */}
            <div className={styles.tabField}>
                <label>
                    System Logo 
                </label>
                <div className={styles.fieldInputContainer}>
                    <input
                        type="file"
                        accept="image/jpeg, image/jpg, image/png, image/gif"
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                        onChange={handleLogoUpload}
                        disabled={loading || logoUploading}
                    />
                    {logoUrl ? (
                        <div className="relative w-[50px] h-[50px]">
                            <img 
                                src={logoUrl} 
                                alt="System Logo" 
                                className="w-[50px] h-[50px] object-contain border border-gray-300 rounded"
                            />
                            <button
                                type="button"
                                className="absolute right-0 bottom-0 bg-white rounded-full p-1 shadow-sm border border-gray-200 cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading || logoUploading}
                                aria-label="Edit logo"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-blue-500">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <button 
                            type="button" 
                            className="flex items-center gap-2 px-0.5 py-0.5 text-white rounded-lg border border-gray-300"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading || logoUploading}
                        >
                            {logoUploading ? (
                                <span className="w-7 h-7 flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </span>
                            ) : (
                                <img src="../svg/icons/general/upload.svg" alt="icon" className="w-7 h-7" />
                            )}
                        </button>
                    )}
                    <div>
                        <p className={styles.instructionText}>Upload .jpeg , .jpg, .png , .gif files only, height should be upto 100 pixels and file size should be upto 40 KB</p>
                        {logoError && <p className="text-red-500 text-xs mt-1">{logoError}</p>}
                        {logoSuccess && <p className="text-green-500 text-xs mt-1">Logo uploaded successfully!</p>}
                        {/* Hidden input field to store the logo filename for form submission */}
                        <input 
                            type="hidden" 
                            {...register('systemLogo')} 
                        />
                    </div>
                </div>
            </div>

            {/* Upload Carousel Images */}
            <div className={styles.tabField}>
                <label className="col-span-3">
                    Upload Carousel Images
                </label>
                <div className="flex flex-col ml-1">
                    <div className="flex items-center">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                id="carouselImages"
                                {...register('carouselImages')}
                                className="hidden peer"
                                disabled={loading}
                            />
                            <div
                                className="w-5 h-5 rounded border border-gray-400 flex items-center justify-center transition-colors peer-checked:bg-blue-500 peer-checked:border-blue-500 relative"
                            >
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
                    <p className={styles.instructionText}>Tick this if you want to show carousel images in the 1Channel App</p>

                    {/* Show carousel image upload UI only when checkbox is checked */}
                    {showCarouselUpload && (
                        <div className="mt-4">
                            {/* Carousel file input */}
                            <input
                                type="file"
                                accept="image/jpeg, image/jpg, image/png, image/gif"
                                style={{ display: 'none' }}
                                ref={carouselFileInputRef}
                                onChange={handleCarouselImageUpload}
                                disabled={loading || carouselImageUploading || carouselImages.length >= 5}
                            />

                            {/* Upload button */}
                            {carouselImages.length < 5 && (
                                <div className="flex items-center mb-4">
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 px-0.5 py-0.5 text-white rounded-lg border border-gray-300"
                                        onClick={() => carouselFileInputRef.current?.click()}
                                        disabled={loading || carouselImageUploading || carouselImages.length >= 5}
                                    >
                                        {carouselImageUploading ? (
                                            <span className="w-5 h-5 flex items-center justify-center">
                                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            </span>
                                        ) : (
                                            <img src="../svg/icons/general/imageIcon.svg" alt="icon" className="w-7 h-7" />
                                        )}
                                    </button>
                                    
                                    <div className="ml-4">
                                        <p className={styles.instructionText}>
                                            Max images: 5, 1 image per selection<br /> 
                                            Max File Size: 1 MB<br />
                                            Image Type: .jpeg, .jpg, .png files only
                                        </p>
                                        {carouselImageError && <p className="text-red-500 text-xs mt-1">{carouselImageError}</p>}
                                        {carouselImageSuccess && <p className="text-green-500 text-xs mt-1">Image uploaded successfully!</p>}
                                    </div>
                                </div>
                            )}

                            {/* Display uploaded carousel images with fields */}
                            <div className="space-y-4 mt-2">
                                {carouselImages.map((image) => (
                                    <div key={image.id}>
                                        <div className="flex flex-wrap md:flex-nowrap gap-4">
                                            {/* Image thumbnail */}
                                            <div className="relative w-[50px] h-[50px] flex-shrink-0">
                                                <img 
                                                    src={`${process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL}${image.url}`} 
                                                    alt="Carousel" 
                                                    className="w-[50px] h-[50px] object-cover rounded border border-gray-300" 
                                                />
                                                {/* Edit icon overlay (same as system logo) */}
                                                <div 
                                                    className="absolute right-0 bottom-0 bg-blue-500 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer shadow-sm border border-white"
                                                    onClick={() => carouselFileInputRef.current?.click()}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-2 h-2">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                </div>
                                            </div>

                                            {/* Fields */}
                                            <div className="flex-grow space-y-4">
                                                {/* Hyperlink field */}
                                                <div>
                                                    <div className="relative">
                                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-500">
                                                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                                            </svg>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={image.hyperlink}
                                                            onChange={(e) => updateCarouselImage(image.id, 'hyperlink', e.target.value)}
                                                            className={styles.input}
                                                            style={{ paddingLeft: '2rem' }}
                                                            placeholder="Add hyperlink"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Display to field - dropdown multiselect */}
                                                <div className="flex items-center">
                                                    <div className="text-sm text-gray-500 mr-4 whitespace-nowrap">
                                                        Display this image only to
                                                    </div>
                                                    <div className="relative dropdown-container flex-grow">
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const currentId = `dropdown-${image.id}`;
                                                                setOpenDropdown(prev => prev === currentId ? null : currentId);
                                                            }}
                                                            className="w-full px-4 py-2 border-b border-gray-300 bg-white text-left flex justify-between items-center text-gray-500 focus:outline-none"
                                                        >
                                                            <span className="text-sm">
                                                                {image.displayTo.length > 0 
                                                                    ? image.displayTo.map(roleId => getRoleNameById(roleId)).join(', ')
                                                                    : 'Select options'}
                                                            </span>
                                                            <svg className="w-3 h-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                        
                                                        {openDropdown === `dropdown-${image.id}` && (
                                                          <div className="absolute z-20 w-full bg-white shadow-lg border border-gray-200 overflow-hidden max-h-60 overflow-y-auto" style={{ zIndex: 9999 }}>
                                                              {roles.length === 0 ? (
                                                                  <div className="px-4 py-2 text-sm text-gray-500">Loading roles...</div>
                                                              ) : (
                                                                roles.map((role, index) => (
                                                                  <label 
                                                                    key={role.roleId} 
                                                                    className={`flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer ${index < roles.length - 1 ? 'border-b border-gray-200' : ''}`}
                                                                    style={{ 
                                                                      width: 'auto', 
                                                                      padding: '8px 12px',
                                                                      whiteSpace: 'normal', 
                                                                      overflow: 'visible',
                                                                      textOverflow: 'clip', 
                                                                      paddingTop: '8px',
                                                                      paddingRight: '8px',
                                                                      display: 'flex',
                                                                      alignItems: 'center',
                                                                      color: '#000'
                                                                    }}
                                                                  >
                                                                    <input
                                                                      type="checkbox"
                                                                      checked={image.displayTo.includes(role.roleId)}
                                                                      onChange={(e) => handleDisplayTargetChange(image.id, role.roleId, e.target.checked)}
                                                                      className="mr-2 h-4 w-4"
                                                                    />
                                                                    <span className="text-sm" style={{ color: '#000' }}>{role.roleName}</span>
                                                                  </label>
                                                                ))
                                                              )}
                                                          </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Hidden input to store the file name */}
                                        <input 
                                            type="hidden"
                                            name={`carouselImage_${image.id}`}
                                            value={image.fileName}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Enable Target for */}
            <div className={styles.tabField}>
                <label className="col-span-3">
                    Enable Target for
                </label>
                <div className="flex items-center gap-8 ml-1">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            id="targetUsers"
                            {...register('targetUsers')}
                            className="hidden peer"
                            disabled={loading}
                        />
                        <div
                            className="w-5 h-5 rounded border border-gray-400 flex items-center justify-center transition-colors peer-checked:bg-blue-500 peer-checked:border-blue-500 relative"
                        >
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
                        <span className="ml-2 text-sm text-gray-700">Users</span>
                    </label>
                    
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            id="targetCustomers"
                            {...register('targetCustomers')}
                            className="hidden peer"
                            disabled={loading}
                        />
                        <div
                            className="w-5 h-5 rounded border border-gray-400 flex items-center justify-center transition-colors peer-checked:bg-blue-500 peer-checked:border-blue-500 relative"
                        >
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
                        <span className="ml-2 text-sm text-gray-700">{moduleSingularNames['Customers'] || 'Customers'}</span>
                    </label>
                    
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            id="targetOpportunities"
                            {...register('targetOpportunities')}
                            className="hidden peer"
                            disabled={loading}
                        />
                        <div
                            className="w-5 h-5 rounded border border-gray-400 flex items-center justify-center transition-colors peer-checked:bg-blue-500 peer-checked:border-blue-500 relative"
                        >
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
                        <span className="ml-2 text-sm text-gray-700">{moduleSingularNames['Opportunities'] || 'Opportunities'}</span>
                    </label>
                </div>
            </div>

            {/* Restrict Multiple Device Login */}
            <div className={styles.tabField}>
                <label className="col-span-3">
                    Restrict Multiple Device Login
                </label>
                <div className="flex flex-col ml-1">
                    <div className="flex items-center">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                id="multipleDeviceLogin"
                                {...register('multipleDeviceLogin')}
                                className="hidden peer"
                                disabled={loading}
                            />
                            <div
                                className="w-5 h-5 rounded border border-gray-400 flex items-center justify-center transition-colors peer-checked:bg-blue-500 peer-checked:border-blue-500 relative"
                            >
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
                    <p className="text-xs text-gray-500 mt-1">Tick this if you want the users to login only in one device at a time</p>
                </div>
            </div>

            {/* System ID */}
            <div className={styles.tabField}>
                <label>
                    System ID
                </label>
                <div className="flex-1 relative">
                    <input
                        id="systemId"
                        {...register('systemId')}
                        type="text"
                        className="w-full rounded-md border-gray-300 px-3 py-2 text-gray-700 bg-gray-100"
                        readOnly
                        disabled={loading}
                    />
                    <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

export default ProjectSettings;
