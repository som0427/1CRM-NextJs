import React, { useState, useEffect, CSSProperties } from 'react';
import authService from '../../lib/services/authService';
import { useRouter } from 'next/router';
import fetchWithAuth from '@/lib/utils/fetchWithAuth';
import apiClient from '@/lib/services/apiClient';
import settingsService from '@/lib/services/settingsService';

// Modal styles as typed objects
interface ModalStyles {
  overlay: CSSProperties;
  modal: CSSProperties;
  modalHeader: CSSProperties;
  modalBody: CSSProperties;
  modalFooter: CSSProperties;
  formGroup: CSSProperties;
  formRow: CSSProperties;
  formLabel: CSSProperties;
  formInput: CSSProperties;
  select: CSSProperties;
  checkbox: CSSProperties;
  errorText: CSSProperties;
  mandatoryMarker: CSSProperties;
  button: CSSProperties;
  secondaryButton: CSSProperties;
  primaryButton: CSSProperties;
  disabledButton: CSSProperties;
}

const modalStyles: ModalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1050,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '4px',
    maxWidth: '500px',
    width: '100%',
    padding: 0,
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
  },
  modalHeader: {
    padding: '1rem',
    borderBottom: '1px solid #e9ecef',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalBody: {
    padding: '1rem'
  },
  modalFooter: {
    padding: '1rem',
    borderTop: '1px solid #e9ecef',
    display: 'flex',
    justifyContent: 'flex-end'
  },
  formGroup: {
    marginBottom: '1rem'
  },
  formRow: {
    display: 'flex',
    flexWrap: 'wrap',
    marginBottom: '1rem'
  },
  formLabel: {
    width: '30%',
    paddingTop: '0.375rem'
  },
  formInput: {
    width: '70%'
  },
  select: {
    display: 'block',
    width: '100%',
    padding: '0.375rem 0.75rem',
    fontSize: '1rem',
    lineHeight: 1.5,
    color: '#495057',
    backgroundColor: '#fff',
    backgroundClip: 'padding-box',
    border: '1px solid #ced4da',
    borderRadius: '0.25rem',
    transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
  },
  checkbox: {
    marginRight: '0.5rem'
  },
  errorText: {
    color: '#dc3545',
    marginTop: '0.25rem',
    fontSize: '80%'
  },
  mandatoryMarker: {
    color: 'red',
    marginLeft: '2px'
  },
  button: {
    cursor: 'pointer',
    padding: '0.375rem 0.75rem',
    fontSize: '1rem',
    lineHeight: 1.5,
    borderRadius: '0.25rem',
    marginLeft: '0.5rem'
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: '1px solid #6c757d'
  },
  primaryButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: '1px solid #007bff'
  },
  disabledButton: {
    opacity: 0.65,
    cursor: 'not-allowed'
  }
};

interface ProjectSelectionModalProps {
  userDetail: any;
  selectionFlag: string;
  onClose: () => void;
}

