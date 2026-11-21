import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useForm } from 'react-hook-form';
import Select from "react-select";
import { communityService } from '@/lib/services/communityService';
import { CommunitySettingsData, CommunitySettingsResponse, RoleItem, CommunityEnableFor } from '@/lib/models/community/community-settings.model';
import { getProjectId } from '@/lib/storage/sharedStorage';
import AddActionButton from '../common/buttons/action-button/AddActionButton';
import RemoveActionButton from '../common/buttons/action-button/RemoveActionButton';

export interface CommunitySettingsRef {
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
}

const CommunitySettings = forwardRef<CommunitySettingsRef, {}>((props, ref) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [communityData, setCommunityData] = useState<CommunitySettingsData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [enableForRoles, setEnableForRoles] = useState<CommunityEnableFor[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Toast notification states
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });

  // Unsaved changes dialog state
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    enableCommunity: false,
    communityName: '',
    selectedRole: null as any
  });

  // Permission states for new role
  const [newRolePermissions, setNewRolePermissions] = useState({
    addPost: false,
    deletePost: false,
    react: false
  });

  // Load form with react-hook-form
  const { register, handleSubmit, setValue, getValues, watch, reset, formState: { errors: formErrors, isDirty } } = useForm<{
    enableCommunity: boolean;
    communityName: string;
  }>({
    defaultValues: {
      enableCommunity: false,
      communityName: ''
    }
  });

  // Track enable for roles changes separately
  const [enableForChanged, setEnableForChanged] = useState(false);
  
  // Combined unsaved changes detection - only after data is loaded
  useEffect(() => {
    if (dataLoaded) {
      console.log('Change detection:', { isDirty, enableForChanged, dataLoaded });
      setHasUnsavedChanges(isDirty || enableForChanged);
    }
  }, [isDirty, enableForChanged, dataLoaded]);

  // Manual change tracking for form fields
  const handleFormChange = () => {
    if (dataLoaded) {
      setHasUnsavedChanges(true);
    }
  };

  // Watch the enableCommunity field to show/hide conditional fields
  const enableCommunity = watch('enableCommunity');
  
  // Toast notification helper
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  // Fetch community settings and roles on component mount
  useEffect(() => {
    fetchCommunitySettings();
    fetchRoles();
  }, []);

  // Fetch roles for the dropdown
  const fetchRoles = async () => {
    try {
      const projectId = getProjectId();
      const response = await communityService.getRoles(projectId);
      
      if (response.statusCode === 200) {
        setRoles(response.responseData || []);
      } else {
        console.error('Failed to fetch roles:', response.message);
        showToast('Failed to load roles', 'error');
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      showToast('Error loading roles', 'error');
    }
  };

  // Fetch community settings
  const fetchCommunitySettings = async () => {
    setLoading(true);
    try {
      const projectId = getProjectId();
      console.log('Fetching community settings for project:', projectId);
      const response = await communityService.getCommunitySettings(projectId);
      console.log('Community settings response:', response);
      
      if (response.statusCode === 200) {
        const data = response.responseData;
        console.log('Community settings data:', data);
        setCommunityData(data);
        
        // Set form values and reset to establish baseline for isDirty
        const formValues = {
          enableCommunity: data?.enableCommunity === 1,
          communityName: data?.communityName || ''
        };
        console.log('Setting form values:', formValues);
        reset(formValues);
        
        // Set enable for roles - ensure at least one empty row if none exist
        const enableForData = data?.enableFor || [];
        if (enableForData.length === 0) {
          enableForData.push({
            roleId: 0, // Empty role, to be selected
            addPost: false,
            deletePost: false,
            react: false
          });
        }
        console.log('Setting enable for roles:', enableForData);
        setEnableForRoles(enableForData);
        
        setFormData({
          enableCommunity: data?.enableCommunity === 1,
          communityName: data?.communityName || '',
          selectedRole: null
        });
        
        setDataLoaded(true);
        console.log('Community settings loaded successfully');
      } else {
        console.error('Failed to fetch community settings:', response.message);
        showToast('Failed to load community settings', 'error');
      }
    } catch (error) {
      console.error('Error fetching community settings:', error);
      showToast('Error loading community settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add new empty role row
  const addNewRoleRow = () => {
    // Check if we can add more rows (max = total roles available)
    if (enableForRoles.length >= roles.length) {
      showToast('Maximum roles reached', 'error');
      return;
    }
    
    const newRole: CommunityEnableFor = {
      roleId: 0, // Empty role, to be selected
      addPost: false,
      deletePost: false,
      react: false
    };
    
    setEnableForRoles(prev => [...prev, newRole]);
    setEnableForChanged(true);
  };

  // Remove role from enable for list
  const removeRoleFromEnableFor = (roleId: number) => {
    setEnableForRoles(prev => prev.filter(role => role.roleId !== roleId));
    setEnableForChanged(true);
  };

  // Update role permissions
  const updateRolePermission = (roleId: number, permission: 'addPost' | 'deletePost' | 'react', value: boolean) => {
    setEnableForRoles(prev => prev.map(role => 
      role.roleId === roleId 
        ? { ...role, [permission]: value ? 1 : 0 }
        : role
    ));
    setEnableForChanged(true);
  };

  // Get role name by ID
  const getRoleName = (roleId: number) => {
    const role = roles.find(r => r.roleId === roleId);
    return role ? role.roleName : 'Unknown Role';
  };

  // Save settings
  const saveSettings = async (data: any) => {
    setLoading(true);
    try {
      const projectId = getProjectId();
      
      // Filter out empty roles (roleId = 0) and format permissions as booleans
      const validRoles = enableForRoles
        .filter(role => role.roleId && role.roleId !== 0)
        .map(role => ({
          roleId: role.roleId,
          addPost: Boolean(role.addPost),
          deletePost: Boolean(role.deletePost),
          react: Boolean(role.react)
        }));
      
      const updateData = {
        enableCommunity: data.enableCommunity,
        communityName: data.communityName,
        enableFor: validRoles
      };
      
      console.log('Saving community settings:', updateData);
      const response = await communityService.updateCommunitySettings(projectId, updateData);
      
      if (response.statusCode === 200) {
        showToast('Community settings saved successfully', 'success');
        setHasUnsavedChanges(false);
        setEnableForChanged(false);
        // Refresh data
        await fetchCommunitySettings();
      } else {
        showToast(response.message || 'Failed to save community settings', 'error');
      }
    } catch (error) {
      console.error('Error saving community settings:', error);
      showToast('Error saving community settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel - directly reset form without dialog
  const handleCancel = () => {
    resetToOriginal();
  };

  // Reset form to original values
  const resetToOriginal = () => {
    if (communityData) {
      const formValues = {
        enableCommunity: communityData.enableCommunity === 1,
        communityName: communityData.communityName || ''
      };
      reset(formValues);
      setEnableForRoles(communityData.enableFor || []);
      setFormData({
        enableCommunity: communityData.enableCommunity === 1,
        communityName: communityData.communityName || '',
        selectedRole: null
      });
      setHasUnsavedChanges(false);
      setEnableForChanged(false);
    }
  };

  const handleSave = handleSubmit(saveSettings);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    handleSave: handleSave,
    handleCancel: handleCancel,
    isLoading: loading,
    hasUnsavedChanges: hasUnsavedChanges
  }));

  // Role options for dropdown
  const roleOptions = roles
    .filter(role => !enableForRoles.some(enableRole => enableRole.roleId === role.roleId))
    .map(role => ({
      value: role.roleId,
      label: role.roleName
    }));

  return (
    <>
      {/* Full Page Loader */}
      {loading && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl p-8 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="text-gray-700 font-medium">Loading...</p>
          </div>
        </div>
      )}
      
      <div className="space-y-8">
        {/* Enable Community */}
        <div className="flex items-start">
          <div className="w-1/4 flex-shrink-0">
            <label className="text-sm font-medium text-gray-700">
              Enable Community
            </label>
          </div>
          <div className="w-3/4 pl-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                {...register('enableCommunity', {
                  onChange: handleFormChange
                })}
                disabled={loading}
                className="hidden peer"
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
        </div>

        {/* Community Name */}
        <div className="flex items-start">
          <div className="w-1/4 flex-shrink-0">
            <label className="text-sm font-medium text-gray-700">
              Community Name
            </label>
          </div>
          <div className="w-3/4 pl-4">
            <div className="relative">
              <input
                type="text"
                {...register('communityName', {
                  onChange: handleFormChange
                })}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter community name"
                maxLength={100}
              />
              <div className="absolute right-3 top-2 text-xs text-gray-400">
                {watch('communityName')?.length || 0}/100
              </div>
            </div>
            {formErrors.communityName && (
              <p className="text-red-500 text-xs mt-1">{formErrors.communityName.message}</p>
            )}
          </div>
        </div>

        {/* Enable For */}
        <div className="flex items-start">
          <div className="w-1/4 flex-shrink-0">
            <label className="text-sm font-medium text-gray-700">
              Enable For
            </label>
          </div>
          <div className="w-3/4 pl-4">
            <div className="space-y-3">
              {/* Render each role row */}
              {enableForRoles.map((roleData, index) => (
                <div key={index} className="flex items-center gap-4">
                  {/* Role Selection Dropdown */}
                  <div className="w-48">
                    <Select
                      value={roleData.roleId && roleData.roleId !== 0 ? 
                        { value: roleData.roleId, label: getRoleName(roleData.roleId) } : null}
                      onChange={(selectedOption) => {
                        if (selectedOption) {
                          // Check if role already exists in other rows
                          const existingRole = enableForRoles.find((role, idx) => 
                            idx !== index && role.roleId === selectedOption.value
                          );
                          if (existingRole) {
                            showToast('Role already added', 'error');
                            return;
                          }
                          
                          const newRoles = [...enableForRoles];
                          newRoles[index] = {
                            ...newRoles[index],
                            roleId: selectedOption.value
                          };
                          setEnableForRoles(newRoles);
                          setEnableForChanged(true);
                        }
                      }}
                      options={roles
                        .filter(role => !enableForRoles.some((enableRole, idx) => 
                          idx !== index && enableRole.roleId === role.roleId
                        ))
                        .map(role => ({
                          value: role.roleId,
                          label: role.roleName
                        }))}
                      placeholder="Select From List"
                      isDisabled={loading}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      styles={{
                        control: (provided) => ({
                          ...provided,
                          minHeight: '38px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          boxShadow: 'none',
                          '&:hover': {
                            borderColor: '#9ca3af'
                          }
                        })
                      }}
                    />
                  </div>

                  {/* Permission Checkboxes */}
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(roleData.addPost)}
                      onChange={(e) => {
                        const newRoles = [...enableForRoles];
                        newRoles[index] = {
                          ...newRoles[index],
                          addPost: e.target.checked
                        };
                        setEnableForRoles(newRoles);
                        setEnableForChanged(true);
                      }}
                      className="hidden peer"
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
                    <span className="ml-2 text-sm text-gray-700">Add Post</span>
                  </label>
                  
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(roleData.deletePost)}
                      onChange={(e) => {
                        const newRoles = [...enableForRoles];
                        newRoles[index] = {
                          ...newRoles[index],
                          deletePost: e.target.checked
                        };
                        setEnableForRoles(newRoles);
                        setEnableForChanged(true);
                      }}
                      className="hidden peer"
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
                    <span className="ml-2 text-sm text-gray-700">Delete Post</span>
                  </label>
                  
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(roleData.react)}
                      onChange={(e) => {
                        const newRoles = [...enableForRoles];
                        newRoles[index] = {
                          ...newRoles[index],
                          react: e.target.checked
                        };
                        setEnableForRoles(newRoles);
                        setEnableForChanged(true);
                      }}
                      className="hidden peer"
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
                    <span className="ml-2 text-sm text-gray-700">React</span>
                  </label>

                  {/* Action Buttons Container with 12px gap */}
                  <div className="flex items-center gap-1 ml-2">
                    {/* Remove Role Button - Only show if more than one role */}
                    {enableForRoles.length > 1 && (
                      <RemoveActionButton
                        id={index}
                        onRemove={(id) => {
                          const newRoles = enableForRoles.filter((_, idx) => idx !== id);
                          setEnableForRoles(newRoles);
                          setEnableForChanged(true);
                        }}
                        disabled={loading}
                        className="!w-7 !h-7"
                      />
                    )}
                    
                    {/* Add Role Button - Only show on last row and if we can add more */}
                    {index === enableForRoles.length - 1 && enableForRoles.length < roles.length && (
                      <AddActionButton
                        onAdd={addNewRoleRow}
                        disabled={loading}
                        className="!w-7 !h-7"
                      />
                    )}
                  </div>
                </div>
              ))}

              {/* Show initial add button if no roles */}
              {enableForRoles.length === 0 && (
                <div className="flex items-center gap-4">
                  <div className="w-48">
                    <div className="h-10 border border-gray-300 rounded-md bg-gray-50 flex items-center px-3 text-gray-500 text-sm">
                      Select From List
                    </div>
                  </div>
                  
                  <label className="flex items-center opacity-50 cursor-not-allowed">
                    <input
                      type="checkbox"
                      disabled
                      className="hidden peer"
                    />
                    <div
                      className="w-5 h-5 rounded border border-gray-400 flex items-center justify-center transition-colors bg-gray-100"
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
                    <span className="ml-2 text-sm text-gray-700">Add Post</span>
                  </label>
                  
                  <label className="flex items-center opacity-50 cursor-not-allowed">
                    <input
                      type="checkbox"
                      disabled
                      className="hidden peer"
                    />
                    <div
                      className="w-5 h-5 rounded border border-gray-400 flex items-center justify-center transition-colors bg-gray-100"
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
                    <span className="ml-2 text-sm text-gray-700">Delete Post</span>
                  </label>
                  
                  <label className="flex items-center opacity-50 cursor-not-allowed">
                    <input
                      type="checkbox"
                      disabled
                      className="hidden peer"
                    />
                    <div
                      className="w-5 h-5 rounded border border-gray-400 flex items-center justify-center transition-colors bg-gray-100"
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
                    <span className="ml-2 text-sm text-gray-700">React</span>
                  </label>

                  <div className="w-8 h-8"></div>
                  
                </div>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Unsaved Changes</h3>
            <p className="text-gray-600 mb-6">
              You have unsaved changes. Are you sure you want to discard them?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowUnsavedDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Keep Editing
              </button>
              <button
                onClick={() => {
                  setShowUnsavedDialog(false);
                  resetToOriginal();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
});

CommunitySettings.displayName = 'CommunitySettings';

export default CommunitySettings;
