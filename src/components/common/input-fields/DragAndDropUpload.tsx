import React, { useRef, useCallback, useState } from 'react';
import { Controller, Control } from 'react-hook-form';

/**
 * DragAndDropUpload Component
 *
 * A drag-and-drop file upload component with React Hook Form integration,
 * primarily designed for image uploads with visual feedback.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <DragAndDropUpload
 *   name="logo"
 *   control={control}
 *   onFileSelect={(file) => handleUpload(file)}
 *   onRemove={() => handleRemove()}
 * />
 *
 * @example
 * // With custom dimensions and accepted types
 * <DragAndDropUpload
 *   name="banner"
 *   control={control}
 *   onFileSelect={handleUpload}
 *   onRemove={handleRemove}
 *   imageWidth="w-64"
 *   imageHeight="h-32"
 *   hint="Upload banner image (1920x480px recommended)"
 * />
 *
 * @example
 * // With custom file size and types
 * <DragAndDropUpload
 *   name="avatar"
 *   control={control}
 *   onFileSelect={handleUpload}
 *   onRemove={handleRemove}
 *   acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
 *   maxSize={5 * 1024 * 1024}  // 5MB
 * />
 *
 * @example
 * // With uploading state
 * <DragAndDropUpload
 *   name="photo"
 *   control={control}
 *   onFileSelect={handleUpload}
 *   onRemove={handleRemove}
 *   isUploading={uploading}
 * />
 *
 * Props:
 * ------
 * @param {string} name - Form field name (required)
 * @param {Control<any>} control - React Hook Form control object (required)
 * @param {(file: File) => void} onFileSelect - Callback when file selected/dropped (required)
 * @param {() => void} onRemove - Callback when file removed (required)
 * @param {any} [validationRules] - React Hook Form validation rules
 * @param {string[]} [acceptedTypes=['image/jpeg', 'image/png']] - Accepted MIME types
 * @param {string} [hint="Use JPEG/PNG with dimensions 512x512 pixels. Max size = 2 MB"] - Hint text
 * @param {boolean} [disabled=false] - Disabled state
 * @param {boolean} [isUploading=false] - Show uploading animation (cloud with arrow)
 * @param {string} [className=""] - Additional CSS classes
 * @param {number} [maxSize=2MB] - Maximum file size in bytes
 * @param {string} [imageWidth="w-32"] - Preview image width class
 * @param {string} [imageHeight="h-32"] - Preview image height class
 * @param {string} [dropzoneHeight="h-auto"] - Dropzone height class
 * @param {string} [error] - External error message
 * @param {(error: string) => void} [onError] - Error callback
 *
 * Features:
 * ---------
 * - React Hook Form integration via Controller
 * - Drag and drop zone with visual feedback
 * - Click to upload option
 * - File type and size validation
 * - Cloud upload animation during upload
 * - Image preview with remove button
 * - Customizable dimensions
 * - Blue highlight on drag over
 * - Error message display
 */
interface DragAndDropUploadProps {
    name: string;
    control: Control<any>;
    validationRules?: any;
    onFileSelect: (file: File) => void;
    onRemove: () => void;
    acceptedTypes?: string[];
    hint?: string;
    disabled?: boolean;
    isUploading?: boolean;
    className?: string;
    maxSize?: number;
    imageWidth?: string;
    imageHeight?: string;
    dropzoneHeight?: string;
    error?: string;
    onError?: (error: string) => void;
}

