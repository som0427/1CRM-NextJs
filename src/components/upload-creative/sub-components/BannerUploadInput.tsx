import React, { useRef, useCallback, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Controller, Control } from 'react-hook-form';
import uploadService from '@/lib/services/uploadService';

/**
 * BannerUploadInput - Custom wrapper for banner file uploads.
 * Restricts uploads to images (.jpeg, .png) and videos (.mp4, .mpeg, .mov) only.
 * Uses uploadDoc API for server upload.
 * Does NOT modify the original UploadInput component.
 */

interface BannerDocumentFile {
    name: string;
    size: number;
    type: string;
    file?: File;
    url?: string;
    serverUrl?: string;
    isUploading?: boolean;
}

const ACCEPTED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'video/mp4',
    'video/mpeg',
    'video/quicktime', // .mov
];

const FILE_EXTENSIONS = ['.jpeg', '.png', '.mp4', '.mpeg', '.mov'];

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime'];

const IMAGE_MAX_SIZE = 1 * 1024 * 1024; // 1 MB
const VIDEO_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

interface BannerUploadInputProps {
    name: string;
    control: Control<any>;
    moduleType?: number;
    projectId?: number;
    hint?: React.ReactNode;
    disabled?: boolean;
    iconSize?: 'sm' | 'md';
    onUploadingChange?: (isUploading: boolean) => void;
}

// Image Modal Component (matches UploadInput's ImageModal)
const BannerImageModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string | null;
    imageName: string;
}> = ({ isOpen, onClose, imageUrl, imageName }) => {
    if (!isOpen || !imageUrl) return null;

    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] max-w-4xl max-h-[600px] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
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
                <img
                    src={imageUrl}
                    alt={imageName}
                    className="max-w-[90%] max-h-[80%] object-contain"
                />
            </div>
        </div>
    );

    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }
    return modalContent;
};

