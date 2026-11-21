import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';

/**
 * ReferenceDocuments Component (Display Only)
 *
 * A read-only display component for showing reference documents (images and files).
 * Only renders for REFERENCE_DOCUMENTS attribute type (17).
 * Opens documents in a new tab when clicked.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <ReferenceDocuments
 *   customAttr={{
 *     combinedAttributeName: 'documents',
 *     attributeType: { id: 17 },
 *     instructions: 'Uploaded reference documents'
 *   }}
 *   fileArray={['path/to/doc1.pdf', 'path/to/image.png']}
 * />
 *
 * @example
 * // With role name
 * <ReferenceDocuments
 *   customAttr={documentAttribute}
 *   fileArray={uploadedFiles}
 *   roleName="Admin"
 * />
 *
 * Props:
 * ------
 * @param {object} customAttr - Attribute configuration (required)
 * @param {string} customAttr.combinedAttributeName - Combined attribute name
 * @param {object} customAttr.attributeType - Must have id=17 (REFERENCE_DOCUMENTS)
 * @param {string} [customAttr.instructions] - Instructions/hint text
 * @param {boolean|number} [customAttr.mandatoryFlag] - Whether field is mandatory
 * @param {string[]} fileArray - Array of file URLs/paths (required)
 * @param {string} [roleName=""] - Role name for display
 *
 * Supported File Types:
 * ---------------------
 * - Images: png, jpg, jpeg, gif, webp (shows thumbnail)
 * - Documents: pdf, doc, docx, xls, xlsx, ppt, pptx, txt (shows icon)
 *
 * Features:
 * ---------
 * - Display-only (no editing)
 * - 90x100px thumbnails for images
 * - File type icons for documents
 * - Click to open in new tab
 * - Instructions text display
 * - Only renders for type 17 (REFERENCE_DOCUMENTS)
 * - Returns null if no files or wrong type
 */
// Image Modal Component for viewing images
interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex: number;
  getFileUrl: (file: string) => string;
}

const ImageModal: React.FC<ImageModalProps> = ({ isOpen, onClose, images, initialIndex, getFileUrl }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Update current index when initialIndex changes
  useMemo(() => {
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

  // Use portal to render modal at document body level
  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* White modal container - centered */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] max-w-4xl max-h-[600px] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
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

        {/* Image counter */}
        {isMultiple && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-3 py-1 rounded-full">
            {currentIndex + 1} / {images.length}
          </div>
        )}

        {/* Main image */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={`Image ${currentIndex + 1}`}
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

  // Render using portal
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};

interface ReferenceDocumentsProps {
  customAttr: {
    combinedAttributeName: string;
    attributeType: {
      id: number;
    };
    instructions?: string | null;
    mandatoryFlag?: boolean | number;
  };
  fileArray: string[]; // Simple array of file URLs
  roleName?: string;
}

const ReferenceDocuments = ({
  customAttr,
  fileArray,
  roleName = ''
}: ReferenceDocumentsProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL;

  // State for image modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  // Document icon mapping for different file types (excluding images - they show thumbnails)
  const documentIconUrlMap = useMemo(() => {
    const map = new Map<string, string>();
    map.set('pdf', '/svg/icons/general/PDF-File.svg');
    map.set('doc', '/svg/icons/general/file-alt-solid.svg');
    map.set('docx', '/svg/icons/general/file-alt-solid.svg');
    map.set('xls', '/svg/icons/general/file-excel-solid.svg');
    map.set('xlsx', '/svg/icons/general/file-excel-solid.svg');
    map.set('txt', '/svg/icons/general/file-alt-solid.svg');
    map.set('ppt', '/svg/icons/general/file-powerpoint-solid.svg');
    map.set('pptx', '/svg/icons/general/file-powerpoint-solid.svg');
    return map;
  }, []);

  // Get document icon URL based on file extension
  const getDocumentIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return documentIconUrlMap.get(ext) || '/svg/icons/general/file-icons/doc.svg';
  };

  // Check if file is an image
  const isImageFile = (fileName: string): boolean => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
  };

  // Get file URL
  const getFileUrl = (file: string): string => {
    return file.startsWith('http') ? file : `${baseUrl}${file}`;
  };

  // Get only image files for modal navigation
  const imageFiles = useMemo(() => {
    return fileArray?.filter(file => isImageFile(file)) || [];
  }, [fileArray]);

  // Open image modal
  const openImageModal = (file: string) => {
    const imageIndex = imageFiles.indexOf(file);
    if (imageIndex !== -1) {
      setModalImageIndex(imageIndex);
      setModalOpen(true);
    }
  };

  // Open document in new tab
  const openDocumentInNewTab = (file: string) => {
    const fileUrl = getFileUrl(file);
    window.open(fileUrl, '_blank');
  };

  // Only render for REFERENCE_DOCUMENTS type (17)
  if (customAttr.attributeType.id !== CustomAttributeTypeEnum.REFERENCE_DOCUMENTS) {
    return null;
  }

  // If no file data exists or empty array, don't render anything
  if (!fileArray || fileArray.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Image Modal for viewing images */}
      <ImageModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        images={imageFiles}
        initialIndex={modalImageIndex}
        getFileUrl={getFileUrl}
      />

      <div className="flex flex-wrap gap-2">
        {fileArray.map((file, i) => {
          const isImage = isImageFile(file);

          return (
            <div key={i} className="inline-block align-top text-center">
              {isImage ? (
                // Show actual image thumbnail for images (similar to UploadInput)
                <img
                  src={getFileUrl(file)}
                  alt={`Image ${i + 1}`}
                  className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => openImageModal(file)}
                  title="Click to view image"
                />
              ) : (
                // Show document icon for non-image files
                <img
                  src={getDocumentIcon(file)}
                  alt="document"
                  className="w-10 h-10 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => openDocumentInNewTab(file)}
                  title="Click to open document"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Instructions hint */}
      <div>
        {customAttr.instructions && (
          <div className="text-sm text-gray-500" style={{ fontSize: '100%', paddingTop: 0 }}>
            {customAttr.instructions}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferenceDocuments;
