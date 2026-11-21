import React from 'react';
import { PaginationInfo } from '../../lib/models/customerModels';

interface PaginationProps {
  paginationInfo: PaginationInfo;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

/**
 * Reusable pagination component that follows the application design standards
 */
const Pagination: React.FC<PaginationProps> = ({ 
  paginationInfo,
  onPageChange,
  onItemsPerPageChange
}) => {
  const { currentPage, totalPages, itemsPerPage, totalItems } = paginationInfo;
  
  return (
    <div style={{ padding: '10px 16px', borderTop: '1px solid #e4e6ef' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        {/* Left side */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            style={{
              color: '#3699ff',
              background: 'none',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              marginRight: '20px'
            }}
            onClick={() => {
              // Load more logic
              onItemsPerPageChange(paginationInfo.itemsPerPage + 10);
            }}
          >
            Load More...
          </button>
          
          <div style={{ fontSize: '14px', color: '#6c757d' }}>
            <span>{paginationInfo.totalItems} of {paginationInfo.totalItems}</span>
            <span style={{ marginLeft: '10px' }}>Items per page:</span>
            <select 
              style={{
                marginLeft: '8px',
                padding: '4px 8px',
                border: '1px solid #e4e6ef',
                borderRadius: '4px'
              }}
              value={paginationInfo.itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
        
        {/* Right side - Page controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px', color: '#6c757d' }}>
            {paginationInfo.totalItems === 0 ? 0 : (paginationInfo.currentPage - 1) * paginationInfo.itemsPerPage + 1} to {Math.min(paginationInfo.currentPage * paginationInfo.itemsPerPage, paginationInfo.totalItems)} of {paginationInfo.totalItems}
          </span>
          
          <div style={{ display: 'flex', gap: '5px' }}>
            <span style={{ fontSize: '14px', color: '#6c757d' }}>Page {paginationInfo.currentPage} of {paginationInfo.totalPages}</span>
            <button 
              onClick={() => onPageChange(Math.max(1, paginationInfo.currentPage - 1))}
              disabled={paginationInfo.currentPage === 1}
              style={{
                background: 'none',
                border: 'none',
                cursor: paginationInfo.currentPage === 1 ? 'default' : 'pointer',
                color: paginationInfo.currentPage === 1 ? '#ccc' : '#3699ff'
              }}
            >
              &lt;
            </button>
            <button 
              onClick={() => onPageChange(Math.min(paginationInfo.totalPages, paginationInfo.currentPage + 1))}
              disabled={paginationInfo.currentPage === paginationInfo.totalPages}
              style={{
                background: 'none',
                border: 'none',
                cursor: paginationInfo.currentPage === paginationInfo.totalPages ? 'default' : 'pointer',
                color: paginationInfo.currentPage === paginationInfo.totalPages ? '#ccc' : '#3699ff'
              }}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
