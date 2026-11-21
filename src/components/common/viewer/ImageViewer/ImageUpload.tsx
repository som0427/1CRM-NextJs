import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import styles from './ImageUpload.module.css';
import uploadService from '@/lib/services/uploadService';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';

interface ImageUploadProps {
  customAttr: any;
  onChange: (files: string[]) => void;
  value?: string[];
  disabled?: boolean;
  isControlHasError?: (name: string, rule: string) => boolean;
}

interface FileArrayType {
  [key: string]: {
    files: string[];
    showDeleteOption: boolean;
    showUploadIcon: boolean;
    uploaded: number;
    maxUpload: number;
    hasError: boolean;
    errorMsg: string;
    validDocType?: string[];
  };
}

const ImageUpload = ({ 
  customAttr, 
  onChange,
  value = [],
  disabled = false,
  isControlHasError = () => false
}: ImageUploadProps) => {
  const [fileArray, setFileArray] = useState<FileArrayType>({});
  const [uploadQueue, setUploadQueue] = useState<{[key: string]: number}>({});
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [imageModalSrc, setImageModalSrc] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Base URL for image display - adjust this to match your environment
  const baseUrl = process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL;
  const selectedProject = JSON.parse(localStorage.getItem('selectedProject') || '{}');
  
  useEffect(() => {
    // Initialize the fileArray structure for this attribute
    if (!fileArray[customAttr.combinedAttributeName]) {
      setFileArray(prev => ({
        ...prev,
        [customAttr.combinedAttributeName]: {
          files: value || [],
          showDeleteOption: !disabled,
          showUploadIcon: true,
          uploaded: value?.length || 0,
          maxUpload: customAttr.maxImagesAllowed || 0,
          hasError: false,
          errorMsg: '',
          validDocType: ['jpg', 'jpeg', 'png', 'gif', 'webp']
        }
      }));
    }
  }, [customAttr, value, disabled]);

  // Update fileArray when value changes externally
  useEffect(() => {
    if (fileArray[customAttr.combinedAttributeName] && JSON.stringify(fileArray[customAttr.combinedAttributeName].files) !== JSON.stringify(value)) {
      setFileArray(prev => ({
        ...prev,
        [customAttr.combinedAttributeName]: {
          ...prev[customAttr.combinedAttributeName],
          files: value || [],
          uploaded: value?.length || 0,
          showUploadIcon: prev[customAttr.combinedAttributeName]?.maxUpload === 0 ? true : (value?.length || 0) < (customAttr.maxImagesAllowed || 0)
        }
      }));
    }
  }, [value, customAttr]);

  const processFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
    attribName: string,
    attributeTypeId: number,
    maxImage?: number
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const initialFileCount = files.length;
    if (initialFileCount > 0) {
      setIsUploading(true);
      
      // Update upload queue
      setUploadQueue(prev => ({
        ...prev,
        [attribName]: initialFileCount
      }));
      
      // Reset error state
      setFileArray(prev => ({
        ...prev,
        [attribName]: {
          ...prev[attribName],
          hasError: false
        }
      }));

      let uploadedFilesCount = fileArray[attribName]?.files?.length || 0;
      const newFiles = [...(fileArray[attribName]?.files || [])];
      const uploadPromises: Promise<any>[] = [];

      for (let i = 0; i < initialFileCount; i++) {
        if (!maxImage || uploadedFilesCount < maxImage) {
          const file = files[i];
          if (checkFileType(file, attributeTypeId, fileArray[attribName]?.validDocType)) {
            if (attributeTypeId === CustomAttributeTypeEnum.IMAGE) {
              const uploadPromise = uploadService.uploadImage(SystemAttributeEnum.OPPORTUNITY_MODULE, file, selectedProject)
                .then(res => {
                  newFiles.push(res.responseData.name);
                  return res;
                })
                .catch(error => {
                  const errorMsg = `Failed to upload file ${getSlicedErrorFileName(file.name)}. Please try again!`;
                  setFileArray(prev => ({
                    ...prev,
                    [attribName]: {
                      ...prev[attribName],
                      hasError: true,
                      errorMsg
                    }
                  }));
                  throw error;
                });
              
              uploadPromises.push(uploadPromise);
              uploadedFilesCount++;
            }
          } else {
            // Handle invalid file type
            const errorMsg = getFileErrorMsg(attributeTypeId, fileArray[attribName]?.validDocType);
            setFileArray(prev => ({
              ...prev,
              [attribName]: {
                ...prev[attribName],
                hasError: true,
                errorMsg
              }
            }));

            // Update upload queue
            setUploadQueue(prev => ({
              ...prev,
              [attribName]: prev[attribName] - 1
            }));
          }
        } else {
          // Max number of files reached
          setUploadQueue(prev => ({
            ...prev,
            [attribName]: prev[attribName] - (initialFileCount - i)
          }));
          break;
        }
      }

      // Process all uploads
      Promise.allSettled(uploadPromises)
        .then(results => {
          const successfulUploads = results.filter(r => r.status === 'fulfilled');
          
          if (successfulUploads.length > 0) {
            const updatedFiles = [...(fileArray[attribName]?.files || [])];
            
            successfulUploads.forEach(result => {
              if (result.status === 'fulfilled') {
                const res = result.value;
                updatedFiles.push(res.responseData.name);
              }
            });

            const uploadCount = updatedFiles.length;
            const showUploadIcon = fileArray[attribName]?.maxUpload === 0 ? true : uploadCount < (maxImage || 0);

            setFileArray(prev => ({
              ...prev,
              [attribName]: {
                ...prev[attribName],
                files: updatedFiles,
                uploaded: uploadCount,
                showUploadIcon
              }
            }));

            // Notify parent component about file change
            onChange(updatedFiles);
          }
        })
        .finally(() => {
          // Clear upload queue
          setUploadQueue(prev => ({
            ...prev,
            [attribName]: 0
          }));
          
          setIsUploading(false);
          
          // Reset the input so the same file can be selected again if needed
          if (uploadInputRef.current) {
            uploadInputRef.current.value = '';
          }
        });
    }
  };

  const checkFileType = (file: File, attributeTypeId: number, validDocTypes?: string[]): boolean => {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    if (attributeTypeId === CustomAttributeTypeEnum.IMAGE) {
      return validDocTypes?.includes(fileExt || '') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt || '');
    }

    if (attributeTypeId === CustomAttributeTypeEnum.DOCUMENT_UPLOAD) {
      return ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'].includes(fileExt || '');
    }

    if (attributeTypeId === CustomAttributeTypeEnum.AUDIO_VIDEO) {
      return ['mp3', 'mp4', 'wav', 'avi', 'mov'].includes(fileExt || '');
    }

    return false;
  };

  const getFileErrorMsg = (attributeTypeId: number, allowedDocTypes?: string[]): string => {
    if (attributeTypeId === CustomAttributeTypeEnum.IMAGE) {
      return 'Invalid image type. Allowed types: jpg, jpeg, png, gif, webp';
    }
    if (attributeTypeId === CustomAttributeTypeEnum.DOCUMENT_UPLOAD) {
      return 'Invalid document type. Allowed types: pdf, doc, docx, txt, xls, xlsx';
    }
    if (attributeTypeId === CustomAttributeTypeEnum.AUDIO_VIDEO) {
      return 'Invalid media type. Allowed types: mp3, mp4, wav, avi, mov';
    }
    return 'Invalid file type';
  };

  const getSlicedErrorFileName = (fileName: string): string => {
    return fileName.length > 15 ? fileName.substring(0, 15) + '...' : fileName;
  };

  const removeFile = (attribName: string, index: number) => {
    const updatedFiles = [...(fileArray[attribName]?.files || [])];
    updatedFiles.splice(index, 1);

    const uploadCount = updatedFiles.length;
    const showUploadIcon = fileArray[attribName]?.maxUpload === 0 ? true : uploadCount < (customAttr.maxImagesAllowed || 0);
    
    setFileArray(prev => ({
      ...prev,
      [attribName]: {
        ...prev[attribName],
        files: updatedFiles,
        uploaded: uploadCount,
        showUploadIcon
      }
    }));
    
    // Notify parent component about file change
    onChange(updatedFiles);
  };

  const clickImage = (attribName: string) => {
    if (uploadInputRef.current) {
      uploadInputRef.current.click();
    }
  };

  const showImageModalOnly = (file: string) => {
    setImageModalSrc(`${baseUrl}${file}`);
  };

  return (
    <div className="col-md-8 mt-3 mb-1">
      <div className={styles.imageUploadContainer}>
        <div className={styles.fileInputContainer}>
          <input
            id={customAttr.combinedAttributeName}
            ref={uploadInputRef}
            type="file"
            multiple={!customAttr.maxImagesAllowed || customAttr.maxImagesAllowed > 1}
            onChange={(e) => processFile(
              e,
              customAttr.combinedAttributeName,
              customAttr.attributeType.id,
              customAttr.maxImagesAllowed
            )}
            accept="image/*"
            disabled={disabled}
          />
        </div>

        {fileArray[customAttr.combinedAttributeName]?.files && (
          <>
            {fileArray[customAttr.combinedAttributeName]?.files.map((file, i) => (
              <div key={`${file}-${i}`} className={styles.artistCollectionPhoto}>
                {fileArray[customAttr.combinedAttributeName]?.showDeleteOption && (
                  <div className={styles.removeImgBtn}>
                    <button 
                      className={styles.closeImageButton}
                      type="button"
                      onClick={() => removeFile(customAttr.combinedAttributeName, i)}
                    >
                      <X size={14} className={styles.closeSvg} />
                    </button>
                  </div>
                )}
                <img 
                  width={60} 
                  height={80} 
                  src={`${baseUrl}${file}`} 
                  alt="image.jpg"
                  className={styles.imgThumbnail}
                  onClick={() => showImageModalOnly(file)}
                />
                <div className={styles.imgIndex}>
                  {customAttr.maxImagesAllowed ? 
                    `${i + 1}/${customAttr.maxImagesAllowed}` : 
                    `${i + 1}`
                  }
                </div>
              </div>
            ))}
          </>
        )}

        {fileArray[customAttr.combinedAttributeName]?.showUploadIcon && (
          <div className={styles.artistCollectionPhoto}>
            <img 
              width={60} 
              height={80}
              src="/svg/icons/general/imageIcon.svg" 
              alt="image.jpg"
              className={styles.imgThumbnail}
              onClick={() => clickImage(customAttr.combinedAttributeName)}
            />
            {customAttr.maxImagesAllowed && fileArray[customAttr.combinedAttributeName]?.uploaded === 0 && (
              <div className={styles.imgIndex}>
                {`0/${customAttr.maxImagesAllowed}`}
              </div>
            )}
          </div>
        )}

        {isUploading && (
          <div className={styles.spinner} />
        )}

        <div className={styles.matFormFieldUnderline}>
          <span className={styles.matFormFieldRipple}></span>
        </div>
        
        <div className={styles.matFormFieldSubscriptWrapper}>
          {!isControlHasError(customAttr.combinedAttributeName, 'required') && 
           !fileArray[customAttr.combinedAttributeName]?.hasError && (
            <div className={styles.matHint_img}>
              {customAttr.instructions}
            </div>
          )}
          
          {isControlHasError(customAttr.combinedAttributeName, 'required') && (
            <div className={styles.errorText}>
              {customAttr.attributeName} can not be blank.
            </div>
          )}
          
          {fileArray[customAttr.combinedAttributeName]?.hasError && (
            <div className={styles.errorText}>
              {fileArray[customAttr.combinedAttributeName].errorMsg}
            </div>
          )}
          
          {!customAttr.isEdit && (
            <span style={{ color: '#808080' }}>🔒</span>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {imageModalSrc && (
        <div className={styles.imageModal} onClick={() => setImageModalSrc(null)}>
          <button className={styles.imageModalClose} onClick={() => setImageModalSrc(null)}>
            <X size={20} className={styles.imageModalCloseIcon} />
          </button>
          <img src={imageModalSrc} alt="Full size preview" className={styles.imageModalContent} />
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
