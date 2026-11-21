import React, { useState, useRef, useEffect, useMemo, MutableRefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import environment from '../../../environment';
import styles from '@/styles/generalSettings.module.css';
import { getModuleSingularName } from '../../lib/storage/sharedStorage';

// Import tab components
import ProjectSettings, { ProjectSettingsRef } from '../../components/general-settings/project-settings';
import CustomerSettings, { CustomerSettingsRef } from '../../components/general-settings/customer-settings';
import ContactSettings, { ContactSettingsRef } from '../../components/general-settings/contact-settings';
import OpportunitySettings, { OpportunitySettingsRef } from '../../components/general-settings/opportunity-settings';
import SupportSettings, { SupportSettingsRef } from '../../components/general-settings/support-settings';
import ThemeSettings, { ThemeSettingsRef } from '../../components/general-settings/theme-settings';
import LoyaltySettings, { LoyaltySettingsRef } from '../../components/general-settings/loyalty-settings';
import { Button } from '@/components/ui/tailwind/Button';

const GeneralSettings: NextPage = () => {
  const [activeTab, setActiveTab] = useState('project');
  const [previousTab, setPreviousTab] = useState('project');
  const [direction, setDirection] = useState(0); // -1 for right to left, 1 for left to right
  const [tabNames, setTabNames] = useState({
    customer: 'Customer Settings',
    contact: 'Contact Settings',
    opportunity: 'Opportunity Settings'
  });
  
  // Unsaved changes detection
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  
  // Create refs for each settings component
  const projectSettingsRef = useRef<ProjectSettingsRef>(null);
  const customerSettingsRef = useRef<CustomerSettingsRef>(null);
  const contactSettingsRef = useRef<ContactSettingsRef>(null);
  const opportunitySettingsRef = useRef<OpportunitySettingsRef>(null);
  const supportSettingsRef = useRef<SupportSettingsRef>(null);
  const themeSettingsRef = useRef<ThemeSettingsRef>(null);
  const loyaltySettingsRef = useRef<LoyaltySettingsRef>(null);

  // State for conditional loyalty tab visibility based on project type
  const [showLoyaltyTab, setShowLoyaltyTab] = useState<boolean>(false);

  // Define the tab order to determine animation direction (dynamic based on loyalty tab visibility)
  const tabOrder = useMemo(() => {
    const baseTabs = ['project', 'customer', 'contact', 'opportunity', 'support', 'themes'];
    return showLoyaltyTab ? [...baseTabs, 'loyalty'] : baseTabs;
  }, [showLoyaltyTab]);
  
  // Load module names from shared storage
  useEffect(() => {
    const singularNames = getModuleSingularName();
    if (singularNames && typeof singularNames === 'object') {
      const newTabNames = { ...tabNames };

      if (singularNames['Customers']) {
        newTabNames.customer = `${singularNames['Customers']} Settings`;
      }

      if (singularNames['Contacts']) {
        newTabNames.contact = `${singularNames['Contacts']} Settings`;
      }

      if (singularNames['Opportunities']) {
        newTabNames.opportunity = `${singularNames['Opportunities']} Settings`;
      }

      setTabNames(newTabNames);
    }
  }, []);

  // Check project type to determine if Loyalty tab should be visible
  useEffect(() => {
    const checkProjectType = () => {
      try {
        const userDataStr = localStorage.getItem('userData');
        const selectedProjectStr = localStorage.getItem('selectedProject');

        if (userDataStr && selectedProjectStr) {
          const userData = JSON.parse(userDataStr);
          const selectedProjectId = JSON.parse(selectedProjectStr);
          const userProjects = userData.userProjects || userData.userProject || [];

          // Find the selected project
          const selectedProject = userProjects.find((p: any) => {
            const projId = p.project?.projectId || p.projectId;
            return projId === selectedProjectId;
          });

          if (selectedProject) {
            const projectType = selectedProject.project?.projectType;
            // Show loyalty tab only for project types 0 and 2
            setShowLoyaltyTab(projectType === 0 || projectType === 2);
          }
        }
      } catch (error) {
        console.error('Error checking project type:', error);
        setShowLoyaltyTab(false);
      }
    };

    checkProjectType();
  }, []);
  
  const handleTabChange = (tab: string) => {
    if (activeTab === tab) return;
    
    // Check if current tab has unsaved changes
    const currentTabHasUnsavedChanges = getCurrentTabUnsavedChanges();
    if (currentTabHasUnsavedChanges) {
      setPendingTab(tab);
      setShowUnsavedDialog(true);
      return;
    }
    
    // Proceed with tab change if no unsaved changes
    switchToTab(tab);
  };

  // Helper function to check if current tab has unsaved changes
  const getCurrentTabUnsavedChanges = () => {
    switch (activeTab) {
      case 'project':
        return projectSettingsRef.current?.hasUnsavedChanges || false;
      case 'customer':
        return customerSettingsRef.current?.hasUnsavedChanges || false;
      case 'contact':
        return contactSettingsRef.current?.hasUnsavedChanges || false;
      case 'opportunity':
        return opportunitySettingsRef.current?.hasUnsavedChanges || false;
      case 'support':
        return supportSettingsRef.current?.hasUnsavedChanges || false;
      case 'themes':
        return themeSettingsRef.current?.hasUnsavedChanges || false;
      case 'loyalty':
        return loyaltySettingsRef.current?.hasUnsavedChanges || false;
      default:
        return false;
    }
  };

  const switchToTab = (tab: string) => {
    // Determine animation direction
    const currentIndex = tabOrder.indexOf(activeTab);
    const newIndex = tabOrder.indexOf(tab);
    const newDirection = newIndex > currentIndex ? 1 : -1; // -1 is right to left, 1 is left to right
    
    setPreviousTab(activeTab);
    setDirection(newDirection);
    setActiveTab(tab);
    setHasUnsavedChanges(false); // Reset unsaved changes when switching tabs
  };
  
  const handleSave = () => {
    // Save functionality based on active tab
    console.log(`Saving ${activeTab} settings...`);
    
    // Call the appropriate save method based on active tab
    switch (activeTab) {
      case 'project':
        if (projectSettingsRef.current) {
          projectSettingsRef.current.handleSave();
        }
        break;
      case 'customer':
        if (customerSettingsRef.current) {
          customerSettingsRef.current.handleSave();
        }
        break;
      case 'opportunity':
        if (opportunitySettingsRef.current) {
          opportunitySettingsRef.current.handleSave();
        }
        break;
      case 'contact':
        if (contactSettingsRef.current) {
          contactSettingsRef.current.handleSave();
        }
        break;
      case 'support':
        if (supportSettingsRef.current) {
          supportSettingsRef.current.handleSave();
        }
        break;
      case 'themes':
        if (themeSettingsRef.current) {
          themeSettingsRef.current.handleSave();
        }
        break;
      case 'loyalty':
        if (loyaltySettingsRef.current) {
          loyaltySettingsRef.current.handleSave();
        }
        break;
      default:
        console.warn('Unknown tab:', activeTab);
    }
  };

  // Compute if any settings component is currently loading
  const isAnyComponentLoading = () => {
    switch (activeTab) {
      case 'project':
        return projectSettingsRef.current?.isLoading || false;
      case 'customer':
        return customerSettingsRef.current?.isLoading || false;
      case 'contact':
        return contactSettingsRef.current?.isLoading || false;
      case 'opportunity':
        return opportunitySettingsRef.current?.isLoading || false;
      case 'support':
        return supportSettingsRef.current?.isLoading || false;
      case 'themes':
        return themeSettingsRef.current?.isLoading || false;
      case 'loyalty':
        return loyaltySettingsRef.current?.isLoading || false;
      default:
        return false;
    }
  };

  // Dialog action handlers
  const handleExitWithoutSaving = () => {
    setShowUnsavedDialog(false);
    setHasUnsavedChanges(false);
    if (pendingTab) {
      switchToTab(pendingTab);
      setPendingTab(null);
    }
  };

  const handleContinueEditing = () => {
    setShowUnsavedDialog(false);
    setPendingTab(null);
  };

  const handleSaveAndExit = async () => {
    setShowUnsavedDialog(false);
    
    // Save current tab data
    try {
      await handleSave();
      setHasUnsavedChanges(false);
      
      // Switch to pending tab after successful save
      if (pendingTab) {
        switchToTab(pendingTab);
        setPendingTab(null);
      }
    } catch (error) {
      console.error('Error saving data:', error);
      // Keep dialog closed but don't switch tabs if save fails
      setPendingTab(null);
    }
  };

  const handleCancel = () => {
    // Call the appropriate cancel method based on active tab
    switch (activeTab) {
      case 'project':
        if (projectSettingsRef.current && projectSettingsRef.current.handleCancel) {
          projectSettingsRef.current.handleCancel();
        }
        break;
      case 'customer':
        if (customerSettingsRef.current && customerSettingsRef.current.handleCancel) {
          customerSettingsRef.current.handleCancel();
        }
        break;
      case 'opportunity':
        if (opportunitySettingsRef.current && opportunitySettingsRef.current.handleCancel) {
          opportunitySettingsRef.current.handleCancel();
        }
        break;
      case 'contact':
        if (contactSettingsRef.current && contactSettingsRef.current.handleCancel) {
          contactSettingsRef.current.handleCancel();
        }
        break;
      case 'support':
        if (supportSettingsRef.current && supportSettingsRef.current.handleCancel) {
          supportSettingsRef.current.handleCancel();
        }
        break;
      case 'themes':
        if (themeSettingsRef.current && themeSettingsRef.current.handleCancel) {
          themeSettingsRef.current.handleCancel();
        }
        break;
      case 'loyalty':
        if (loyaltySettingsRef.current && loyaltySettingsRef.current.handleCancel) {
          loyaltySettingsRef.current.handleCancel();
        }
        break;
      default:
        console.log('No cancel method available for this tab');
    }

    // Reset unsaved changes flag
    setHasUnsavedChanges(false);
    console.log(`${activeTab} settings canceled`);
  };

  return (
    <Layout>
      <Head>
        <title>General Settings | 1Channel</title>
      </Head>
      
      <TailwindPageLayout
        header={
          <div className="flex flex-col space-y-4 bg-white py-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-800">Account Setup</h1>
              </div>
            </div>
          </div>
        }
      >
        <div className="bg-white rounded-lg shadow-sm flex flex-col h-full relative overflow-y-auto pb-20" style={{ minHeight: 'calc(100vh - 120px)' }}>
          <div className="border-b border-gray-200 sticky top-0 bg-white z-10">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                className={`${activeTab === 'project' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 border-b-2 font-medium text-sm`}
                onClick={() => handleTabChange('project')}
              >
                Project Settings
              </button>
              <button
                className={`${activeTab === 'customer' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                onClick={() => handleTabChange('customer')}
              >
                {tabNames.customer}
              </button>
              <button
                className={`${activeTab === 'opportunity' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                onClick={() => handleTabChange('opportunity')}
              >
                {tabNames.opportunity}
              </button>
              <button
                className={`${activeTab === 'contact' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                onClick={() => handleTabChange('contact')}
              >
                {tabNames.contact}
              </button>
              <button
                className={`${activeTab === 'support' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                onClick={() => handleTabChange('support')}
              >
                Support Settings
              </button>
              <button
                className={`${activeTab === 'themes' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                onClick={() => handleTabChange('themes')}
              >
                Themes
              </button>
              {showLoyaltyTab && (
                <button
                  className={`${activeTab === 'loyalty' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  onClick={() => handleTabChange('loyalty')}
                >
                  Loyalty Settings
                </button>
              )}
            </nav>
          </div>

          <div className="flex-grow py-4 relative">
            <AnimatePresence 
              initial={false} 
              custom={direction}
              {...{mode: "wait"} as any}>
              {/* Project Settings Tab Content */}
              {activeTab === 'project' && (
                <motion.div
                  key="project"
                  custom={direction}
                  variants={{
                    enter: (direction) => ({ x: direction * 100 + '%', opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (direction) => ({ x: direction * -100 + '%', opacity: 0 })
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="gs-tab-content"
                  style={{ width: '100%' }}
                >
                  <ProjectSettings ref={projectSettingsRef} />
                </motion.div>
              )}

              {/* Customer1 Settings Tab Content */}
              {activeTab === 'customer' && (
                <motion.div
                  key="customer"
                  custom={direction}
                  variants={{
                    enter: (direction) => ({ x: direction * 100 + '%', opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (direction) => ({ x: direction * -100 + '%', opacity: 0 })
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="gs-tab-content"
                  style={{ width: '100%' }}
                >
                  <CustomerSettings ref={customerSettingsRef} />
                </motion.div>
              )}

              {/* Opportunity Settings Tab Content */}
              {activeTab === 'opportunity' && (
                <motion.div
                  key="opportunity"
                  custom={direction}
                  variants={{
                    enter: (direction) => ({ x: direction * 100 + '%', opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (direction) => ({ x: direction * -100 + '%', opacity: 0 })
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="gs-tab-content"
                  style={{ width: '100%' }}
                >
                  <OpportunitySettings ref={opportunitySettingsRef} />
                </motion.div>
              )}

              {/* Contact1 Settings Tab Content */}
              {activeTab === 'contact' && (
                <motion.div
                  key="contact"
                  custom={direction}
                  variants={{
                    enter: (direction) => ({ x: direction * 100 + '%', opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (direction) => ({ x: direction * -100 + '%', opacity: 0 })
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="gs-tab-content"
                  style={{ width: '100%' }}
                >
                  <ContactSettings ref={contactSettingsRef} />
                </motion.div>
              )}

              {/* Support Settings Tab Content */}
              {activeTab === 'support' && (
                <motion.div
                  key="support"
                  custom={direction}
                  variants={{
                    enter: (direction) => ({ x: direction * 100 + '%', opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (direction) => ({ x: direction * -100 + '%', opacity: 0 })
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="gs-tab-content"
                  style={{ width: '100%' }}
                >
                  <SupportSettings ref={supportSettingsRef} />
                </motion.div>
              )}

              {/* Theme Settings Tab Content */}
              {activeTab === 'themes' && (
                <motion.div
                  key="themes"
                  custom={direction}
                  variants={{
                    enter: (direction) => ({ x: direction * 100 + '%', opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (direction) => ({ x: direction * -100 + '%', opacity: 0 })
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="gs-tab-content"
                  style={{ width: '100%' }}
                >
                  <ThemeSettings ref={themeSettingsRef} />
                </motion.div>
              )}

              {/* Loyalty Settings Tab Content */}
              {showLoyaltyTab && activeTab === 'loyalty' && (
                <motion.div
                  key="loyalty"
                  custom={direction}
                  variants={{
                    enter: (direction) => ({ x: direction * 100 + '%', opacity: 0 }),
                    center: { x: 0, opacity: 1 },
                    exit: (direction) => ({ x: direction * -100 + '%', opacity: 0 })
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="gs-tab-content"
                  style={{ width: '100%' }}
                >
                  <LoyaltySettings ref={loyaltySettingsRef} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Save and Cancel buttons - Fixed for all tabs */}
          <div className={styles["gs-button-panel"]}>
            <Button
              className="bg-[#E4E6EF] hover:bg-gray-300 text-[#3F4254] rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm"
              aria-label="Cancel"
              onClick={handleCancel}
            >{activeTab === 'themes' ? "Cancel" : "Reset"}
            </Button>

            <Button
              className="bg-[#3699FF] hover:bg-blue-600 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm"
              aria-label="Save"
              onClick={handleSave}
            >{isAnyComponentLoading() ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </TailwindPageLayout>

      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modalBackground">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl m-6 p-6">
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Unsaved Changes</h3>
            <div className="w-full h-px bg-gray-200 mb-6"></div>
            <p className="text-gray-600 mb-8 text-base">
              Unsaved changes will be lost. Do you want to save them?
            </p>
            
            <div className="flex flex-row gap-4 justify-center">
              <button
                onClick={handleExitWithoutSaving}
                className="px-3 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium shadow-md whitespace-nowrap text-md"
              >
                Exit without saving
              </button>
              <button
                onClick={handleContinueEditing}
                className="px-3 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-md whitespace-nowrap text-md"
              >
                Continue editing
              </button>
              <button
                onClick={handleSaveAndExit}
                className="px-3 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium shadow-md whitespace-nowrap text-md"
              >
                Save and exit
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default GeneralSettings;
