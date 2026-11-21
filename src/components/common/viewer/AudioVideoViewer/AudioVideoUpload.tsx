import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import styles from './AudioVideoUpload.module.css';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import uploadService from '@/lib/services/uploadService';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';

interface AudioVideoUploadProps {
  customAttr: any;
  onChange: (files: string[]) => void;
  value: string[];
  disabled?: boolean;
  isControlHasError: (name: string, rule: string) => boolean;
}

const AudioVideoUpload: React.FC<AudioVideoUploadProps> = ({
  customAttr,
  onChange,
  value = [],
  disabled = false,
  isControlHasError
}) => {
  const [fileArray, setFileArray] = useState<{[key: string]: any}>({});
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<{[key: string]: number}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const baseUrl = process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL;
  const selectedProject = JSON.parse(localStorage.getItem('selectedProject') || '{}');
  
  // Extract stable values from customAttr to prevent unnecessary re-renders
  const key = useMemo(() => customAttr.combinedAttributeName, []);
  const maxImagesAllowed = useMemo(() => customAttr.maxImagesAllowed || 0, []);

  // Initialize fileArray on component mount only once or when critical values change
  useEffect(() => {
    const currentFiles = value || [];
    const currentUploaded = currentFiles.length;
    const showUploadIcon = maxImagesAllowed === 0 ? true : currentUploaded < maxImagesAllowed;
    
    setFileArray(prevState => {
      // Only update if values are different to prevent unnecessary re-renders
      if (prevState[key] && 
          JSON.stringify(prevState[key].files) === JSON.stringify(currentFiles) &&
          prevState[key].showDeleteOption === !disabled &&
          prevState[key].showUploadIcon === showUploadIcon) {
        return prevState;
      }
      
      return {
        [key]: {
          files: currentFiles,
          showDeleteOption: !disabled,
          showUploadIcon,
          hasError: false,
          errorMsg: '',
          uploaded: currentUploaded,
          maxUpload: maxImagesAllowed,
          validDocType: ['audio/*', 'video/*']
        }
      };
    });
  }, [value, disabled]);

  const clickImage = () => {
    if (fileInputRef.current && !disabled) {
      fileInputRef.current.click();
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = [...fileArray[key].files];
    updatedFiles.splice(index, 1);
    
    const updatedCount = updatedFiles.length;
    const showUploadIcon = maxImagesAllowed === 0 ? true : updatedCount < maxImagesAllowed;
    
    setFileArray(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        files: updatedFiles,
        uploaded: updatedCount,
        showUploadIcon,
        hasError: false,
        errorMsg: ''
      }
    }));
    
    onChange(updatedFiles);
  };

  const checkFileType = (file: File) => {
    const fileType = file.type;
    return fileType.startsWith('audio/') || fileType.startsWith('video/');
  };

  const getSlicedErrorFileName = (fileName: string) => {
    if (fileName.length > 20) {
      return fileName.substring(0, 17) + '...';
    }
    return fileName;
  };

  const checkUploadQueue = (fileKey: string) => {
    if (uploadQueue[fileKey] <= 0) {
      setUploading(false);
      setUploadQueue(prev => ({
        ...prev,
        [fileKey]: 0
      }));
    }
  };

  const processFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const files = Array.from(event.target.files);
    const maxImages = customAttr.maxImagesAllowed;
    const currentFileCount = fileArray[key]?.files?.length || 0;
    
    setUploading(true);
    setUploadQueue(prev => ({
      ...prev,
      [key]: (prev[key] || 0) + files.length
    }));
    
    // Create a copy of the fileArray state to avoid direct mutations
    const updatedFileArray = { ...fileArray };
    if (!updatedFileArray[key]) {
      updatedFileArray[key] = {
        files: [],
        showDeleteOption: true,
        showUploadIcon: true,
        hasError: false,
        errorMsg: '',
        uploaded: 0,
        maxUpload: maxImages || 0
      };
    }
    updatedFileArray[key].hasError = false;
    updatedFileArray[key].errorMsg = '';
    
    let uploadedFilesCount = currentFileCount;
    
    files.forEach((file, index) => {
      if (!maxImages || uploadedFilesCount < maxImages) {
        if (checkFileType(file)) {
          if (file.size < 26214400) { // 25MB limit
            uploadService.uploadDoc(SystemAttributeEnum.OPPORTUNITY_MODULE, file, selectedProject)
              .then(res => {
                // Update fileArray when upload completes
                setFileArray(current => {
                  const updated = { ...current };
                  if (!updated[key]) {
                    updated[key] = {
                      files: [],
                      showDeleteOption: !disabled,
                      showUploadIcon: maxImages === 0 ? true : 0 < maxImages,
                      hasError: false,
                      errorMsg: '',
                      uploaded: 0,
                      maxUpload: maxImagesAllowed
                    };
                  }
                  
                  updated[key].files = [...(updated[key].files || []), res.responseData.name];
                  updated[key].uploaded = updated[key].files.length;
                  updated[key].showUploadIcon = maxImagesAllowed === 0 ? 
                    true : updated[key].uploaded < maxImagesAllowed;
                  
                  // Notify parent of change
                  onChange(updated[key].files);
                  
                  return updated;
                });
                
                // Update upload queue
                setUploadQueue(prev => {
                  const updated = { ...prev };
                  updated[key] = (updated[key] || 0) - 1;
                  checkUploadQueue(key);
                  return updated;
                });
              })
              .catch(error => {
                setFileArray(current => {
                  const updated = { ...current };
                  if (!updated[key]) {
                    updated[key] = {
                      files: [],
                      showDeleteOption: !disabled,
                      showUploadIcon: maxImages === 0 ? true : 0 < maxImages,
                      hasError: true,
                      errorMsg: `Failed to upload file ${getSlicedErrorFileName(file.name)}. Please try again!`,
                      uploaded: 0,
                      maxUpload: maxImagesAllowed
                    };
                  } else {
                    updated[key].hasError = true;
                    updated[key].errorMsg = `Failed to upload file ${getSlicedErrorFileName(file.name)}. Please try again!`;
                  }
                  return updated;
                });
                
                // Update upload queue
                setUploadQueue(prev => {
                  const updated = { ...prev };
                  updated[key] = (updated[key] || 0) - 1;
                  checkUploadQueue(key);
                  return updated;
                });
                
                console.error('Error uploading file:', error);
              });
              
            uploadedFilesCount++;
          } else {
            // Handle file too large
            setFileArray(current => {
              const updated = { ...current };
              if (!updated[key]) {
                updated[key] = {
                  files: [],
                  showDeleteOption: !disabled,
                  showUploadIcon: maxImagesAllowed === 0 ? true : 0 < maxImagesAllowed,
                  hasError: true,
                  errorMsg: 'File size limit 25 MB',
                  uploaded: 0,
                  maxUpload: maxImagesAllowed
                };
              } else {
                updated[key].hasError = true;
                updated[key].errorMsg = 'File size limit 25 MB';
              }
              return updated;
            });
            
            // Update upload queue
            setUploadQueue(prev => {
              const updated = { ...prev };
              updated[key] = (updated[key] || 0) - 1;
              checkUploadQueue(key);
              return updated;
            });
          }
        } else {
          // Handle invalid file type
          setFileArray(current => {
            const updated = { ...current };
            if (!updated[key]) {
              updated[key] = {
                files: [],
                showDeleteOption: !disabled,
                showUploadIcon: maxImages === 0 ? true : 0 < maxImages,
                hasError: true,
                errorMsg: 'Only audio and video files are allowed',
                uploaded: 0,
                maxUpload: maxImages || 0
              };
            } else {
              updated[key].hasError = true;
              updated[key].errorMsg = 'Only audio and video files are allowed';
            }
            return updated;
          });
          
          // Update upload queue
          setUploadQueue(prev => {
            const updated = { ...prev };
            updated[key] = (updated[key] || 0) - 1;
            checkUploadQueue(key);
            return updated;
          });
        }
      } else {
        // Max files already reached
        setUploadQueue(prev => {
          const updated = { ...prev };
          updated[key] = (updated[key] || 0) - 1;
          checkUploadQueue(key);
          return updated;
        });
      }
    });
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // If fileArray isn't initialized for this key yet, return null or loading state
  // Initialize fileData with defaults if not yet available
  const fileData = fileArray[key] || {
    files: [],
    showDeleteOption: !disabled,
    showUploadIcon: true,
    hasError: false,
    errorMsg: '',
    uploaded: 0,
    maxUpload: maxImagesAllowed,
    validDocType: ['audio/*', 'video/*']
  };

  return (
    <div className="col-md-8 mt-3 mb-1">
      <div className={styles.imageUploadContainer}>
      <input 
        id={customAttr.combinedAttributeName}
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        multiple
        accept="audio/*,video/*"
        onChange={processFile}
        disabled={disabled}
      />
      
      <div className={styles.filesContainer}>
        {fileData.files && fileData.files.map((file: string, idx: number) => (
          <div key={idx} className={styles.artistCollectionPhoto}>
            <div className={styles.filePreview}>
              {fileData.showDeleteOption && !disabled && (
                <button 
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeFile(idx)}
                >
                  <X size={16} />
                </button>
              )}
              <a 
                href={`${baseUrl}${file}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className={styles.fileThumbnail}>
                  {/* File icon for audio/video */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 384 512">
                    <path d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm76.45 211.36l-96.42 95.7c-6.65 6.61-17.39 6.61-24.04 0l-96.42-95.7C73.42 337.29 80.54 320 94.82 320H160v-80c0-8.84 7.16-16 16-16h32c8.84 0 16 7.16 16 16v80h65.18c14.28 0 21.4 17.29 11.27 27.36zM377 105L279.1 7c-4.5-4.5-10.6-7-17-7H256v128h128v-6.1c0-6.3-2.5-12.4-7-16.9z" />
                  </svg>
                  
                </div>
              </a>
            </div>
            <div className={styles.imgIndex}>
              {customAttr.maxImagesAllowed ? `${idx + 1}/${customAttr.maxImagesAllowed}` : `${idx + 1}`}
            </div>
          </div>
        ))}
        
        {fileData.showUploadIcon && !disabled && (
          <div className={styles.artistCollectionPhoto}>
            <div className={styles.filePreview}>
              <img 
                width={60} 
                height={80}
                src="/svg/icons/general/DocumentUpload.svg" 
                alt="document_upload.svg" 
                className={styles.imgThumbnail}
                onClick={clickImage}
              />
            </div>
            {customAttr.maxImagesAllowed && (
              <div className={styles.imgIndex}>
                0/{customAttr.maxImagesAllowed}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className={styles.matFormFieldSubscriptWrapper}>
        {!isControlHasError(customAttr.combinedAttributeName, 'required') && !fileData.hasError && customAttr.instructions && (
          <div className={styles.matHint_img}>
            {customAttr.instructions}
          </div>
        )}
        
        {isControlHasError(customAttr.combinedAttributeName, 'required') && (
          <div className={styles.errorText}>
            {customAttr.attributeName} can not be blank.
          </div>
        )}
        
        {fileData.hasError && (
          <div className={styles.errorText}>
            {fileData.errorMsg}
          </div>
        )}
        
        {!customAttr.isEdit && (
          <span style={{ color: '#808080' }}>🔒</span>
        )}
      </div>
      
      {/* Loading spinner */}
      {uploading && (
        <div className={styles.spinnerContainer}>
          <div className={styles.spinner}></div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AudioVideoUpload;
