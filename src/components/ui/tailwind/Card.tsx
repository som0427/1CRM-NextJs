import React from 'react';
import { cn } from '../../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  cardTitle?: React.ReactNode;
  extra?: React.ReactNode;
  bordered?: boolean;
  hoverable?: boolean;
  bodyStyle?: React.CSSProperties;
  headStyle?: React.CSSProperties;
  cover?: React.ReactNode;
  actions?: React.ReactNode[];
}

/**
 * Card component - A Tailwind CSS replacement for Ant Design Card
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    cardTitle, 
    extra, 
    bordered = true, 
    hoverable = false, 
    bodyStyle, 
    headStyle, 
    cover, 
    actions, 
    children, 
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-white rounded-lg overflow-hidden",
          bordered && "border border-gray-200",
          hoverable && "transition-shadow hover:shadow-md",
          className
        )}
        {...props}
      >
        {(cardTitle || extra) && (
          <div 
            className="px-6 py-4 border-b border-gray-200 flex items-center justify-between" 
            style={headStyle}
          >
            {cardTitle && (
              <div className="font-medium text-base text-gray-900">
                {cardTitle}
              </div>
            )}
            {extra && (
              <div>{extra}</div>
            )}
          </div>
        )}
        
        {cover && (
          <div className="w-full">
            {cover}
          </div>
        )}
        
        <div 
          className="px-6 py-4" 
          style={bodyStyle}
        >
          {children}
        </div>
        
        {actions && actions.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50">
            <div className="flex divide-x divide-gray-200">
              {actions.map((action, index) => (
                <div key={index} className="flex-1 p-3 text-center">
                  {action}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = 'Card';

export { Card };

export interface CardGridProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

const CardGrid = React.forwardRef<HTMLDivElement, CardGridProps>(
  ({ className, hoverable = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "border border-gray-200 p-4",
          hoverable && "transition-shadow hover:shadow-md cursor-pointer",
          className
        )}
        {...props}
      />
    );
  }
);

CardGrid.displayName = 'CardGrid';

export { CardGrid };

export interface CardMetaProps extends React.HTMLAttributes<HTMLDivElement> {
  avatar?: React.ReactNode;
  metaTitle?: React.ReactNode;
  description?: React.ReactNode;
}

const CardMeta = React.forwardRef<HTMLDivElement, CardMetaProps>(
  ({ className, avatar, metaTitle, description, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(className)}
        {...props}
      >
        <div className="flex items-center space-x-3">
          {avatar && <div>{avatar}</div>}
          <div>
            {metaTitle && (
              <div className="font-medium text-gray-900">
                {metaTitle}
              </div>
            )}
            {description && (
              <div className="text-sm text-gray-500 mt-1">
                {description}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

CardMeta.displayName = 'CardMeta';

export { CardMeta };
