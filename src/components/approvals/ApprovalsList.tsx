import React, { useState, useCallback } from 'react';
import PendingApprovals from './subs/PendingApprovals';
import CompletedApprovals from './subs/CompletedApprovals';
import ApprovalHeader from './ApprovalHeader';
import Spinner from '../common/Spinner';

const ApprovalsList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSearch = useCallback(() => {
    // Search is handled via the searchText prop in the grid components
    console.log('Searching for:', searchTerm);
  }, [searchTerm]);

  const handleTabChange = useCallback((tab: 'pending' | 'completed') => {
    setActiveTab(tab);
  }, []);

  const handleLoadingChange = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <ApprovalHeader 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleSearch={handleSearch}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
      />
      
      <div className="flex-1 bg-white mt-4 relative">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner />
          </div>
        ) : null}
        
        <div style={{ display: isLoading ? 'none' : 'block' }} className="h-full">
          {activeTab === 'pending' ? (
            <PendingApprovals 
              searchText={searchTerm} 
              onLoadingChange={handleLoadingChange}
            />
          ) : (
            <CompletedApprovals 
              searchText={searchTerm}
              onLoadingChange={handleLoadingChange}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalsList;