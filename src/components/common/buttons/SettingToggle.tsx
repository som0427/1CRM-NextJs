import React from "react";
import { Button } from "../../ui/tailwind/Button";

/**
 * SettingToggle Component
 *
 * A pill-shaped toggle button group for switching between Fields, Logs, and Settings views.
 * Features smooth sliding animation for active tab indicator.
 *
 * @component
 *
 * @example
 * // Basic usage with fields and logs
 * <SettingToggle
 *   activeTab={activeTab}
 *   setActiveTab={setActiveTab}
 * />
 *
 * @example
 * // With settings tab enabled
 * <SettingToggle
 *   activeTab={activeTab}
 *   setActiveTab={setActiveTab}
 *   hasSetting={true}
 * />
 *
 * @example
 * // Without logs tab
 * <SettingToggle
 *   activeTab={activeTab}
 *   setActiveTab={setActiveTab}
 *   hasLogs={false}
 *   hasSetting={true}
 * />
 *
 * @example
 * // Full usage with state
 * const [activeTab, setActiveTab] = useState<"fields" | "setting" | "logs">("fields");
 * <SettingToggle
 *   activeTab={activeTab}
 *   setActiveTab={setActiveTab}
 *   hasLogs={true}
 *   hasSetting={true}
 * />
 *
 * Props:
 * ------
 * @param {"fields" | "setting" | "logs"} activeTab - Currently active tab (required)
 * @param {(tab: "fields" | "setting" | "logs") => void} setActiveTab - Tab change handler (required)
 * @param {boolean} [hasLogs=true] - Show logs tab
 * @param {boolean} [hasSetting=false] - Show settings tab
 *
 * Tab Icons:
 * ----------
 * - Fields: List/form icon
 * - Logs: Database/chain link icon
 * - Setting: Gear/cog icon
 *
 * Features:
 * ---------
 * - Pill-shaped container with border
 * - Sliding blue indicator (40px circular)
 * - 300ms smooth translate animation
 * - Icon tooltips on hover
 * - White background with shadow
 * - Active tab: white icon on blue background
 * - Inactive tab: gray icon with hover state
 * - Dynamic positioning based on visible tabs
 */
interface SettingToggleProps {
  activeTab: "fields" | "setting" | "logs";
  setActiveTab: (tab:  "fields" | "setting" | "logs") => void;
  hasLogs?: boolean;
  hasSetting?: boolean;
}

const FieldIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M2.75311 11.996L5.25244 12.007C5.66654 12.0088 6.00076 12.3461 5.99895 12.7603C5.99726 13.14 5.7138 13.4525 5.34761 13.5006L5.24583 13.507L3.4996 13.498V18.999L5.24914 19C5.62873 19 5.94245 19.2821 5.9921 19.6482L5.99895 19.75C5.99895 20.1297 5.71686 20.4435 5.35088 20.4931L5.24914 20.5H2.7498C2.37021 20.5 2.05649 20.2178 2.00684 19.8518L2 19.75V12.7459C2 12.3651 2.28377 12.0507 2.65103 12.0024L2.75311 11.996ZM21.2449 17.5C21.659 17.5 21.9947 17.8358 21.9947 18.25C21.9947 18.6297 21.7126 18.9435 21.3466 18.9931L21.2449 19H7.74848C7.33437 19 6.99868 18.6642 6.99868 18.25C6.99868 17.8703 7.28076 17.5565 7.64673 17.5068L7.74848 17.5H21.2449ZM21.2449 13.5C21.659 13.5 21.9947 13.8358 21.9947 14.25C21.9947 14.6297 21.7126 14.9435 21.3466 14.9931L21.2449 15H7.74848C7.33437 15 6.99868 14.6642 6.99868 14.25C6.99868 13.8703 7.28076 13.5565 7.64673 13.5068L7.74848 13.5H21.2449ZM2.75311 2.5L5.25244 2.51102C5.66654 2.51284 6.00076 2.85011 5.99895 3.26432C5.99726 3.64401 5.7138 3.95656 5.34761 4.00461L5.24583 4.011L3.4996 4.00299V9.49499L5.24914 9.49505C5.62873 9.49505 5.94245 9.77721 5.9921 10.1433L5.99895 10.2451C5.99895 10.6247 5.71686 10.9385 5.35088 10.9882L5.24914 10.9951H2.7498C2.37021 10.9951 2.05649 10.7129 2.00684 10.3468L2 10.2451V3.24999C2 2.86911 2.28377 2.55477 2.65103 2.50644L2.75311 2.5ZM21.2449 8.00431C21.659 8.00431 21.9947 8.34009 21.9947 8.75431C21.9947 9.134 21.7126 9.4478 21.3466 9.49746L21.2449 9.50431H7.74848C7.33437 9.50431 6.99868 9.16852 6.99868 8.75431C6.99868 8.37461 7.28076 8.06082 7.64673 8.01115L7.74848 8.00431H21.2449ZM21.2502 4.00431C21.6643 4.00431 22 4.34009 22 4.75431C22 5.134 21.7179 5.4478 21.3519 5.49746L21.2502 5.50431H7.75377C7.33967 5.50431 7.00397 5.16852 7.00397 4.75431C7.00397 4.37461 7.28605 4.06082 7.65203 4.01115L7.75377 4.00431H21.2502Z"
      fill="currentColor"
    />
  </svg>
);

const LogsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M4 6V18C4 18.6906 4.3153 19.2934 4.77423 19.7798C5.2294 20.2622 5.85301 20.6626 6.56668 20.9825C7.99575 21.6231 9.91738 22 12 22C12.5109 22 13.0121 21.9773 13.4987 21.9336C12.8538 21.5859 12.2984 21.0933 11.8762 20.4995C10.0055 20.4848 8.34946 20.1378 7.18027 19.6137C6.58195 19.3455 6.14382 19.0456 5.86525 18.7503C5.59044 18.4591 5.5 18.2069 5.5 18V8.39242C5.82094 8.61282 6.18063 8.80942 6.56668 8.98248C7.99575 9.6231 9.91738 10 12 10C14.0826 10 16.0042 9.6231 17.4333 8.98248C17.8194 8.80942 18.1791 8.61282 18.5 8.39242V13H19.25C19.5052 13 19.7557 13.0201 20 13.0589V6C20 5.30945 19.6847 4.70664 19.2258 4.22025C18.7706 3.73784 18.147 3.33745 17.4333 3.01752C16.0042 2.3769 14.0826 2 12 2C9.91738 2 7.99575 2.3769 6.56668 3.01752C5.85301 3.33745 5.2294 3.73784 4.77423 4.22025C4.3153 4.70664 4 5.30945 4 6ZM5.5 6C5.5 5.79309 5.59044 5.54091 5.86525 5.24966C6.14382 4.95441 6.58195 4.65449 7.18027 4.38628C8.37519 3.85063 10.0786 3.5 12 3.5C13.9214 3.5 15.6248 3.85063 16.8197 4.38628C17.418 4.65449 17.8562 4.95441 18.1348 5.24966C18.4096 5.54091 18.5 5.79309 18.5 6C18.5 6.20691 18.4096 6.45909 18.1348 6.75034C17.8562 7.04559 17.418 7.3455 16.8197 7.61372C15.6248 8.14937 13.9214 8.5 12 8.5C10.0786 8.5 8.37519 8.14937 7.18027 7.61372C6.58195 7.3455 6.14382 7.04559 5.86525 6.75034C5.59044 6.45909 5.5 6.20691 5.5 6ZM23 17.75C23 15.6789 21.3211 14 19.25 14L19.1482 14.0068C18.7822 14.0565 18.5 14.3703 18.5 14.75C18.5 15.1642 18.8358 15.5 19.25 15.5L19.404 15.5052C20.5748 15.5844 21.5 16.5591 21.5 17.75C21.5 18.9926 20.4926 20 19.25 20L19.2466 20.0046L19.1448 20.0119C18.779 20.0633 18.4983 20.3783 18.5 20.758C18.5019 21.1722 18.8392 21.5065 19.2534 21.5046V21.5L19.4523 21.4948C21.4276 21.3913 23 19.7543 23 17.75ZM16.5 14.75C16.5 14.3358 16.1642 14 15.75 14L15.5508 14.0052C13.5724 14.1087 12 15.7457 12 17.75C12 19.8211 13.6789 21.5 15.75 21.5L15.8518 21.4932C16.2178 21.4435 16.5 21.1297 16.5 20.75C16.5 20.3358 16.1642 20 15.75 20L15.596 19.9948C14.4252 19.9156 13.5 18.9409 13.5 17.75C13.5 16.5074 14.5074 15.5 15.75 15.5L15.8518 15.4932C16.2178 15.4435 16.5 15.1297 16.5 14.75ZM20 17.75C20 17.3358 19.6642 17 19.25 17H15.75L15.6482 17.0068C15.2822 17.0565 15 17.3703 15 17.75C15 18.1642 15.3358 18.5 15.75 18.5H19.25L19.3518 18.4932C19.7178 18.4435 20 18.1297 20 17.75Z"
      fill="currentColor"
    />
  </svg>
);

const SettingIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    width="19" 
    height="20" 
    viewBox="0 0 19 20" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M9.37253 0C10.1065 0.0084595 10.8376 0.0932622 11.554 0.253038C11.8668 0.322785 12.1007 0.583511 12.1362 0.901963L12.3064 2.42881C12.3834 3.12986 12.9753 3.66084 13.681 3.66158C13.8706 3.66188 14.0583 3.62238 14.2335 3.54483L15.6342 2.92956C15.9255 2.80159 16.2658 2.87136 16.4833 3.10362C17.4955 4.18464 18.2493 5.48115 18.688 6.89558C18.7826 7.20058 18.6738 7.53203 18.4167 7.7215L17.1752 8.63659C16.8211 8.89679 16.6119 9.31001 16.6119 9.74946C16.6119 10.1889 16.8211 10.6021 17.176 10.8629L18.4186 11.7783C18.6757 11.9677 18.7847 12.2992 18.6901 12.6043C18.2515 14.0185 17.4981 15.3149 16.4865 16.3961C16.2692 16.6283 15.9291 16.6983 15.6378 16.5706L14.2315 15.9545C13.8292 15.7784 13.3671 15.8042 12.9869 16.024C12.6067 16.2437 12.3536 16.6312 12.3053 17.0677L12.1362 18.5944C12.1014 18.9092 11.8725 19.1682 11.5644 19.2415C10.1159 19.5861 8.60683 19.5861 7.15838 19.2415C6.85026 19.1682 6.6214 18.9092 6.58653 18.5944L6.41771 17.07C6.36812 16.6343 6.11469 16.248 5.73478 16.029C5.35486 15.81 4.89356 15.7843 4.49255 15.9594L3.08593 16.5756C2.79457 16.7033 2.45439 16.6333 2.23713 16.4009C1.22498 15.3185 0.471545 14.0205 0.0335523 12.6048C-0.0607863 12.2999 0.0482132 11.9686 0.305198 11.7793L1.54853 10.8633C1.90267 10.6031 2.11183 10.1899 2.11183 9.75046C2.11183 9.31101 1.90267 8.89779 1.54807 8.63725L0.305513 7.72285C0.0481474 7.53345 -0.0609522 7.20178 0.033719 6.89658C0.47247 5.48215 1.2263 4.18564 2.23848 3.10462C2.45594 2.87236 2.79629 2.80259 3.0876 2.93056L4.48797 3.54572C4.89091 3.72256 5.35415 3.69585 5.73612 3.47269C6.11644 3.25209 6.36964 2.86422 6.41852 2.42764L6.5886 0.901963C6.62411 0.58335 6.85821 0.322541 7.17115 0.252942C7.88843 0.0934198 8.6203 0.00865372 9.37253 0ZM9.37271 1.4999C8.91867 1.50524 8.46591 1.54443 8.01818 1.61702L7.90925 2.59418C7.80742 3.50368 7.28039 4.31102 6.49077 4.76903C5.69632 5.23317 4.72771 5.28903 3.88493 4.91917L2.98664 4.52456C2.41471 5.21873 1.95949 6.00135 1.63887 6.84168L2.43667 7.42879C3.17548 7.97162 3.61183 8.83367 3.61183 9.75046C3.61183 10.6672 3.17548 11.5293 2.43745 12.0715L1.6384 12.6602C1.95874 13.502 2.41403 14.2861 2.98635 14.9816L3.89148 14.5851C4.72958 14.2192 5.69159 14.2727 6.48388 14.7294C7.27617 15.1861 7.80468 15.9917 7.90834 16.9026L8.01731 17.8865C8.90695 18.0378 9.81581 18.0378 10.7055 17.8865L10.8144 16.9027C10.9152 15.9921 11.4431 15.1837 12.2363 14.7253C13.0296 14.2668 13.9935 14.213 14.8332 14.5805L15.7376 14.9767C16.3094 14.2823 16.7645 13.4995 17.085 12.659L16.2871 12.0711C15.5483 11.5283 15.1119 10.6662 15.1119 9.74946C15.1119 8.83267 15.5483 7.97062 16.2862 7.42847L17.083 6.84109C16.7624 6.00061 16.3071 5.21784 15.7351 4.52356L14.8386 4.91737C14.4733 5.07901 14.0781 5.1622 13.679 5.16158C12.2093 5.16004 10.9759 4.05355 10.8155 2.59383L10.7066 1.6167C10.261 1.5442 9.81299 1.50512 9.37271 1.4999ZM9.36005 5.99995C11.4311 5.99995 13.11 7.67888 13.11 9.74995C13.11 11.821 11.4311 13.5 9.36005 13.5C7.28898 13.5 5.61005 11.821 5.61005 9.74995C5.61005 7.67888 7.28898 5.99995 9.36005 5.99995ZM9.36005 7.49995C8.11741 7.49995 7.11005 8.50731 7.11005 9.74995C7.11005 10.9926 8.11741 12 9.36005 12C10.6027 12 11.61 10.9926 11.61 9.74995C11.61 8.50731 10.6027 7.49995 9.36005 7.49995Z" 
      fill="currentColor"
    />
  </svg>

);

