import React, { useEffect, useState, useRef } from 'react';

/**
 * AlertDialog Component
 *
 * A flexible, customizable dialog component with support for custom titles,
 * body content (React components or strings), and multiple action buttons.
 *
 * @component
 *
 * @example
 * // Simple alert with OK button
 * <AlertDialog
 *   open={showAlert}
 *   onClose={() => setShowAlert(false)}
 *   title="Alert"
 *   message="This is a simple alert message."
 *   buttons={[
 *     { label: 'OK', onClick: () => setShowAlert(false), variant: 'primary' }
 *   ]}
 * />
 *
 * @example
 * // Confirmation with multiple buttons
 * <AlertDialog
 *   open={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   title="Confirm Action"
 *   titleIcon={<TrashIcon className="w-5 h-5 text-red-500" />}
 *   message="Are you sure you want to delete this item?"
 *   buttons={[
 *     { label: 'Cancel', onClick: () => setShowConfirm(false), variant: 'secondary' },
 *     { label: 'Delete', onClick: handleDelete, variant: 'danger', loading: isDeleting }
 *   ]}
 * />
 *
 * @example
 * // Custom body content with React component
 * <AlertDialog
 *   open={showCustom}
 *   onClose={() => setShowCustom(false)}
 *   title="Select Options"
 *   body={
 *     <div className="space-y-2">
 *       <label><input type="checkbox" /> Option 1</label>
 *       <label><input type="checkbox" /> Option 2</label>
 *     </div>
 *   }
 *   buttons={[
 *     { label: 'Cancel', onClick: handleCancel, variant: 'secondary' },
 *     { label: 'Apply', onClick: handleApply, variant: 'primary' }
 *   ]}
 *   size="lg"
 * />
 *
 * @example
 * // Large dialog with scrollable content
 * <AlertDialog
 *   open={showLarge}
 *   onClose={() => setShowLarge(false)}
 *   title="Terms and Conditions"
 *   body={<LongContentComponent />}
 *   buttons={[
 *     { label: 'Decline', onClick: handleDecline, variant: 'secondary' },
 *     { label: 'Accept', onClick: handleAccept, variant: 'primary' }
 *   ]}
 *   size="xl"
 *   maxHeight="70vh"
 * />
 *
 * Props:
 * ------
 * @param {boolean} open - Whether dialog is visible (required)
 * @param {() => void} onClose - Callback when dialog closes (required)
 * @param {string} [title] - Dialog title text
 * @param {AlertDialogIconType} [titleIcon] - Icon: preset ('info'|'warning'|'danger'|'success') or custom React node
 * @param {string} [message] - Simple message string (use body for complex content)
 * @param {React.ReactNode} [body] - Custom body content (overrides message)
 * @param {ButtonConfig[]} [buttons] - Array of button configurations
 * @param {"sm" | "md" | "lg" | "xl"} [size="md"] - Dialog width size
 * @param {string} [maxHeight="80vh"] - Maximum height of dialog
 * @param {boolean} [closeOnBackdropClick=true] - Close when clicking backdrop
 * @param {boolean} [showCloseButton=false] - Show X button in header
 * @param {string} [className] - Additional classes for dialog container
 *
 * ButtonConfig:
 * -------------
 * @typedef {Object} ButtonConfig
 * @property {string} label - Button text
 * @property {() => void} onClick - Click handler
 * @property {"primary" | "secondary" | "danger" | "success" | "warning" | "ghost"} [variant="primary"] - Button style
 * @property {boolean} [disabled] - Disable button
 * @property {boolean} [loading] - Show loading spinner
 * @property {string} [className] - Additional button classes
 */

