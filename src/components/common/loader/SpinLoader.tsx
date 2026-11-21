import React from 'react';

interface SpinLoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  overlay?: boolean;
}

const SpinLoader: React.FC<SpinLoaderProps> = ({ 
  text = '', 
  size = 'md',
  overlay = true 
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  const spinnerContent = (
    <div className="flex flex-col items-center justify-center">
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-t-2 border-b-2 border-indigo-500`}></div>
      {text && <span className="mt-2 text-gray-700 font-medium">{text}</span>}
    </div>
  );

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export default SpinLoader;