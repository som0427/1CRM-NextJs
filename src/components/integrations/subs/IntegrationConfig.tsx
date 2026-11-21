import React, { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import TextInput from '@/components/common/input-fields/TextInput';
import Select from '@/components/common/input-fields/Select';
import MultiSelect from '@/components/common/input-fields/MultiSelect';
import { useDynamicNames } from '@/hooks/useDynamicNames';
import { integrationsService } from '@/lib/services/integrationsService';
import { getProjectId } from '@/lib/storage/sharedStorage';
import { 
  ConfigSection, 
  IntegrationConfigField,
  ConfigFieldsApiResponse,
  SaveConfigurationRequest,
  ConfigFieldSaveValue,
  GetConfigurationDetailsResponse,
  AppConfigModule
} from '@/lib/models/integrations/integrationsModels';
import settingsService from '@/lib/services/settingsService';

interface IntegrationConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  integrationName: string;
  appId: number;
  isEdit?: boolean;
  integrationType?: number;
  onSaveSuccess?: (message: string) => void;
  onSaveError?: (message: string) => void;
}

interface FormErrors {
  [key: string]: string;
}

interface ExistingConfigData {
  appId: number;
  projectId: number;
  moduleType: number[];
  appConfigModule: AppConfigModule[];
  configFieldSaveValue: ConfigFieldSaveValue[];
}

