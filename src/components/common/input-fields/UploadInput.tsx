import React, { useRef, useCallback, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Controller, Control } from 'react-hook-form';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import uploadService from '@/lib/services/uploadService';

/**
 * UploadInput Component (Enhanced/Universal)
 *
 * A universal file upload component with React Hook Form integration supporting
 * images, documents, audio/video files with built-in server upload capability.
 *
 * @component
 *
 * @example
 * // Basic image upload
 * <UploadInput
 *   name="profileImage"
 *   control={control}
 *   attributeTypeId={CustomAttributeTypeEnum.IMAGE}
 * />
 *
 * @example
 * // Image upload with server upload (auto-uploads when moduleType and projectId provided)
 * <UploadInput
 *   name="productImages"
 *   control={control}
 *   attributeTypeId={CustomAttributeTypeEnum.IMAGE}
 *   moduleType={1}
 *   projectId={123}
 *   multiple={true}
 *   maxFiles={5}
 * />
 *
 * @example
 * // Document upload
 * <UploadInput
 *   name="resume"
 *   control={control}
 *   attributeTypeId={CustomAttributeTypeEnum.DOCUMENT_UPLOAD}
 *   maxSize={10 * 1024 * 1024}  // 10MB
 * />
 *
 * @example
 * // Audio/Video upload
 * <UploadInput
 *   name="mediaFile"
 *   control={control}
 *   attributeTypeId={CustomAttributeTypeEnum.AUDIO_VIDEO}
 * />
 *
 * @example
 * // Reference documents (images + documents mixed)
 * <UploadInput
 *   name="attachments"
 *   control={control}
 *   attributeTypeId={CustomAttributeTypeEnum.REFERENCE_DOCUMENTS}
 *   multiple={true}
 *   maxFiles={10}
 * />
 *
 * @example
 * // With upload state callback
 * <UploadInput
 *   name="file"
 *   control={control}
 *   attributeTypeId={CustomAttributeTypeEnum.IMAGE}
 *   onUploadingChange={(isUploading) => setFormDisabled(isUploading)}
 * />
 *
 * Props:
 * ------
 * @param {string} name - Form field name (required)
 * @param {Control<any>} control - React Hook Form control object (required)
 * @param {CustomAttributeTypeEnum} attributeTypeId - File type: IMAGE(4), DOCUMENT_UPLOAD(15), AUDIO_VIDEO(16), REFERENCE_DOCUMENTS(17) (required)
 * @param {any} [validationRules] - React Hook Form validation rules
 * @param {(file: File) => void} [onFileSelect] - Callback when file selected (before upload)
 * @param {(index?: number) => void} [onRemove] - Callback when file removed
 * @param {() => void} [onUploadClick] - Callback when upload button clicked
 * @param {(isUploading: boolean) => void} [onUploadingChange] - Callback when upload state changes
 * @param {any} [hint] - Hint text displayed below input
 * @param {boolean} [disabled=false] - Disabled state
 * @param {boolean} [isUploading] - External uploading state control
 * @param {string} [className] - Additional CSS classes
 * @param {number} [maxSize=20MB] - Maximum file size in bytes
 * @param {string} [error] - External error message
 * @param {(error: string) => void} [onError] - Error callback
 * @param {boolean} [multiple=false] - Allow multiple file uploads
 * @param {number} [maxFiles] - Maximum files when multiple=true (shows counter like "1/5")
 * @param {number} [moduleType] - Module type for server upload (enables auto-upload)
 * @param {number} [projectId] - Project ID for server upload (enables auto-upload)
 *
 * File Types by attributeTypeId:
 * ------------------------------
 * - IMAGE (4): jpeg, png, gif, webp, svg
 * - DOCUMENT_UPLOAD (15): pdf, docx, xlsx, pptx
 * - AUDIO_VIDEO (16): mp3, wav, ogg, mp4, mpeg, webm, mov
 * - REFERENCE_DOCUMENTS (17): All image + document types
 *
 * Features:
 * ---------
 * - React Hook Form integration via Controller
 * - Auto-upload when moduleType and projectId provided
 * - Uses uploadImage() API for IMAGE type, uploadDoc() for others
 * - Image modal viewer with navigation (portal-based)
 * - Multiple file upload with counter display (e.g., "1/5", "2/5")
 * - File type validation based on attributeTypeId
 * - File size validation
 * - Bouncing ball upload animation
 * - Remove button on each file
 * - Error message display
 * - Hint text support
 */
