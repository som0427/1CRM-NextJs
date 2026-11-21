import React from "react";
import { Button } from "../../ui/tailwind/Button";

/**
 * ReorderButton Component
 *
 * A circular button for saving display order changes, typically used with drag-and-drop reordering.
 * Features loading state with spinner animation.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <ReorderButton onClick={handleSaveOrder} />
 *
 * @example
 * // With loading state
 * <ReorderButton onClick={handleSaveOrder} loading={isSaving} />
 *
 * Props:
 * ------
 * @param {() => void} [onClick] - Callback when button clicked
 * @param {boolean} [loading=false] - Show loading spinner
 *
 * Features:
 * ---------
 * - Blue circular button (40px)
 * - Package/reorder icon
 * - Loading spinner when saving
 * - Tooltip: "Save Display Order"
 * - Scale animation on hover
 * - Disabled state during loading
 */
interface ReorderButtonProps {
  onClick?: () => void;
  loading?: boolean;
}

const ReorderButton: React.FC<ReorderButtonProps> = ({ onClick, loading = false }) => {
  return (
    <div className="flex items-center relative group">
      <Button
        className={`bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-full h-10 w-10 flex items-center justify-center shadow-sm transition-all duration-200 ease-in-out ${loading ? "opacity-80 cursor-wait" : "transform hover:scale-105"}`}
        aria-label="Reorder items"
        type="button"
        onClick={loading ? undefined : onClick}
        disabled={loading}
      >
        {loading ? (
          <span className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="text-white"
          >
            <path
              d="M4 5.25C4 4.00736 5.00736 3 6.25 3H15.75C16.9926 3 18 4.00736 18 5.25V14H22V17.75C22 19.5449 20.5449 21 18.75 21H11.6668C11.8811 20.6276 12 20.1993 12 19.753V19.5H16.5V5.25C16.5 4.83579 16.1642 4.5 15.75 4.5H6.25C5.83579 4.5 5.5 4.83579 5.5 5.25V11.0505C5.28783 11.0938 5.07996 11.1649 4.88197 11.2639L4 11.7049V5.25ZM13.75 12.5H9.59017L7.55009 11.48C7.65849 11.1992 7.93098 11 8.25 11H13.75C14.1642 11 14.5 11.3358 14.5 11.75C14.5 12.1642 14.1642 12.5 13.75 12.5ZM18 19.5H18.75C19.7165 19.5 20.5 18.7165 20.5 17.75V15.5H18V19.5ZM8.25 7C7.83579 7 7.5 7.33579 7.5 7.75C7.5 8.16421 7.83579 8.5 8.25 8.5H13.75C14.1642 8.5 14.5 8.16421 14.5 7.75C14.5 7.33579 14.1642 7 13.75 7H8.25ZM10.1708 13.9084L6.67082 12.1584C6.24853 11.9472 5.75147 11.9472 5.32918 12.1584L1.82918 13.9084C1.321 14.1624 1 14.6818 1 15.25V19.753C1 20.3211 1.321 20.8405 1.82918 21.0946L5.32918 22.8446C5.75147 23.0557 6.24853 23.0557 6.67082 22.8446L10.1708 21.0946C10.679 20.8405 11 20.3211 11 19.753V15.25C11 14.6818 10.679 14.1624 10.1708 13.9084ZM2.55279 15.2764C2.67628 15.0294 2.97662 14.9293 3.22361 15.0528L6 16.441L8.77639 15.0528C9.02338 14.9293 9.32372 15.0294 9.44721 15.2764C9.57071 15.5234 9.4706 15.8237 9.22361 15.9472L6.5 17.3091V20.5C6.5 20.7762 6.27614 21 6 21C5.72386 21 5.5 20.7762 5.5 20.5V17.3091L2.77639 15.9472C2.5294 15.8237 2.42929 15.5234 2.55279 15.2764Z"
              fill="currentColor"
            />
          </svg>
        )}
      </Button>
      {/* Tooltip */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
        Save Display Order
      </div>
    </div>
  );
};

export default ReorderButton;