const IntegrationConfigModal: React.FC<IntegrationConfigModalProps> = ({
  isOpen,
  onClose,
  integrationName,
  appId,
  isEdit = false,
  integrationType = 4,
  onSaveSuccess,
  onSaveError
}) => {
  const { control, handleSubmit, setValue, trigger, reset, watch, getValues } = useForm();
  const { getSingularName, isLoading: singularNamesLoading } = useDynamicNames();
  
  const [loading, setLoading] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [configSections, setConfigSections] = useState<ConfigSection[]>([]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  
  // Store existing configuration for edit mode
  const [existingConfig, setExistingConfig] = useState<ExistingConfigData | null>(null);

  // Module selection states (for calling features)
  const [selectedModules, setSelectedModules] = useState<number[]>([]);
  const [previousModules, setPreviousModules] = useState<number[]>([]);
  const [moduleOptions, setModuleOptions] = useState<{ id: number; name: string }[]>([]);
  const [labelMap, setLabelMap] = useState<Map<number, { name: string; options: any[]; isSelected: boolean }>>(new Map());
  
  // Get entity name by module ID
  const getEntityName = (moduleId: number): string => {
    const moduleOption = moduleOptions.find(opt => opt.id === moduleId);
    return moduleOption ? moduleOption.name : `Module ${moduleId}`;
  };


  // Fetch numeric fields for a specific module from API
  const getNumericFields = async (moduleId: number) => {
    try {
      const projectId = getProjectId();
      if (!projectId) {
        throw new Error('Project ID not found');
      }

      const response = await settingsService.getFieldDetails(projectId, moduleId);
      const numericFields = response.responseData
        .filter(row => row.attributeType.id === 7)
        .map(filteredRow => ({
          attributeId: filteredRow.id,
          attributeName: filteredRow.attributeName
        }));

      // Update labelMap with fetched fields
      setLabelMap(prev => {
        const newMap = new Map(prev);
        newMap.set(moduleId, {
          name: getEntityName(moduleId),
          options: numericFields,
          isSelected: selectedModules.includes(moduleId)
        });
        return newMap;
      });

    } catch (error) {
      console.error(`Error loading fields for module ${moduleId}:`, error);
    }
  };

  // Load module options dynamically based on integration configuration
  const loadModuleOptions = async () => {
    try {
      // Wait for singular names to load if they're still loading
      if (singularNamesLoading) {
        return;
      }
      
      // Load options based on available modules for this integration
      const options: any = [
        { id: 1, name: getSingularName('contacts') },
        { id: 2, name: getSingularName('customers') }
      ];

      setModuleOptions(options);
    } catch (error) {
      console.error('Error loading module options:', error);
    }
  };

  useEffect(() => {
    if (isOpen && appId) {
      loadModuleOptions();
      fetchConfigFields();
    } else {
      // Reset form when modal closes
      resetForm();
    }
  }, [isOpen, appId]);

  // Reload module options when singular names finish loading
  useEffect(() => {
    if (!singularNamesLoading && isOpen && appId) {
      loadModuleOptions();
    }
  }, [singularNamesLoading, isOpen, appId]);

  // Prefetch fields when module options are loaded
  useEffect(() => {
    if (moduleOptions.length > 0 && isOpen && integrationType === 1 && !loading && !dataLoading) {
      // Prefetch fields for all available modules
      const prefetchFields = async () => {
        // Only prefetch if we haven't already loaded these fields
        const needsPrefetch = moduleOptions.some(module => !labelMap.has(module.id));
        if (!needsPrefetch) {
          return;
        }

        // Wait a bit to ensure the main loader has finished
        setTimeout(async () => {
          // Show loading while prefetching
          setDataLoading(true);
          
          try {
            const fetchPromises = moduleOptions.map(module => {
              // Only fetch if not already in labelMap
              if (!labelMap.has(module.id)) {
                return getNumericFields(module.id);
              }
              return Promise.resolve();
            });
            
            await Promise.all(fetchPromises);
          } finally {
            setDataLoading(false);
          }
        }, 300); // Slightly longer delay to ensure smooth transition after main loader
      };
      
      prefetchFields();
    }
  }, [moduleOptions, isOpen, integrationType, loading]);

  const resetForm = () => {
    setFormErrors({});
    setSelectedModules([]);
    setPreviousModules([]);
    setExistingConfig(null);
    setSaving(false);
    setLoading(false);
    setDataLoading(false);
    setLabelMap(new Map());
    prevModuleSelection.current = [];
    reset();
  };

  const fetchConfigFields = async () => {
    setLoading(true);
    try {
      const response: ConfigFieldsApiResponse = await integrationsService.fetchConfigFields(appId);
      setConfigSections(response.responseData);
      
      // Initialize form data
      const initialFormData: Record<string, string | string[]> = {};
      response.responseData.forEach(section => {
        section.integrationConfigField.forEach(field => {
          // Initialize with empty string for all field types
          const fieldKey = field.id.toString();
          initialFormData[fieldKey] = '';
          // Don't set in react-hook-form yet - will set after loading edit data or at the end
        });
      });
      
      // Initialize enableCallingFor for calling integrations
      if (integrationType === 1) {
        initialFormData['enableCallingFor'] = [];
      }

      // If editing, fetch existing configuration
      if (isEdit) {
        const projectId = getProjectId();
        if (projectId) {
          // Add a small delay to ensure loading has finished before starting dataLoading
          setTimeout(async () => {
            setDataLoading(true);
            try {
            const configResponse: GetConfigurationDetailsResponse = await integrationsService.getConfigurationDetails(appId, projectId);
            const configData = configResponse.responseData;
            
            // Store existing configuration for later use
            setExistingConfig({
              appId: configData.appId,
              projectId: configData.projectId,
              moduleType: configData.moduleType || [],
              appConfigModule: configData.appConfigModule || [],
              configFieldSaveValue: configData.configFieldSaveValue || []
            });
            
            // Populate form data with existing values
            configData.configFieldSaveValue.forEach(savedField => {
              // Ensure the value is always a string for Select components
              initialFormData[savedField.fieldId.toString()] = savedField.fieldValue.toString();
            });
            
            // Set selected modules and store previous state
            if (configData.moduleType && configData.moduleType.length > 0) {
              const modules = configData.moduleType.filter(m => m !== 0);
              setSelectedModules(modules);
              setPreviousModules(modules);
              
              // Set the Enable Calling For multi-select value
              if (modules.length > 0) {
                const moduleStrings = modules.map(m => m.toString());
                initialFormData['enableCallingFor'] = moduleStrings;
              }
              
              // Populate module-specific fields (attributeId is the selected field ID)
              configData.appConfigModule.forEach(moduleConfig => {
                if (moduleConfig.isActive === 1 && moduleConfig.moduleId !== 0) {
                  const fieldKey = `module_${moduleConfig.moduleId}_field`;
                  const attributeValue = moduleConfig.attributeId.toString();
                  initialFormData[fieldKey] = attributeValue;
                }
              });
            }
            
            // Set ALL values in React Hook Form at once AFTER gathering all data
            Object.entries(initialFormData).forEach(([key, value]) => {
              setValue(key, value, { shouldValidate: false, shouldDirty: false });
            });
            
            
            // Update formData state
            validateForm(initialFormData);
            
            } catch (error) {
              console.error('Error fetching configuration details:', error);
            } finally {
              setDataLoading(false);
            }
          }, 200); // Small delay to avoid overlapping loaders
        }
      } else {
        // For new configurations, set the initial empty values
        Object.entries(initialFormData).forEach(([key, value]) => {
          setValue(key, value, { shouldValidate: false, shouldDirty: false });
        });
        
        validateForm(initialFormData);
      }
    } catch (error) {
      console.error('Error fetching config fields:', error);
      if (onSaveError) {
        onSaveError('Failed to load configuration fields');
      }
    } finally {
      setLoading(false);
    }
  };

  const getExistingIdByModuleType = (moduleId: number): number | null => {
    if (!existingConfig) return null;
    const existingModule = existingConfig.appConfigModule.find(m => m.moduleId === moduleId);
    return existingModule?.id || null;
  };

  const getExistingFieldId = (fieldId: number): number | null => {
    if (!existingConfig) return null;
    const existingField = existingConfig.configFieldSaveValue.find(f => f.fieldId === fieldId);
    return existingField?.id || null;
  };

  const validateField = (fieldId: string, value: string, field?: IntegrationConfigField): string => {
    if (!field) {
      const allFields = configSections.flatMap(s => s.integrationConfigField);
      field = allFields.find(f => f.id.toString() === fieldId);
    }
    
    if (!field) return '';

    // Only mandatory field validation
    if (field.isMandatory === 1 && !value.trim()) {
      return `${field.fieldName} is required`;
    }

    return '';
  };

  const validateForm = (data: Record<string, string | string[]>): boolean => {
    const errors: FormErrors = {};
    let isValid = true;

    configSections.forEach(section => {
      section.integrationConfigField
        .filter(field => field.isActive === 1)
        .forEach(field => {
          const fieldId = field.id.toString();
          const fieldValue = data[fieldId];
          const valueStr = Array.isArray(fieldValue) ? fieldValue.join(',') : (fieldValue || '');
          const error = validateField(fieldId, valueStr, field);
          if (error) {
            errors[fieldId] = error;
            isValid = false;
          }
        });
    });

    // Validate enableCallingFor field
    if (integrationType === 1) {
      const enableCallingFor = data['enableCallingFor'];
      if (!enableCallingFor || (Array.isArray(enableCallingFor) && enableCallingFor.length === 0)) {
        errors['enableCallingFor'] = 'Please select at least one module';
        isValid = false;
      }
    }

    // Validate module-specific fields
    selectedModules.forEach(moduleId => {
      const moduleName = moduleOptions.find(m => m.id === moduleId)?.name;
      const fieldValue = data[`module_${moduleId}_field`];
      if (moduleName && (!fieldValue || (typeof fieldValue === 'string' && !fieldValue.trim()))) {
        errors[`module_${moduleId}_field`] = `Please select a field for ${moduleName}`;
        isValid = false;
      }
    });

    setFormErrors(errors);
    return isValid;
  };



  // Watch for changes in the enableCallingFor MultiSelect field
  const enableCallingForValue = watch('enableCallingFor') || [];
  
  // Use a ref to track the previous value to avoid infinite loops
  const prevModuleSelection = useRef<string[]>([]);
  
  useEffect(() => {
    const moduleIds = enableCallingForValue.map((id: string) => parseInt(id));
    const moduleStrings = enableCallingForValue.map((id: string) => String(id));
    
    // Only proceed if the module selection actually changed
    const prevStrings = prevModuleSelection.current;
    const hasChanged = moduleStrings.length !== prevStrings.length || 
                      !moduleStrings.every((id: string) => prevStrings.includes(id));
    
    if (!hasChanged) return;
    
    prevModuleSelection.current = moduleStrings;
    
    // Update selected modules immediately
    setSelectedModules(moduleIds);
    
    // Initialize newly selected module fields in React Hook Form
    moduleIds.forEach((moduleId: number) => {
      const fieldKey = `module_${moduleId}_field`;
      const currentValue = getValues(fieldKey);
      if (!currentValue) {
        setValue(fieldKey, '');
      }
    });
    
    // Clear field values for deselected modules
    const currentSelected = selectedModules;
    const deselectedModules = currentSelected.filter(id => !moduleIds.includes(id));
    deselectedModules.forEach(moduleId => {
      // Clear from react-hook-form
      setValue(`module_${moduleId}_field`, '');
    });

    // Update labelMap selection status immediately
    setLabelMap(prev => {
      const newMap = new Map(prev);
      newMap.forEach((value, key) => {
        value.isSelected = moduleIds.includes(key);
      });
      return newMap;
    });
    
    // Fetch fields for newly selected modules that don't have fields loaded yet
    const modulesToLoad = moduleIds.filter((moduleId: number) => !labelMap.has(moduleId));
    for (const moduleId of modulesToLoad) {
      getNumericFields(moduleId);
    }
  }, [enableCallingForValue]);


  const onSubmitForm = async () => {
    handleSave();
  };

  const handleSave = async () => {
    // Trigger validation for all fields
    await trigger();

    // Get ALL current form values from react-hook-form
    const currentFormValues = getValues();
    
    // Validate form using react-hook-form values
    if (!validateForm(currentFormValues)) {
      if (onSaveError) {
        onSaveError('Please fill in all required fields correctly');
      }
      return;
    }

    setSaving(true);
    try {
      const projectId = getProjectId();
      if (!projectId) {
        throw new Error('Project ID not found');
      }

      // Prepare configuration field values with IDs for edit mode
      const configFieldSaveValue: ConfigFieldSaveValue[] = [];
      
      configSections.forEach(section => {
        section.integrationConfigField
          .filter(field => field.isActive === 1)
          .forEach(field => {
            const fieldId = field.id.toString();
            const fieldValue = currentFormValues[fieldId];
            
            
            // Always include the field, even if empty
            const existingId = isEdit ? getExistingFieldId(field.id) : null;
            configFieldSaveValue.push({
              id: existingId,
              fieldId: field.id,
              fieldValue: typeof fieldValue === 'string' ? fieldValue : '' // Use empty string if no value or not a string
            });

          });
      });
      

      // Prepare module configuration with proper ID handling for edit mode
      const appConfigModule: AppConfigModule[] = [];

      if (integrationType === 1 && selectedModules.length > 0) {
        // Handle module configurations for calling integrations
        
        // Process currently selected modules
        selectedModules.forEach(moduleId => {
          const fieldValue = currentFormValues[`module_${moduleId}_field`];
          const attributeId = parseInt(typeof fieldValue === 'string' ? fieldValue : '0');
          const existingId = getExistingIdByModuleType(moduleId);
          
          appConfigModule.push({
            id: existingId, // Keep existing ID for updates
            isActive: 1,
            moduleId: moduleId,
            attributeId: attributeId
          });
        });
        
        // Handle deselected modules in edit mode (mark as inactive)
        if (isEdit && existingConfig) {
          previousModules.forEach(moduleId => {
            if (!selectedModules.includes(moduleId)) {
              const existingModule = existingConfig.appConfigModule.find(m => m.moduleId === moduleId);
              if (existingModule) {
                appConfigModule.push({
                  id: existingModule.id,
                  isActive: 0, // Mark as inactive
                  moduleId: moduleId,
                  attributeId: existingModule.attributeId
                });
              }
            }
          });
        }
      } else {
        // For non-calling integrations or when no modules selected
        if (isEdit && existingConfig && existingConfig.appConfigModule.length > 0) {
          // Preserve existing module configuration
          appConfigModule.push(...existingConfig.appConfigModule);
        } else {
          // Default configuration
          appConfigModule.push({
            id: null,
            isActive: 1,
            moduleId: 0,
            attributeId: 0
          });
        }
      }

      const requestData: SaveConfigurationRequest = {
        flagId: isEdit ? 1 : 0, // 0 for add, 1 for edit
        appId: appId,
        projectId: projectId,
        integrationType: integrationType,
        moduleType: selectedModules.length > 0 ? selectedModules : [0],
        appConfigModule: appConfigModule,
        configFieldSaveValue: configFieldSaveValue
      };


      // await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      await integrationsService.saveConfiguration(requestData);
      
      if (onSaveSuccess) {
        onSaveSuccess(isEdit ? 'Configuration updated successfully' : 'Configuration saved successfully');
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving configuration:', error);
      if (onSaveError) {
        onSaveError('Failed to save configuration. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: IntegrationConfigField) => {
    const fieldId = field.id.toString();

    if (field.fieldType === 6) {
      // Text input using common component
      return (
        <div key={field.id} className="mb-4">
          <div className="flex items-start">
            <label className="w-2/5 pt-2 text-sm text-gray-700">
              {field.fieldName}
              {field.isMandatory === 1 && <span className="text-[#F64E60]">*</span>}
            </label>
            <div className="w-3/5">
              <TextInput
                name={fieldId}
                control={control}
                placeholder={`Enter ${field.fieldName}`}
                maxLength={200}
                showCharacterCount={false}
                pattern={/.*/}  // Allow any pattern
                disabled={false}
                maxWidth="w-full"
                validationRules={{
                  required: field.isMandatory === 1 ? `${field.fieldName} is required` : false
                }}
              />
            </div>
          </div>
        </div>
      );
    } else if (field.fieldType === 1 || field.fieldType === 2) {
      // Dropdown using common Select component
      const selectOptions = field.lookupValues
        .filter(option => option.isActive === 1)
        .map(option => ({
          value: option.id.toString(),
          label: option.lookupValue
        }));

      return (
        <div key={field.id} className="mb-4">
          <div className="flex items-start">
            <label className="w-2/5 pt-2 text-sm text-gray-700">
              {field.fieldName}
              {field.isMandatory === 1 && <span className="text-[#F64E60]">*</span>}
            </label>
            <div className="w-3/5">
              <Select
                name={fieldId}
                control={control}
                options={selectOptions}
                placeholder={`Select ${field.fieldName}`}
                disabled={false}
                maxWidth="w-full"
                validationRules={{
                  required: field.isMandatory === 1 ? `${field.fieldName} is required` : false
                }}
              />
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderModuleSelection = () => {
    return (
      <div className="mb-6">
        {/* Enable Calling For multi-select dropdown */}
        <div className="mb-4">
          <div className="flex items-start">
            <label className="w-2/5 pt-2 text-sm text-gray-700">
              Enable Calling For
              <span className="text-[#F64E60]">*</span>
            </label>
            <div className="w-3/5">
              <MultiSelect
                name="enableCallingFor"
                control={control}
                options={moduleOptions.map(module => ({
                  value: module.id.toString(),
                  label: module.name
                }))}
                placeholder="Select modules..."
                disabled={saving}
                maxWidth="w-full"
                validationRules={{
                  required: "Please select at least one module"
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Module-specific field selections */}
        {selectedModules.length > 0 && (
          <div className="space-y-4">
            {selectedModules.map(moduleId => {
              const moduleData = labelMap.get(moduleId);
              const fieldKey = `module_${moduleId}_field`;
              const fields = moduleData?.options || [];
              const error = formErrors[fieldKey];
              
              return (
                <div key={moduleId} className="mb-4">
                  <div className="flex items-start">
                    <label className="w-2/5 pt-2 text-sm text-gray-700">
                      {getEntityName(moduleId)} Field
                      <span className="text-[#F64E60]">*</span>
                    </label>
                    <div className="w-3/5 relative">
                      {
                        <Select
                          name={fieldKey}
                          control={control}
                          options={fields.map((field: any) => ({
                            value: field.attributeId.toString(),
                            label: field.attributeName
                          }))}
                          placeholder="Select field"
                          disabled={saving}
                          maxWidth="w-full"
                          validationRules={{
                            required: `Please select a field for ${moduleData?.name || getEntityName(moduleId)}`
                          }}
                        />
                      }
                      {error && (
                        <div className="text-xs text-red-500 mt-1">
                          {error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  const isFormDisabled = saving || dataLoading || loading;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] modalBackground p-4">
      <div className="bg-white rounded-lg shadow-xl w-1/2 mx-4 max-h-[90vh] overflow-hidden relative">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {isEdit ? 'Edit' : 'Configure'} {integrationName}
            </h2>
            
          </div>
        </div>

        {/* Content */}
        <div className="relative px-6 py-4 max-h-[60vh] overflow-y-auto">
          {/* Loading overlay - show only one loader at a time based on priority */}
          {(saving || (!loading && dataLoading)) && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-4 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium text-gray-700">
                    {saving ? 'Saving configuration...' : 'Loading data...'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading configuration fields...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Render all sections */}
              {configSections.map((section) => (
                <div key={section.sectionId}>
                  {/* Section header - only show if not "General" section and more than 1 section */}
                  {configSections.length > 1 && section.sectionId !== 1 && (
                    <div className="mb-4">
                      <h3 className="text-md font-semibold text-blue-500 pb-2 border-b border-gray-200">
                        {section.sectionName}
                      </h3>
                    </div>
                  )}
                  
                  {/* Module selection for section 1 calling integrations - render after the fields */}
                  {section.sectionId === 1 && integrationType === 1 && renderModuleSelection()}
                  
                  {/* Render fields for all sections */}
                  <div>
                    {section.integrationConfigField
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .filter(field => field.isActive === 1)
                      .map(renderField)}
                  </div>
      
                </div>
              ))}
              
              {configSections.length === 0 && !loading && (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0-4v2m0-6V4"></path>
                  </svg>
                  <p className="text-gray-500">No configuration fields available</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <div className="space-x-3">
            <button
              onClick={onClose}
              disabled={isFormDisabled}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit(onSubmitForm)}
              disabled={loading || isFormDisabled}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center inline-flex"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationConfigModal;
