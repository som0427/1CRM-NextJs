import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { MenuItem } from '../../types/menu';
import { useLoading } from '../../contexts/loading/LoadingContext';

// Define fallback menu items in case no menu is available
const fallbackMenuItems: MenuItem[] = [];

interface MainNavProps {
  disableNavigation?: boolean;
}

const MainNav: React.FC<MainNavProps> = ({ disableNavigation = false }) => {
  const router = useRouter();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null);
  const [localIsLoading, setLocalIsLoading] = useState<boolean>(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [menuLoadAttempted, setMenuLoadAttempted] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentPath = router.pathname;
  
  // Integration with global loading context
  const { addPendingAPI, removePendingAPI } = useLoading();
  
  // Add listener for storage events to detect when projectId changes
  useEffect(() => {
    // Function to check and update projectId from storage
    const checkProjectId = () => {
      const storedProjectId = localStorage.getItem('projectId') || sessionStorage.getItem('projectId');
      if (storedProjectId && storedProjectId !== projectId) {
        console.log('ProjectId changed or became available:', storedProjectId);
        setProjectId(storedProjectId);
      }
    };
    
    // Check immediately on component mount
    checkProjectId();
    
    // Set up listeners for storage changes
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'projectId') {
        console.log('ProjectId changed in storage:', event.newValue);
        setProjectId(event.newValue);
      }
    };
    
    // Add listeners
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [projectId]);

  // Toggle dropdown menu
  const toggleDropdown = useCallback((menuId: number): void => {
    if (disableNavigation) return;
    if (activeMenu === menuId) {
      setActiveMenu(null);
      setActiveSubmenu(null);
    } else {
      setActiveMenu(menuId);
      setActiveSubmenu(null);
    }
  }, [activeMenu, disableNavigation]);

  // Handle menu item click
  const handleMenuItemClick = useCallback((path: string): void => {
    if (disableNavigation) return;
    if (path && path !== '#') {
      router.push(path);
    }
    setActiveMenu(null);
    setActiveSubmenu(null);
  }, [router, disableNavigation]);

  // Track when menu loading was last attempted
  const [lastMenuAttemptTime, setLastMenuAttemptTime] = useState<number>(0);
  
  // Load menu items from localStorage or API when projectId changes or becomes available
  useEffect(() => {
    // Skip if we haven't detected a projectId yet
    if (!projectId) {
      console.log('No projectId available yet, using fallback or cached menu');
      
      // Check if we have cached menu data to show in the meantime
      try {
        const storedMenu = localStorage.getItem('userMenu');
        if (storedMenu) {
          const parsedMenu = JSON.parse(storedMenu);
          
          if (Array.isArray(parsedMenu) && parsedMenu.length > 0) {
            console.log('Loaded nav-ready menu from localStorage:', parsedMenu);
            setMenuItems(parsedMenu);
          } else {
            console.warn('Menu in localStorage is empty or invalid, using fallback. Parsed menu:', parsedMenu);
            setMenuItems(fallbackMenuItems);
          }
        } else {
          console.log('No cached menu found, using fallback menu items');
        }
      } catch (error) {
        console.error('Error parsing cached menu:', error);
      }
      
      // Only stop loading if menu is actually present
      if (menuItems && menuItems.length > 0) {
        setLocalIsLoading(false);
        return;
      }
      // Otherwise, keep loader until the next effect or menu is loaded
    }
    
    // We have a projectId, load the full menu data
    const loadMenuItems = async (): Promise<void> => {
      // Skip repeated load attempts if we already tried with this projectId
      if (menuLoadAttempted && menuItems.length > 0) {
        console.log('Menu already loaded with current projectId, skipping additional fetch');
        setLocalIsLoading(false);
        return;
      }
      
      // Mark menu loading as a pending API operation in global loading state
      const menuLoadingKey = `menu_load_${projectId}`;
      addPendingAPI(menuLoadingKey);
      
      console.log(`Loading menu items with projectId: ${projectId}`);
      setLocalIsLoading(true);
      setMenuLoadAttempted(true);
      
      try {
        // First check if menu is already in localStorage
        let parsedMenu = null;
        try {
          const storedMenu = localStorage.getItem('userMenu');
          if (storedMenu) {
            parsedMenu = JSON.parse(storedMenu);
            
            // Check for responseData in the parsed menu (matching the API response format)
            if (parsedMenu.responseData && Array.isArray(parsedMenu.responseData)) {
              setMenuItems(parsedMenu.responseData);
              setLocalIsLoading(false);
              // Continue with API fetch in background to ensure fresh data
            }
            
            // If menu is directly an array
            else if (Array.isArray(parsedMenu)) {
              setMenuItems(parsedMenu);
              setLocalIsLoading(false);
              // Continue with API fetch in background to ensure fresh data
            }
          }
        } catch (err) {
          console.error('Error parsing menu from localStorage:', err);
        }
        
        // Do not make API call, just use the data from localStorage/sessionStorage
        console.log('Using cached menu data - no API call since menu is loaded during login');
        
        // If we already have valid menu data from localStorage, just use it
        if (parsedMenu && parsedMenu.responseData && Array.isArray(parsedMenu.responseData) && parsedMenu.responseData.length > 0) {
          console.log('Using menu data from localStorage');
          setMenuItems(parsedMenu.responseData);
          setLocalIsLoading(false);
          return;
        } else if (parsedMenu && Array.isArray(parsedMenu) && parsedMenu.length > 0) {
          console.log('Using menu array from localStorage');
          setMenuItems(parsedMenu);
          setLocalIsLoading(false);
          return;
        }
        
        // If no valid menu data in localStorage, try sessionStorage
        const sessionMenu = sessionStorage.getItem('userMenu');
        if (sessionMenu) {
          try {
            const parsedSessionMenu = JSON.parse(sessionMenu);
            if (parsedSessionMenu.responseData && Array.isArray(parsedSessionMenu.responseData)) {
              console.log('Using menu data from sessionStorage');
              setMenuItems(parsedSessionMenu.responseData);
              setLocalIsLoading(false);
              return;
            } else if (Array.isArray(parsedSessionMenu)) {
              console.log('Using menu array from sessionStorage');
              setMenuItems(parsedSessionMenu);
              setLocalIsLoading(false);
              return;
            }
          } catch (err) {
            console.error('Error parsing menu from sessionStorage:', err);
          }
        }
        
        // If we get here, we couldn't find valid menu data in either localStorage or sessionStorage
        console.log('No valid menu data found in storage, using fallback');
        setMenuItems(fallbackMenuItems);
        setLocalIsLoading(false);
        
        console.log('**** MENU LOAD COMPLETE ****');
      } catch (error) {
        console.error('Error loading menu items:', error);
        setMenuItems(fallbackMenuItems);
      } finally {
        // Always stop loading, regardless of menu items
        setLocalIsLoading(false);
        
        // Remove the pending API operation from global loading state
        removePendingAPI(`menu_load_${projectId}`);
      }
    };
    
    loadMenuItems();
  }, [projectId]); // Re-run when projectId changes

  // Check if current path is in a menu item's children
  const isMenuItemActive = useCallback((menuItem: MenuItem): boolean => {
    // Check if current path matches this menu item's page
    if (menuItem.page && currentPath === menuItem.page) {
      return true;
    }
    
    // Check first level submenu
    if (menuItem.submenu && Array.isArray(menuItem.submenu)) {
      for (const subItem of menuItem.submenu) {
        // Check direct match with submenu item
        if (subItem.page && currentPath === subItem.page) {
          return true;
        }
        
        // Check third level submenu
        if (subItem.submenu && Array.isArray(subItem.submenu)) {
          for (const thirdLevelItem of subItem.submenu) {
            if (thirdLevelItem.page && currentPath === thirdLevelItem.page) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }, [currentPath]);

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
        setActiveSubmenu(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav 
      className="header-menu-container"
      ref={dropdownRef}
      style={{
        height: '100%',
        flex: 1,
        marginLeft: '40px',
        position: 'relative',
        opacity: disableNavigation ? 0.5 : 1,
        pointerEvents: disableNavigation ? 'none' : 'auto'
      }}
    >
      <ul style={{
        display: 'flex',
        listStyle: 'none',
        margin: 0,
        padding: 0,
        height: '100%',
        gap: '20px',
        justifyContent: 'flex-start'
      }}>
        {localIsLoading ? (
          <li style={{ color: '#5E6278', padding: '0 15px' }}>Loading menu...</li>
        ) : (
          menuItems.map((item, index) => {
            // Skip section headers (items with only section property)
            if (item.section && !item.title) {
              return null; // Don't render section headers
            }
            
            // Only skip completely empty items
            if (!item) return null;
            
            // Use title or name property for display
            const itemTitle = item.title || item.name || `Menu ${index + 1}`;
            
            const hasSubmenu = item.submenu && Array.isArray(item.submenu) && item.submenu.length > 0;
            const isActive = activeMenu === item.menuId;
            const isCurrentPathInSubmenu = isMenuItemActive(item);
            
            return (
              <li key={item.menuId || index} style={{ margin: '5px 0px', position: 'relative' }}>
                <div 
                  className="menu-dropdown"
                  onClick={() => hasSubmenu ? toggleDropdown(item.menuId || 0) : handleMenuItemClick(item.page || '#')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 15px',
                    height: '100%',
                    color: isActive || isCurrentPathInSubmenu ? '#3699FF' : '#5E6278',
                    fontSize: '14px',
                    fontWeight: isActive || isCurrentPathInSubmenu ? 500 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    backgroundColor: isCurrentPathInSubmenu ? '#4d59950f' : 'transparent',
                    borderRadius: isCurrentPathInSubmenu ? '6px' : '0px',
                  }}
                >
                  {itemTitle}
                </div>
                
                {hasSubmenu && isActive && (
                  <ul style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    listStyle: 'none',
                    margin: 0,
                    padding: '8px 0',
                    background: 'white',
                    border: '1px solid #E4E6EF',
                    borderRadius: '4px',
                    boxShadow: '0 10px 30px rgba(82, 63, 105, 0.15)',
                    minWidth: '180px',
                    zIndex: 1000,
                  }}>
                    {item.submenu?.map((subItem, subIndex) => {
                      const subHasSubmenu = subItem.submenu && Array.isArray(subItem.submenu) && subItem.submenu.length > 0;
                      const isSubActive = activeSubmenu === subItem.menuId;
                      
                      return (
                        <li key={subItem.menuId || subIndex} style={{ position: 'relative' }}>
                          <div 
                            onClick={() => subHasSubmenu 
                              ? setActiveSubmenu(isSubActive ? null : subItem.menuId || 0) 
                              : handleMenuItemClick(subItem.page || '#')}
                            style={{
                              padding: '8px 15px',
                              fontSize: '13px',
                              color: '#4F4F4F',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F3F6F9')}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            {subItem.title}
                            {subHasSubmenu && (
                              <svg 
                                style={{ 
                                  width: '10px', 
                                  height: '10px',
                                  marginLeft: '5px',
                                  transform: isSubActive ? 'rotate(90deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s ease'
                                }} 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="2" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                              >
                                <polyline points="9 6 15 12 9 18" />
                              </svg>
                            )}
                          </div>
                          
                          {/* Third level submenu */}
                          {subHasSubmenu && isSubActive && (
                            <ul style={{
                              position: 'absolute',
                              top: '0',
                              left: '100%',
                              listStyle: 'none',
                              margin: 0,
                              padding: '8px 0',
                              background: 'white',
                              border: '1px solid #E4E6EF',
                              borderRadius: '4px',
                              boxShadow: '0 10px 30px rgba(82, 63, 105, 0.15)',
                              minWidth: '180px',
                              zIndex: 1001,
                            }}>
                              {subItem.submenu?.map((thirdLevelItem, thirdIndex) => (
                                <li key={thirdLevelItem.menuId || thirdIndex}>
                                  <div 
                                    onClick={() => handleMenuItemClick(thirdLevelItem.page || '#')}
                                    style={{
                                      padding: '8px 15px',
                                      fontSize: '13px',
                                      color: '#4F4F4F',
                                      cursor: 'pointer',
                                      transition: 'all 0.3s ease',
                                    }}
                                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#F3F6F9')}
                                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                  >
                                    {thirdLevelItem.title}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })
        )}
      </ul>
    </nav>
  );
};

export default MainNav;
