import React, { useState, useEffect } from 'react';
import { getUserData } from '../lib/storage/sharedStorage';
import Layout from '../components/layout/Layout';
import { useAuth } from '../lib/auth';
import { useRouter } from 'next/router';
import { User } from '../lib/models/User';
import { NextPage } from 'next';
import Head from 'next/head';

// Declare custom properties on window
declare global {
  interface Window {
    _isOnDashboard?: boolean;
    _preventLoginRedirect?: boolean;
  }
}

const Dashboard: NextPage = () => {
  const router = useRouter();
  const { isAuthenticated, user, loading } = useAuth();
  
  // State for dashboard
  const [userData, setUserData] = useState<User | null>(null);
  const [authOverride, setAuthOverride] = useState<boolean>(false);
  
  // Simple auth check
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window._isOnDashboard = true;
      window._preventLoginRedirect = true;
    }
  }, []);
  
  // Load user data
  useEffect(() => {
    const user = getUserData();
    setUserData(user);
  }, []);
  
  

  // Show loading state
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Head>
        <title>Dashboard | 1Channel</title>
      </Head>
      
      {/* Welcome Screen with Blue Gradient */}
      <div className="min-h-screen bg-gradient-to-bl from-blue-100 via-blue-400 to-blue-600 flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-light text-white mb-8 tracking-wide">
            Welcome to 1Channel!
          </h1>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
