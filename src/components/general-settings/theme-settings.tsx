import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useForm } from 'react-hook-form';
import styles from '@/styles/generalSettings.module.css';
import { generalSettingService } from '@/lib/services/generalSettingsService';
import { getProjectId } from '@/lib/storage/sharedStorage';
import AddActionButton from '../common/buttons/action-button/AddActionButton';
import ColorPickerInput from '../common/input-fields/ColorPickerInput';

export interface ThemeSettingsRef {
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  refreshThemes: () => Promise<void>;
}

interface Theme {
  id?: number | null;
  identifier: string;
  name: string;
  brandColor: string;
  kpiAndHeaderColor: string;
  isDefault?: boolean;
  isSelected?: boolean;
}

const ThemeSettings = forwardRef<ThemeSettingsRef, {}>((_, ref) => {
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { control, setValue } = useForm<any>({
    defaultValues: {
      themes: {}
    }
  });
  
  const [themes, setThemes] = useState<Theme[]>([]);

  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchThemeSettings();
  }, []);

  const fetchThemeSettings = async () => {
    setLoading(true);
    try {
      const projectId = getProjectId();
      const response = await generalSettingService.getThemeSettings(projectId);
      if (response.statusCode === 200 && response.responseData) {
        const apiThemes = response.responseData || [];

        // Always show themes from API response
        const themesWithSelection = apiThemes.map((theme: Theme) => ({
          ...theme,
          isSelected: theme.isSelected
        }));
        setThemes(themesWithSelection);
        
        // Set form values for all theme colors
        apiThemes.forEach((theme: Theme) => {
          setValue(`themes.${theme.identifier}.brandColor`, theme.brandColor);
          setValue(`themes.${theme.identifier}.brandColorText`, theme.brandColor);
          setValue(`themes.${theme.identifier}.kpiAndHeaderColor`, theme.kpiAndHeaderColor);
          setValue(`themes.${theme.identifier}.kpiAndHeaderColorText`, theme.kpiAndHeaderColor);
        });
      }
    } catch (error) {
      console.error('Error fetching theme settings:', error);
    } finally {
      setLoading(false);
      setHasUnsavedChanges(false);
    }
  };

  const handleThemeSelection = (themeIdentifier: string) => {
    setThemes(prev => prev.map(theme => ({
      ...theme,
      isSelected: theme.identifier === themeIdentifier
    })));
    setHasUnsavedChanges(true);
  };

  const handleColorChange = (themeIdentifier: string, colorType: 'brandColor' | 'kpiAndHeaderColor', value: string) => {
    if (themeIdentifier === 'theme.default') return;
    
    setThemes(prev => prev.map(theme => 
      theme.identifier === themeIdentifier 
        ? { ...theme, [colorType]: value }
        : theme
    ));
    
    // Update the form value to keep text input in sync
    setValue(`themes.${themeIdentifier}.${colorType}`, value);
    
    setHasUnsavedChanges(true);
  };

  const handleHexInputChange = (themeIdentifier: string, colorType: 'brandColor' | 'kpiAndHeaderColor', value: string) => {
    if (themeIdentifier === 'theme.default') return;
    
    // Remove any non-hex characters except #
    let formattedValue = value.replace(/[^#A-Fa-f0-9]/g, '');
    
    // Ensure it starts with #
    if (formattedValue && !formattedValue.startsWith('#')) {
      formattedValue = '#' + formattedValue;
    }
    
    // Limit to 7 characters (#XXXXXX)
    if (formattedValue.length > 7) {
      formattedValue = formattedValue.slice(0, 7);
    }
    
    // Convert to uppercase
    formattedValue = formattedValue.toUpperCase();
    
    setThemes(prev => prev.map(theme => 
      theme.identifier === themeIdentifier 
        ? { ...theme, [colorType]: formattedValue }
        : theme
    ));
    
    // Update the form value to sync with color picker
    setValue(`themes.${themeIdentifier}.${colorType}`, formattedValue);
    
    setHasUnsavedChanges(true);
  };

  const validateAndUpdateColor = (themeIdentifier: string, colorType: 'brandColor' | 'kpiAndHeaderColor', value: string) => {
    if (themeIdentifier === 'theme.default') return;
    
    // Validate hex format on blur
    const hexRegex = /^#[A-Fa-f0-9]{6}$/;
    let finalValue = value;
    
    if (!hexRegex.test(value)) {
      // If invalid, revert to previous valid color
      finalValue = '#3699FF';
    }
    
    setThemes(prev => prev.map(theme => 
      theme.identifier === themeIdentifier 
        ? { ...theme, [colorType]: finalValue }
        : theme
    ));
    
    // Update the form value to sync with color picker
    setValue(`themes.${themeIdentifier}.${colorType}`, finalValue);
  };

  const handleNameChange = (themeIdentifier: string, newName: string) => {
    setThemes(prev => prev.map(theme => 
      theme.identifier === themeIdentifier 
        ? { ...theme, name: newName }
        : theme
    ));
    
    setHasUnsavedChanges(true);
  };

  const handleNameBlur = (themeIdentifier: string, value: string) => {
    // If the name is empty or only whitespace, revert to default custom name
    if (!value.trim()) {
      // Extract the number from the identifier (e.g., "theme.custom1" -> "1")
      const customNumber = themeIdentifier.replace('theme.custom', '');
      const defaultName = `Custom ${customNumber}`;
      
      setThemes(prev => prev.map(theme => 
        theme.identifier === themeIdentifier 
          ? { ...theme, name: defaultName }
          : theme
      ));
    }
  };


  const handleAddTheme = () => {
    const customThemesCount = themes.filter(t => !t.isDefault).length;
    
    const newThemeNumber = customThemesCount + 1;
    const newTheme: Theme = {
      id: null, // ID is null for new themes
      identifier: `theme.custom${newThemeNumber}`,
      name: `Custom ${newThemeNumber}`,
      brandColor: '#3699FF',
      kpiAndHeaderColor: '#3699FF',
      isDefault: false,
      isSelected: false
    };
    
    setThemes(prev => [...prev, newTheme]);
    
    // Set form values for the new theme
    setValue(`themes.${newTheme.identifier}.brandColor`, newTheme.brandColor);
    setValue(`themes.${newTheme.identifier}.brandColorText`, newTheme.brandColor);
    setValue(`themes.${newTheme.identifier}.kpiAndHeaderColor`, newTheme.kpiAndHeaderColor);
    setValue(`themes.${newTheme.identifier}.kpiAndHeaderColorText`, newTheme.kpiAndHeaderColor);
    
    setHasUnsavedChanges(true);
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      setIsSaving(true);
      const projectId = getProjectId();
      
      const data = {
        themes: themes,
        projectId: projectId || null
      };
      
      const response = await generalSettingService.updateThemeSettings(data);
      
      if (response.statusCode === 200 || response.statusCode === 201) {
        setIsSaving(false);
        showToast(response.message || 'Theme settings saved successfully', 'success');
        setHasUnsavedChanges(false);
        setLoading(false);
        setIsRefreshing(true); // This keeps the save button disabled during delay
        
        // Wait 1 second, then refresh themes
        setTimeout(async () => {
          setLoading(true); // Show loader for refresh
          await fetchThemeSettings();
          setLoading(false);
          setIsRefreshing(false);
        }, 1000); // 1 second delay
      } else {
        showToast(response.message || 'Failed to save theme settings', 'error');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error saving theme settings:', error);
      showToast('Failed to save theme settings. Please try again.', 'error');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if(isRefreshing || loading) return;
    await saveSettings();
  };

  const handleCancel = () => {
    // Reload themes from API instead of hardcoded defaults
    fetchThemeSettings();
    setHasUnsavedChanges(false);
  };

  useImperativeHandle(ref, () => ({
    handleSave,
    handleCancel,
    isLoading: loading || isRefreshing,
    hasUnsavedChanges: hasUnsavedChanges,
    refreshThemes: fetchThemeSettings
  }));

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 1000);
  };

  return (
    <div className={`${styles.tabContainer}`}>
      <div className={`${styles.tabContent} pb-24 overflow-y-auto`} style={{ maxHeight: 'calc(90vh - 180px)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        
        {/* Theme list */}
        <div className=" min-h-0 flex-1">
          {themes.length > 0 ? (themes.map((theme, index) => (
            <div key={theme.identifier} className="mb-0.5">
              {/* Grid container for proper column alignment */}
              <div className={`grid grid-cols-12 items-center bg-gray-100 p-3 ${
                themes.length === 1 ? 'rounded-lg' :
                index === 0 ? 'rounded-t-lg' : 
                index === themes.length - 1 ? 'rounded-b-lg' : ''
              }`}>
                {/* Theme name section with radio button - Column 3 */}
                <div className="col-start-1 col-span-4">
                  <div className="flex items-center">
                    <div className="relative" onClick={() => !loading && handleThemeSelection(theme.identifier)}>
                      <input
                        type="checkbox"
                        checked={theme.isSelected || false}
                        onChange={() => !loading && handleThemeSelection(theme.identifier)}
                        disabled={loading}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        theme.isSelected 
                          ? 'border-gray-600 bg-white' 
                          : 'border-gray-400 bg-white'
                      } ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} flex items-center justify-center transition-opacity`}>
                        {theme.isSelected && (
                          <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                        )}
                      </div>
                    </div>
                    {!theme.isDefault ? (
                      <input
                        type="text"
                        value={theme.name}
                        onChange={(e) => handleNameChange(theme.identifier, e.target.value)}
                        onBlur={(e) => handleNameBlur(theme.identifier, e.target.value)}
                        className="text-xs text-gray-700 rounded-lg font-mono bg-white ml-[8px] p-[8px] border-none outline-none cursor-text"

                        placeholder="Theme Name"
                        // maxLength={20}
                      />
                    ) : (
                      <div className="text-sm ml-[16px] font-normal text-gray-700 ml-2">
                        {theme.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Combined div for Brand Color, KPI Header, and Add button - Starting Column 9 */}
                <div className="col-start-5 col-span-4 flex items-center gap-4">
                  {/* Brand Color section */}
                  <div className="flex items-center gap-3">
                    <ColorPickerInput
                      name={`themes.${theme.identifier}.brandColor`}
                      control={control}
                      disabled={theme.isDefault}
                      onChange={(value) => handleColorChange(theme.identifier, 'brandColor', value)}
                    />
                    <div>
                      <div className="text-xs text-gray-500 mb-1 font-normal">
                        Brand Color
                      </div>
                      <input
                        type="text"
                        value={theme.brandColor}
                        onChange={(e) => handleHexInputChange(theme.identifier, 'brandColor', e.target.value)}
                        onBlur={(e) => validateAndUpdateColor(theme.identifier, 'brandColor', e.target.value)}
                        disabled={theme.isDefault}
                        className="text-xs text-gray-700 rounded-lg font-mono bg-white px-[15px] p-[8px] border-none w-20 outline-none cursor-text"
                        placeholder="#000000"
                        maxLength={7}
                      />
                    </div>
                  </div>

                  {/* KPI & Header section */}
                  <div className="flex items-center gap-3">
                    <ColorPickerInput
                      name={`themes.${theme.identifier}.kpiAndHeaderColor`}
                      control={control}
                      disabled={theme.isDefault}
                      onChange={(value) => handleColorChange(theme.identifier, 'kpiAndHeaderColor', value)}
                    />
                    <div>
                      <div className="text-xs text-gray-500 mb-1 font-normal">
                        KPI & Header
                      </div>
                      <input
                        type="text"
                        value={theme.kpiAndHeaderColor}
                        onChange={(e) => handleHexInputChange(theme.identifier, 'kpiAndHeaderColor', e.target.value)}
                        onBlur={(e) => validateAndUpdateColor(theme.identifier, 'kpiAndHeaderColor', e.target.value)}
                        disabled={theme.isDefault}
                        className="text-xs text-gray-700 rounded-lg font-mono bg-white px-[15px] p-[8px] border-none w-20 outline-none cursor-text"
                        placeholder="#000000"
                        maxLength={7}
                      />
                    </div>
                  </div>

                  {/* Add button section */}
                  <div className="flex items-center">
                    {index === themes.length - 1 && (
                      <AddActionButton
                        onAdd={handleAddTheme}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
          ) : (
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-center">
                  <div className="text-sm text-gray-500">No themes available.</div>
                  
                </div>
              </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div 
          className={`fixed bottom-1 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-lg shadow-lg text-white font-medium z-50 transition-all duration-3000 min-w-80 max-w-128 ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
          style={{ zIndex: 9999 }}
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

      {/* Full Page Loader with blur on entire page - only show during actual loading */}
      {loading && (
        <div className="fixed inset-0 bg-white bg-opacity-80 backdrop-blur flex items-center justify-center z-[9999]">
          <div className="bg-transparent rounded-lg p-8 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-700 text-sm font-medium">{isRefreshing ? "Refreshing data...": isSaving ?"Saving...":  "Loading..." }</p>
          </div>
        </div>
      )}
    </div>
  );
});

ThemeSettings.displayName = 'ThemeSettings';

export default ThemeSettings;