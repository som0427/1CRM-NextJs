
import React from "react";

/**
 * Available size options for the Spinner component.
 * - 'small': 32x32 pixels (h-8 w-8)
 * - 'medium': 40x40 pixels (h-10 w-10)
 * - 'large': 48x48 pixels (h-12 w-12)
 */
type SpinnerSize = 'small' | 'medium' | 'large';

const sizeClasses: Record<SpinnerSize, string> = {
    small: 'h-8 w-8',
    medium: 'h-10 w-10',
    large: 'h-12 w-12',
};


type version = 'custom' | 'fixed';

const versionClasses: Record<version, string> = {
    custom: 'w-full h-full min-h-[100px]',
    fixed: 'fixed inset-0',
};

/**
 * Spinner Component
 *
 * A loading indicator component that displays a spinning animation with optional
 * customization for size, blur background, and loading text.
 *
 * @component
 *
 * @example
 * // Basic usage (large spinner with "Loading..." text)
 * <Spinner />
 *
 * @example
 * // Small spinner
 * <Spinner size="small" />
 *
 * @example
 * // Medium spinner with custom loading text
 * <Spinner size="medium" customLoadingName="Saving..." />
 *
 * @example
 * // Spinner with blur background overlay
 * <Spinner blur={true} />
 *
 * @example
 * // Spinner with additional custom classes
 * <Spinner className="my-custom-class" />
 *
 * @example
 * // Fixed spinner covering entire viewport
 * <Spinner version="fixed" blur={true} />
 *
 * @example
 * // Fixed spinner with custom z-index
 * <Spinner version="fixed" zIndex={1000} />
 *
 * @example
 * // Full customization
 * <Spinner
 *   size="medium"
 *   blur={true}
 *   customLoadingName="Uploading..."
 *   className="text-blue-500"
 *   version="fixed"
 *   zIndex={999}
 * />
 *
 * Props:
 * ------
 * @param {string} [className=""] - Additional CSS classes to apply to the spinner container.
 *   Use this to add custom styling like colors, margins, or other Tailwind utilities.
 *
 * @param {boolean} [blur=false] - When true, adds a semi-transparent dark overlay with
 *   backdrop blur effect behind the spinner. Useful for modal-like loading states where
 *   you want to obscure the background content.
 *
 * @param {string|null} [customLoadingName=null] - Custom text to display below the spinner.
 *   If null or not provided, defaults to "Loading...". Use this to provide context-specific
 *   loading messages like "Saving...", "Uploading...", "Processing...", etc.
 *
 * @param {SpinnerSize} [size='large'] - Size of the spinner animation.
 *   - 'small': 32x32 pixels (h-8 w-8) - Use for inline or compact loading states
 *   - 'medium': 40x40 pixels (h-10 w-10) - Use for moderate-sized containers
 *   - 'large': 48x48 pixels (h-12 w-12) - Default, use for full-page or modal loading states
 *
 * @param {version} [version='custom'] - Version/positioning mode of the spinner.
 *   - 'custom': Default, uses relative positioning with min-height of 100px
 *   - 'fixed': Uses fixed positioning to cover the entire viewport
 *
 * @param {number} [zIndex=999] - Z-index value for the spinner when version is 'fixed'.
 *   Only applies when version='fixed'. Defaults to 999.
 *
 * Styling:
 * --------
 * - The spinner uses indigo-500 color for the spinning border
 * - Text is displayed in black with medium font weight
 * - Includes a fadeIn animation on mount
 * - Container has min-height of 100px for consistent layout
 */
const Spinner: React.FC<{
    className?: string;
    blur?: boolean;
    customLoadingName?: string | null;
    size?: SpinnerSize;
    version?: version;
    zIndex?: number;
}> = ({ className = "", blur = false, customLoadingName = null, size = 'large', version = 'custom', zIndex = 999 }) => {
    return (
    <div className={`${versionClasses[version]} flex items-center justify-center`} style={version === 'fixed' ? { zIndex } : undefined}>
        <div className={`absolute inset-0 ${blur ? 'bg-black/50 backdrop-blur-sm' : ''}`} />
        <div className="relative bg-transparent rounded-lg p-8 animate-fadeIn">
            <div className={`flex flex-col items-center ${className}`}>
                <div className={`animate-spin rounded-full ${sizeClasses[size]} border-t-2 border-b-2 border-indigo-500`}></div>
                <p className="text-[#3F4254] font-medium">
                    {customLoadingName ? customLoadingName : 'Loading...'}
                </p>
            </div>
        </div>
    </div>
    );
};

export default Spinner;