interface DocumentFile {
    name: string;
    size: number;
    type: string;
    file?: File;
    url?: string; // URL for displaying image preview
    serverUrl?: string; // Server URL after upload (e.g., "us-east-2-data/618/custom_field_ref_doc/...")
    isUploading?: boolean; // Flag to indicate if file is being uploaded
}

// Image MIME types for checking if a file is an image
const IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
];

// Accepted types based on attribute type
const ACCEPTED_TYPES_BY_ATTRIBUTE: Record<number, string[]> = {
    [CustomAttributeTypeEnum.IMAGE]: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml'
    ],
    [CustomAttributeTypeEnum.DOCUMENT_UPLOAD]: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
    ],
    [CustomAttributeTypeEnum.AUDIO_VIDEO]: [
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/mp3',
        'video/mp4',
        'video/mpeg',
        'video/webm',
        'video/ogg',
        'video/quicktime'
    ],
    [CustomAttributeTypeEnum.REFERENCE_DOCUMENTS]: [
        // Images
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        // Documents
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' // .pptx
    ]
};

// File extensions based on attribute type
const FILE_EXTENSIONS_BY_ATTRIBUTE: Record<number, string[]> = {
    [CustomAttributeTypeEnum.IMAGE]: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
    [CustomAttributeTypeEnum.DOCUMENT_UPLOAD]: ['.pdf', '.docx', '.xlsx', '.pptx'],
    [CustomAttributeTypeEnum.AUDIO_VIDEO]: ['.mp3', '.wav', '.ogg', '.mp4', '.mpeg', '.webm', '.mov'],
    [CustomAttributeTypeEnum.REFERENCE_DOCUMENTS]: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.docx', '.xlsx', '.pptx']
};

// Image file extensions for checking by filename
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

// Helper function to check if a file is an image based on MIME type or file extension
const isImageFile = (doc: DocumentFile): boolean => {
    // First check MIME type if available
    if (doc.type && IMAGE_MIME_TYPES.includes(doc.type)) {
        return true;
    }
    // Fallback: check file extension from name or serverUrl
    const fileName = doc.name || doc.serverUrl || '';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return IMAGE_EXTENSIONS.includes(`.${ext}`);
};

// Helper function to get document icon based on file type or extension
const getDocumentIcon = (doc: DocumentFile): string => {
    // Get file extension from name or serverUrl
    const fileName = doc.name || doc.serverUrl || '';
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    // Check MIME type first, then fall back to extension
    if (doc.type === 'application/pdf' || ext === 'pdf') {
        return "/svg/icons/general/PDF-File.svg";
    }
    if (doc.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx' || ext === 'doc') {
        return "/svg/icons/general/file-alt-solid.svg";
    }
    if (doc.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || ext === 'xlsx' || ext === 'xls') {
        return "/svg/icons/general/file-excel-solid.svg";
    }
    if (doc.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || ext === 'pptx' || ext === 'ppt') {
        return "/svg/icons/general/file-powerpoint-solid.svg";
    }
    // For other document types, use a generic document icon
    return "/svg/icons/general/file-alt-solid.svg";
};

// Helper function to get upload button icon based on attribute type
const getUploadIcon = (attributeTypeId: CustomAttributeTypeEnum): string => {
    if (attributeTypeId === CustomAttributeTypeEnum.IMAGE) {
        return "/svg/icons/general/ImageUploadIcon.svg";
    }
    // For REFERENCE_DOCUMENTS and DOCUMENT_UPLOAD, use document upload icon
    return "/svg/icons/general/DocumentUploadIcon.svg";
};

