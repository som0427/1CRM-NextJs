import React from 'react';

interface HamburgerMenuProps {
    hasError?: boolean;
    size?: number;
    className?: string;
    onClick?: () => void;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ 
    hasError = false, 
    size = 24,
    className = '',
    onClick 
}) => {
    const fillColor = hasError ? "#EF4444" : "#5B9EF7";
    
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={`cursor-pointer ${className}`}
            onClick={onClick}
        >
            <rect x="4" y="5" width="16" height="2.5" rx="1.25" fill={fillColor} />
            <rect x="4" y="9" width="16" height="2.5" rx="1.25" fill={fillColor} />
            <rect x="4" y="13" width="16" height="2.5" rx="1.25" fill={fillColor} />
            <rect x="4" y="17" width="16" height="2.5" rx="1.25" fill={fillColor} />
        </svg>
    );
};

export default HamburgerMenu;