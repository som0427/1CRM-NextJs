import React, { useRef, useCallback } from 'react';
import { Controller, Control } from 'react-hook-form';

/**
 * UploadImage Component (Legacy/Simple)
 *
 * A simple image upload component with React Hook Form integration.
 * For new implementations, prefer using UploadInput with attributeTypeId=IMAGE.
 *
 * @component
 * @deprecated Consider using UploadInput component instead for more features
 *
 * @example
 * // Basic usage
 * <UploadImage
 *   name="avatar"
 *   control={control}
 *   onFileSelect={(file) => handleUpload(file)}
 *   onRemove={() => handleRemove()}
 * />
 *
 * @example
 * // With uploading state
 * <UploadImage
 *   name="photo"
 *   control={control}
 *   onFileSelect={handleUpload}
 *   onRemove={handleRemove}
 *   isUploading={uploading}
 * />
 *
 * @example
 * // With custom accepted types
 * <UploadImage
 *   name="image"
 *   control={control}
 *   onFileSelect={handleUpload}
 *   onRemove={handleRemove}
 *   acceptedTypes={['image/jpeg', 'image/png', 'image/gif']}
 * />
 *
 * Props:
 * ------
 * @param {string} name - Form field name (required)
 * @param {Control<any>} control - React Hook Form control object (required)
 * @param {(file: File) => void} onFileSelect - Callback when file selected (required)
 * @param {() => void} onRemove - Callback when image removed (required)
 * @param {any} [validationRules] - React Hook Form validation rules
 * @param {() => void} [onUploadClick] - Callback when upload button clicked
 * @param {string[]} [acceptedTypes=['image/jpeg', 'image/png', 'image/jpg']] - Accepted MIME types
 * @param {any} [hint="Upload .jpeg, .png files only, Dimensions 512*512 pixels"] - Hint text
 * @param {boolean} [disabled=false] - Disabled state
 * @param {boolean} [isUploading=false] - Show uploading animation (bouncing ball)
 * @param {string} [className=""] - Additional CSS classes
 *
 * Features:
 * ---------
 * - React Hook Form integration via Controller
 * - 32x32px preview image
 * - Remove button on image hover
 * - Bouncing ball upload animation
 * - Error message display
 * - Hint text support
 *
 * Note: This is a legacy component. Use UploadInput for:
 * - Multiple file support
 * - Server upload integration
 * - Image modal viewer
 * - Counter display for multiple files
 */
interface UploadImageProps {
    name: string;
    control: Control<any>;
    validationRules?: any;
    onFileSelect: (file: File) => void;
    onRemove: () => void;
    onUploadClick?: () => void;
    acceptedTypes?: string[];
    hint?: any;
    disabled?: boolean;
    isUploading?: boolean;
    className?: string;
}

const UploadImage: React.FC<UploadImageProps> = ({
    name,
    control,
    validationRules,
    onFileSelect,
    onRemove,
    onUploadClick,
    acceptedTypes = ['image/jpeg', 'image/png', 'image/jpg'],
    hint = "Upload .jpeg, .png files only, Dimensions 512*512 pixels",
    disabled = false,
    isUploading = false,
    className = ""
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelect(file);
        }
    }, [onFileSelect]);

    const handleRemoveImage = useCallback(() => {
        onRemove();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [onRemove]);

    const handleUploadClick = useCallback(() => {
        onUploadClick?.(); // Clear errors immediately when upload button is clicked
        fileInputRef.current?.click();
    }, [onUploadClick]);

    return (
        <Controller
            name={name}
            control={control}
            rules={validationRules}
            render={({ field, fieldState }) => (
                <div className={className}>
                    {field.value ? (
                        // Show uploaded image with remove button
                        <div className="relative inline-block">
                            <img
                                src={field.value}
                                alt="Uploaded image"
                                className="w-32 h-32 object-cover rounded-lg border border-gray-300 shadow-sm"
                            />
                            {/* Remove button in top-right corner */}
                            <button
                                type="button"
                                onClick={handleRemoveImage}
                                disabled={disabled || isUploading}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Remove image"
                            >
                                <svg className="w-3 h-3 transition-transform duration-200 hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        // Show upload button when no image is uploaded
                        <div>
                            <div className="flex items-center">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept={acceptedTypes.join(', ')}
                                    className="hidden"
                                    onChange={handleFileChange}
                                    disabled={disabled || isUploading}
                                />
                                <button
                                    type="button"
                                    onClick={handleUploadClick}
                                    disabled={disabled || isUploading}
                                    className={`relative ${disabled || isUploading
                                        ? 'cursor-not-allowed opacity-50'
                                        : 'hover:opacity-80'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded flex items-center justify-center relative ${isUploading
                                        ? ''
                                        : 'transition-all duration-200'
                                        }`}>
                                        {isUploading ? (
                                            <div className="relative w-5 h-5 flex items-start justify-center bg-white">
                                                {/* Grey bouncing ball animation */}
                                                <div className="w-4 h-4 bg-gray-400 rounded-full animate-big-bounce shadow-lg"></div>
                                            </div>
                                        ) : (
                                            <img src="/svg/icons/general/upload.svg" alt="Upload" className="w-7 h-6 transition-opacity duration-200" />
                                        )}
                                    </div>
                                </button>
                            </div>

                            {/* Hint Text */}
                            {hint && (!fieldState.error || disabled) && (
                                <div className="text-xs text-gray-500 mt-1">
                                    {hint}
                                </div>
                            )}

                        </div>
                    )}
                    
                    {fieldState.error && !disabled && (
                        <div className="text-xs text-red-500 mt-1">
                            {fieldState.error.message}
                        </div>
                    )}
                </div>
            )}
        />
    );
};

UploadImage.displayName = 'UploadImage';

export default UploadImage;