const DragAndDropUpload: React.FC<DragAndDropUploadProps> = ({
    name,
    control,
    validationRules,
    onFileSelect,
    onRemove,
    acceptedTypes = ['image/jpeg', 'image/png'],
    hint = "Use JPEG/PNG with dimensions 512x512 pixels. Max size = 2 MB",
    disabled = false,
    isUploading = false,
    className = "",
    maxSize = 2 * 1024 * 1024, // 2MB default
    imageWidth = "w-32",
    imageHeight = "h-32",
    dropzoneHeight = "h-auto",
    error,
    onError
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [localError, setLocalError] = useState<string>('');

    const handleFileSelect = useCallback((file: File) => {
        
        // Clear any previous errors
        setLocalError('');
        if (onError) onError(''); // Clear parent error as well
        
        // Validate file type
        if (!acceptedTypes.includes(file.type)) {
            const errorMsg = `File type not accepted. Please upload ${acceptedTypes.join(' or ')} files only.`;
            setLocalError(errorMsg);
            if (onError) onError(errorMsg);
            return;
        }

        // Validate file size
        if (file.size > maxSize) {
            const errorMsg = `File size exceeds maximum allowed size of ${(maxSize / (1024 * 1024)).toFixed(0)}MB`;
            setLocalError(errorMsg);
            if (onError) onError(errorMsg);
            return;
        }

        onFileSelect(file);
    }, [onFileSelect, acceptedTypes, maxSize, onError]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    }, [handleFileSelect]);

    const handleRemove = useCallback(() => {
        // Clear any errors when removing the image
        setLocalError('');
        if (onError) onError('');
        
        onRemove();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [onRemove, onError]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && !isUploading) {
            setIsDragging(true);
        }
    }, [disabled, isUploading]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (disabled || isUploading) return;

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    }, [disabled, isUploading, handleFileSelect]);

    const handleClick = useCallback(() => {
        if (!disabled && !isUploading) {
            fileInputRef.current?.click();
        }
    }, [disabled, isUploading]);

    return (
        <Controller
            name={name}
            control={control}
            rules={validationRules}
            render={({ field, fieldState }) => (
                <div className={className}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={acceptedTypes.join(', ')}
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={disabled || isUploading}
                    />

                    {field.value ? (
                        // Show uploaded image with micro preview
                        <div className="relative inline-block">
                            <img
                                src={field.value}
                                alt="Uploaded image"
                                className={`${imageWidth} ${imageHeight} object-cover rounded-lg border border-gray-300 shadow-sm`}
                            />
                            {/* Remove button in top-right corner */}
                            <button
                                type="button"
                                onClick={handleRemove}
                                disabled={disabled}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Remove image"
                            >
                                <svg className="w-3 h-3 transition-transform duration-200 hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        // Show drag and drop area
                        <div
                            className={`
                                relative border-2 border-dashed rounded-lg p-6 text-center transition-all
                                ${isDragging && !isUploading
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                                }
                                ${disabled || isUploading
                                    ? 'cursor-not-allowed'
                                    : 'cursor-pointer'
                                }
                            `}
                            onDragOver={!isUploading ? handleDragOver : undefined}
                            onDragLeave={!isUploading ? handleDragLeave : undefined}
                            onDrop={!isUploading ? handleDrop : undefined}
                            onClick={!isUploading ? handleClick : undefined}
                        >
                            <div className="space-y-2">
                                {isUploading ? (
                                    <div className="relative h-12 w-12 mx-auto">
                                        {/* Cloud */}
                                        <svg className="absolute inset-0 w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9" />
                                        </svg>
                                        {/* Animated arrow going up into cloud */}
                                        <svg className="absolute inset-0 w-12 h-12" viewBox="0 0 24 24">
                                            <path
                                                className="animate-upload-arrow"
                                                fill="none"
                                                stroke="#42A5F5"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M12 20v-12m0 0l-3 3m3-3l3 3"
                                            />
                                        </svg>
                                    </div>
                                ) : (
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                )}

                                {!isUploading && (
                                    <div className="text-sm">
                                        <span className="font-medium text-blue-500 hover:text-blue-500">
                                            Click to upload
                                        </span>
                                        <span className="text-gray-500"> or drag and drop</span>
                                    </div>

                                )}
                                {hint && (
                                    <p className="text-xs text-gray-500">{hint}</p>
                                )}

                            </div>
                        </div>
                    )}

                    {/* Show errors outside the drag area */}
                    {!disabled && (fieldState.error || localError || error) && (
                        <div className="text-sm text-red-500 mt-2">
                            {fieldState.error?.message || localError || error}
                        </div>
                    )}
                </div>
            )}
        />
    );
};

DragAndDropUpload.displayName = 'DragAndDropUpload';

export default DragAndDropUpload;