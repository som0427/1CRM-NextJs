import React from 'react';

interface ExpandCollapseIconProps {
  isExpanded: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Reusable expand/collapse icon component that rotates based on state
 * @param isExpanded - Whether the section is expanded
 * @param onClick - Optional click handler function
 * @param className - Additional CSS classes to apply
 */
const ExpandCollapseIcon: React.FC<ExpandCollapseIconProps> = ({ 
  isExpanded, 
  onClick,
  className = '',
}) => {
  return (
    <button 
      className={`text-gray-400 hover:text-gray-600 transition-transform duration-200 ease-in-out ${className}`}
      onClick={onClick}
      aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className={`transform ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
  );
};

export default ExpandCollapseIcon;
