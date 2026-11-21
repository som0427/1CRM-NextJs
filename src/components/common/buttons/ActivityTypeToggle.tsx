import React from "react";
import { Button } from "../../ui/tailwind/Button";
import { CalendarDays, CheckCircle2 } from "lucide-react";

interface ActivityTypeToggleProps {
  activeTab: "performed" | "planned";
  setActiveTab: (tab: "performed" | "planned") => void;
}

const ActivityTypeToggle: React.FC<ActivityTypeToggleProps> = ({
  activeTab,
  setActiveTab,
}) => (
  <div className="relative flex bg-white border border-gray-200 rounded-full h-11 px-[1px] items-center shadow-sm overflow-hidden">
    <div
      className={`absolute bg-blue-500 rounded-full h-10 w-10 transition-transform duration-300 ease-in-out ${
        activeTab === 'performed' ? 'translate-x-10' : 'translate-x-0'
      }`}
    />
    <Button
      className={`relative z-10 h-10 w-10 flex items-center justify-center transition-colors duration-300`}
      aria-label="Planned & Overdue Activities"
      onClick={() => setActiveTab('planned')}
      style={{ borderRadius: '50%' }}
      title="Planned & Overdue Activities"
    >
      <div className="flex items-center justify-center w-5 h-5">
        <CalendarDays 
          size={20}
          className={`transition-all duration-300 ${activeTab === 'planned' ? 'text-white' : 'text-gray-500'}`}
        />
      </div>
    </Button>
    <Button
      className={`relative z-10 h-10 w-10 flex items-center justify-center transition-colors duration-300`}
      aria-label="Performed Activities"
      onClick={() => setActiveTab('performed')}
      style={{ borderRadius: '50%' }}
      title="Performed Activities"
    >
      <div className="flex items-center justify-center w-5 h-5">
        <CheckCircle2 
          size={20}
          className={`transition-all duration-300 ${activeTab === 'performed' ? 'text-white' : 'text-gray-500'}`}
        />
      </div>
    </Button>
  </div>
);

export default ActivityTypeToggle;
