/**
 * Shared styles to ensure consistency across all application pages
 * This file contains common styles that can be imported and used in multiple pages
 */
import { CSSProperties } from 'react';

type StyleObject = { [key: string]: any };

export const pageStyles = {
  // Main container styles for all pages
  pageContainer: {
    fontFamily: 'Arial, sans-serif',
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '100vh',
    backgroundColor: 'white',
    color: '#4F4F4F',
    padding: 0
  },

  // Fixed header styles used across pages
  pageHeader: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
    backgroundColor: 'white',
    borderBottom: '1px solid #e4e6ef',
    padding: '15px 20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
  },

  // Header title container
  headerTitleContainer: {
    display: 'flex', 
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  // Page title style
  pageTitle: {
    fontSize: '24px', 
    margin: 0,
    padding: 0,
    color: '#181c32'
  },

  // Header actions container
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap' as const
  },

  // Search input container
  searchContainer: {
    position: 'relative' as const,
    width: '200px',
    marginRight: '12px'
  },

  // Search input field
  searchInput: {
    width: '100%',
    padding: '8px 10px 8px 36px',
    borderRadius: '6px',
    border: '1px solid #e4e6ef',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#4F4F4F',
    outline: 'none',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    transition: 'all 0.2s',
    height: '36px',
    '&::placeholder': {
      color: '#a1a5b7',
    },
    '&:focus': {
      borderColor: '#3699ff',
      boxShadow: '0 0 0 2px rgba(54, 153, 255, 0.1)'
    },
    '&:hover': {
      borderColor: '#3699ff',
    }
  },

  // Search icon
  searchIcon: {
    position: 'absolute' as const,
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#6993ff',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Filter button
  filterButton: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f3f6f9',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    cursor: 'pointer',
    color: '#7e8299',
    fontSize: '14px'
  },

  // Primary action button (like "Add New")
  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#0095e8',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    cursor: 'pointer',
    color: 'white',
    fontSize: '14px'
  },

  // Content area that scrolls independently
  contentContainer: {
    padding: '0',
    flex: 1,
    overflowY: 'auto' as const
  },

  // Container for the data table or main content
  dataContainer: {
    backgroundColor: 'white',
    overflow: 'hidden',
    height: '100%'
  },

  // Table styles
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
    overflow: 'hidden' as const,
  },

  // Table header
  tableHeader: {
    background: 'linear-gradient(to right, #3699ff, #6979f8)',
  },

  // Table header cell
  tableHeaderCell: {
    padding: '12px 16px',
    textAlign: 'left' as const,
    fontWeight: 600,
    fontSize: '13px',
    color: 'white',
    borderBottom: 'none',
  },

  // Table body row
  tableRow: {
    borderBottom: 'none',
    transition: 'all 0.15s ease',
    '&:hover': {
      backgroundColor: '#f3f6f9',
      boxShadow: '0 1px 5px rgba(0, 0, 0, 0.07)',
    }
  },

  // Table data cell
  tableCell: {
    padding: '12px 16px',
    fontSize: '13px',
    color: '#464e5f',
  },

  // Status indicator
  statusBadge: (status: string) => ({
    display: 'inline-block',
    padding: '5px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    backgroundColor: status.toLowerCase() === 'active' ? '#e1f0ff' : '#ffe2eb',
    color: status.toLowerCase() === 'active' ? '#3699ff' : '#f1416c',
    textTransform: 'capitalize' as const
  }),

  // Action buttons container
  actionButtonsContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
  },

  // Action button
  actionButton: {
    backgroundColor: '#f0f7ff',
    border: 'none',
    borderRadius: '4px',
    color: '#3699ff',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '14px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    '&:hover': {
      backgroundColor: '#e1f0ff',
      color: '#2d8ff3',
      transform: 'scale(1.1)',
      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)'
    }
  },

  // Loading indicator
  loadingIndicator: {
    padding: '20px', 
    textAlign: 'center' as const
  },

  // Empty state message
  emptyState: {
    padding: '20px', 
    textAlign: 'center' as const
  },

  // Modern primary button style
  modernPrimaryButton: {
    background: 'linear-gradient(to right, #3699ff, #6979f8)',
    color: 'white',
    border: 'none',
    padding: '7px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    fontWeight: 600,
    fontSize: '13px',
    letterSpacing: '0.3px',
    transition: 'all 0.2s',
    height: '36px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    '&:hover': {
      background: 'linear-gradient(to right, #2d8ff3, #5a6af0)',
      boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
    }
  },
  
  // Secondary button style
  secondaryButton: {
    background: 'linear-gradient(to right, #3699ff, #6979f8)',
    color: 'white',
    border: 'none',
    width: '36px',
    height: '36px',
    padding: '0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    '&:hover': {
      background: 'linear-gradient(to right, #2d8ff3, #5a6af0)',
      boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
    }
  },
  
  // Icon button style
  iconButton: {
    background: 'linear-gradient(to right, #3699ff, #6979f8)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    width: '36px',
    height: '36px',
    padding: '0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    marginRight: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    '&:hover': {
      background: 'linear-gradient(to right, #2d8ff3, #5a6af0)',
      boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
    }
  },
  
  // Small icon button (for button groups)
  iconButtonSmall: {
    backgroundColor: 'white',
    color: '#3699ff',
    border: 'none',
    borderRadius: '0',
    width: '36px',
    height: '36px',
    padding: '0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    margin: '0',
    fontSize: '16px',
    '&:hover': {
      backgroundColor: '#f0f7ff',
    },
    '&.active': {
      background: 'linear-gradient(to right, #3699ff, #6979f8)',
      color: 'white',
    },
    '&:first-child': {
      borderTopLeftRadius: '6px',
      borderBottomLeftRadius: '6px',
    },
    '&:last-child': {
      borderTopRightRadius: '6px',
      borderBottomRightRadius: '6px',
    }
  },
  
  // Button group container
  buttonGroup: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: '6px',
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    marginRight: '12px',
    border: '1px solid #e4e6ef',
    '& > button': {
      borderRadius: '0',
      border: 'none',
      borderRight: '1px solid #eaeef5',
    },
    '& > button:last-child': {
      borderRight: 'none',
    }
  }

};
