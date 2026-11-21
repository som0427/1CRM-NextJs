import React from "react";
import PageHeading from "../common/PageHeading";
import SearchBar from "../common/SearchBar";
import { CheckCircle2 } from "lucide-react";

interface ApprovalHeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  handleSearch: () => void;
  activeTab: 'pending' | 'completed';
  setActiveTab: (tab: 'pending' | 'completed') => void;
}

const ApprovalHeader: React.FC<ApprovalHeaderProps> = ({
  searchTerm,
  setSearchTerm,
  handleSearch,
  activeTab,
  setActiveTab
}) => {
  return (
    <>
      <style jsx>{`
        @keyframes rotateHourglass {
          0%, 50% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(180deg);
          }
        }
        
        @keyframes sandDeplete {
          0% {
            clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
          }
          100% {
            clip-path: polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%);
          }
        }
        
        @keyframes sandFill {
          0% {
            clip-path: polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%);
          }
          100% {
            clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%);
          }
        }
        
        @keyframes sandStream {
          0%, 85% {
            opacity: 0.4;
            height: 4px;
          }
          100% {
            opacity: 0;
            height: 0px;
          }
        }
      `}</style>
      <div className="flex flex-col space-y-4 bg-white py-4 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <PageHeading heading="Approvals" />
        </div>
        <div className="flex h-11 items-center gap-4">
          
          <SearchBar
            searchTerm={searchTerm}
            border="gray"
            variant="expandable"
            setSearchTerm={setSearchTerm}
            handleSearch={handleSearch}
          />
          <div className="flex items-center space-x-3">
            {/* Toggle Button */}
            <div className="flex h-11 items-center border border-gray-200 rounded-full relative overflow-visible gap-2 px-[1px]">
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 relative group ${
                  activeTab === 'pending'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg 
                  className="h-5 w-5" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  style={{
                    animation: activeTab === 'pending' 
                      ? 'rotateHourglass 3s ease-in-out infinite' 
                      : 'none'
                  }}
                >
                  {/* Top and bottom bars */}
                  <rect x="5" y="1" width="14" height="2" rx="0.5" fill="currentColor"/>
                  <rect x="5" y="21" width="14" height="2" rx="0.5" fill="currentColor"/>
                  
                  {/* Hourglass outline */}
                  <path 
                    d="M7 3L7 8.5C7 9.5 7.5 10.5 8.5 11L12 12L15.5 11C16.5 10.5 17 9.5 17 8.5V3H7Z
                       M17 21V15.5C17 14.5 16.5 13.5 15.5 13L12 12L8.5 13C7.5 13.5 7 14.5 7 15.5V21H17Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                  />
                  
                  {/* Top sand (depleting) */}
                  <g style={{
                    clipPath: activeTab === 'pending' ? undefined : undefined,
                    animation: activeTab === 'pending' 
                      ? 'sandDeplete 3s ease-in-out infinite' 
                      : 'none'
                  }}>
                    <path 
                      d="M8 4H16V7.5C16 8 15.7 8.5 15.2 8.8L12 10L8.8 8.8C8.3 8.5 8 8 8 7.5V4Z"
                      fill="currentColor"
                      opacity={activeTab === 'pending' ? "0.7" : "0.6"}
                    />
                  </g>
                  
                  {/* Bottom sand (filling) */}
                  <g style={{
                    clipPath: activeTab === 'pending' ? undefined : undefined,
                    animation: activeTab === 'pending' 
                      ? 'sandFill 3s ease-in-out infinite' 
                      : 'none'
                  }}>
                    <path 
                      d="M8 20H16V17C16 16.5 15.7 16 15.2 15.7L12 14.5L8.8 15.7C8.3 16 8 16.5 8 17V20Z"
                      fill="currentColor"
                      opacity={activeTab === 'pending' ? "0.8" : "0.7"}
                    />
                  </g>
                  
                  {/* Falling sand stream */}
                  {activeTab === 'pending' && (
                    <rect 
                      x="11.5" 
                      y="10" 
                      width="1.5" 
                      fill="currentColor"
                      style={{
                        animation: 'sandStream 3s ease-in-out infinite',
                        height: '4px',
                        opacity: 0.6
                      }}
                    />
                  )}
                </svg>
                {/* Tooltip for Pending */}
                <span className="absolute top-11 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  Pending
                </span>
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 relative group ${
                  activeTab === 'completed'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <CheckCircle2 className="h-5 w-5" />
                {/* Tooltip for Completed */}
                <span className="absolute top-11 left-1/2 transform -translate-x-3/4 bg-gray-800 text-white text-xs px-3 py-1.5 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  Completed
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default ApprovalHeader;