const BannerUploadInput: React.FC<BannerUploadInputProps> = ({
    name,
    control,
    moduleType,
    projectId,
    hint,
    disabled = false,
    iconSize = 'md',
    onUploadingChange,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [localError, setLocalError] = useState<string>('');
    const [isInternalUploading, setIsInternalUploading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);

    const baseUrl = process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL || '';

    const acceptString = useMemo(
        () => [...ACCEPTED_MIME_TYPES, ...FILE_EXTENSIONS].join(', '),
        [],
    );

    const getFileUrl = (doc: BannerDocumentFile): string | null => {
        if (doc.url && doc.url.startsWith('blob:')) return doc.url;
        if (doc.serverUrl) {
            if (doc.serverUrl.startsWith('http://') || doc.serverUrl.startsWith('https://')) {
                return doc.serverUrl;
            }
            const baseUrlDomain = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
            if (baseUrlDomain && doc.serverUrl.includes(baseUrlDomain)) {
                return doc.serverUrl.startsWith('//') ? `https:${doc.serverUrl}` : `https://${doc.serverUrl}`;
            }
            return `${baseUrl}${doc.serverUrl}`;
        }
        if (doc.url) return doc.url;
        if (doc.file) return URL.createObjectURL(doc.file);
        return null;
    };

    const handleUploadClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const isImage = (mimeType: string) => IMAGE_MIME_TYPES.includes(mimeType);
    const isVideo = (mimeType: string) => VIDEO_MIME_TYPES.includes(mimeType);

    // Match UploadInput's getDocumentIcon logic exactly
    const getDocumentIcon = (doc: BannerDocumentFile): string => {
        const fileName = doc.name || doc.serverUrl || '';
        const ext = fileName.split('.').pop()?.toLowerCase() || '';

        if (doc.type === 'application/pdf' || ext === 'pdf') {
            return '/svg/icons/general/PDF-File.svg';
        }
        if (doc.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx' || ext === 'doc') {
            return '/svg/icons/general/file-alt-solid.svg';
        }
        if (doc.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || ext === 'xlsx' || ext === 'xls') {
            return '/svg/icons/general/file-excel-solid.svg';
        }
        if (doc.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || ext === 'pptx' || ext === 'ppt') {
            return '/svg/icons/general/file-powerpoint-solid.svg';
        }
        return '/svg/icons/general/file-alt-solid.svg';
    };

    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState }) => {
                const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;

                    setLocalError('');
                    const file = files[0];

                    // Validate MIME type
                    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
                        setLocalError('File type not accepted. Please upload .jpeg, .png, .mp4, .mpeg, or .mov files only.');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        return;
                    }

                    // Validate size based on type
                    if (isImage(file.type) && file.size > IMAGE_MAX_SIZE) {
                        setLocalError('Image size exceeds maximum allowed size of 1MB');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        return;
                    }
                    if (isVideo(file.type) && file.size > VIDEO_MAX_SIZE) {
                        setLocalError('Video size exceeds maximum allowed size of 5MB');
                        if (fileInputRef.current) fileInputRef.current.value = '';
                        return;
                    }

                    // Build doc file object
                    const newFile: BannerDocumentFile = {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        file,
                        url: URL.createObjectURL(file),
                        isUploading: true,
                    };

                    // Upload to server
                    if (moduleType !== undefined && projectId !== undefined) {
                        setIsInternalUploading(true);
                        onUploadingChange?.(true);
                        try {
                            const response = isImage(file.type)
                                ? await uploadService.uploadImage(moduleType, file, projectId)
                                : await uploadService.uploadDoc(moduleType, file, projectId);
                            if (response.statusCode === 200 && response.responseData?.name) {
                                newFile.serverUrl = response.responseData.name;
                                newFile.url = `${baseUrl}${response.responseData.name}`;
                                newFile.isUploading = false;
                                field.onChange(newFile);
                            } else {
                                setLocalError(response.message || 'Failed to upload file');
                            }
                        } catch {
                            setLocalError('Failed to upload file. Please try again.');
                        } finally {
                            setIsInternalUploading(false);
                            onUploadingChange?.(false);
                        }
                    } else {
                        newFile.isUploading = false;
                        field.onChange(newFile);
                    }

                    if (fileInputRef.current) fileInputRef.current.value = '';
                };

                const handleRemove = () => {
                    setLocalError('');
                    field.onChange(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                };

                const renderPreview = (doc: BannerDocumentFile) => {
                    const fileUrl = getFileUrl(doc);

                    // Image: show image thumbnail, click opens modal
                    if (isImage(doc.type) && fileUrl) {
                        return (
                            <img
                                src={fileUrl}
                                alt={doc.name}
                                className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setModalOpen(true)}
                            />
                        );
                    }

                    // Video: show video thumbnail
                    if (isVideo(doc.type) && fileUrl) {
                        return (
                            <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Open ${doc.name}`}
                                className="block relative w-8 h-8"
                            >
                                <video
                                    src={fileUrl}
                                    className="w-8 h-8 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                    muted
                                    preload="metadata"
                                />
                                {/* Play icon overlay */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <svg className="w-3 h-3 text-white drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                            </a>
                        );
                    }

                    // Fallback: document icon
                    const iconSrc = getDocumentIcon(doc);
                    return (
                        <img src={iconSrc} alt={doc.name} className="w-8 h-8 cursor-pointer hover:opacity-80 transition-opacity" />
                    );
                };

                return (
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={acceptString}
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={disabled || isInternalUploading}
                        />

                        {/* Image Modal */}
                        {field.value && isImage(field.value.type) && (
                            <BannerImageModal
                                isOpen={modalOpen}
                                onClose={() => setModalOpen(false)}
                                imageUrl={getFileUrl(field.value)}
                                imageName={field.value.name || 'Banner Image'}
                            />
                        )}

                        {field.value && !field.value.isUploading ? (
                            <div className="relative inline-block">
                                {renderPreview(field.value)}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove();
                                    }}
                                    disabled={disabled || isInternalUploading}
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Remove file"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center">
                                    <button
                                        type="button"
                                        onClick={handleUploadClick}
                                        disabled={disabled || isInternalUploading}
                                        className={`relative ${disabled || isInternalUploading ? 'cursor-not-allowed opacity-50' : 'hover:opacity-80'}`}
                                    >
                                        <div className="w-10 h-10 rounded flex items-center justify-center relative">
                                            {isInternalUploading ? (
                                                <div className="relative w-5 h-5 flex items-start justify-center bg-white">
                                                    <div className="w-4 h-4 bg-gray-400 rounded-full animate-big-bounce shadow-lg"></div>
                                                </div>
                                            ) : (
                                                <img
                                                    src="/svg/icons/general/ImageUploadIcon.svg"
                                                    alt="Upload"
                                                    className={`${iconSize === 'sm' ? 'w-10 h-10' : 'w-12 h-12'} transition-opacity duration-200`}
                                                />
                                            )}
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Hint */}
                        {hint && !fieldState.error && !localError && (
                            <div className="text-xs text-gray-500 mt-1">{hint}</div>
                        )}

                        {/* Error */}
                        {!disabled && (fieldState.error || localError) && (
                            <div className="text-xs text-red-500 mt-1">
                                {fieldState.error?.message || localError}
                            </div>
                        )}
                    </div>
                );
            }}
        />
    );
};

export default BannerUploadInput;
