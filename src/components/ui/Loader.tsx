import React from 'react';
import { useLoading } from '../../contexts/loading/LoadingContext';

// Using Tailwind directly instead of styled components

const Loader: React.FC = () => {
  const { isLoading, pendingAPIs } = useLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-80 flex justify-center items-center z-[9999] transition-opacity duration-300">
      <div className="text-center bg-white p-5 rounded-lg shadow-md">
        {/* Tailwind CSS Spinner */}
        <div className="inline-block">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
        <h3 className="mt-4 text-lg font-semibold">Loading Application...</h3>
        <p className="text-gray-500 mt-2">Please wait while we prepare your experience</p>
      </div>
    </div>
  );
};

export default Loader;
