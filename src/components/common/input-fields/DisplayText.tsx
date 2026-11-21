import React from 'react';

type DisplayTextVariant = 'header' | 'normal';

interface DisplayTextProps {
  label: string;
  required?: boolean;
  instructions?: string;
  variant?: DisplayTextVariant;
  className?: string;
}

const DisplayText: React.FC<DisplayTextProps> = ({
  label,
  required = false,
  instructions,
  variant = 'normal',
  className = '',
}) => {
  const labelClass =
    variant === 'header'
      ? 'text-lg font-semibold text-gray-800'
      : 'text-sm font-medium text-gray-700';

  return (
    <div className={`w-full ${className}`}>
      <div className={labelClass}>
        {label}
        {required ? <span className="text-[#F64E60] ml-1">*</span> : null}
      </div>
      {instructions ? (
        <p className="text-sm text-gray-600 mt-1">{instructions}</p>
      ) : null}
    </div>
  );
};

export default DisplayText;
