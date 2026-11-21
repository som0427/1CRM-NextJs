import React from "react";

/**
 * TwinModal Component
 *
 * A dual-panel modal component with a main modal and a slide-in secondary panel.
 * Useful for master-detail views, sidebars, or additional context panels.
 *
 * @component
 *
 * @example
 * // Basic usage with secondary panel
 * <TwinModal
 *   open={isOpen}
 *   onClose={handleClose}
 *   header={<h2>Items</h2>}
 *   secondaryOpen={showDetails}
 *   secondaryHeader={<h3>Item Details</h3>}
 *   secondaryContent={<ItemDetails item={selectedItem} />}
 * >
 *   <ItemList onSelect={setSelectedItem} />
 * </TwinModal>
 *
 * @example
 * // With footer on both panels
 * <TwinModal
 *   open={isOpen}
 *   onClose={handleClose}
 *   header={<h2>Settings</h2>}
 *   footer={<button>Save All</button>}
 *   secondaryOpen={showSubSettings}
 *   secondaryHeader={<h3>Advanced</h3>}
 *   secondaryContent={<AdvancedSettings />}
 *   secondaryFooter={<button>Apply</button>}
 *   secondaryWidth="500px"
 * >
 *   <MainSettings />
 * </TwinModal>
 *
 * Props (Main Panel):
 * -------------------
 * @param {boolean} open - Whether modal is visible (required)
 * @param {() => void} onClose - Callback when modal closes (required)
 * @param {React.ReactNode} children - Main panel content (required)
 * @param {React.ReactNode} [header] - Main panel header
 * @param {React.ReactNode} [footer] - Main panel footer
 * @param {string} [className=""] - Backdrop classes
 * @param {string} [modalClassName=""] - Main modal classes
 * @param {string} [containerClassName=""] - Container classes
 * @param {string} [mainHeightClassName] - Custom height class for main panel
 * @param {boolean} [fullScreen=false] - Full screen mode
 * @param {boolean} [allowBorder=false] - Border for main panel header/footer
 * @param {boolean} [closeOnOutsideClick=true] - Close on backdrop click (disabled when secondary open)
 *
 * Props (Secondary Panel):
 * ------------------------
 * @param {boolean} [secondaryOpen=false] - Show secondary panel
 * @param {React.ReactNode} [secondaryHeader] - Secondary panel header
 * @param {React.ReactNode} [secondaryContent] - Secondary panel content
 * @param {React.ReactNode} [secondaryFooter] - Secondary panel footer
 * @param {string} [secondaryWidth="420px"] - Width of secondary panel
 * @param {boolean} [allowBorderForSub=false] - Border for secondary panel
 *
 * Features:
 * ---------
 * - Main panel shifts left (-20px) when secondary opens
 * - Smooth slide-in transition (300ms)
 * - Prevents backdrop close when secondary is open
 * - Independent scrolling for each panel
 * - Sticky headers and footers
 * - Rounded corners and shadow
 */
interface TwinModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;

  // Same as Modal props
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  modalClassName?: string;
  containerClassName?: string;
  mainHeightClassName?: string;
  fullScreen?: boolean;
  allowBorder?: boolean;
  allowBorderForSub?: boolean
  closeOnOutsideClick?: boolean;

  // EXTRA for the second modal panel
  secondaryOpen?: boolean;

  secondaryHeader?: React.ReactNode;
  secondaryContent?: React.ReactNode;
  secondaryFooter?: React.ReactNode;
  secondaryWidth?: string;
}

// Helper function to render header content
const renderHeaderContent = (header: React.ReactNode): React.ReactNode => {
  // If it's a string, wrap with div and h2
  if (typeof header === 'string') {
    return (
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#3F4254]">{header}</h2>
      </div>
    );
  }
  // Otherwise, render as-is (for div or other React elements)
  return header;
};

const TwinModal: React.FC<TwinModalProps> = ({
  open,
  onClose,
  children,

  // modal props
  header,
  footer,
  className = "",
  modalClassName = "",
  containerClassName = "",
  mainHeightClassName,
  fullScreen = false,
  allowBorder = false,
  allowBorderForSub = false,
  closeOnOutsideClick = true,

  // second panel
  secondaryOpen = false,
  secondaryHeader,
  secondaryContent,
  secondaryFooter,
  secondaryWidth = "420px",
}) => {
  if (!open) return null;

  const handleBackdropClick = () => {
    if (!secondaryOpen && closeOnOutsideClick) {
      onClose();
    }
  };

  return (
    <div
      className={`
        fixed ${fullScreen ? "inset-0 z-[1000]" : "inset-x-0 top-10 bottom-0 z-50"}
        flex ${mainHeightClassName ? "":"items-center"} justify-center
        bg-black-100 bg-opacity-50 backdrop-blur-sm
        ${className}
      `}
      onClick={handleBackdropClick}
    >
      <div
        className={`${mainHeightClassName ? "pt-7" : "flex items-center justify-center"}`}
        onClick={(e) => e.stopPropagation()} // prevents closing
      >
        {/* -------------------------------------------- */}
        {/* MAIN PANEL (uses modal props) */}
        {/* -------------------------------------------- */}
        <div
          className={`
          bg-white relative rounded-lg shadow-xl
          ${fullScreen ? "w-[98vw]" : "w-[98vw]"}
          ${mainHeightClassName ? mainHeightClassName : fullScreen ? "h-[98vh]" : "h-[calc(96vh-64px)]"}
          flex flex-col overflow-visible
          transition-all duration-300
          ${modalClassName}
          ${secondaryOpen ? "translate-x-[-20px]" : "translate-x-0"}
          ${containerClassName}
        `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {header && (
            <div className={`sticky top-0 rounded-t-lg z-10 px-6 pt-4 pb-[16px] ${allowBorder ? "border-b" : ""} bg-white`}>
              {renderHeaderContent(header)}
            </div>
          )}

          {/* Content */}
          <div className="relative flex-1 overflow-y-auto px-6 py-4 hide-scrollbar">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className={`sticky bottom-0 rounded-b-lg  z-10 px-6 pt-[16px] pb-4 ${allowBorder ? "border-t" : ""} space-x-4 flex justify-end bg-white`}>
              {footer}
            </div>
          )}
        </div>

        {/* -------------------------------------------- */}
        {/* SECONDARY SLIDE-IN PANEL */}
        {/* -------------------------------------------- */}
        {secondaryOpen && (
          <div
            className={`
            bg-white relative rounded-xl shadow-xl
            h-[calc(96vh-64px)]
            flex flex-col overflow-visible transition-transform duration-300
          `}
            style={{ width: secondaryWidth }}
            onClick={(e) => e.stopPropagation()}
          >
            {secondaryHeader && (
              <div className={`sticky rounded-t-lg top-0 z-10 px-6 py-4 ${allowBorderForSub ? "border-b" : ""} bg-white flex justify-between items-center`}>
                {renderHeaderContent(secondaryHeader)}
              </div>
            )}

            <div className="relative flex-1 overflow-y-auto px-6 py-4 hide-scrollbar">
              {secondaryContent}
            </div>

            {secondaryFooter && (
              <div className={`sticky rounded-b-lg bottom-0 z-10 px-6 py-4 ${allowBorderForSub ? "border-t" : ""} bg-white flex justify-end`}>
                {secondaryFooter}
              </div>
            )}
          </div>
        )}

      </div>
    </div>

  );
};

export default TwinModal;
