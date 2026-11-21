// Quick fix for the menu rendering issue:

// 1. Go to src/components/layout/MainNav.tsx
// 2. Replace the menu loading code with this direct approach:

/*
  useEffect(() => {
    const loadMenuItems = async (): Promise<void> => {
      try {
        setIsLoading(true);
        
        // Get auth token
        const authToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
        if (!authToken) {
          setMenuItems(fallbackMenuItems);
          setIsLoading(false);
          return;
        }
        
        // Direct API call using QA environment
        const apiUrl = 'https://endpoints-backend.api.qa.postgres.assistive.site/retailitynew/login/api/menu/assignedWebMenus';
        const projectId = localStorage.getItem('selectedProjectId') || sessionStorage.getItem('selectedProjectId');
        
        const fullUrl = `${apiUrl}${projectId ? '?projectId=' + projectId : ''}`;
        
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Use response directly without filtering
        const menuItems = data;
        
        console.log('MENU ITEMS:', JSON.stringify(menuItems).substring(0, 500));
        
        if (Array.isArray(menuItems)) {
          setMenuItems(menuItems);
        } else {
          setMenuItems(fallbackMenuItems);
        }
      } catch (error) {
        console.error('Failed to load menu items:', error);
        setMenuItems(fallbackMenuItems);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMenuItems();
  }, []);
*/
