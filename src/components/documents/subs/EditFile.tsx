import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { DocumentData } from '@/lib/models/document.model';
import documentService from '@/lib/services/documentService';
import { getProjectId } from '@/lib/storage/sharedStorage';

interface EditFileRequest {
  id: number;
  projectId: number;
  name: string;
  shareWith: number;
  accessIds: string;
  isActive: number;
}

interface EditFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fileData: EditFileRequest) => void;
  onDelete?: (fileId: number) => void;
  fileData: DocumentData;
  existingFiles: DocumentData[];
  isLoading?: boolean;
}

const EditFileModal: React.FC<EditFileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  fileData,
  existingFiles,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    name: fileData.name || '',
    sharedWith: fileData.sharedWith || 'None',
    status: fileData.status || 'Active'
  });
  
  const [nameLength, setNameLength] = useState(fileData.name?.length || 0);
  const maxNameLength = 100;
  
  // Dropdown states
  const [isShareWithDropdownOpen, setIsShareWithDropdownOpen] = useState(false);
  const [isAccessDropdownOpen, setIsAccessDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  
  // Access control states
  const [accessOptions, setAccessOptions] = useState<any[]>([]);
  const [accessIds, setAccessIds] = useState<number[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [accessSearchTerm, setAccessSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  
  // Refs for dropdown management
  const shareWithDropdownRef = useRef<HTMLDivElement>(null);
  const accessDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  
  // Toast state
  const [toast, setToast] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({
    show: false,
    type: 'success',
    message: ''
  });

  // Confirmation modal state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<any>(null);
  
  // Delete confirmation modal state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Save loading state
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when fileData changes
  useEffect(() => {
    if (fileData) {
      setFormData({
        name: fileData.name || '',
        sharedWith: fileData.sharedWith || 'None',
        status: fileData.status || 'Active'
      });
      setNameLength(fileData.name?.length || 0);
      
      // Initialize access IDs if file has existing access
      if (fileData.accessIds) {
        const ids = fileData.accessIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        setAccessIds(ids);
      } else {
        setAccessIds([]);
      }

      // Load access options if file is shared with roles or users
      const sharedWith = fileData.sharedWith || 'None';
      if (sharedWith === 'Selected Role' || sharedWith === 'Selected User') {
        loadAccessOptions(sharedWith);
      } else {
        setAccessOptions([]);
      }
    }
  }, [fileData]);

  const handleInputChange = (field: string, value: string) => {
    if (field === 'name') {
      setNameLength(value.length);
    }
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleShareWithSelect = (option: string) => {
    setFormData(prev => ({ ...prev, sharedWith: option }));
    setIsShareWithDropdownOpen(false);
    setAccessIds([]);
    setAccessOptions([]);
    
    // Load access options if needed
    if (option === 'Selected Role' || option === 'Selected User') {
      loadAccessOptions(option);
    }
  };

  const handleStatusSelect = (status: "Active" | "Inactive") => {
    setFormData(prev => ({ ...prev, status: status }));
    setIsStatusDropdownOpen(false);
  };

  const loadAccessOptions = async (type: string) => {
    setLoadingAccess(true);
    try {
      const projectId = getProjectId();
      
      if (type === 'Selected Role') {
        // Load roles from API
        const response = await documentService.getRoles(projectId);
        if (response.statusCode === 200 && response.responseData) {
          setAccessOptions(response.responseData);
        } else {
          console.error('Failed to fetch roles:', response.message);
          setAccessOptions([]);
        }
      } else if (type === 'Selected User') {
        // Load users from API
        const response = await documentService.getUsers(projectId);
        if (response.statusCode === 200 && response.responseData) {
          setAccessOptions(response.responseData);
        } else {
          console.error('Failed to fetch users:', response.message);
          setAccessOptions([]);
        }
      }
    } catch (error) {
      console.error('Error loading access options:', error);
      setAccessOptions([]);
    } finally {
      setLoadingAccess(false);
    }
  };

  const handleAccessToggle = (id: number) => {
    setAccessIds(prev => 
      prev.includes(id) 
        ? prev.filter(accessId => accessId !== id)
        : [...prev, id]
    );
  };

  // Calculate dropdown position based on available space
  const calculateDropdownPosition = (buttonRef: React.RefObject<HTMLDivElement>) => {
    if (!buttonRef.current) return 'bottom';
    
    const buttonRect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const dropdownHeight = 300; // Approximate height of dropdown with max-h-60 + search + padding
    
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    
    // If there's not enough space below but enough space above, position it above
    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      return 'top';
    }
    
    return 'bottom';
  };

  // Handle access dropdown toggle with position calculation
  const handleAccessDropdownToggle = () => {
    if (!isAccessDropdownOpen) {
      const position = calculateDropdownPosition(accessDropdownRef);
      setDropdownPosition(position);
    }
    setIsAccessDropdownOpen(!isAccessDropdownOpen);
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareWithDropdownRef.current && !shareWithDropdownRef.current.contains(event.target as Node)) {
        setIsShareWithDropdownOpen(false);
      }
      if (accessDropdownRef.current && !accessDropdownRef.current.contains(event.target as Node)) {
        setIsAccessDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };

    if (isShareWithDropdownOpen || isAccessDropdownOpen || isStatusDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isShareWithDropdownOpen, isAccessDropdownOpen, isStatusDropdownOpen]);

  const handleSave = async () => {
    // Prevent multiple clicks
    if (isSaving) return;
    
    // Set saving state immediately
    setIsSaving(true);
    
    try {
      // Validate required fields
      if (!formData.name.trim()) {
        showToast('error', 'File name is required.');
        return;
      }

      // Check for duplicate file names
      const duplicateFile = existingFiles.find(file => 
        file.name.toLowerCase() === formData.name.trim().toLowerCase() && 
        file.id !== fileData.id &&
        file.parentId === fileData.parentId
      );

      if (duplicateFile) {
        showToast('error', 'A file with this name already exists in this folder');
        return;
      }

      // Map shareWith to numeric value
      const shareWithMap: { [key: string]: number } = {
        'None': 0,
        'Selected Role': 1,
        'Selected User': 2
      };

      // Prepare file data for API
      const projectId = getProjectId();
      const shareWithValue = shareWithMap[formData.sharedWith] || 0;
      const fileDataToSave = {
        id: fileData.id,
        projectId,
        parentId: fileData.parentId,
        name: formData.name.trim(),
        shareWith: shareWithValue,
        accessIds: accessIds.join(','),
        isActive: formData.status === 'Active' ? 1 : 0
      };

      // Check if sharing type changed (for confirmation)
      const originalShareWith = fileData.sharedWith || 'None';
      const hasShareTypeChanged = originalShareWith !== formData.sharedWith;

      if (hasShareTypeChanged) {
        // Show confirmation popup
        setPendingChanges(fileDataToSave);
        setShowConfirmation(true);
        setIsSaving(false);
        return;
      }

      // Save directly if no sharing change
      await saveFile(fileDataToSave);
    } catch (error) {
      console.error('Error in handleSave:', error);
      showToast('error', 'An error occurred while saving.');
      setIsSaving(false);
    }
  };

  // Actual save function that calls the API
  const saveFile = async (fileData: any) => {
    try {
      setIsSaving(true);
      const response = await documentService.addEditFolder(fileData);
      
      if (response.statusCode === 200) {
        showToast('success', 'File updated successfully');
        onSave(fileData);
      } else {
        throw new Error(response.message || 'Failed to save file');
      }
    } catch (error: any) {
      console.error('Error saving file:', error);
      showToast('error', error.message || 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      const projectId = getProjectId();
      const response = await documentService.deleteFile(projectId, fileData.id);
      
      if (response.statusCode === 200) {
        showToast('success', 'File deleted successfully');
        setShowDeleteConfirmation(false);
        onDelete?.(fileData.id);
      } else {
        throw new Error(response.message || 'Failed to delete file');
      }
    } catch (error: any) {
      console.error('Error deleting file:', error);
      showToast('error', error.message || 'Failed to delete file');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  const handleCancel = () => {
    onClose();
  };

  // Handle confirmation and save
  const handleConfirmSave = async () => {
    setShowConfirmation(false);
    if (pendingChanges) {
      await saveFile(pendingChanges);
      setPendingChanges(null);
    }
  };

  // Cancel confirmation
  const handleCancelSave = () => {
    setShowConfirmation(false);
    setPendingChanges(null);
    setIsSaving(false);
  };

  // Share With options
  const shareWithOptions = ['None', 'Selected Role', 'Selected User'];
  
  // Status options
  const statusOptions: ("Active" | "Inactive")[] = ['Active', 'Inactive'];

  // Filter access options based on search term
  const filteredAccessOptions = accessOptions.filter(option => {
    if (!accessSearchTerm) return true;
    
    if (formData.sharedWith === 'Selected Role') {
      return option.roleName?.toLowerCase().includes(accessSearchTerm.toLowerCase());
    } else {
      const fullName = `${option.firstName || ''} ${option.lastName || ''}`.trim();
      return fullName.toLowerCase().includes(accessSearchTerm.toLowerCase());
    }
  });

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-[9999] modalBackground p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Edit Document</h2>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-500"
                  placeholder="Enter document name"
                  maxLength={maxNameLength}
                />
                <div className="absolute right-3 top-2 text-xs text-gray-400">
                  {nameLength} / {maxNameLength}
                </div>
              </div>
            </div>

            {/* Upload File Section */}
            <div className="grid grid-cols-4 gap-4 items-start">
              <label className="text-sm font-medium text-gray-700 pt-2">
                Upload File
              </label>
              <div className="col-span-3">
                
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded flex items-center justify-center">
                        <img src="../svg/icons/general/DocumentUpload.svg" alt="icon" className="w-10 h-10" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-500">{fileData.name}</div>
                    </div>
                  </div>
                
              </div>
            </div>

            {/* Folder Field (Read-only for edit) */}
            <div className="grid grid-cols-4 gap-4 items-start">
              <label className="text-sm font-medium text-gray-700 pt-3">
                Folder
              </label>
              <div className="col-span-3">
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 flex items-center">
                  <span className="flex-1">
                    {fileData.parentId 
                      ? existingFiles.find(folder => folder.id === fileData.parentId)?.name || 'Parent Folder'
                      : 'Root Level'
                    }
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Selected folder access will be applicable for all items under it
                </p>
              </div>
            </div>

            {/* Share With Dropdown */}
            <div className="grid grid-cols-4 gap-4 items-start">
              <label className="text-sm font-medium text-gray-700 pt-3">
                Share With
              </label>
              <div className="col-span-3 relative" ref={shareWithDropdownRef}>
                {fileData.parentId ? (
                  // Child file - sharing is inherited and cannot be changed
                  <>
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 flex items-center">
                      <span className="flex-1">
                        {formData.sharedWith || 'Inherited from parent folder'}
                      </span>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Files inherit the sharing type from their parent folder. You can customize which specific {formData.sharedWith === 'Selected Role' ? 'roles' : 'users'} have access below.
                    </p>
                  </>
                ) : (
                  // Root level file - sharing can be changed
                  <button
                    type="button"
                    onClick={() => setIsShareWithDropdownOpen(!isShareWithDropdownOpen)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left flex justify-between items-center"
                  >
                    <span className="text-gray-900">
                      {formData.sharedWith || 'Select sharing option...'}
                    </span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}

                {isShareWithDropdownOpen && !fileData.parentId && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
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
              </div>
            </div>

            {/* Access Dropdown - Show when Selected Role or Selected User is chosen */}
            {(formData.sharedWith === 'Selected Role' || formData.sharedWith === 'Selected User') && (
              <div className="grid grid-cols-4 gap-4 items-start">
                <label className="text-sm font-medium text-gray-700 pt-2">
                  {formData.sharedWith === 'Selected Role' ? 'Select Roles' : 'Select Users'}
                </label>
                <div className="col-span-3 relative" ref={accessDropdownRef}>
                  <button
                    type="button"
                    onClick={handleAccessDropdownToggle}
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

                  {isAccessDropdownOpen && (
                    <div className={`absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg ${
                      dropdownPosition === 'top' 
                        ? 'bottom-full mb-1' 
                        : 'top-full mt-1'
                    }`}>
                      <div className="p-3 border-b border-gray-200">
                        <input
                          type="text"
                          placeholder={`Search ${formData.sharedWith === 'Selected Role' ? 'roles' : 'users'}...`}
                          value={accessSearchTerm}
                          onChange={(e) => setAccessSearchTerm(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>

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
                </div>
              </div>
            )}

            {/* Status Dropdown */}
            <div className="grid grid-cols-4 gap-4 items-center">
              <label className="text-sm font-medium text-gray-700">
                Status
              </label>
              <div className="col-span-3 relative" ref={statusDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-left flex justify-between items-center"
                >
                  <span className="text-gray-900">
                    {formData.status || 'Select status...'}
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isStatusDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    <div className="max-h-60 overflow-y-auto">
                      {statusOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleStatusSelect(option)}
                          className={`w-full px-3 py-2 text-left hover:bg-gray-50 text-sm ${
                            formData.status === option ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-between px-6 py-4 border-t bg-gray-50">
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 border border-transparent rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              Delete
            </button>
            
            <div className="flex gap-4">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name.trim() || isLoading || isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                )}
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
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
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
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

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h4 className="text-base font-medium text-gray-900">Access Change</h4>
              <button
                onClick={handleCancelSave}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Changing the sharing access will change change the sharing access of all the sub-folders and documents under it.
                  </p>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to proceed?
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={handleCancelSave}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b">
              <h4 className="text-lg font-medium text-gray-900">Delete File</h4>
              <button
                onClick={cancelDelete}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Deleting the file will permanently remove it from the system.
                  </p>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to proceed?
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                )}
                {isDeleting ? 'Deleting...' : 'Yes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EditFileModal;
