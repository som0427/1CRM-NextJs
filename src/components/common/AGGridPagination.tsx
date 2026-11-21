import React from 'react';
import { GridApi } from 'ag-grid-community';

interface AGGridPaginationProps {
  // Grid API for pagination control
  gridApi: GridApi | null;
  
  // Data and pagination state
  totalItems: number;
  currentPage: number;
  currentPageSize: number;
  
  // State setters
  setCurrentPage: (page: number) => void;
  setCurrentPageSize: (size: number) => void;
  
  // Optional Load More functionality
  handleLoadMore?: () => void;
  isLoadingMore?: boolean;
  totalCount?: number | null;
  currentCount?: number;
  
  // Optional page size options
  pageSizeOptions?: number[];
}

const AGGridPagination: React.FC<AGGridPaginationProps> = ({
  gridApi,
  totalItems,
  currentPage,
  currentPageSize,
  setCurrentPage,
  setCurrentPageSize,
  handleLoadMore,
  isLoadingMore = false,
  totalCount,
  currentCount,
  pageSizeOptions = [20, 50, 100, 500]
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / currentPageSize));
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage >= totalPages - 1;

  const handlePageSizeChange = (newSize: number) => {
    if (gridApi) {
      setCurrentPageSize(newSize);
      setCurrentPage(0);
      gridApi.setGridOption('paginationPageSize', newSize);
      gridApi.paginationGoToFirstPage();
    }
  };

  const handleFirstPage = () => {
    if (gridApi && !isFirstPage) {
      setCurrentPage(0);
      gridApi.paginationGoToFirstPage();
    }
  };

  const handlePreviousPage = () => {
    if (gridApi && !isFirstPage) {
      const newPage = Math.max(0, currentPage - 1);
      setCurrentPage(newPage);
      gridApi.paginationGoToPage(newPage);
    }
  };

  const handleNextPage = () => {
    if (gridApi && !isLastPage) {
      const newPage = Math.min(totalPages - 1, currentPage + 1);
      setCurrentPage(newPage);
      gridApi.paginationGoToPage(newPage);
    }
  };

  const handleLastPage = () => {
    if (gridApi && !isLastPage) {
      const lastPage = Math.max(0, totalPages - 1);
      setCurrentPage(lastPage);
      gridApi.paginationGoToLastPage();
    }
  };

  return (
    <div className="bg-white py-4 relative">
      <div className="flex justify-between items-center">
        {/* Left side - Load More + counts */}
        <div className="flex-1 flex items-center">
          {handleLoadMore && totalItems > 0 && (
            <>
              {!(totalCount !== null && totalItems >= totalCount) && (
                <button
                  className={`text-sm pr-4 flex items-center ${
                    isLoadingMore 
                      ? 'text-gray-500 cursor-not-allowed' 
                      : 'text-blue-500 cursor-pointer'
                  }`}
                  onClick={isLoadingMore ? undefined : handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-500 pr-4"></div>
                      <p className='pl-2'>Loading...</p>
                    </>
                  ) : (
                    'Load More...'
                  )}
                </button>
              )}
              {!(totalCount !== null && (currentCount || totalItems) >= (totalCount || 0)) && (
                <span className="text-black text-sm font-medium">
                  {currentCount || totalItems} of {totalCount || totalItems}
                </span>
              )}
            </>
          )}
        </div>
        
        {/* Right side - Page size selector and pagination */}
        <div className="flex items-center">
          {gridApi && totalItems > 0 && (
            <div className="flex items-center space-x-8">
              {/* Page Size label and selector */}
              <div className="flex items-center">
                <div className="text-black font-medium text-sm mr-2">Page Size:</div>
                <div className="relative inline-block">
                  <select 
                    className="appearance-none bg-white border border-gray-300 rounded px-3 py-1 pr-8 focus:outline-none text-sm font-medium"
                    value={currentPageSize}
                    onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                  >
                    {pageSizeOptions.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                    <svg className="fill-current h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Range display - bold and black */}
              <div className="text-black font-medium text-sm ml-6">
                {currentPage * currentPageSize + 1} to {Math.min((currentPage + 1) * currentPageSize, totalItems)} of {totalItems}
              </div>
              
              {/* Navigation buttons */}
              <div className="flex items-center ml-12">
                <button 
                  className="w-4 h-4 flex items-center justify-center text-black font-bold text-lg disabled:opacity-50"
                  onClick={handleFirstPage}
                  disabled={isFirstPage}
                  title="First Page"
                >
                  «
                </button>
                <button 
                  className="w-4 h-4 flex items-center justify-center text-black font-bold text-lg ml-1 disabled:opacity-50"
                  onClick={handlePreviousPage}
                  disabled={isFirstPage}
                  title="Previous Page"
                >
                  ‹
                </button>
                
                <div className="mx-4 text-black font-medium text-sm">
                  Page {currentPage + 1} of {totalPages}
                </div>
                
                <button 
                  className="w-4 h-4 flex items-center justify-center text-black font-bold text-lg disabled:opacity-50"
                  onClick={handleNextPage}
                  disabled={isLastPage}
                  title="Next Page"
                >
                  ›
                </button>
                <button 
                  className="w-4 h-4 flex items-center justify-center text-black font-bold text-lg ml-1 disabled:opacity-50"
                  onClick={handleLastPage}
                  disabled={isLastPage}
                  title="Last Page"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AGGridPagination;
