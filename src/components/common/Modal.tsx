import React from "react";

/**
 * Modal Component
 *
 * A flexible modal dialog component with header, scrollable content, and footer sections.
 * Supports full-screen mode and customizable styling.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <Modal open={isOpen} onClose={() => setIsOpen(false)}>
 *   <p>Modal content here</p>
 * </Modal>
 *
 * @example
 * // With header and footer
 * <Modal
 *   open={isOpen}
 *   onClose={handleClose}
 *   header={<h2>Edit Item</h2>}
 *   footer={
 *     <>
 *       <button onClick={handleClose}>Cancel</button>
 *       <button onClick={handleSave}>Save</button>
 *     </>
 *   }
 * >
 *   <form>...</form>
 * </Modal>
 *
 * @example
 * // Full screen modal
 * <Modal open={isOpen} onClose={handleClose} fullScreen={true}>
 *   <div>Full screen content</div>
 * </Modal>
 *
 * @example
 * // Prevent close on outside click
 * <Modal open={isOpen} onClose={handleClose} closeOnOutsideClick={false}>
 *   <div>Must click button to close</div>
 * </Modal>
 *
 * Props:
 * ------
 * @param {boolean} open - Whether modal is visible (required)
 * @param {() => void} onClose - Callback when modal closes (required)
 * @param {React.ReactNode} children - Modal content (required)
 * @param {React.ReactNode} [header] - Sticky header content
 * @param {React.ReactNode} [footer] - Sticky footer content (right-aligned)
 * @param {string} [className=""] - Additional classes for backdrop
 * @param {string} [modalClassName=""] - Additional classes for modal container
 * @param {string} [containerClassName=""] - Additional container classes
 * @param {boolean} [fullScreen=false] - Full screen mode (98vw x 98vh)
 * @param {boolean} [allowBorder=false] - Show border between header/content/footer
 * @param {boolean} [closeOnOutsideClick=true] - Close when clicking backdrop
 *
 * Features:
 * ---------
 * - Backdrop with blur effect
 * - Sticky header and footer
 * - Scrollable content area with hidden scrollbar
 * - Full screen mode option
 * - Click outside to close (configurable)
 * - Rounded corners and shadow
 * - z-index: 50 (or 1000 for fullScreen)
 */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  modalClassName?: string;
  containerClassName?: string;
  fullScreen?: boolean;
  allowBorder?: boolean;
  closeOnOutsideClick?: boolean;
}


const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  header,
  children,
  footer,
  className = "",
  modalClassName = "",
  containerClassName = "",
  fullScreen = false,
  allowBorder = false,
  closeOnOutsideClick = true
}) => {

  if (!open) return null;

  const handleBackdropClick = () => {
    if (closeOnOutsideClick) {
      onClose();
    }
  };

  return (
    <div
      className={`fixed ${fullScreen ? 'inset-0 z-[1000]' : 'inset-x-0 top-10 bottom-0 z-50'} flex items-center justify-center bg-black-100 ${fullScreen ? 'bg-opacity-100 backdrop-blur-md' : 'bg-opacity-50 backdrop-blur-sm'} ${className}`}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white relative rounded-lg shadow-xl ${fullScreen ? 'w-[98vw] h-[98vh]' : 'w-[98vw] h-[calc(96vh-64px)]'} flex flex-col overflow-visible ${modalClassName} ${containerClassName}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {header && (
          <div className={`sticky rounded-t-lg top-0 z-10 px-6 pt-4 pb-[16px] ${allowBorder ? 'border-b' : ''} bg-white`}>
            {header}
          </div>
        )}
        {/* Scrollable Content */}
        <div className="relative flex-1 overflow-y-auto px-6 py-4 hide-scrollbar">
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div className={`sticky bottom-0 rounded-b-lg z-10 px-6 pt-[16px] pb-4 gap-4 ${allowBorder ? 'border-t' : ''} flex justify-end bg-white`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