const SettingToggle: React.FC<SettingToggleProps> = ({
  activeTab,
  setActiveTab,
  hasLogs = true,
  hasSetting = false,
}) => {
  // Calculate translation based on active tab (each button is 40px = 2.5rem)
  const getTranslateClass = () => {
    switch (activeTab) {
      case 'fields':
        return 'translate-x-0';
      case 'logs':
        return hasLogs ? 'translate-x-10' : 'translate-x-0'; // 40px if logs visible
      case 'setting':
        // Position depends on which buttons are visible before it
        if (hasLogs) {
          return 'translate-x-20'; // 80px (fields + logs)
        }
        return 'translate-x-10'; // 40px (only fields before)
      default:
        return 'translate-x-0';
    }
  };

  return (
  <div className="relative flex bg-white border border-gray-200 rounded-full h-11 px-[1px] items-center shadow-sm">
    <div
      className={`absolute bg-blue-500 rounded-full h-10 w-10 transition-transform duration-300 ease-in-out ${getTranslateClass()}`}
    />
    {/* Fields Button with Tooltip */}
    <div className="relative group">
      <Button
        className={`relative z-10 rounded-full h-10 w-10 flex items-center justify-center mx-0 transition-colors duration-300 ${
          activeTab === 'fields' ? 'text-white' : 'text-gray-500 hover:text-gray-600'
        }`}
        aria-label="fields view"
        onClick={() => setActiveTab('fields')}
      >
        <FieldIcon className="h-6 w-6" />
      </Button>
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
        Fields
      </div>
    </div>
    {/* Logs Button with Tooltip - only show if hasLogs is true */}
    {hasLogs && (
      <div className="relative group">
        <Button
          className={`relative z-10 rounded-full h-10 w-10 flex items-center justify-center mx-0 transition-colors duration-300 ${
            activeTab === 'logs' ? 'text-white' : 'text-gray-400 hover:text-gray-600'
          }`}
          aria-label="Logs view"
          onClick={() => setActiveTab('logs')}
        >
          <LogsIcon className="h-6 w-6" />
        </Button>
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
          Logs
        </div>
      </div>
    )}

    {/* Setting Button with Tooltip - only show if hasSetting is true */}
    {hasSetting && (
      <div className="relative group">
        <Button
          className={`relative z-10 rounded-full h-10 w-10 flex items-center justify-center mx-0 transition-colors duration-300 ${
            activeTab === 'setting' ? 'text-white' : 'text-gray-400 hover:text-gray-600'
          }`}
          aria-label="Setting view"
          onClick={() => setActiveTab('setting')}
        >
          <SettingIcon className="h-6 w-6" />
        </Button>
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
          Settings
        </div>
      </div>
    )}
  </div>
  );
};

export default SettingToggle;
