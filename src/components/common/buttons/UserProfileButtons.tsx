import React from "react";
import Image from "next/image";
import { Button } from "../../ui/tailwind/Button";
import { Users, Globe } from "lucide-react";

interface UserProfileButtonsProps {
  selectedView: "self" | "team" | "all";
  setSelectedView: (view: "self" | "team" | "all") => void;
  setLoading: (loading: boolean) => void;
  setNeedsListRefresh: (refresh: boolean) => void;
}

const UserProfileButtons: React.FC<UserProfileButtonsProps> = ({
  selectedView,
  setSelectedView,
  setLoading,
  setNeedsListRefresh
}) => (
  <div className="relative flex bg-white border border-gray-200 rounded-full h-11 px-[1px] items-center shadow-sm overflow-hidden">
    <div
      className={`absolute bg-blue-500 rounded-full h-10 w-10 transition-transform duration-300 ease-in-out ${
        selectedView === 'team' ? 'translate-x-10' : 
        selectedView === 'all' ? 'translate-x-20' : 
        'translate-x-0'
      }`}
    />
    <Button
      className={`relative z-10 h-10 w-10 flex items-center justify-center transition-colors duration-300`}
      aria-label="User profile"
      onClick={() => {
        setSelectedView('self');
        setLoading(true);
        setNeedsListRefresh(true);
      }}
      style={{ borderRadius: '50%' }}
    >
      <div className="flex items-center justify-center w-5 h-5">
        <Image 
          src="/svg/icons/general/self.svg" 
          alt="Self view" 
          width={20} 
          height={20} 
          className={`object-contain transition-all duration-300 ${selectedView === 'self' ? 'brightness-0 invert' : ''}`}
        />
      </div>
    </Button>
    <Button
      className={`relative z-10 h-10 w-10 flex items-center justify-center transition-colors duration-300`}
      aria-label="Team"
      onClick={() => {
        setSelectedView('team');
        setLoading(true);
        setNeedsListRefresh(true);
      }}
      style={{ borderRadius: '50%' }}
    >
      <div className="flex items-center justify-center w-5 h-5">
        <Image 
          src="/svg/icons/general/team.svg" 
          alt="Team view" 
          width={20} 
          height={20} 
          className={`object-contain transition-all duration-300 ${selectedView === 'team' ? 'brightness-0 invert' : ''}`}
        />
      </div>
    </Button>
    <Button
      className={`relative z-10 h-10 w-10 flex items-center justify-center transition-colors duration-300`}
      aria-label="All"
      onClick={() => {
        setSelectedView('all');
        setLoading(true);
        setNeedsListRefresh(true);
      }}
      style={{ borderRadius: '50%' }}
    >
      <div className="flex items-center justify-center w-5 h-5">
        <Image 
          src="/svg/icons/general/all.svg" 
          alt="All users" 
          width={20} 
          height={20} 
          className={`object-contain transition-all duration-300 ${selectedView === 'all' ? 'brightness-0 invert' : ''}`}
        />
      </div>
    </Button>
  </div>
);

export default UserProfileButtons;
