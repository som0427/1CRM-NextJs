import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { DocumentData } from '@/lib/models/document.model';
import { AddFileRequest } from '@/lib/models/document.model';
import documentService from '@/lib/services/documentService';
import { getProjectId } from '@/lib/storage/sharedStorage';

interface AddFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fileData: {
    name: string;
    parentId: number | null;
    sharedWith: string;
    selectedFile?: File;
    accessIds?: string;
  }) => void;
  onSaveAndAddNew: (fileData: {
    name: string;
    parentId: number | null;
    sharedWith: string;
    selectedFile?: File;
    accessIds?: string;
  }) => void;
  existingFiles: DocumentData[];
  isLoading?: boolean;
}

const AddFileModal: React.FC<AddFileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveAndAddNew,
  existingFiles,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    parentId: null as number | null,
    sharedWith: 'None'
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    file?: string;
    folder?: string;
    shareWith?: string;
    access?: string;
  }>({});

  const [nameLength, setNameLength] = useState(0);
  const maxNameLength = 100;
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const [isShareWithDropdownOpen, setIsShareWithDropdownOpen] = useState(false);
  const [isAccessDropdownOpen, setIsAccessDropdownOpen] = useState(false);
  const [accessOptions, setAccessOptions] = useState<any[]>([]);
  const [accessIds, setAccessIds] = useState<number[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [accessSearchTerm, setAccessSearchTerm] = useState('');

  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [shareWithDropdownPosition, setShareWithDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [toast, setToast] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const shareWithDropdownRef = useRef<HTMLDivElement>(null);
  const accessDropdownRef = useRef<HTMLDivElement>(null);

  // File upload handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-populate name field with file name (without extension)
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      setFormData(prev => ({ ...prev, name: fileName }));
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-populate name field with file name (without extension)
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      setFormData(prev => ({ ...prev, name: fileName }));
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        parentId: null,
        sharedWith: 'None'
      });
      setSelectedFile(null);
      setIsDragOver(false);
      setNameLength(0);
      setIsFolderDropdownOpen(false);
      setIsShareWithDropdownOpen(false);
      setIsAccessDropdownOpen(false);
      setAccessIds([]);
      setAccessOptions([]);
      setAccessSearchTerm('');
    }
  }, [isOpen]);

  // Update name length counter
  useEffect(() => {
    setNameLength(formData.name.length);
  }, [formData.name]);

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFolderDropdownOpen(false);
      }
      if (shareWithDropdownRef.current && !shareWithDropdownRef.current.contains(event.target as Node)) {
        setIsShareWithDropdownOpen(false);
      }
      if (accessDropdownRef.current && !accessDropdownRef.current.contains(event.target as Node)) {
        setIsAccessDropdownOpen(false);
      }
    };

    if (isFolderDropdownOpen || isShareWithDropdownOpen || isAccessDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFolderDropdownOpen, isShareWithDropdownOpen, isAccessDropdownOpen]);

  // Get only folders from existing documents
  const folderOptions = existingFiles.filter(doc => doc.type === 'folder');

  // Get selected folder name for display
  const selectedFolder = folderOptions.find(folder => folder.id === formData.parentId);
  const selectedFolderName = selectedFolder ? selectedFolder.name : 'None';

  // Share With options
  const shareWithOptions = ['None', 'Selected Role', 'Selected User'];

  // Filter access options based on search term
  const filteredAccessOptions = accessOptions.filter(option => {
    if (!accessSearchTerm) return true;
    
    const name = formData.sharedWith === 'Selected Role' 
      ? option.roleName 
      : `${option.firstName || ''} ${option.lastName || ''}`.trim();
    
    return name.toLowerCase().includes(accessSearchTerm.toLowerCase());
  });

  // Toast utility functions
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message });
    // Auto-hide toast after 5 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFolderSelect = (folderId: number | null) => {
    let inheritedShareWith = '';
    
    if (folderId === null) {
      // When "None" is selected, Share With becomes editable and required
      inheritedShareWith = '';
    } else {
      // Find the selected folder from existingFolders (which has the sharing data)
      const folder = existingFiles.find(f => f.id === folderId);
      console.log('Selected folder:', folder); // Debug log
      
      if (folder) {
        console.log('Folder sharedWith:', folder.sharedWith); // Debug log
        // Map folder's sharedWith value to dropdown options
        switch (folder.sharedWith) {
          case 'Selected Role':
          case 'Role':
          case 'Selected Roles': // Handle plural form
            inheritedShareWith = 'Selected Role';
            break;
          case 'Selected User':
          case 'User':
          case 'Selected Users': // Handle plural form
            inheritedShareWith = 'Selected User';
            break;
          default:
            inheritedShareWith = 'None';
        }
      } else {
        inheritedShareWith = 'None';
      }
    }
    
    setFormData(prev => ({
      ...prev,
      parentId: folderId,
      sharedWith: inheritedShareWith
    }));
    setIsFolderDropdownOpen(false);
    
    // Reset access selections when folder changes
    setAccessIds([]);
    setAccessOptions([]);
    
    // If the inherited setting requires role/user selection, fetch the options
    if (inheritedShareWith === 'Selected Role') {
      fetchAccessOptions('roles');
    } else if (inheritedShareWith === 'Selected User') {
      fetchAccessOptions('users');
    }
  };

  const handleShareWithSelect = async (shareWith: string) => {
    setFormData(prev => ({
      ...prev,
      sharedWith: shareWith
    }));
    setIsShareWithDropdownOpen(false);

    // If Selected Role is chosen, fetch roles
    if (shareWith === 'Selected Role') {
      await fetchAccessOptions('roles');
    } else if (shareWith === 'Selected User') {
      await fetchAccessOptions('users');
    } else {
      // Reset access options if other option is selected
      setAccessIds([]);
      setAccessOptions([]);
    }
  };

  const fetchAccessOptions = async (type: 'roles' | 'users') => {
    setLoadingAccess(true);
    try {
      // Get project ID from shared storage
      const projectId = getProjectId();
      
      const response = type === 'roles' 
        ? await documentService.getRoles(projectId)
        : await documentService.getUsers(projectId);
      
      if (response.statusCode === 200) {
        setAccessOptions(response.responseData);
      }
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
    } finally {
      setLoadingAccess(false);
    }
  };

  const handleAccessToggle = (accessId: number) => {
    setAccessIds(prev => {
      if (prev.includes(accessId)) {
        return prev.filter(id => id !== accessId);
      } else {
        return [...prev, accessId];
      }
    });
  };

  const calculateDropdownPosition = () => {
    if (accessDropdownRef.current) {
      const rect = accessDropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 300; // Approximate height of dropdown
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        setDropdownPosition('top');
      } else {
        setDropdownPosition('bottom');
      }
    }
  };

  const calculateShareWithDropdownPosition = () => {
    if (shareWithDropdownRef.current) {
      const rect = shareWithDropdownRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 200; // Approximate height of share with dropdown
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        setShareWithDropdownPosition('top');
      } else {
        setShareWithDropdownPosition('bottom');
      }
    }
  };

  const handleSave = async () => {
    // Clear previous validation errors
    setValidationErrors({});
    
    const errors: typeof validationErrors = {};
    
    // Validate required fields
    if (!formData.name.trim()) {
      errors.name = 'Document name cannot be blank.';
    }
    
    if (!selectedFile) {
      errors.file = 'File upload cannot be blank.';
    }
    
    if (!formData.sharedWith || formData.sharedWith === 'None') {
      errors.shareWith = 'Share With cannot be blank.';
    }

    // Validate folder selection is required
    if (formData.parentId === null) {
      errors.folder = 'Folder selection cannot be blank.';
    }

    // Validate access selection based on shareWith value
    if (formData.sharedWith === 'Selected Role' || formData.sharedWith === 'Selected User') {
      if (accessIds.length === 0) {
        const fieldName = formData.sharedWith === 'Selected Role' ? 'Select Roles' : 'Select Users';
        errors.access = `${fieldName} cannot be blank.`;
      }
    }

    // Check for duplicate document names within the same folder
    const isDuplicateName = existingFiles.some(file => 
      file.name.toLowerCase() === formData.name.trim().toLowerCase() &&
      file.type === 'document' && // Only check against documents
      file.parentId === formData.parentId // Check within the same folder
    );
    
    if (isDuplicateName) {
      const folderName = formData.parentId 
        ? folderOptions.find(f => f.id === formData.parentId)?.name || 'selected folder'
        : 'root folder';
      errors.name = `A document with this name already exists in ${folderName}.`;
    }

    // If there are validation errors (including duplicates), set them and return
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      // Call parent save handler with file data
      onSave({
        name: formData.name.trim(),
        parentId: formData.parentId,
        sharedWith: formData.sharedWith,
        selectedFile: selectedFile,
        accessIds: accessIds.length > 0 ? accessIds.join(',') : ''
      });
    } catch (error) {
      console.error('Error saving file:', error);
    }
  };

  const handleSaveAndAddNew = async () => {
    // Clear previous validation errors
    setValidationErrors({});
    
    const errors: typeof validationErrors = {};
    
    // Validate required fields
    if (!formData.name.trim()) {
      errors.name = 'Document name cannot be blank.';
    }
    
    if (!selectedFile) {
      errors.file = 'File upload cannot be blank.';
    }

    if (!formData.sharedWith || formData.sharedWith === 'None') {
      errors.shareWith = 'Share With cannot be blank.';
    }

    // Validate folder selection is required
    if (!formData.parentId) {
      errors.folder = 'Folder selection cannot be blank.';
    }

    // Validate accessIds when Selected Role or Selected User is chosen
    if ((formData.sharedWith === 'Selected Role' || formData.sharedWith === 'Selected User') && accessIds.length === 0) {
      errors.access = formData.sharedWith === 'Selected Role' 
        ? 'Select Roles cannot be blank.' 
        : 'Select Users cannot be blank.';
    }

    // If there are validation errors, set them and return
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Check for duplicate document names within the same folder
    const isDuplicateName = existingFiles.some(file => 
      file.name.toLowerCase() === formData.name.trim().toLowerCase() &&
      file.type === 'document' && // Only check against documents
      file.parentId === formData.parentId // Check within the same folder
    );

    if (isDuplicateName) {
      const folderName = formData.parentId 
        ? folderOptions.find(f => f.id === formData.parentId)?.name || 'selected folder'
        : 'root folder';
      errors.name = `A document with this name already exists in ${folderName}.`;
    }

    // If there are validation errors (including duplicates), set them and return
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      // Call parent save handler with file data
      await onSaveAndAddNew({
        name: formData.name.trim(),
        parentId: formData.parentId,
        sharedWith: formData.sharedWith,
        selectedFile: selectedFile,
        accessIds: accessIds.length > 0 ? accessIds.join(',') : ''
      });

      // Reset form for new entry but keep modal open (only on success)
      setFormData({
        name: '',
        parentId: null,
        sharedWith: 'None'
      });
      setSelectedFile(null);
      setNameLength(0);
      setAccessIds([]);
      setAccessOptions([]);
    } catch (error) {
      console.error('Error saving file for Save & Add New:', error);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-[9999] modalBackground p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">New Document</h2>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Name Field */}
          <div className="grid grid-cols-4 gap-4 items-center">
            <label className="text-sm font-medium text-gray-700">
              Name
            </label>
            <div className="col-span-3 relative">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter document name"
                maxLength={maxNameLength}
              />
              <div className="absolute right-3 top-2 text-xs text-gray-400">
                {nameLength} / {maxNameLength}
              </div>
              
              {/* Name Validation Error */}
              {validationErrors.name && (
                <p className="text-xs text-red-500 mt-1">
                  {validationErrors.name}
                </p>
              )}
              
              {/* Duplicate Name Validation */}
              {formData.name.trim() && (() => {
                const isDuplicate = existingFiles.some(file => 
                  file.name.toLowerCase() === formData.name.trim().toLowerCase() &&
                  file.type === 'document' && // Only check against documents, not folders
                  file.parentId === formData.parentId // Check within the same folder
                );
                if (isDuplicate) {
                  const folderName = formData.parentId 
                    ? folderOptions.find(f => f.id === formData.parentId)?.name || 'selected folder'
                    : 'root folder';
                  return (
                    <p className="text-xs text-red-500 mt-1">
                      A document with this name already exists in {folderName}.
                    </p>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Upload File Field */}
          <div className="grid grid-cols-4 gap-4 items-start">
            <label className="text-sm font-medium text-gray-700 pt-2">
              Upload File
            </label>
            <div className="col-span-3">
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50'
                    : selectedFile
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center">
                      <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600">Click to Upload file, only .jpg, .jpeg, .png, .pdf, .xlsx, .docx, .mp4, .mpeg, .mov format, max size 50MB</p>
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                      accept=".jpg,.jpeg,.png,.pdf,.xlsx,.docx,.mp4,.mpeg,.mov"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-block px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 cursor-pointer"
                    >
                      Choose File
                    </label>
                  </div>
                )}
              </div>
              
              {/* File Upload Validation Error */}
              {validationErrors.file && (
                <p className="text-xs text-red-500 mt-1">
                  {validationErrors.file}
                </p>
              )}
            </div>
          </div>

          {/* Folder Dropdown */}
          <div className="grid grid-cols-4 gap-4 items-start">
            <label className="text-sm font-medium text-gray-700 pt-3">
              Folder
            </label>
            <div className="col-span-3 relative" ref={dropdownRef}>
              {/* Dropdown Button */}
              <button
                type="button"
                onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left flex justify-between items-center"
              >
                <span className={selectedFolderName === 'None' ? 'text-gray-500' : 'text-gray-900'}>
                  {selectedFolderName}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isFolderDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  {/* Options */}
                  <div className="max-h-60 overflow-y-auto">
                    {/* None Option */}
                    <button
                      type="button"
                      onClick={() => handleFolderSelect(null)}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 text-sm ${
                        formData.parentId === null ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                      }`}
                    >
                      None
                    </button>

                    {/* Folder Options */}
                    {existingFiles.filter(folder => folder.type === 'folder').map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => handleFolderSelect(folder.id)}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 text-sm ${
                          formData.parentId === folder.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                        }`}
                      >
                        {folder.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500 mt-1">
                Selected folder access will be applicable for all items under it
              </p>
              
              {/* Folder Validation Error */}
              {validationErrors.folder && (
                <p className="text-xs text-red-500 mt-1">
                  {validationErrors.folder}
                </p>
              )}
            </div>
          </div>

          {/* Share With Dropdown */}
          <div className="grid grid-cols-4 gap-4 items-center">
            <label className="text-sm font-medium text-gray-700">
              Share With
            </label>
            <div className="col-span-3 relative" ref={shareWithDropdownRef}>
              {/* Dropdown Button */}
              <button
                type="button"
                onClick={() => {
                  // Only allow dropdown if no folder is selected (creating at root level)
                  if (!formData.parentId) {
                    if (!isShareWithDropdownOpen) {
                      calculateShareWithDropdownPosition();
                    }
                    setIsShareWithDropdownOpen(!isShareWithDropdownOpen);
                  }
                }}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none text-left flex justify-between items-center ${
                  formData.parentId 
                    ? 'bg-gray-100 cursor-not-allowed text-gray-500' 
                    : 'bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer'
                }`}
              >
                <span className="text-gray-900">
                  {formData.sharedWith || 'Select sharing option...'}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isShareWithDropdownOpen && (
                <div className={`absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg ${
                  shareWithDropdownPosition === 'top' 
                    ? 'bottom-full mb-1' 
                    : 'top-full mt-1'
                }`}>
                  {/* Options */}
                  <div className="max-h-60 overflow-y-auto">
                    {shareWithOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleShareWithSelect(option)}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 text-sm ${
                          formData.sharedWith === option ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Share With Validation Error */}
              {validationErrors.shareWith && (
                <p className="text-xs text-red-500 mt-1">
                  {validationErrors.shareWith}
                </p>
              )}
              
              {/* Inherited Setting Indicator */}
              {formData.parentId && formData.sharedWith && (
                <p className="text-xs text-blue-600 mt-1">
                  Inherited from parent folder: {formData.sharedWith}
                </p>
              )}
            </div>
          </div>

          {/* Access Dropdown - Show when Selected Role or Selected User is chosen */}
          {(formData.sharedWith === 'Selected Role' || formData.sharedWith === 'Selected User') && (
            <div className="grid grid-cols-4 gap-4 items-start">
              <label className="text-sm font-medium text-gray-700 pt-2">
                {formData.sharedWith === 'Selected Role' ? 'Select Roles' : 'Select Users'}
              </label>
              <div className="col-span-3 relative" ref={accessDropdownRef}>
                {/* Dropdown Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isAccessDropdownOpen) {
                      calculateDropdownPosition();
                    }
                    setIsAccessDropdownOpen(!isAccessDropdownOpen);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left flex justify-between items-center"
                >
                  <span className="text-gray-900">
                    {accessIds.length === 0 
                      ? `Select ${formData.sharedWith === 'Selected Role' ? 'roles' : 'users'}...` 
                      : `${accessIds.length} ${formData.sharedWith === 'Selected Role' ? 'role' : 'user'}${accessIds.length > 1 ? 's' : ''} selected`
                    }
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isAccessDropdownOpen && (
                  <div className={`absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg ${
                    dropdownPosition === 'top' 
                      ? 'bottom-full mb-1' 
                      : 'top-full mt-1'
                  }`}>
                    {/* Search Input */}
                    <div className="p-3 border-b border-gray-200">
                      <input
                        type="text"
                        placeholder={`Search ${formData.sharedWith === 'Selected Role' ? 'roles' : 'users'}...`}
                        value={accessSearchTerm}
                        onChange={(e) => setAccessSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>

                    {/* Options */}
                    <div className="max-h-60 overflow-y-auto">
                      {loadingAccess ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          Loading {formData.sharedWith === 'Selected Role' ? 'roles' : 'users'}...
                        </div>
                      ) : filteredAccessOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          {accessSearchTerm 
                            ? `No ${formData.sharedWith === 'Selected Role' ? 'roles' : 'users'} found matching "${accessSearchTerm}"`
                            : `No ${formData.sharedWith === 'Selected Role' ? 'roles' : 'users'} found`
                          }
                        </div>
                      ) : (
                        filteredAccessOptions.map((option) => {
                          const id = formData.sharedWith === 'Selected Role' ? option.roleId : option.userId;
                          const name = formData.sharedWith === 'Selected Role' 
                            ? option.roleName 
                            : `${option.firstName || ''} ${option.lastName || ''}`.trim();
                          const isSelected = accessIds.includes(id);
                          
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => handleAccessToggle(id)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm flex items-center gap-3"
                            >
                              {/* Checkbox */}
                              <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                                isSelected 
                                  ? 'bg-blue-600 border-blue-600' 
                                  : 'border-gray-300 bg-white'
                              }`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              
                              {/* Name */}
                              <span className={`flex-1 ${isSelected ? 'text-blue-700 font-medium' : 'text-gray-900'}`}>
                                {name}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Access Selection Validation Error */}
                {validationErrors.access && (
                  <p className="text-xs text-red-500 mt-1">
                    {validationErrors.access}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-4 px-6 py-4 border-t bg-gray-50 flex-shrink-0">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.name.trim() || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Save
          </button>
          <button
            onClick={handleSaveAndAddNew}
            disabled={!formData.name.trim() || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Save & Add New
          </button>
        </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 transition-all duration-300 ${
          toast.type === 'success' 
            ? 'bg-teal-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {/* Icon */}
          {toast.type === 'success' ? (
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          
          {/* Message */}
          <span className="text-sm font-medium">{toast.message}</span>
          
          {/* Close Button */}
          <button
            onClick={hideToast}
            className="ml-2 text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}


    </>
  );
};

export default AddFileModal;
