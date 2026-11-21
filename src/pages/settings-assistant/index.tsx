import React, { useState, useEffect, useRef } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { FiChevronRight, FiCheck, FiUsers, FiShoppingBag, FiPhoneCall, FiTarget, FiPackage, FiSettings } from 'react-icons/fi';
import Layout from '../../components/layout/Layout';
import settingsService from '../../lib/services/settingsService';
import { SettingsMenuItem } from '../../lib/models/SettingsAssistant';
import { getUserData } from '../../lib/storage/sharedStorage';
import TailwindPageLayout from '@/components/layout/TailwindPageLayout';

// Helper function to map icon names to React Icons
const getIconComponent = (iconName: string | null) => {
  if (!iconName) return <FiSettings className="w-6 h-6 text-gray-400" />;
  
  switch (iconName.toLowerCase()) {
    case 'fa-user-cog':
      return <FiUsers className="w-6 h-6 text-gray-400" />;
    case 'fa-building':
      return <FiShoppingBag className="w-6 h-6 text-gray-400" />;
    case 'fa-address-book':
      return <FiPhoneCall className="w-6 h-6 text-gray-400" />;
    case 'fa-money-check':
      return <FiTarget className="w-6 h-6 text-gray-400" />;
    case 'fa-box-open':
      return <FiPackage className="w-6 h-6 text-gray-400" />;
    case 'fa-cogs':
      return <FiSettings className="w-6 h-6 text-gray-400" />;
    default:
      return <FiSettings className="w-6 h-6 text-gray-400" />;
  }
};

// Type for side nav items
interface SideNavItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  href: string;
  menuDescription: string;
  apiData: SettingsMenuItem;
}

