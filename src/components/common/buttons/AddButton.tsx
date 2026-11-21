import React, { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "../../ui/tailwind/Button";
import { Plus } from "lucide-react";

/**
 * AddButton Component
 *
 * A circular button for adding new items with multiple icon variants.
 * Features smart tooltip positioning to stay within viewport.
 *
 * @component
 *
 * @example
 * // Basic usage (plus icon)
 * <AddButton
 *   pageHeading="Add User"
 *   handleOpenAddModal={() => setShowModal(true)}
 * />
 *
 * @example
 * // Duplicate variant
 * <AddButton
 *   pageHeading="Duplicate Item"
 *   handleOpenAddModal={handleDuplicate}
 *   variant="duplicate"
 * />
 *
 * @example
 * // Folder variant
 * <AddButton
 *   pageHeading="Add Folder"
 *   handleOpenAddModal={handleAddFolder}
 *   variant="folder"
 * />
 *
 * @example
 * // Document variant
 * <AddButton
 *   pageHeading="Add Document"
 *   handleOpenAddModal={handleAddDoc}
 *   variant="document"
 * />
 *
 * Props:
 * ------
 * @param {string} pageHeading - Tooltip text and aria-label (required)
 * @param {() => void} handleOpenAddModal - Click handler (required)
 * @param {"plus" | "duplicate" | "folder" | "document"} [variant="plus"] - Icon variant
 *
 * Variants:
 * ---------
 * - "plus": Plus icon (lucide-react)
 * - "duplicate": Stacked squares with plus
 * - "folder": Folder add SVG icon
 * - "document": Document add SVG icon
 *
 * Features:
 * ---------
 * - Blue circular button (40px)
 * - Smart tooltip auto-positioning
 * - Scale animation on hover
 * - Responsive tooltip stays in viewport
 */
interface AddButtonProps {
  pageHeading: string;
  handleOpenAddModal: () => void;
  variant?: "plus" | "duplicate" | "folder" | "document";
}

const DuplicateIcon: React.FC<{ className?: string }> = ({ className = "h-6 w-6" }) => (
  <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M9.56558 6.50389L9.75 6.49875H17.25C18.983 6.49875 20.3992 7.8552 20.4949 9.56432L20.5 9.74875V17.2487C20.5 18.9818 19.1435 20.398 17.4344 20.4936L17.25 20.4987H9.75C8.01697 20.4987 6.60075 19.1423 6.50515 17.4332L6.5 17.2487V9.74875C6.5 8.01571 7.85646 6.5995 9.56558 6.50389ZM17.25 7.99875H9.75C8.83183 7.99875 8.07881 8.70586 8.0058 9.60522L8 9.74875V17.2487C8 18.1669 8.70711 18.9199 9.60647 18.9929L9.75 18.9987H17.25C18.1682 18.9987 18.9212 18.2916 18.9942 17.3923L19 17.2487V9.74875C19 8.78225 18.2165 7.99875 17.25 7.99875ZM13.5 9.5C13.9142 9.5 14.25 9.83579 14.25 10.25V12.748L16.75 12.7487C17.1642 12.7487 17.5 13.0845 17.5 13.4987C17.5 13.913 17.1642 14.2487 16.75 14.2487L14.25 14.248V16.75C14.25 17.1642 13.9142 17.5 13.5 17.5C13.0858 17.5 12.75 17.1642 12.75 16.75V14.248L10.25 14.2487C9.83579 14.2487 9.5 13.913 9.5 13.4987C9.5 13.0845 9.83579 12.7487 10.25 12.7487L12.75 12.748V10.25C12.75 9.83579 13.0858 9.5 13.5 9.5ZM14.0818 2.73284L14.1345 2.90964L14.827 5.498H13.274L12.6856 3.29787C12.4355 2.36431 11.4759 1.81029 10.5423 2.06044L3.29787 4.00158C2.41344 4.23856 1.86966 5.11227 2.02756 5.99737L2.06044 6.14488L4.00158 13.3893C4.19372 14.1064 4.80445 14.5996 5.50045 14.6764L5.50056 16.1816C4.19932 16.1051 3.02962 15.2445 2.60539 13.9544L2.55269 13.7776L0.611548 6.53311C0.163006 4.85913 1.1067 3.1401 2.73284 2.60539L2.90964 2.55269L10.1541 0.611548C11.8281 0.163006 13.5471 1.1067 14.0818 2.73284Z" fill="currentColor"/>
  </svg>
);

const AddButton: React.FC<AddButtonProps> = ({ pageHeading, handleOpenAddModal, variant = "plus" }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  const calculateTooltipPosition = useCallback(() => {
    if (!containerRef.current || !tooltipRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const padding = 8; // Minimum padding from screen edge

    // Calculate centered position (tooltip center aligned with button center)
    const buttonCenterX = containerRect.left + containerRect.width / 2;
    let tooltipLeft = buttonCenterX - tooltipRect.width / 2;

    // Adjust if tooltip would go off the right edge
    if (tooltipLeft + tooltipRect.width > viewportWidth - padding) {
      tooltipLeft = viewportWidth - tooltipRect.width - padding;
    }

    // Adjust if tooltip would go off the left edge
    if (tooltipLeft < padding) {
      tooltipLeft = padding;
    }

    // Convert to position relative to container
    const relativeLeft = tooltipLeft - containerRect.left;

    setTooltipStyle({
      left: `${relativeLeft}px`,
      transform: 'none',
    });
  }, []);

  useEffect(() => {
    // Calculate on mount and window resize
    calculateTooltipPosition();
    window.addEventListener('resize', calculateTooltipPosition);
    return () => window.removeEventListener('resize', calculateTooltipPosition);
  }, [calculateTooltipPosition]);

  const renderIcon = () => {
    switch (variant) {
      case "duplicate":
        return <DuplicateIcon className="h-5 w-5" />;
      case "folder":
        return <img src="/svg/icons/general/FolderAdd.svg" alt="Add Folder" className="h-6 w-6" />;
      case "document":
        return <img src="/svg/icons/general/DocumentAdd.svg" alt="Add Document" className="h-6 w-6" />;
      case "plus":
      default:
        return <Plus className="h-5 w-5" />;
    }
  };

  return (
    <div ref={containerRef} className="flex items-center relative group">
      <Button
        className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-full h-10 w-10 flex items-center justify-center shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105"
        aria-label={`${pageHeading}`}
        onClick={handleOpenAddModal}
        onMouseEnter={calculateTooltipPosition}
      >
        <div className="flex items-center justify-center">
          {renderIcon()}
        </div>
      </Button>
      {/* Tooltip - auto-positions to stay in viewport while trying to center */}
      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className="absolute -bottom-8 px-2 py-1 bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50"
      >
        {pageHeading}
      </div>
    </div>
  );
};

export default AddButton;
