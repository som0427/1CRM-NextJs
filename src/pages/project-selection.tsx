import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../lib/auth';
import Footer from '../components/layout/Footer';

const ProjectSelection: NextPage = () => {
  const router = useRouter();
  const { mode } = router.query;
  const { getUserMenu } = useAuth();
  
  const [userDetail, setUserDetail] = useState<any>(null);
  const [projectList, setProjectList] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<number>(0);
  const [defaultProject, setDefaultProject] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [formView, setFormView] = useState<boolean>(false);

  // Fetch user details from localStorage (set during login)
  useEffect(() => {
    const userDataStr = localStorage.getItem('userForProjectSelection');
    if (!userDataStr) {
      // No user data found, redirect to login
      router.push('/auth/login');
      return;
    }

    try {
      const userData = JSON.parse(userDataStr);
      setUserDetail(userData);
      
      // Initialize the project list
      if (userData.userProject && userData.userProject.length > 0) {
        setProjectList(userData.userProject);
        
        // If user has a default project, pre-select it
        if (userData.defaultProjectId && userData.defaultProjectId > 0) {
          setSelectedProject(userData.defaultProjectId);
          setDefaultProject(true);
        } else if (userData.userProject.length === 1) {
          // If only one project, select it
          setSelectedProject(userData.userProject[0].project.projectId);
        }
        
        // Show form view if multiple projects and no default, or if switching projects
        if ((userData.userProject.length > 1 && 
            (!userData.defaultProjectId || userData.defaultProjectId === 0)) || 
            mode === 'switch') {
          setFormView(true);
        } else {
          // Proceed with the default or only project
          handleProceed(userData, userData.defaultProjectId || userData.userProject[0].project.projectId);
        }
      } else {
        setError('No projects found for user');
      }
    } catch (err) {
      console.error('Error parsing user data:', err);
      setError('Error loading user data');
    }
  }, [router, mode]);

  // Handle project selection change
  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const projectId = parseInt(e.target.value, 10);
    setSelectedProject(projectId);
    
    // If this is the default project, check the default checkbox
    if (userDetail?.defaultProjectId === projectId) {
      setDefaultProject(true);
    } else {
      setDefaultProject(false);
    }
  };

  // Handle default project checkbox change
  const handleDefaultChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDefaultProject(e.target.checked);
  };

  // Handle form submission
  const handleProceed = async (user = userDetail, projectId = selectedProject) => {
    if (!user || !projectId) {
      setError('Invalid user or project selection');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Update user's selected project
      const updatedUser = { ...user, selectedProjectId: projectId };
      
      // Update default project if checked
      if (defaultProject && projectId !== user.defaultProjectId) {
        try {
          // Call API to update default project
          await updateDefaultProject(projectId);
          updatedUser.defaultProjectId = projectId;
        } catch (err) {
          console.error('Error updating default project:', err);
          // Continue despite error
        }
      }

      // Store updated user data
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      localStorage.setItem('selectedProject', projectId.toString());
      
      // Fetch user menu for the selected project
      await fetchUserMenu(updatedUser, projectId);
      
    } catch (err) {
      console.error('Error in project selection:', err);
      setError('Error selecting project');
      setLoading(false);
    }
  };

  // Update default project
  const updateDefaultProject = async (projectId: number) => {
    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (!authToken) {
        throw new Error('Authentication token not found');
      }
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      const response = await fetch(`${API_URL}/api/user/updateDefaultProject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update default project: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating default project:', error);
      throw error;
    }
  };

  // Fetch user menu for selected project
  const fetchUserMenu = async (user: any, projectId: number) => {
    try {
      // Get user menu data
      const menuData = await getUserMenu(projectId);
      
      // Additional API calls similar to Angular implementation
      await Promise.all([
        fetchAppIntegrationDetails(projectId),
        fetchSupportSettings(projectId),
        fetchLocalization(projectId)
      ]);
      
      // Process menu data if needed
      const processedMenu = processMenuData(menuData);
      
      // Store processed menu data
      localStorage.setItem('userMenu', JSON.stringify({
        header: {
          self: {},
          items: processedMenu
        }
      }));
      
      // Redirect to dashboard or settings-assistant based on menu data
      const defaultPage = localStorage.getItem('defaultMenuFlag') === 'true' 
        ? '/settings-assistant' 
        : '/dashboard';
      
      window.location.href = window.location.origin + defaultPage;
    } catch (err) {
      console.error('Error fetching user menu:', err);
      setError('Error fetching menu data');
      setLoading(false);
    }
  };

  // Fetch app integration details
  const fetchAppIntegrationDetails = async (projectId: number) => {
    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      
      const response = await fetch(`${API_URL}/api/appIntegration/getConfiguredAndAvailableIntegrationAppDetails?projectId=${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const ivrIntegrationEnabled = data.responseData?.configuredApp?.length > 0 ? true : false;
        localStorage.setItem('isAppIntegrationEnable', JSON.stringify(ivrIntegrationEnabled));
      } else {
        localStorage.setItem('isAppIntegrationEnable', 'null');
      }
    } catch (error) {
      console.error('Error fetching app integration details:', error);
      localStorage.setItem('isAppIntegrationEnable', 'null');
    }
  };

  // Fetch support settings
  const fetchSupportSettings = async (projectId: number) => {
    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      
      const response = await fetch(`${API_URL}/api/support/getSupportSetting?projectId=${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.statusCode === 200) {
          const enableChatSupport = data.responseData ? data.responseData.enableChatSupport : '1';
          localStorage.setItem('enableChatSupport', enableChatSupport);
        }
      } else {
        localStorage.setItem('enableChatSupport', '1');
      }
    } catch (error) {
      console.error('Error fetching support settings:', error);
      localStorage.setItem('enableChatSupport', '1');
    }
  };

  // Fetch localization
  const fetchLocalization = async (projectId: number) => {
    try {
      const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const API_URL = process.env.NEXT_PUBLIC_API_URL;
      
      const response = await fetch(`${API_URL}/api/localization?projectId=${projectId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.responseData) {
          const systemLogo = data.responseData.systemLogo;
          localStorage.setItem('systemLogo', systemLogo ? systemLogo : '');
          
          const systemName = data.responseData.systemName;
          localStorage.setItem('systemName', systemName ? JSON.stringify(systemName) : '');
        }
      } else {
        localStorage.setItem('systemName', '');
      }
    } catch (error) {
      console.error('Error fetching localization:', error);
      localStorage.setItem('systemName', '');
    }
  };

  // Process menu data (similar to Angular's finalizeUserMenu and createPageHeading)
  const processMenuData = (menuData: any[]): any[] => {
    // First process menu alignment
    const processedMenu = menuData.map(item => {
      if (item.root === true) {
        item.alignment = 'left';
        item.toggle = 'click';
      }
      return item;
    });
    
    // Then create page heading data
    const menuObj: any = {};
    const pluralName: any = {};
    const singularName: any = {};
    let defaultMenuFlag = false;
    
    // Process menu items to create page headings (recursive function)
    const generatePageHeading = (menu: any) => {
      const pageName = menu.page?.replace(/\//g, '');
      if (pageName) {
        const jsonVal = {
          page: {
            title: menu.title,
            desc: '',
            singularName: menu.singularName,
            pruralName: menu.pruralName
          }
        };
        
        menuObj[pageName] = jsonVal;
        
        // Check for default menu
        if (pageName === 'settings-assistant') {
          defaultMenuFlag = true;
        }
        
        // Store plural and singular names for specific pages
        if (['customers', 'contacts', 'opportunities'].includes(pageName)) {
          pluralName[pageName] = menu.pruralName;
          singularName[pageName] = menu.singularName;
        }
      }
    };
    
    // Recursive function to process menu items at all levels
    const processMenuItems = (items: any[]) => {
      for (const item of items) {
        if (item.page && item.page !== '#') {
          generatePageHeading(item);
        }
        
        if (item.submenu && item.submenu.length > 0) {
          processMenuItems(item.submenu);
        }
      }
    };
    
    // Start processing from the top level
    processMenuItems(processedMenu);
    
    // Store page title and name data
    localStorage.setItem('pageTitle', JSON.stringify(menuObj));
    localStorage.setItem('pluralName', JSON.stringify(pluralName));
    localStorage.setItem('singularName', JSON.stringify(singularName));
    localStorage.setItem('defaultMenuFlag', JSON.stringify(defaultMenuFlag));
    
    return processedMenu;
  };

  return (
    <>
      <Head>
        <title>Project Selection | 1Channel CRM</title>
        <meta name="description" content="Select your project to continue" />
      </Head>
      
      <div style={{ 
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '1rem',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '500px',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          backgroundColor: 'white'
        }}>
          <h2 style={{ 
            textAlign: 'center',
            marginBottom: '1.5rem',
            color: '#212529'
          }}>
            Project Selection
          </h2>
          
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              backgroundColor: '#f8d7da',
              borderRadius: '0.25rem',
              color: '#721c24'
            }}>
              {error}
            </div>
          )}
          
          {formView && projectList.length > 0 ? (
            <form onSubmit={(e) => {
              e.preventDefault();
              handleProceed();
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="selectProject" style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 'bold',
                  color: '#212529'
                }}>
                  Select Project
                </label>
                <select
                  id="selectProject"
                  value={selectedProject}
                  onChange={handleProjectChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.25rem',
                    border: '1px solid #ced4da'
                  }}
                  required
                >
                  <option value="">-- Select Project --</option>
                  {projectList.map((proj) => (
                    <option 
                      key={proj.project.projectId}
                      value={proj.project.projectId}
                    >
                      {proj.project.projectName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={defaultProject}
                    onChange={handleDefaultChange}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span>Set as default project</span>
                </label>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => router.push('/auth/login')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedProject}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: loading || !selectedProject ? 'not-allowed' : 'pointer',
                    opacity: loading || !selectedProject ? 0.65 : 1
                  }}
                >
                  {loading ? 'Loading...' : 'Proceed'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p>Loading project data...</p>
            </div>
          )}
        </div>
      </div>
      
      <div style={{ 
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        width: '100%' 
      }}>
        <Footer />
      </div>
    </>
  );
};

export default ProjectSelection;
