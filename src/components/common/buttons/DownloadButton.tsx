import React from "react";
import { Button } from "../../ui/tailwind/Button";
import Image from "next/image";
import { Download } from "lucide-react";

/**
 * DownloadButton Component
 *
 * A circular button for exporting/downloading data.
 * Features loading spinner during export operations.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <DownloadButton
 *   exporting={isExporting}
 *   exportEntities={handleExport}
 * />
 *
 * Props:
 * ------
 * @param {boolean} exporting - Whether export is in progress (required)
 * @param {() => void} exportEntities - Callback to trigger export (required)
 *
 * Features:
 * ---------
 * - Blue circular button (40px)
 * - Export icon from SVG
 * - Indigo spinner during export
 * - Scale animation on hover/active
 * - Disabled state during export
 */
interface DownloadButtonProps {
  exporting: boolean;
  exportEntities: () => void;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ exporting, exportEntities }) => (
  <Button
    className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-full h-10 w-10 flex items-center justify-center shadow-sm transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95"
    aria-label="Export"
    onClick={exportEntities}
    disabled={exporting}
  >
    {exporting ? (
      <span className="h-4 w-4 animate-spin rounded-full border-t-2 border-b-2 border-indigo-500"></span>
    ) : (
      <Image 
          src="/svg/icons/general/export.svg" 
          alt="Export" 
          width={24} 
          height={24} 
        />
    )}
  </Button>
);

export default DownloadButton;
