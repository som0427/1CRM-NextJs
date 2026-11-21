import React from 'react';
import PageHeading from '../common/PageHeading';

interface SwapDataHeaderProps {
  pageHeading?: string;
}

const SwapDataHeader: React.FC<SwapDataHeaderProps> = ({ pageHeading = 'Swap Data' }) => {
  return (
    <div className="flex flex-col space-y-4 bg-white py-4 rounded-lg">
      <div className="flex items-center justify-between">
        <PageHeading heading={pageHeading} />
      </div>
    </div>
  );
};

export default SwapDataHeader;
