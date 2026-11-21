import React from 'react';

/**
 * AndOrToggle Component (Enhanced)
 *
 * A pill-shaped toggle button for AND/OR operator selection with smooth sliding animation.
 * Supports showing both options or individual options only, with disabled state.
 */

// ============================================
// COLOR CONSTANTS
// ============================================
const COLORS = {
  // Primary - Blue (on/selected state)
  primary: {
    base: '#3699FF',
    hover: '#2563eb',     // blue-600
    text: '#ffffff',
    shadow: 'rgba(54, 153, 255, 0.4)',
  },
  // Container/Off state - Grey (with gradient for depth)
  container: {
    from: '#f3f4f6',      // gray-100
    to: '#e5e7eb',        // gray-200
    shadowInner: 'rgba(0, 0, 0, 0.06)',
    shadowOuter: 'rgba(255, 255, 255, 0.8)',
    text: '#3F4254',
    textHover: '#1f2937', // gray-800
  },
  // Highlight for depth
  highlight: 'rgba(255, 255, 255, 0.25)',
} as const;

// ============================================
// COMPONENT
// ============================================
interface AndOrToggleProps {
  value: 'AND' | 'OR';
  onChange: (value: 'AND' | 'OR') => void;
  showAnd?: boolean;
  showOr?: boolean;
  disabled?: boolean;
  className?: string;
}

const AndOrToggle: React.FC<AndOrToggleProps> = ({
  value,
  onChange,
  showAnd = true,
  showOr = true,
  disabled = false,
  className = '',
}) => {
  if (!showAnd && !showOr) {
    return null;
  }

  const handleClick = (newValue: 'AND' | 'OR') => {
    if (!disabled) {
      onChange(newValue);
    }
  };

  // Container with gradient and subtle shadows for depth
  const containerStyle: React.CSSProperties = {
    background: `linear-gradient(to bottom, ${COLORS.container.from}, ${COLORS.container.to})`,
    boxShadow: `inset 0 2px 4px ${COLORS.container.shadowInner}, 0 1px 2px ${COLORS.container.shadowOuter}`,
  };

  // Sliding pill with glow
  const pillStyle: React.CSSProperties = {
    backgroundColor: COLORS.primary.base,
    boxShadow: `0 4px 12px -2px ${COLORS.primary.shadow}, inset 0 1px 1px ${COLORS.highlight}`,
    width: 'calc(50% - 4px)',
    left: value === 'AND' ? '4px' : 'calc(50%)',
    transition: 'all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  };

  const getButtonStyle = (isSelected: boolean): React.CSSProperties => ({
    color: isSelected ? COLORS.primary.text : COLORS.container.text,
  });

  // Single option render - fixed width to match AND button size
  if (!showAnd || !showOr) {
    const singleValue = showAnd ? 'AND' : 'OR';
    return (
      <div className={`inline-flex ${className}`}>
        <div
          className={`
            px-3.5 py-2.5 rounded-full text-sm font-semibold tracking-wide text-center
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          style={{
            backgroundColor: COLORS.primary.base,
            color: COLORS.primary.text,
            boxShadow: `0 4px 12px -2px ${COLORS.primary.shadow}, inset 0 1px 1px ${COLORS.highlight}`,
            minWidth: '56px',  // Fixed width to match AND button size
          }}
        >
          {singleValue}
        </div>
      </div>
    );
  }

  // Both options render
  return (
    <div
      className={`
        relative inline-flex rounded-full p-1
        ${disabled ? 'opacity-50' : ''} 
        ${className}
      `}
      style={containerStyle}
    >
      {/* Sliding background indicator */}
      <div
        className="absolute top-1 bottom-1 rounded-full"
        style={pillStyle}
      />

      {/* AND Button */}
      <button
        type="button"
        onClick={() => handleClick('AND')}
        disabled={disabled}
        className={`
          relative z-10 px-3.5 py-2.5 rounded-full text-sm font-semibold tracking-wide
          transition-colors duration-300 ease-out
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={getButtonStyle(value === 'AND')}
        onMouseEnter={(e) => {
          if (value !== 'AND' && !disabled) {
            e.currentTarget.style.color = COLORS.container.textHover;
          }
        }}
        onMouseLeave={(e) => {
          if (value !== 'AND' && !disabled) {
            e.currentTarget.style.color = COLORS.container.text;
          }
        }}
      >
        AND
      </button>

      {/* OR Button */}
      <button
        type="button"
        onClick={() => handleClick('OR')}
        disabled={disabled}
        className={`
          relative z-10 px-3.5 py-2.5 rounded-full text-sm font-semibold tracking-wide
          transition-colors duration-300 ease-out
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={getButtonStyle(value === 'OR')}
        onMouseEnter={(e) => {
          if (value !== 'OR' && !disabled) {
            e.currentTarget.style.color = COLORS.container.textHover;
          }
        }}
        onMouseLeave={(e) => {
          if (value !== 'OR' && !disabled) {
            e.currentTarget.style.color = COLORS.container.text;
          }
        }}
      >
        OR
      </button>
    </div>
  );
};

export default AndOrToggle;
