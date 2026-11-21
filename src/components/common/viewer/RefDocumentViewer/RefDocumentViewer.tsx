import React, { useMemo } from 'react';
import styles from './RefDocumentViewer.module.css';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';

interface RefDocumentViewerProps {
  customAttr: {
    attributeType: {
      id: number;
    };
    isHidden: boolean;
    combinedAttributeName: string;
    instructions?: string;
    mandatoryFlag: boolean;
  };
  fileArray: Record<string, {
    files: string[];
    documentIcons: string[];
  }>;
  baseUrl: string;
}

/**
 * Component to display reference document thumbnails with viewer functionality
 * Direct equivalent to the Angular implementation
 */
const RefDocumentViewer: React.FC<RefDocumentViewerProps> = ({
  customAttr,
  fileArray,
  baseUrl = process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL
}) => {
  
  // Document icon mapping for different file types
  const documentIconUrlMap = useMemo(() => {
    const map = new Map<string, string>();
    map.set('pdf', '/svg/icons/general/file-icons/pdf.svg');
    map.set('doc', '/svg/icons/general/file-icons/doc.svg');
    map.set('docx', '/svg/icons/general/file-icons/doc.svg');
    map.set('xls', '/svg/icons/general/file-icons/xls.svg');
    map.set('xlsx', '/svg/icons/general/file-icons/xls.svg');
    map.set('txt', '/svg/icons/general/file-icons/txt.svg');
    map.set('ppt', '/svg/icons/general/file-icons/ppt.svg');
    map.set('pptx', '/svg/icons/general/file-icons/ppt.svg');
    return map;
  }, []);

  // Skip rendering if this isn't a reference document or is hidden
  if (
    customAttr.attributeType.id !== CustomAttributeTypeEnum.REFERENCE_DOCUMENTS ||
    customAttr.isHidden
  ) {
    return null;
  }

  /**
   * Handle clicking on document thumbnail
   * Equivalent to showRefDocModal in Angular
   */
  const showRefDocModal = (attr: string, id: number) => {
    const fileAttr = fileArray[attr];
    if (fileAttr) {
      // Open all documents in a new tab
      window.open(fileAttr.files[id], '_blank');
    }
  };

  // If there's no data, render placeholder with debug info
  if (!fileArray[customAttr.combinedAttributeName]) {
    return (
      <div className={styles.filesContainer}>
        <p>No reference documents to display</p>
        <p className="text-gray-400 text-sm">(Field name: {customAttr.combinedAttributeName})</p>
      </div>
    );
  }

  return (
    <div className="col-md-8 mt-3 mb-1">
      <div className={styles.documentViewerContainer}>
        <div className={styles.filesContainer}>
          {fileArray[customAttr.combinedAttributeName]?.documentIcons.map((icon, i) => (
            <div key={i} className={styles.artistCollectionPhoto}>
              <div className={styles.filePreview}>
                <img
                  width="90"
                  height="100"
                  src={icon}
                  alt="document thumbnail"
                  className={styles.documentThumbnail}
                  onClick={() => showRefDocModal(customAttr.combinedAttributeName, i)}
                />
              </div>
              <div className={styles.imgIndex}>
                {i + 1}
              </div>
            </div>
          ))}
        </div>
        <div className={styles.matFormFieldSubscriptWrapper}>
          {customAttr.instructions && (
            <div className={styles.matHint_img}>
              {customAttr.instructions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefDocumentViewer;
