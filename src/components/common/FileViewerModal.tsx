import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/tailwind/dialog";
import { Button } from "../ui/tailwind";
import { X, Download, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { CustomAttributeTypeEnum } from '../../lib/constants/CustomAttributeTypeEnum.constant';

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  fileName?: string;
  fileType: CustomAttributeTypeEnum.IMAGE | CustomAttributeTypeEnum.AUDIO_VIDEO | CustomAttributeTypeEnum.DOCUMENT_UPLOAD;
}

const FileViewerModal: React.FC<FileViewerModalProps> = ({
  isOpen,
  onClose,
  filePath,
  fileName,
  fileType
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imagePaths, setImagePaths] = useState<string[]>([]);

  // Get the base URL from environment
  const baseUrl = process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL || '';
  
  // Handle comma-separated paths for all file types
  useEffect(() => {
    if (filePath) {
      const paths = filePath.split(',').map(path => path.trim()).filter(path => path.length > 0);
      setImagePaths(paths);
      setCurrentImageIndex(0);
    } else {
      setImagePaths([filePath]);
      setCurrentImageIndex(0);
    }
  }, [filePath, fileType]);
  
  // Get current file URL
  const getCurrentFileUrl = () => {
    const currentPath = imagePaths[currentImageIndex] || filePath;
    return `${baseUrl}${currentPath}`;
  };
  
  const fullUrl = getCurrentFileUrl();

  // Extract file extension from path
  const getFileExtension = (path: string): string => {
    return path.split('.').pop()?.toLowerCase() || '';
  };

  const getCurrentPath = () => imagePaths[currentImageIndex] || filePath;
  const fileExtension = getFileExtension(getCurrentPath());
  const displayFileName = fileName || getCurrentPath().split('/').pop() || 'Unknown File';
  
  // Navigation functions for multiple images
  const goToPreviousImage = useCallback(() => {
    if (imagePaths.length > 1) {
      setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : imagePaths.length - 1));
      setIsLoading(true);
      setHasError(false);
    }
  }, [imagePaths.length]);
  
  const goToNextImage = useCallback(() => {
    if (imagePaths.length > 1) {
      setCurrentImageIndex((prev) => (prev < imagePaths.length - 1 ? prev + 1 : 0));
      setIsLoading(true);
      setHasError(false);
    }
  }, [imagePaths.length]);

  // Handle download
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = displayFileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle external link
  const handleOpenExternal = () => {
    window.open(fullUrl, '_blank');
  };

  // Handle load success
  const handleLoadSuccess = () => {
    setIsLoading(false);
    setHasError(false);
  };

  // Handle load error
  const handleLoadError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Reset states when modal opens or image changes
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setHasError(false);
      // Always start from first image when modal opens
      setCurrentImageIndex(0);
    }
  }, [isOpen]);
  
  // Add keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isOpen || imagePaths.length <= 1) {
        return;
      }
      
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPreviousImage();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNextImage();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress);
      return () => {
        document.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [isOpen, fileType, imagePaths.length, goToPreviousImage, goToNextImage, onClose]);

  // Render content based on file type
  const renderFileContent = () => {
    if (hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-96 text-gray-500">
          <div className="text-6xl mb-4">📄</div>
          <p className="text-lg font-medium mb-2">Unable to load file</p>
          <p className="text-sm text-gray-400 mb-4">The file might be corrupted or unavailable</p>
          <Button onClick={handleOpenExternal} variant="outline" className="mb-2">
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in New Tab
          </Button>
        </div>
      );
    }

    switch (fileType) {
      case CustomAttributeTypeEnum.IMAGE:
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            )}
            
            {/* Navigation buttons for multiple images - Always visible */}
            {imagePaths.length > 1 && (
              <>
                <button
                  onClick={goToPreviousImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg hover:bg-gray-50 text-gray-700 p-3 rounded-full z-10 transition-all border border-gray-200"
                  title="Previous image"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goToNextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg hover:bg-gray-50 text-gray-700 p-3 rounded-full z-10 transition-all border border-gray-200"
                  title="Next image"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
            
            <img
              src={fullUrl}
              alt={displayFileName}
              className="max-w-full max-h-full object-contain"
              onLoad={handleLoadSuccess}
              onError={handleLoadError}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
            
          </div>
        );

      case CustomAttributeTypeEnum.AUDIO_VIDEO:
        const isVideo = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(fileExtension);
        const isAudio = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'].includes(fileExtension);

        if (isVideo) {
          return (
            <div className="relative bg-black rounded-lg overflow-hidden">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              )}
              
              {/* Navigation buttons for multiple videos - Always visible */}
              {imagePaths.length > 1 && (
                <>
                  <button
                    onClick={goToPreviousImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg hover:bg-gray-50 text-gray-700 p-3 rounded-full z-10 transition-all border border-gray-200"
                    title="Previous video"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goToNextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg hover:bg-gray-50 text-gray-700 p-3 rounded-full z-10 transition-all border border-gray-200"
                    title="Next video"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
              
              <video
                src={fullUrl}
                controls
                className="w-full max-h-[70vh]"
                onLoadedData={handleLoadSuccess}
                onError={handleLoadError}
                style={{ display: isLoading ? 'none' : 'block' }}
              >
                Your browser does not support the video tag.
              </video>
              

            </div>
          );
        } else if (isAudio) {
          return (
            <div className="relative flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
              <div className="text-6xl mb-4">🎵</div>
              <audio
                src={fullUrl}
                controls
                className="w-full max-w-md mb-4"
                onLoadedData={handleLoadSuccess}
                onError={handleLoadError}
              >
                Your browser does not support the audio tag.
              </audio>
              <Button onClick={handleDownload} variant="outline" className="mt-2">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              
              {/* Navigation arrows for multiple audio files */}
              {imagePaths.length > 1 && (
                <>
                  <button
                    onClick={goToPreviousImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg hover:bg-gray-50 text-gray-700 p-3 rounded-full z-10 transition-all border border-gray-200"
                    title="Previous audio"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goToNextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg hover:bg-gray-50 text-gray-700 p-3 rounded-full z-10 transition-all border border-gray-200"
                    title="Next audio"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  
                  {/* Audio counter */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} of {imagePaths.length}
                  </div>
                </>
              )}
            </div>
          );
        } else {
          return (
            <div className="relative flex flex-col items-center justify-center h-96 text-gray-500">
              <div className="text-6xl mb-4">🎬</div>
              <p className="text-lg font-medium mb-2">Media File</p>
              <Button onClick={handleOpenExternal} variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in New Tab
              </Button>
              
              {/* Navigation arrows for multiple media files */}
              {imagePaths.length > 1 && (
                <>
                  <button
                    onClick={goToPreviousImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg hover:bg-gray-50 text-gray-700 p-3 rounded-full z-10 transition-all border border-gray-200"
                    title="Previous media"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goToNextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg hover:bg-gray-50 text-gray-700 p-3 rounded-full z-10 transition-all border border-gray-200"
                    title="Next media"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  
                  {/* Media counter */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} of {imagePaths.length}
                  </div>
                </>
              )}
            </div>
          );
        }

      case CustomAttributeTypeEnum.DOCUMENT_UPLOAD:
        const isPdf = fileExtension === 'pdf';
        
        if (isPdf) {
          return (
            <div className="relative bg-gray-100 rounded-lg overflow-hidden">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              )}
              <iframe
                src={fullUrl}
                className="w-full h-[70vh]"
                title={displayFileName}
                onLoad={handleLoadSuccess}
                onError={handleLoadError}
                style={{ display: isLoading ? 'none' : 'block' }}
              />
              
              {/* Navigation arrows for multiple PDFs */}
              {imagePaths.length > 1 && (
                <>
                  <button
                    onClick={goToPreviousImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg hover:bg-gray-50 text-gray-700 p-3 rounded-full z-10 transition-all border border-gray-200"
                    title="Previous PDF"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goToNextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg hover:bg-gray-50 text-gray-700 p-3 rounded-full z-10 transition-all border border-gray-200"
                    title="Next PDF"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  
                  {/* PDF counter */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} of {imagePaths.length}
                  </div>
                </>
              )}
            </div>
          );
        } else {
          return (
            <div className="relative flex flex-col items-center justify-center h-96 text-gray-500">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-lg font-medium mb-2">Document File</p>
              <div className="flex gap-2">
                <Button onClick={handleDownload} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
              
              {/* Navigation arrows for multiple documents */}
              {imagePaths.length > 1 && (
                <>
                  <button
                    onClick={goToPreviousImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg hover:bg-gray-50 text-gray-700 p-3 rounded-full z-10 transition-all border border-gray-200"
                    title="Previous document"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={goToNextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white shadow-lg hover:bg-gray-50 text-gray-700 p-3 rounded-full z-10 transition-all border border-gray-200"
                    title="Next document"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  
                  {/* Document counter */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} of {imagePaths.length}
                  </div>
                </>
              )}
            </div>
          );
        }

      default:
        return (
          <div className="flex flex-col items-center justify-center h-96 text-gray-500">
            <div className="text-6xl mb-4">❓</div>
            <p className="text-lg font-medium mb-2">Unknown File Type</p>
            <Button onClick={handleOpenExternal} variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="w-24"></div> {/* Spacer for left side */}
            <DialogTitle className="text-lg font-semibold text-center flex-1">
              {imagePaths.length > 0 
                ? `${currentImageIndex + 1}/${imagePaths.length}`
                : 'No File'
              }
            </DialogTitle>
            <div className="flex items-center gap-2 w-24 justify-end">
              
              <Button 
                variant="ghost" 
                className="h-10 w-10 p-0 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-0 focus:border-none focus:shadow-none" 
                onClick={onClose}
                title="Close"
                style={{ boxShadow: 'none', outline: 'none' }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 mt-4 relative bg-gray-50 rounded-lg overflow-hidden">
          {renderFileContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FileViewerModal;