// Image Modal Component
interface ImageModalProps {
    isOpen: boolean;
    onClose: () => void;
    images: DocumentFile[];
    initialIndex: number;
    getFileUrl: (doc: DocumentFile) => string | null;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, images, initialIndex, getFileUrl }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    React.useEffect(() => {
        setCurrentIndex(initialIndex);
    }, [initialIndex]);

    if (!isOpen) return null;

    const currentImage = images[currentIndex];
    const imageUrl = currentImage ? getFileUrl(currentImage) : null;
    const isMultiple = images.length > 1;

    const goToPrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    // Use portal to render modal at document body level, outside any parent modal hierarchy
    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* White modal container - centered both horizontally and vertically */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] max-w-4xl max-h-[600px] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button - top right of modal */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-3 right-3 w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-full flex items-center justify-center cursor-pointer border-none transition-all duration-200 z-10"
                    title="Close"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Image counter - top center of modal */}
                {isMultiple && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-3 py-1 rounded-full">
                        {currentIndex + 1} / {images.length}
                    </div>
                )}

                {/* Main image - 90% width, 80% height of modal */}
                {imageUrl && (
                    <img
                        src={imageUrl}
                        alt={currentImage?.name || 'Image'}
                        className="max-w-[90%] max-h-[80%] object-contain"
                    />
                )}

                {/* Navigation for multiple images */}
                {isMultiple && (
                    <>
                        {/* Previous button */}
                        <button
                            type="button"
                            onClick={goToPrevious}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-full flex items-center justify-center transition-all duration-200"
                            title="Previous"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        {/* Next button */}
                        <button
                            type="button"
                            onClick={goToNext}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-full flex items-center justify-center transition-all duration-200"
                            title="Next"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </>
                )}
            </div>
        </div>
    );

    // Render using portal to escape parent modal's stacking context
    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }

    return modalContent;
};

interface UploadInputProps {
    name: string;
    control: Control<any>;
    validationRules?: any;
    onFileSelect?: (file: File) => void;
    onRemove?: (index?: number) => void;
    onUploadClick?: () => void;
    onUploadingChange?: (isUploading: boolean) => void; // Callback to notify parent when upload state changes
    hint?: any;
    disabled?: boolean;
    isUploading?: boolean;
    className?: string;
    maxSize?: number;
    error?: string;
    onError?: (error: string) => void;
    multiple?: boolean;
    maxFiles?: number; // Maximum number of files allowed when multiple is true
    attributeTypeId: CustomAttributeTypeEnum; // Use CustomAttributeTypeEnum.IMAGE, DOCUMENT_UPLOAD, AUDIO_VIDEO, etc.
    customAcceptedTypes?: string[]; // Override accepted MIME types (e.g., ['image/jpeg', 'image/png'])
    customFileExtensions?: string[]; // Override accepted file extensions (e.g., ['.jpg', '.jpeg', '.png'])
    moduleType?: number; // Module type for server upload
    projectId?: number; // Project ID for server upload
    uploadButtonPosition?: 'left' | 'right'; // Position of upload button (default: right)
    iconSize?: 'sm' | 'md'; // Size of upload icon: 'sm' = w-10 h-10 (40px), 'md' = w-12 h-12 (48px, default)
}

