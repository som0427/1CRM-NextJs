import React from 'react';
import { Button } from '@/components/ui/tailwind';

interface CancelButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

const CancelButton: React.FC<CancelButtonProps> = ({
  onClick,
  disabled = false,
  label = 'Cancel',
  className = '',
}) => {
  return (
    <Button
      className={`bg-[#E4E6EF] hover:bg-gray-300 text-[#3F4254] rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      aria-label={label}
      type="button"
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </Button>
  );
};

export default CancelButton;