const SettingsAssistant: NextPage = () => {
  // Get base path for assets
  const router = useRouter();
  const basePath = router.basePath;
  
  // State for animation and panel management
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [previousItem, setPreviousItem] = useState<string | null>(null);
  const [animating, setAnimating] = useState<boolean>(false);
  const [slideDirection, setSlideDirection] = useState<'left-to-right' | 'right-to-left'>('right-to-left');
  
  // Reference to the carousel component
  const carouselRef = useRef<any>(null);
  
  // State for API data
  const [menuItems, setMenuItems] = useState<SettingsMenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Extract fetchMenuData to make it re-usable
  const fetchMenuData = async () => {
    console.log('SettingsAssistant: fetchMenuData called');
    try {
      setLoading(true);
      console.log('SettingsAssistant: setting loading state to true');
      
      // Get project ID
      const userData = getUserData();
      console.log('SettingsAssistant: userData retrieved:', userData ? 'present' : 'null/undefined');
      
      // First check for the project ID in localStorage
      let projectId;
      if (typeof window !== 'undefined') {
        try {
          const selectedProject = localStorage.getItem('selectedProject');
          if (selectedProject) {
            console.log('SettingsAssistant: Found selectedProject in localStorage');
            projectId = JSON.parse(selectedProject);
            // The project object might store ID as id, projectId, or project_id
            console.log('SettingsAssistant: Extracted projectId from localStorage:', projectId);
          }
        } catch (e) {
          console.error('Error parsing selectedProject from localStorage:', e);
        }
      }
      
      // If not found, try to get project ID from other possible sources
      if (!projectId) {
        projectId = userData?.selectedProjectId || userData?.projectId;
        if (!projectId && userData?.currentUser) projectId = userData.currentUser.projectId;
        if (!projectId && userData?.userProjects?.[0]) projectId = userData.userProjects[0].id;
        
        // Try to get from selectedProject object in localStorage
        if (!projectId && typeof window !== 'undefined') {
          try {
            const selectedProject = localStorage.getItem('selectedProject');
            if (selectedProject) {
              const parsed = JSON.parse(selectedProject);
              projectId = parsed.id || parsed.projectId;
            }
          } catch (e) {
            console.error('Error parsing selected project:', e);
          }
        }
        
        // Last resort - scan localStorage for any project ID
        if (!projectId && typeof window !== 'undefined') {
          const projectKeys = Object.keys(localStorage).filter(key => 
            key.toLowerCase().includes('project'));
          
          for (const key of projectKeys) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '');
              if (data.id) { projectId = data.id; break; }
              if (data.projectId) { projectId = data.projectId; break; }
            } catch {}
          }
        }
      }
      
      console.log('SettingsAssistant: Final projectId resolved as:', projectId);
      
      if (!projectId) {
        console.log('SettingsAssistant: No project ID found, cannot proceed with API call');
        setError('No project ID found. Please select a project first.');
        setLoading(false);
        return;
      }
      
      // Use the settingsService to make the API call
      console.log('SettingsAssistant: Using settingsService to fetch data');
      const data = await settingsService.getSettingsAssistantData(projectId);
      console.log('SettingsAssistant: settingsService call complete, data received:', data ? `${data.length} items` : 'no data');
      
      // Update menu items with the fetched data
      console.log('Setting menu items with:', data);
      setMenuItems(data);
    } catch (err) {
      console.error('SettingsAssistant: Error fetching menu data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Call settingsService when component mounts
  useEffect(() => {
    console.log('SettingsAssistant: Component mounted, calling API');
    fetchMenuData();
    
    return () => {
      console.log('SettingsAssistant: Component unmounting');
    };
  }, []);

  // Convert API data to side nav items format
  const sideNavItems: SideNavItem[] = menuItems.map(item => ({
    id: item.menuName.toLowerCase().replace(/\s+/g, '-'),
    name: item.menuName,
    icon: getIconComponent(item.menuIcon),
    href: item.urlPath || `/settings/${item.menuName.toLowerCase().replace(/\s+/g, '-')}`,
    menuDescription: item.menuDescription,
    apiData: item // Store the original API data for reference
  }));
  
  // Handle setting the active item with enhanced carousel-like animation
  const handleItemClick = (id: string) => {
    if (id === activeItem) return;
    
    // Determine direction based on position in the sidebar
    const newItemIndex = sideNavItems.findIndex(item => item.id === id);
    const currentItemIndex = activeItem ? sideNavItems.findIndex(item => item.id === activeItem) : -1;
    
    // If moving down the list (increasing index) -> right to left
    // If moving up the list (decreasing index) -> left to right
    const direction = currentItemIndex === -1 || newItemIndex > currentItemIndex 
      ? 'right-to-left' 
      : 'left-to-right';
    
    // For continuous transitions without gaps
    if (activeItem) {
      // Prepare both panels for transition
      setPreviousItem(activeItem);
      setSlideDirection(direction);
      
      // First disable animation to position panels
      setAnimating(false);
      
      // Use requestAnimationFrame to ensure DOM updates before starting animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Now set new active item and start animation in the next frame
          setActiveItem(id);
          setAnimating(true);
          
          // After animation completes, clean up
          setTimeout(() => {
            setAnimating(false);
            setPreviousItem(null);
          }, 500); // Match the duration in the CSS transition
        });
      });
    } else {
      // First selection - simpler case
      setSlideDirection(direction);
      setActiveItem(id);
      setAnimating(true);
      setTimeout(() => {
        setAnimating(false);
      }, 500); // Match the duration in the CSS transition
    }
  };

  // Render content for an item
  const renderItemContent = (itemId: string) => {
    const menuItem = menuItems.find(item => 
      item.menuName.toLowerCase().replace(/\s+/g, '-') === itemId
    );

    if (!menuItem) return null;

    return (
      <div className="p-8">
        <h2 className="text-xl font-medium mb-6">{menuItem.menuName}</h2>
        {menuItem.childList.map((childItem, index) => (
          <div className="bg-blue-50 rounded-md mb-4 overflow-hidden" key={index}>
            <div className="flex items-center justify-between p-4">
              <div>
                <h3 className="font-medium text-gray-800">{childItem.menuName}</h3>
                <p className="text-sm text-gray-500">{childItem.menuDescription}</p>
              </div>
              <div className="flex items-center">
                {childItem.greenTick && (
                  <div className="bg-green-500 rounded-full p-1 mr-2">
                    <FiCheck className="h-4 w-4 text-white" />
                  </div>
                )}
                {childItem.urlPath ? (
                  <Link href={childItem.urlPath} className="flex items-center justify-center cursor-pointer">

                    <FiChevronRight className="h-5 w-5 text-blue-500" />

                  </Link>
                ) : (
                  <FiChevronRight className="h-5 w-5 text-blue-500" />
                )}
              </div>
            </div>
          </div>
        ))}
        {menuItem.childList.length === 0 && (
          <div className="text-gray-500 text-center py-8">
            No settings available for this category
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <Head>
        <title>Settings Assistant | 1Channel</title>
      </Head>
      
      <TailwindPageLayout
        header={
          <div className="flex flex-col space-y-4 bg-white py-2 rounded-lg">
            {/* Top row with title and primary buttons */}
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-800">Settings Assistant</h1>
              </div>
            </div>
          </div>
        }
      >
        <div className="flex flex-1">
          {/* Left sidebar */}
          <div className="w-80 bg-white border-r border-gray-200 px-8">
            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <nav className="py-4">
                <ul>
                  {sideNavItems.map((item) => (
                    <li key={item.id} className="mb-3">
                      <button
                        onClick={() => handleItemClick(item.id)}
                        className={`block w-full text-left px-4 py-4 hover:bg-gray-50 ${activeItem === item.id ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex items-center">
                          <div className="mr-3">{item.icon}</div>
                          <div>
                            <div className="text-gray-700 font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.menuDescription}</div>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 bg-white relative overflow-hidden">
            {/* Loading state */}
            {loading && (
              <div className="flex justify-center items-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            )}
            
            {/* Error state */}
            {error && !loading && (
              <div className="p-8 text-center">
                <div className="text-red-500 mb-4">Error loading settings data</div>
                <p className="text-gray-600">{error}</p>
              </div>
            )}
            
            {/* Welcome message - shown when no item is selected */}
            {!loading && !error && !activeItem && (
              <div className="px-8 py-6">
                <div className="max-w-4xl">
                  <p className="mb-4">Welcome to the configuration assistant. This assistant will help you configure and customize 1Channel according to your needs.</p>
                  
                  <p className="mb-4">Please use the options at the left to navigate to the appropriate option, and come back to this assistant when you are done. While this assistant is best used in the sequence of options defined - you can choose to do it in any order that you would like.</p>
                </div>
              </div>
            )}

            {/* Custom animation for sliding panels */}
            {!loading && !error && previousItem && (
              <div className={`absolute inset-0 transition-all duration-500 ease-in-out transform ${slideDirection === 'right-to-left' ? '-translate-x-full' : 'translate-x-full'}`}>
                {renderItemContent(previousItem)}
              </div>
            )}

            {/* Show the active panel content */}
            {!loading && !error && activeItem && (
              <div className={`absolute inset-0 transition-all duration-500 ease-in-out transform ${animating ? (slideDirection === 'right-to-left' ? 'translate-x-full' : '-translate-x-full') : 'translate-x-0'}`}>
                {renderItemContent(activeItem)}
              </div>
            )}
          </div>
        </div>
      </TailwindPageLayout>
    </Layout>
  );
};

export default SettingsAssistant;