const UploadInput: React.FC<UploadInputProps> = ({
    name,
    control,
    validationRules,
    onFileSelect,
    onRemove,
    onUploadClick,
    onUploadingChange,
    hint = "",
    disabled = false,
    isUploading = false,
    className = "",
    maxSize = 20 * 1024 * 1024, // 20MB default
    error,
    onError,
    multiple = false,
    maxFiles,
    attributeTypeId,
    customAcceptedTypes,
    customFileExtensions,
    moduleType,
    projectId,
    uploadButtonPosition = 'right',
    iconSize = 'md'
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [localError, setLocalError] = useState<string>('');
    const [modalOpen, setModalOpen] = useState(false);
    const [modalImageIndex, setModalImageIndex] = useState(0);
    const [isInternalUploading, setIsInternalUploading] = useState(false);

    // Combined uploading state (external prop or internal state)
    const isCurrentlyUploading = isUploading || isInternalUploading;

    // Get accepted types based on customAcceptedTypes or attributeTypeId
    const acceptedTypes = useMemo(() => {
        if (customAcceptedTypes && customAcceptedTypes.length > 0) {
            return customAcceptedTypes;
        }
        if (attributeTypeId && ACCEPTED_TYPES_BY_ATTRIBUTE[attributeTypeId]) {
            return ACCEPTED_TYPES_BY_ATTRIBUTE[attributeTypeId];
        }
        // Default to document types if no attributeTypeId provided
        return ACCEPTED_TYPES_BY_ATTRIBUTE[CustomAttributeTypeEnum.DOCUMENT_UPLOAD];
    }, [attributeTypeId, customAcceptedTypes]);

    // Get file extensions based on customFileExtensions or attributeTypeId
    const fileExtensions = useMemo(() => {
        if (customFileExtensions && customFileExtensions.length > 0) {
            return customFileExtensions;
        }
        if (attributeTypeId && FILE_EXTENSIONS_BY_ATTRIBUTE[attributeTypeId]) {
            return FILE_EXTENSIONS_BY_ATTRIBUTE[attributeTypeId];
        }
        // Default to document extensions if no attributeTypeId provided
        return FILE_EXTENSIONS_BY_ATTRIBUTE[CustomAttributeTypeEnum.DOCUMENT_UPLOAD];
    }, [attributeTypeId, customFileExtensions]);

    const isImageType = attributeTypeId === CustomAttributeTypeEnum.IMAGE;
    const isReferenceDocType = attributeTypeId === CustomAttributeTypeEnum.REFERENCE_DOCUMENTS;

    // Base URL for server files
    const baseUrl = process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL || '';

    // Get file URL for opening in new tab
    const getFileUrl = (doc: DocumentFile): string | null => {
        // For new uploads with blob URL (starts with blob:)
        if (doc.url && doc.url.startsWith('blob:')) return doc.url;
        // For files from server with serverUrl
        if (doc.serverUrl) {
            // If serverUrl already has a protocol (http/https) or already contains the base URL domain, use as-is
            if (doc.serverUrl.startsWith('http://') || doc.serverUrl.startsWith('https://')) {
                return doc.serverUrl;
            }
            // Check if serverUrl contains the base URL domain (without protocol)
            const baseUrlDomain = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
            if (baseUrlDomain && doc.serverUrl.includes(baseUrlDomain)) {
                return doc.serverUrl.startsWith('//') ? `https:${doc.serverUrl}` : `https://${doc.serverUrl}`;
            }
            // Otherwise prepend baseUrl
            return `${baseUrl}${doc.serverUrl}`;
        }
        // For files with url that's not a blob (already full URL)
        if (doc.url) return doc.url;
        // Fallback: create blob URL from file object
        if (doc.file) return URL.createObjectURL(doc.file);
        return null;
    };

    // Open image modal
    const openImageModal = (index: number = 0) => {
        setModalImageIndex(index);
        setModalOpen(true);
    };

    // Open file in new tab
    const openFileInNewTab = (doc: DocumentFile) => {
        const fileUrl = getFileUrl(doc);
        if (fileUrl) {
            window.open(fileUrl, '_blank', 'noopener,noreferrer');
        }
    };

    // Render file preview based on attributeTypeId
    const renderFilePreview = (doc: DocumentFile, size: 'small' | 'medium' = 'medium', index: number = 0): React.ReactNode => {
        const sizeClasses = size === 'small' ? 'w-10 h-10' : 'w-8 h-8';
        const fileUrl = getFileUrl(doc);

        // If attributeTypeId is IMAGE (4), show image preview with modal on click
        if (isImageType && fileUrl) {
            return (
                <img
                    src={fileUrl}
                    alt={doc.name}
                    className={`${sizeClasses} object-cover rounded cursor-pointer hover:opacity-80 transition-opacity`}
                    onClick={() => openImageModal(index)}
                />
            );
        }

        // For REFERENCE_DOCUMENTS (17), handle both images and documents
        if (isReferenceDocType) {
            const isImage = isImageFile(doc);

            if (isImage && fileUrl) {
                // Show image preview, click opens in new tab
                return (
                    <img
                        src={fileUrl}
                        alt={doc.name}
                        className={`${sizeClasses} object-cover rounded cursor-pointer hover:opacity-80 transition-opacity`}
                        onClick={() => openFileInNewTab(doc)}
                        title={`Open ${doc.name} in new tab`}
                    />
                );
            } else {
                // Show document icon, click opens in new tab
                const iconSrc = getDocumentIcon(doc);
                return (
                    <img
                        src={iconSrc}
                        alt={doc.name}
                        className={`${sizeClasses} cursor-pointer hover:opacity-80 transition-opacity`}
                        onClick={() => openFileInNewTab(doc)}
                        title={`Open ${doc.name} in new tab`}
                    />
                );
            }
        }

        // For DOCUMENT (15), AUDIO/VIDEO (16), or no attributeTypeId - show appropriate icon based on file type
        const iconSrc = getDocumentIcon(doc);

        const iconElement = (
            <img src={iconSrc} alt={doc.name} className={`${sizeClasses} cursor-pointer hover:opacity-80 transition-opacity`} />
        );

        if (fileUrl) {
            return (
                <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Open ${doc.name}`}
                >
                    {iconElement}
                </a>
            );
        }

        return iconElement;
    };

    const handleUploadClick = useCallback(() => {
        onUploadClick?.();
        fileInputRef.current?.click();
    }, [onUploadClick]);

    const getAcceptString = (): string => {
        return [...acceptedTypes, ...fileExtensions].join(', ');
    };

    const isMaxFilesReached = (currentFiles: DocumentFile[] | undefined): boolean => {
        if (!multiple || !maxFiles) return false;
        return Array.isArray(currentFiles) && currentFiles.length >= maxFiles;
    };

    return (
        <Controller
            name={name}
            control={control}
            rules={validationRules}
            render={({ field, fieldState }) => {
                const maxReached = isMaxFilesReached(field.value);
                const allImages = multiple && Array.isArray(field.value) ? field.value : (field.value ? [field.value] : []);

                // Internal file change handler that validates, uploads to server, and updates field value
                const handleInternalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                        // Clear any previous errors
                        setLocalError('');
                        if (onError) onError('');

                        // Check maxFiles limit before processing
                        const currentFiles = Array.isArray(field.value) ? field.value : (field.value ? [field.value] : []);
                        const currentCount = currentFiles.length;
                        
                        if (multiple && maxFiles) {
                            const remainingSlots = maxFiles - currentCount;
                            if (remainingSlots <= 0) {
                                // Silently reject - max files already reached
                                if (fileInputRef.current) {
                                    fileInputRef.current.value = '';
                                }
                                return;
                            }
                        }

                        // Validate files first
                        const filesToUpload: File[] = [];
                        // Silently limit files to remaining slots (no error message)
                        const filesToProcess = multiple && maxFiles 
                            ? Array.from(files).slice(0, maxFiles - currentCount)
                            : Array.from(files);
                            
                        for (const file of filesToProcess) {
                            // Validate file type
                            if (!acceptedTypes.includes(file.type)) {
                                const errorMsg = `File type not accepted. Please upload supported document files only.`;
                                setLocalError(errorMsg);
                                if (onError) onError(errorMsg);
                                continue;
                            }

                            // Validate file size
                            if (file.size > maxSize) {
                                const errorMsg = `File size exceeds maximum allowed size of ${(maxSize / (1024 * 1024)).toFixed(0)}MB`;
                                setLocalError(errorMsg);
                                if (onError) onError(errorMsg);
                                continue;
                            }

                            filesToUpload.push(file);
                        }

                        if (filesToUpload.length === 0) {
                            // Reset the input
                            if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                            }
                            return;
                        }

                        // Set internal uploading state and notify parent
                        setIsInternalUploading(true);
                        onUploadingChange?.(true);

                        // Upload files to server if moduleType and projectId are provided
                        const uploadedFiles: DocumentFile[] = [];

                        for (const file of filesToUpload) {
                            // Create document file object with uploading state
                            const newFile: DocumentFile = {
                                name: file.name,
                                size: file.size,
                                type: file.type,
                                file: file,
                                url: URL.createObjectURL(file),
                                isUploading: true
                            };

                            // If moduleType and projectId are provided, upload to server
                            if (moduleType !== undefined && projectId !== undefined) {
                                try {
                                    // Use uploadImage for IMAGE type, uploadDoc for all other types
                                    const response = isImageType
                                        ? await uploadService.uploadImage(moduleType, file, projectId)
                                        : await uploadService.uploadDoc(moduleType, file, projectId);
                                    if (response.statusCode === 200 && response.responseData?.name) {
                                        // Store the server URL
                                        newFile.serverUrl = response.responseData.name;
                                        // Update url to use baseUrl + serverUrl for display
                                        newFile.url = `${baseUrl}${response.responseData.name}`;
                                        newFile.isUploading = false;
                                        uploadedFiles.push(newFile);
                                    } else {
                                        const errorMsg = response.message || 'Failed to upload file';
                                        setLocalError(errorMsg);
                                        if (onError) onError(errorMsg);
                                    }
                                } catch (error) {
                                    console.error('Upload error:', error);
                                    const errorMsg = 'Failed to upload file. Please try again.';
                                    setLocalError(errorMsg);
                                    if (onError) onError(errorMsg);
                                }
                            } else {
                                // No server upload - just store locally (for backwards compatibility)
                                newFile.isUploading = false;
                                uploadedFiles.push(newFile);
                            }
                        }

                        if (uploadedFiles.length > 0) {
                            if (multiple) {
                                // Append to existing files
                                const currentFiles = Array.isArray(field.value) ? field.value : (field.value ? [field.value] : []);
                                field.onChange([...currentFiles, ...uploadedFiles]);
                            } else {
                                // Replace with single file
                                field.onChange(uploadedFiles[0]);
                            }
                            // Call onFileSelect for each valid file (for external handling if needed)
                            uploadedFiles.forEach(f => f.file && onFileSelect?.(f.file));
                        }

                        // Reset internal uploading state and notify parent
                        setIsInternalUploading(false);
                        onUploadingChange?.(false);
                    }
                    // Reset the input value so the same file can be selected again
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                };

                // Internal remove handler that updates field value directly
                const handleInternalRemove = (index?: number) => {
                    setLocalError('');
                    if (onError) onError('');

                    if (multiple && Array.isArray(field.value)) {
                        if (typeof index === 'number') {
                            const newFiles = field.value.filter((_: DocumentFile, i: number) => i !== index);
                            field.onChange(newFiles.length > 0 ? newFiles : null);
                        }
                    } else {
                        field.onChange(null);
                    }
                    onRemove?.(index);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                };

                return (
                <div className={className}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={getAcceptString()}
                        className="hidden"
                        onChange={handleInternalFileChange}
                        disabled={disabled || isCurrentlyUploading}
                        multiple={multiple}
                    />

                    {/* Image Modal */}
                    {isImageType && (
                        <ImageModal
                            isOpen={modalOpen}
                            onClose={() => setModalOpen(false)}
                            images={allImages}
                            initialIndex={modalImageIndex}
                            getFileUrl={getFileUrl}
                        />
                    )}

                    {multiple && Array.isArray(field.value) && field.value.length > 0 ? (
                        // Multiple files - show grid layout
                        <div className="flex flex-wrap items-start gap-3">
                            {/* Upload button on LEFT if uploadButtonPosition is 'left' */}
                            {uploadButtonPosition === 'left' && !maxReached && (
                                <div className="flex flex-col items-center">
                                    <button
                                        type="button"
                                        onClick={handleUploadClick}
                                        disabled={disabled || isCurrentlyUploading}
                                        className={`relative ${disabled || isCurrentlyUploading
                                            ? 'cursor-not-allowed opacity-50'
                                            : 'hover:opacity-80'
                                            }`}
                                    >
                                        {isCurrentlyUploading ? (
                                            <div className="relative w-10 h-10 flex items-center justify-center">
                                                <div className="w-4 h-4 bg-gray-400 rounded-full animate-big-bounce shadow-lg"></div>
                                            </div>
                                        ) : (
                                            <img
                                                src={getUploadIcon(attributeTypeId)}
                                                alt="Upload"
                                                className="w-10 h-10 transition-opacity duration-200"
                                            />
                                        )}
                                    </button>
                                    {maxFiles && (
                                        <span className="text-xs text-transparent mt-1 select-none">0/{maxFiles}</span>
                                    )}
                                    {!maxFiles && (
                                        <span className="text-xs text-transparent mt-1 select-none">&nbsp;</span>
                                    )}
                                </div>
                            )}

                            {field.value.map((doc: DocumentFile, index: number) => (
                                <div
                                    key={index}
                                    className="flex flex-col items-center"
                                >
                                    <div className="relative">
                                        {/* File Preview - Image or Document Icon based on attributeTypeId */}
                                        {renderFilePreview(doc, 'small', index)}

                                        {/* Remove button - top right of icon */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleInternalRemove(index);
                                            }}
                                            disabled={disabled || isCurrentlyUploading}
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                            title={`Remove ${doc.name}`}
                                        >
                                            <svg className="w-3 h-3 transition-transform duration-200 hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    {/* Counter showing uploaded/max under each file */}
                                    {maxFiles && (
                                        <span className="text-xs text-gray-500 mt-1">{index + 1}/{maxFiles}</span>
                                    )}
                                    {/* Position number if no maxFiles */}
                                    {!maxFiles && (
                                        <span className="text-xs text-gray-500 mt-1">{index + 1}</span>
                                    )}
                                </div>
                            ))}

                            {/* Upload button on RIGHT (default) if uploadButtonPosition is 'right' */}
                            {uploadButtonPosition === 'right' && !maxReached && (
                                <div className="flex flex-col items-center">
                                    <button
                                        type="button"
                                        onClick={handleUploadClick}
                                        disabled={disabled || isCurrentlyUploading}
                                        className={`relative ${disabled || isCurrentlyUploading
                                            ? 'cursor-not-allowed opacity-50'
                                            : 'hover:opacity-80'
                                            }`}
                                    >
                                        {isCurrentlyUploading ? (
                                            <div className="relative w-10 h-10 flex items-center justify-center">
                                                <div className="w-4 h-4 bg-gray-400 rounded-full animate-big-bounce shadow-lg"></div>
                                            </div>
                                        ) : (
                                            <img
                                                src={getUploadIcon(attributeTypeId)}
                                                alt="Upload"
                                                className="w-10 h-10 transition-opacity duration-200"
                                            />
                                        )}
                                    </button>
                                    {/* Counter placeholder to match height */}
                                    {maxFiles && (
                                        <span className="text-xs text-transparent mt-1 select-none">0/{maxFiles}</span>
                                    )}
                                    {!maxFiles && (
                                        <span className="text-xs text-transparent mt-1 select-none">&nbsp;</span>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : field.value && !Array.isArray(field.value) ? (
                        // Single file - show layout based on type
                        isImageType ? (
                            // Single image - just image with cross, no name
                            <div className="relative inline-block">
                                {/* Image Preview */}
                                {renderFilePreview(field.value, 'medium', 0)}

                                {/* Remove button - top right of image */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleInternalRemove();
                                    }}
                                    disabled={disabled || isCurrentlyUploading}
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Remove image"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            // Single document - same layout as multiple (icon with cross, no name)
                            <div className="relative inline-block">
                                {/* File Preview */}
                                {renderFilePreview(field.value, 'small', 0)}

                                {/* Remove button - top right of icon */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleInternalRemove();
                                    }}
                                    disabled={disabled || isCurrentlyUploading}
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Remove document"
                                >
                                    <svg className="w-3 h-3 transition-transform duration-200 hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )
                    ) : (
                        // No files - show upload button
                        <div>
                            <div className="flex items-center">
                                <button
                                    type="button"
                                    onClick={handleUploadClick}
                                    disabled={disabled || isCurrentlyUploading}
                                    className={`relative ${disabled || isCurrentlyUploading
                                        ? 'cursor-not-allowed opacity-50'
                                        : 'hover:opacity-80'
                                        }`}
                                >
                                    <div className={`w-10 h-10 rounded flex items-center justify-center relative ${isCurrentlyUploading
                                        ? ''
                                        : 'transition-all duration-200'
                                        }`}>
                                        {isCurrentlyUploading ? (
                                            <div className="relative w-5 h-5 flex items-start justify-center bg-white">
                                                {/* Grey bouncing ball animation */}
                                                <div className="w-4 h-4 bg-gray-400 rounded-full animate-big-bounce shadow-lg"></div>
                                            </div>
                                        ) : (
                                            <img
                                                src={getUploadIcon(attributeTypeId)}
                                                alt="Upload"
                                                className={`${iconSize === 'sm' ? 'w-10 h-10' : 'w-12 h-12'} transition-opacity duration-200`}
                                            />
                                        )}
                                    </div>
                                </button>
                            </div>

                        </div>
                    )}

                    {/* Hint Text - shown in all states */}
                    {hint && (!fieldState.error || disabled) && (
                        <div className="text-xs text-gray-500 mt-1">
                            {hint}
                        </div>
                    )}

                    {/* Show errors */}
                    {!disabled && (fieldState.error || localError || error) && (
                        <div className="text-xs text-red-500 mt-1">
                            {fieldState.error?.message || localError || error}
                        </div>
                    )}
                </div>
            );
            }}
        />
    );
};

UploadInput.displayName = 'UploadInput';

export type { DocumentFile };
export default UploadInput;