const ProjectSelectionModal: React.FC<ProjectSelectionModalProps> = ({
  userDetail,
  selectionFlag,
  onClose
}) => {
  const router = useRouter();
  const [formView, setFormView] = useState<boolean>(false);
  const [projectList, setProjectList] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<number>(0);
  const [defaultProjSet, setDefaultProjSet] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [disabled, setDisabled] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Helper functions to get project data safely
  const getProjectId = (proj: any): number => {
    if (!proj) return 0;

    if (proj.project && typeof proj.project === 'object' && proj.project.projectId) {
      return Number(proj.project.projectId);
    } else if (proj.projectId) {
      return Number(proj.projectId);
    } else if (proj.id) {
      return Number(proj.id);
    }

    return 0;
  };

  const getProjectName = (proj: any): string => {
    if (!proj) return '';

    if (proj.project && typeof proj.project === 'object' && proj.project.projectName) {
      return proj.project.projectName;
    } else if (proj.projectName) {
      return proj.projectName;
    } else if (proj.name) {
      return proj.name;
    }

    return '';
  };

  useEffect(() => {
    if (!userDetail) return;
    
    // Handle async operations in a function to allow await
    const handleProjectSelection = async () => {
      try {
        // Handle both property names (userProjects or userProject)
        const userProj = userDetail.userProjects || userDetail.userProject || [];
        const projectArray = Array.isArray(userProj) ? userProj : [];

        // Store the projects for reference
        setProjectList(projectArray);

        // Always show form view for login, matching Angular implementation
        if (selectionFlag === 'Login') {
          // If user has multiple projects and no default, show selection form
          if (projectArray.length > 1 && (!userDetail.defaultProjectId || userDetail.defaultProjectId === 0)) {
            setFormView(true);

            // Pre-select default project if available
            if (userDetail.defaultProjectId) {
              setDefaultProjSet(true);
              setSelectedProject(userDetail.defaultProjectId);
            }
          } else {
            // Has only one project or has a default set - automatically proceed
            if (userDetail.defaultProjectId && userDetail.defaultProjectId > 0) {
              // Use the default project - CRITICAL: wait for menu to fully load before proceeding
              setDisabled(true); // Disable UI during menu loading
              
              // IMPORTANT: Wait for menu to load before navigation
              const success = await fetchUserMenu(userDetail);
              if (!success) {
                console.error('Menu fetch failed during auto-selection');
                setDisabled(false);
                setError('Failed to load menu data. Please try again.');
                return;
              }
              
              // Only close modal after successful menu load
              onClose();
              
              // Navigation happens here - ONLY after successful menu loading
              router.push('/settings-assistant');
            } else if (projectArray.length === 1) {
              // Only one project, use it - CRITICAL: wait for menu to fully load
              const singleProject = getProjectId(projectArray[0]);
              setSelectedProject(singleProject);
              userDetail.selectedProjectId = singleProject;
              
              // Menu loading is the critical path - defer navigation until completed
              const success = await fetchUserMenu(userDetail);
              if (!success) {
                console.error('Menu fetch failed for single project');
                setDisabled(false);
                setError('Failed to load menu data. Please try again.');
                return;
              }
              
              // Only close modal after successful menu load
              onClose();
              
              // Navigation happens here - ONLY after successful menu loading
              router.push('/settings-assistant');
            } else if (projectArray.length === 0) {
              // No projects - need to load system menu before navigation
              setDisabled(true); // Disable UI during menu loading
              
              // Even with no projects, we need to load the basic menu
              // We'll use 0 as the project ID to get system-level menu
              const success = await fetchUserMenu({ ...userDetail, selectedProjectId: 0 });
              if (!success) {
                console.error('Menu fetch failed for no-project scenario');
                setDisabled(false);
                setError('Failed to load menu data. Please try again.');
                return;
              }
              
              // Only close modal after successful menu load
              onClose();
              
              // Navigation happens here - ONLY after successful menu loading
              router.push('/settings-assistant');
            }
          }
        } else {
          // Switch project flow
          setFormView(true);

          if (userDetail.defaultProjectId === userDetail.selectedProjectId) {
            setDefaultProjSet(true);
            setSelectedProject(userDetail.defaultProjectId);
          } else {
            setDefaultProjSet(false);
            setSelectedProject(userDetail.selectedProjectId);
          }
        }
      } catch (error) {
        console.error('Error in project selection:', error);
        setError('An error occurred during project selection. Please try again.');
        setDisabled(false);
      }
    };
    
    // Execute the async function
    handleProjectSelection();
  }, [userDetail, selectionFlag, onClose, router]);

  const changeEntity = (value: number) => {
    if (value === 0) {
      setError('Please select a project');
    } else {
      setError('');
    }
  };

  const handleClose = () => {
    onClose();
  };

  const isControlHasError = (controlName: string, validationType: string): boolean => {
    if (controlName === 'selectProject' && validationType === 'required') {
      return selectedProject === 0;
    }
    return false;
  };

  const isDisabled = (): boolean => {
    return selectedProject === 0;
  };

  const Proceed = async () => {
    if (selectedProject === 0) {
      setError('Please select a project');
      return;
    }

    try {
      // Disable UI to prevent multiple clicks
      setDisabled(true);
      setError('');
      
      // Find the selected project
      const selectedProj = projectList.find(p => getProjectId(p) === selectedProject);

      if (selectedProj) {
        localStorage.setItem('selectedProject', JSON.stringify(selectedProj));
        
        // Update default project if needed
        if (defaultProjSet) {
          userDetail.defaultProjectId = selectedProject;
        }
        
        // Always set the selected project ID
        userDetail.selectedProjectId = selectedProject;

        // Critical step: get menu data - this must complete before navigation
        const menuSuccess = await fetchUserMenu(userDetail);
        
        if (!menuSuccess) {
          // If menu fetch failed, stay on page and show error
          console.error('Menu fetch unsuccessful');
          setError('Failed to load menu data. Please try again.');
          setDisabled(false);
          return;
        }
        
        // Menu load was successful, now we can safely navigate
        // Close modal first
        onClose();
        
        // Navigation happens here - ONLY after successful menu loading
        router.push('/settings-assistant');
      } else {
        console.error('Selected project not found in list');
        setError('Project selection error. Please try again.');
        setDisabled(false);
      }
    } catch (error) {
      console.error('Error during project selection process:', error);
      setError('An error occurred. Please try again.');
      setDisabled(false);
    }
  };

  // Function to check if menu data is already loaded in storage
  const checkExistingMenuData = () => {
    try {
      const storedMenu = localStorage.getItem('userMenu');
      if (!storedMenu) return false;
      
      const menuData = JSON.parse(storedMenu);
      return menuData && 
        ((Array.isArray(menuData) && menuData.length > 0) || 
         (menuData.responseData && Array.isArray(menuData.responseData) && menuData.responseData.length > 0));
    } catch {
      return false;
    }
  };

  /**
   * Function to fetch user menu - Critical for navigation
   * Navigation to settings-assistant ONLY happens if menu loads successfully
   * Otherwise user stays on auth/login page
   */
  const fetchUserMenu = async (user: any): Promise<boolean> => {
    let projectId: number;
    if (user.selectedProjectId) {
      projectId = user.selectedProjectId;
    } else if (selectedProject > 0) {
      projectId = selectedProject;
    } else {
      projectId = user.defaultProjectId;
    }

    try {
      // Log the start of the critical menu loading process
      
      // IMPORTANT: This is the key API call - must succeed before navigation
      const menuResponse = await authService.getUserMenu(projectId);
      
      // Validate the response is present
      if (!menuResponse) {
        console.error('ERROR: Menu API returned null or undefined');
        return false;
      }
      
      // Validate the menu response has content - handle different response formats
      const hasValidMenu = (() => {
        // Case 1: Direct array of menu items
        if (Array.isArray(menuResponse) && menuResponse.length > 0) {
          return true;
        }
        
        // Case 2: Object with responseData array
        if (typeof menuResponse === 'object' && menuResponse !== null) {
          const responseData = (menuResponse as any).responseData;
          if (Array.isArray(responseData) && responseData.length > 0) {
            return true;
          }
        }
        
        // No valid menu data found
        return false;
      })();
      
      if (!hasValidMenu) {
        console.error('ERROR: Menu API returned empty menu data');
        return false;
      }
      
      // Store menu data - critical for application function
      localStorage.setItem('userMenu', JSON.stringify(menuResponse));
      sessionStorage.setItem('userMenu', JSON.stringify(menuResponse));
      
      // Process the menu data if needed
      const processedMenu = finalizeUserMenu(menuResponse);
      
      // Validate processed menu
      if (!processedMenu) {
        console.error('ERROR: Failed to process menu data');
        return false;
      }
      
      // Start background API calls for other data in parallel
      // Don't await these calls - they should run in background
      fetchAppIntegration(projectId); 
      fetchSupportSettings(projectId);
      fetchLocalization(projectId);
      
      // MENU LOADED SUCCESSFULLY - but wait to make sure it's fully available
      
      // Return true to indicate successful menu loading
      // The caller will handle navigation after this
      return true;
    } catch (error) {
      console.error('CRITICAL ERROR in menu loading:', error);
      return false;
    }
  };

  // Define type for the integration API response
  interface IntegrationResponse {
    responseData: {
      configuredApp?: any[];
      [key: string]: any;
    };
    [key: string]: any;
  }

  const fetchAppIntegration = async (projectId: number) => {
    try {
      const url = `/setting/api/integration/getAvailableIntegrationAndConfiguredApp`;
      const data = await apiClient.get<IntegrationResponse>(url, { projectId });

      if (data.responseData) {
        localStorage.setItem('app_integration', JSON.stringify(data.responseData));
        sessionStorage.setItem('app_integration', JSON.stringify(data.responseData));
        const ivrIntegerationEnabled: boolean = data.responseData.configuredApp?.length > 0 ? true : false;
        localStorage.setItem('isAppIntegerationEnable', JSON.stringify(ivrIntegerationEnabled));
      }
    } catch (error) {
      localStorage.setItem('isAppIntegerationEnable', null);
      console.error('Error fetching app integration:', error);
    }
  };

  const fetchSupportSettings = async (projectId: number) => {
    try {
      const data = await settingsService.getSupportSettingDetails(projectId);
      if (data.responseData) {
          const settings = {
            twilioEnable: data.responseData.twilioEnable || false,
            emailPrefix: data.responseData.emailPrefix || '',
            emailSuffix: data.responseData.emailSuffix || '',
            emailDomain: data.responseData.emailDomain || ''
          };

          localStorage.setItem('supportSettings', JSON.stringify(settings));
        }
    } catch (error) {
      console.error('Error fetching support settings:', error);
    }
  };

  const fetchLocalization = async (projectId: number) => {
    try {
      
      const response = await settingsService.getLocalization(projectId);``

      if (response.statusCode>=200 && response.statusCode<300) {
        
        if (response.responseData) {
          localStorage.setItem('localization_settings', JSON.stringify(response.responseData));
          sessionStorage.setItem('localization_settings', JSON.stringify(response.responseData));
        } else {
          // Set default if API doesn't return anything
          const defaultSettings = {
            "dateFormat": "MM/dd/yyyy",
            "timeFormat": "12"
          };
          localStorage.setItem('localization_settings', JSON.stringify(defaultSettings));
          sessionStorage.setItem('localization_settings', JSON.stringify(defaultSettings));
        }
      }
    } catch (error) {
      console.error('Error fetching localization settings:', error);
      // Set default on error
      const defaultSettings = {
        "dateFormat": "MM/dd/yyyy",
        "timeFormat": "12"
      };
      localStorage.setItem('localization_settings', JSON.stringify(defaultSettings));
      sessionStorage.setItem('localization_settings', JSON.stringify(defaultSettings));
    }
  };

  const finalizeUserMenu = (menuData: any) => {
    // Menu data might be in different formats
    let processedMenuData = [];
    
    if (Array.isArray(menuData)) {
      processedMenuData = menuData;
    } else if (menuData.responseData && Array.isArray(menuData.responseData)) {
      processedMenuData = menuData.responseData;
    }
    
    // Create page heading data
    const menuObj: any = {}, pluralName: any = {}, singularName: any = {};
    
    processedMenuData.forEach((menu: any) => {
      createPageHeading(processedMenuData, menuObj, pluralName, singularName, true);
    });
    
    return processedMenuData;
  };

  const createPageHeading = (userMenu: any, menuObj: any, pluralName: any, singularName: any, defaultMenuFlag: boolean) => {
    if (!Array.isArray(userMenu) || userMenu.length === 0) {
      return;
    }
    
    for (const menu of userMenu) {
      // Process menu item
      if (menu.childMenu && menu.childMenu.length > 0) {
        generatePageHeading(menu, menuObj, pluralName, singularName, defaultMenuFlag);
      } else if (menu.url) {
        // Process leaf menu item
        const pageName = menu.url.split('/').pop();
        if (pageName) {
          menuObj[pageName] = menu.title;
        }
        
        if (pageName === 'customers' || pageName === 'contacts' || pageName === 'opportunities') {
          pluralName[pageName] = menu.pruralName || menu.pluralName || '';
          singularName[pageName] = menu.singularName || '';
        }
      }
    }
  };

  const generatePageHeading = (menu: any, menuObj: any, pluralName: any, singularName: any, defaultMenuFlag: boolean) => {
    if (!menu || !menu.childMenu) {
      return;
    }
    
    for (const childMenu of menu.childMenu) {
      if (childMenu.childMenu && childMenu.childMenu.length > 0) {
        generatePageHeading(childMenu, menuObj, pluralName, singularName, defaultMenuFlag);
      } else if (childMenu.url) {
        // Process leaf menu item
        const pageName = childMenu.url.split('/').pop();
        if (pageName) {
          menuObj[pageName] = childMenu.title;
        }
        
        if (pageName === 'customers' || pageName === 'contacts' || pageName === 'opportunities') {
          pluralName[pageName] = childMenu.pruralName || childMenu.pluralName || '';
          singularName[pageName] = childMenu.singularName || '';
        }
      }
    }
  };

  // Filter projects based on search input
  const filteredProjects = projectList.filter(proj => {
    if (!proj) return false;
    
    // Handle different data structures
    // Some responses have proj.project.projectName, others have proj.projectName directly
    let projectName = '';
    
    if (proj.project && typeof proj.project === 'object') {
      projectName = proj.project.projectName || '';
    } else if (proj.projectName) {
      projectName = proj.projectName;
    } else if (typeof proj === 'object' && 'name' in proj) {
      projectName = proj.name || '';
    }
    
    return projectName.toLowerCase().includes(searchFilter.toLowerCase());
  });
  
  if (!formView) {
    return null;
  }

  return (
    <div style={{...modalStyles.overlay}}>
      <div style={{...modalStyles.modal}}>
        <div style={{...modalStyles.modalHeader}}>
          <h4>Select System</h4>
        </div>
        <div style={{...modalStyles.modalBody}}>
          <div>
            <p>Dear {userDetail.firstName},</p>
            <p>
              You are registered as a user on multiple systems. 
              Please select the one you want to access now. 
              You can also set a default to avoid selection every time you login. 
              You can change the system or reset the default from the navigation bar at any time.
            </p>
          </div>
          
          <div style={{...modalStyles.formGroup}}>
            <div style={{...modalStyles.formRow}}>
              <div style={{...modalStyles.formLabel}}>
                <label>
                  System Name
                  <span style={{...modalStyles.mandatoryMarker}}>*</span>
                </label>
              </div>
              <div style={{...modalStyles.formInput}}>
                {/* Search input */}
                <div style={{ marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    style={{
                      ...modalStyles.select,
                      marginBottom: '0.5rem'
                    }}
                  />
                </div>
                
                {/* Project select dropdown */}
                <select
                  value={selectedProject}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    setSelectedProject(value);
                    changeEntity(value);
                  }}
                  style={modalStyles.select}
                >
                  <option value={0}>-- Select System --</option>
                  {filteredProjects.map((proj) => (
                    <option 
                      key={getProjectId(proj)} 
                      value={getProjectId(proj)}
                    >
                      {getProjectName(proj)}
                    </option>
                  ))}
                </select>
                
                {isControlHasError('selectProject', 'required') && (
                  <div style={{...modalStyles.errorText}}>Please select system</div>
                )}
              </div>
            </div>
          </div>
          
          <div style={{...modalStyles.formGroup}}>
            <div style={{...modalStyles.formRow}}>
              <div style={{...modalStyles.formLabel}}>
                <label>
                  Set as Default
                  <span style={{...modalStyles.mandatoryMarker}}>*</span>
                </label>
              </div>
              <div style={{...modalStyles.formInput}}>
                <label>
                  <input
                    type="checkbox"
                    checked={defaultProjSet}
                    onChange={(e) => setDefaultProjSet(e.target.checked)}
                    style={{...modalStyles.checkbox}}
                  />
                  Yes
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div style={{...modalStyles.modalFooter}}>
          <div>
            {error && <div style={{...modalStyles.errorText}}>{error}</div>}
            {disabled && !error && <div style={{color: '#666'}}>Loading menu data, please wait...</div>}
          </div>
          <div>
            <button
              onClick={handleClose}
              disabled={disabled}
              style={{
                ...modalStyles.button,
                ...modalStyles.secondaryButton,
                ...(disabled ? modalStyles.disabledButton : {})
              }}
            >
              Cancel
            </button>
            <button
              onClick={Proceed}
              disabled={isDisabled() || disabled}
              style={{
                ...modalStyles.button,
                ...modalStyles.primaryButton,
                ...(isDisabled() || disabled ? modalStyles.disabledButton : {})
              }}
            >
              {disabled ? 'Loading...' : 'Proceed'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectSelectionModal;
