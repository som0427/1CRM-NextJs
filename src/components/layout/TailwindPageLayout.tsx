import React from 'react';
import { Card } from '../ui/tailwind';
import { cn } from '../../lib/utils';

interface PageLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}

/**
 * TailwindPageLayout - A reusable page layout component using Tailwind CSS
 * This replaces the styled components that were extending Ant Design components
 */
export const TailwindPageLayout: React.FC<PageLayoutProps> = ({ 
  children, 
  header,
  className
}) => {
  return (
    <div className={cn(
      "flex flex-col h-screen bg-white px-6",
      className
    )}>
      {header && (
        <div className="sticky top-0 z-10 w-full bg-white">
          <div className="py-0">
            {header}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto pb-6">
        {children}
      </div>
    </div>
  );
};

/**
 * HeaderCard - A styled header container using Tailwind CSS
 */
export const HeaderCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={cn(
      "bg-white w-full border-0 shadow-sm",
      className
    )}>
      <div className="px-0 py-4">
        {children}
      </div>
    </div>
  );
};

/**
 * ContentCard - A styled content container using Tailwind CSS
 */
export const ContentCard: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={cn(
      "bg-white border border-gray-200 rounded-lg shadow-sm flex-1 overflow-hidden",
      className
    )}>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

export default TailwindPageLayout;
