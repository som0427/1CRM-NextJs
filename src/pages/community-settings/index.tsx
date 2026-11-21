import React, { useRef, useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import CommunitySettings, { CommunitySettingsRef } from '../../components/community/community-settings';
import styles from '@/styles/generalSettings.module.css';

const CommunitySettingsPage: NextPage = () => {
  const communitySettingsRef = useRef<CommunitySettingsRef>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Poll for state changes from the component
  useEffect(() => {
    const interval = setInterval(() => {
      if (communitySettingsRef.current) {
        setIsLoading(communitySettingsRef.current.isLoading);
        setHasUnsavedChanges(communitySettingsRef.current.hasUnsavedChanges);
      }
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, []);

  const handleSave = async () => {
    if (communitySettingsRef.current) {
      await communitySettingsRef.current.handleSave();
    }
  };

  // Compute if any settings component is currently loading
  const isAnyComponentLoading = () => {
    return communitySettingsRef.current?.isLoading || false;
  };

  const handleCancel = () => {
    if (communitySettingsRef.current) {
      communitySettingsRef.current.handleCancel();
    }
  };

  return (
    <Layout>
      <Head>
        <title>Community Settings | 1Channel</title>
      </Head>
      
      <TailwindPageLayout
          header={
            <div className="flex flex-col space-y-4 bg-white py-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-gray-800">Community Settings</h1>
                </div>
              </div>
            </div>
          }
        >

          <div>
            <CommunitySettings ref={communitySettingsRef} />
          </div>

          {/* Fixed Action Buttons at Bottom */}
          <div className={styles["gs-button-panel"]}>
            <button
              type="button"
              onClick={handleCancel}
              className={styles["gs-button-cancel"]}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isAnyComponentLoading()}
              className={`${styles["gs-button-save"]} ${isAnyComponentLoading() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isAnyComponentLoading() ? 'Saving...' : 'Save'}
            </button>
          </div>

      </TailwindPageLayout>
    </Layout>
  );
};

export default CommunitySettingsPage;