export interface AlertDialogButtonConfig {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

// Icon type can be a preset string or custom React node
export type AlertDialogIconType = 'info' | 'warning' | 'danger' | 'success' | React.ReactNode;

interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  titleIcon?: AlertDialogIconType;
  message?: string;
  body?: React.ReactNode;
  buttons?: AlertDialogButtonConfig[];
  size?: 'sm' | 'md' | 'lg' | 'xl';
  maxHeight?: string;
  closeOnBackdropClick?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const AlertDialog: React.FC<AlertDialogProps> = ({
  open,
  onClose,
  title,
  titleIcon,
  message,
  body,
  buttons = [],
  size = 'md',
  maxHeight = '80vh',
  closeOnBackdropClick = true,
  showCloseButton = false,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  // Handle open/close animations
  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (open) {
      setIsAnimating(false);
      setIsVisible(true);
      animationFrameRef.current = requestAnimationFrame(() => {
        animationFrameRef.current = requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else if (isVisible) {
      setIsAnimating(false);
      closeTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 300);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, [open, isVisible]);

  if (!isVisible) return null;

  // Size classes mapping
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  // Button variant classes
  const getButtonClasses = (variant: AlertDialogButtonConfig['variant'] = 'primary') => {
    // Ghost has completely different base classes - no hover effects at all
    if (variant === 'ghost') {
      return 'px-4 py-2 rounded h-10 min-w-[80px] flex items-center justify-center cursor-pointer bg-transparent text-[#3F4254] disabled:opacity-50 disabled:cursor-not-allowed';
    }

    const baseClasses = 'px-4 py-2 rounded h-10 min-w-[80px] flex items-center justify-center shadow-sm transition-all duration-200 transform hover:scale-105 hover:shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-sm';

    const variantClasses = {
      primary: 'bg-[#3699FF] hover:bg-blue-600 text-white',
      secondary: 'bg-[#E4E6EF] hover:bg-gray-300 text-[#3F4254]',
      danger: 'bg-[#F64E60] hover:bg-red-600 text-white',
      success: 'bg-[#1BC5BD] hover:bg-teal-600 text-white',
      warning: 'bg-[#FFA800] hover:bg-amber-600 text-white',
    };

    return `${baseClasses} ${variantClasses[variant]}`;
  };

  // Render title icon - supports preset types or custom React nodes
  const renderTitleIcon = () => {
    if (!titleIcon) return null;

    // Check if it's a preset string type
    if (typeof titleIcon === 'string') {
      const presetIcons: Record<string, React.ReactNode> = {
        info: (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#3699FF]/10">
            <svg className="w-5 h-5 text-[#3699FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        ),
        warning: (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        ),
        danger: (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#F64E60]/10">
            <svg className="w-5 h-5 text-[#F64E60]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        ),
        success: (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1BC5BD]/10">
            <svg className="w-5 h-5 text-[#1BC5BD]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        ),
      };

      return presetIcons[titleIcon] || null;
    }

    // It's a custom React node, render as-is
    return titleIcon;
  };

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 z-[9999]
          bg-black/40 backdrop-blur-md
          transition-opacity duration-300 ease-out
          ${isAnimating ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={handleBackdropClick}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`
            bg-white w-full ${sizeClasses[size]} pointer-events-auto
            shadow-2xl rounded-lg overflow-hidden flex flex-col
            transition-all duration-300 ease-out
            ${isAnimating ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}
            ${className}
          `}
          style={{ maxHeight }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Fixed */}
          {(title || showCloseButton || titleIcon) && (
            <div className="sticky top-0 z-10 px-6 py-4 border-b bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                {titleIcon && (
                  <div className="flex-shrink-0">
                    {renderTitleIcon()}
                  </div>
                )}
                {title && (
                  <h2 className="text-lg font-semibold text-gray-900">
                    {title}
                  </h2>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Body - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {body ? (
              body
            ) : message ? (
              <p className="text-gray-700 text-base leading-relaxed">
                {message}
              </p>
            ) : null}
          </div>

          {/* Footer - Fixed */}
          {buttons.length > 0 && (
            <div className="sticky bottom-0 z-10 px-6 py-4 border-t bg-white flex justify-end gap-3">
              {buttons.map((button, index) => (
                <button
                  key={index}
                  onClick={button.onClick}
                  disabled={button.disabled || button.loading}
                  className={`${getButtonClasses(button.variant)} ${button.className || ''}`}
                >
                  {button.loading ? (
                    <span className="inline-block h-5 w-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  ) : (
                    button.label
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AlertDialog;
