import React, { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { TailwindPageLayout } from '../../components/layout/TailwindPageLayout';
import { DocumentData, DocumentApiData } from '@/lib/models/document.model';
import documentService from '@/lib/services/documentService';
import { getProjectId } from '@/lib/storage/sharedStorage';
import AddFolderModal from '@/components/documents/subs/AddFolder';
import AddFileModal from '@/components/documents/subs/AddFile';
import EditFolderModal from '../../components/documents/subs/EditFolder';
import EditFileModal from '../../components/documents/subs/EditFile';
import { useEntityHeading } from '../../hooks/useEntityHeading';
import DocumentsHeader from '../../components/documents/DocumentsHeader';
import DocumentDataGrid from '../../components/documents/DocumentTreeGrid';

const Documents: NextPage = () => {
  // State management
  const [allDocuments, setAllDocuments] = useState<DocumentData[]>([]);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState<boolean>(false);
  const [isAddFileModalOpen, setIsAddFileModalOpen] = useState<boolean>(false);
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState<boolean>(false);
  const [selectedFolderForEdit, setSelectedFolderForEdit] = useState<DocumentData | null>(null);
  const [isEditFileModalOpen, setIsEditFileModalOpen] = useState<boolean>(false);
  const [selectedFileForEdit, setSelectedFileForEdit] = useState<DocumentData | null>(null);
  const [globalLoading, setGlobalLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  
  // Display order management state
  const [hasDisplayOrderChanges, setHasDisplayOrderChanges] = useState<boolean>(false);
  const [originalDisplayOrder, setOriginalDisplayOrder] = useState<{[key: number]: number}>({});

  // Get entity-specific heading using our custom hook
  const pageHeading = useEntityHeading('Documents');

  // Access notistack's enqueueSnackbar function for notifications
  const { enqueueSnackbar } = useSnackbar();

  // Transform API data to UI format
  const transformApiDataToUI = (apiData: any[]): DocumentData[] => {
    return apiData.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type === 0 ? 'folder' : 'document',
      sharedWith: item.shareWith === 0 ? 'None' : item.shareWith === 1 ? 'Selected Role' : 'Selected User',
      status: item.status === 1 ? 'Active' : 'Inactive',
      size: item.fileSize || undefined,
      parentId: item.parentId === 0 ? null : item.parentId, // Treat parentId: 0 as null (root level)
      level: 0, // Will be calculated later
      isExpanded: item.type === 0 ? false : undefined, // Only folders can be expanded, start collapsed
      displayOrder: item.displayOrder,
      accessIds: item.accessIds,
      filePath: item.filePath,
      path: Array.isArray(item.path) ? item.path.join('/') : item.filePath,
      actions: 'actions' // Add actions field for the Actions column
    }));
  };

  // Calculate hierarchy levels for documents
  const calculateHierarchyLevels = (documents: DocumentData[]): DocumentData[] => {
    const documentMap = new Map<number, DocumentData>();
    documents.forEach(doc => documentMap.set(doc.id, { ...doc }));
    
    const calculateLevel = (doc: DocumentData, visited = new Set<number>()): number => {
      if (visited.has(doc.id)) return 0; // Prevent infinite recursion
      visited.add(doc.id);
      
      if (!doc.parentId) return 0;
      
      const parent = documentMap.get(doc.parentId);
      if (!parent) return 0;
      
      return calculateLevel(parent, visited) + 1;
    };
    
    return documents.map(doc => ({
      ...doc,
      level: calculateLevel(doc)
    }));
  };

  // Filter documents based on parent expansion state and search
  const getVisibleDocuments = (allDocuments: DocumentData[], searchTerm?: string): DocumentData[] => {
    const result: DocumentData[] = [];
    
    // If searching, find all matching documents and their parents
    if (searchTerm && searchTerm.trim()) {
      const matchingDocIds = new Set<number>();
      const parentIdsToShow = new Set<number>();
      
      // Find all documents that match the search term
      allDocuments.forEach(doc => {
        const searchableText = `${doc.name} ${doc.sharedWith} ${doc.status}`.toLowerCase();
        if (searchableText.includes(searchTerm.toLowerCase())) {
          matchingDocIds.add(doc.id);
          
          // Add all parent folders to show
          let currentDoc = doc;
          while (currentDoc.parentId !== null && currentDoc.parentId !== 0) {
            parentIdsToShow.add(currentDoc.parentId);
            currentDoc = allDocuments.find(d => d.id === currentDoc.parentId) || currentDoc;
            if (!allDocuments.find(d => d.id === currentDoc.parentId)) break;
          }
        }
      });
      
      // Auto-expand parent folders that contain matches
      allDocuments.forEach(doc => {
        if (parentIdsToShow.has(doc.id) && !doc.isExpanded) {
          doc.isExpanded = true;
        }
      });
    }
    
    const addVisibleChildren = (parentId: number | null, currentLevel: number = 0) => {
      const children = allDocuments.filter(doc => doc.parentId === parentId);
      
      children.forEach(child => {
        child.level = currentLevel;
        result.push(child);
        
        // If this is a folder and it's expanded, add its children
        if (child.type === 'folder' && child.isExpanded) {
          addVisibleChildren(child.id, currentLevel + 1);
        }
      });
    };
    
    // Start with root level documents (parentId === null)
    addVisibleChildren(null, 0);
    
    return result;
  };

  // Fetch documents from API
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const projectId = getProjectId();
      
      // Get documents from API
      const response = await documentService.getAllDocuments(projectId);
      
      if (response.statusCode === 200 && response.responseData) {
        // Transform API data to UI format
        const transformedData = transformApiDataToUI(response.responseData);
        
        // Calculate hierarchy levels
        const documentsWithLevels = calculateHierarchyLevels(transformedData);
        
        // Set all documents (complete dataset)
        setAllDocuments(documentsWithLevels);
        
        // Get visible documents based on expansion state
        const visibleDocs = getVisibleDocuments(documentsWithLevels, searchTerm);
        setDocuments(visibleDocs);
        
        // Store original display order for change tracking
        const originalOrder: {[key: number]: number} = {};
        documentsWithLevels.forEach(doc => {
          originalOrder[doc.id] = doc.displayOrder;
        });
        setOriginalDisplayOrder(originalOrder);
      } else {
        console.warn('API failed:', response.message);
        setAllDocuments([]);
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setAllDocuments([]);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // Initial load
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Update visible documents when allDocuments or searchTerm changes
  useEffect(() => {
    if (allDocuments.length > 0) {
      const visibleData = getVisibleDocuments(allDocuments, searchTerm);
      setDocuments(visibleData);
    }
  }, [allDocuments, searchTerm]);

  // Export documents function
  const exportDocuments = async () => {
    try {
      setExporting(true);
      const projectId = getProjectId();
      
      const exportType = 1; // Assuming 1 for Excel export
      const requestBody = {
        // Add any additional export parameters here
      };
      
      const response = await documentService.exportDocuments(projectId, exportType, requestBody);
      
      if (response.statusCode === 200) {
        // Handle successful export - typically download the file
        console.log('Export successful:', response.responseData);
        
        enqueueSnackbar('Documents exported successfully', {
          variant: 'success',
          anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
          autoHideDuration: 3000
        });
      } else {
        throw new Error(response.message || 'Export failed');
      }
    } catch (error: any) {
      console.error('Error exporting documents:', error);
      enqueueSnackbar(error.message || 'Failed to export documents', {
        variant: 'error',
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
        autoHideDuration: 3000
      });
    } finally {
      setExporting(false);
    }
  };

  // Search handler - now only for client-side filtering (no API call)
  const handleSearch = () => {
    // Search is handled by AG Grid's setQuickFilter in DocumentTreeGrid
    // No API call needed - search works on already loaded data
  };



  // Document action handlers
  const handleEditDocument = (document: DocumentData) => {
    if (document.type === 'folder') {
      setSelectedFolderForEdit(document);
      setIsEditFolderModalOpen(true);
    } else {
      // Handle document (file) editing
      setSelectedFileForEdit(document);
      setIsEditFileModalOpen(true);
    }
  };

  const handleDeleteDocument = (document: DocumentData) => {
    enqueueSnackbar(`Delete ${document.type}: ${document.name}`, {
      variant: 'warning',
      anchorOrigin: { vertical: 'top', horizontal: 'right' },
      autoHideDuration: 3000
    });
  };

  const handleDownloadDocument = async (documentData: DocumentData) => {
    if (documentData.type === 'document' && documentData.filePath) {
      try {
        // Construct full file URL using static file base URL and file path from API
        const staticFileBaseUrl = process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL || '';
        const fullFileUrl = `${staticFileBaseUrl}${documentData.filePath}`;
        
        // Create anchor element for download
        const a = document.createElement('a');
        a.href = fullFileUrl;
        a.target = '_blank';
        a.download = documentData.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        enqueueSnackbar(`Downloading: ${documentData.name}`, {
          variant: 'success',
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          autoHideDuration: 3000
        });
      } catch (error) {
        console.error('Error downloading document:', error);
        enqueueSnackbar('Error downloading document', {
          variant: 'error',
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          autoHideDuration: 3000
        });
      }
    } else if (documentData.type === 'document' && !documentData.filePath) {
      enqueueSnackbar('File path not available for download', {
        variant: 'warning',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 3000
      });
    }
  };

  const handleShareDocument = (document: DocumentData) => {
    enqueueSnackbar(`Share ${document.type}: ${document.name}`, {
      variant: 'info',
      anchorOrigin: { vertical: 'top', horizontal: 'right' },
      autoHideDuration: 3000
    });
  };

  const handleCreateFolder = () => {
    setIsAddFolderModalOpen(true);
  };

  const handleSaveFolder = async (folderData: {
    name: string;
    parentId: number | null;
    sharedWith: string;
  }) => {
    try {
      setGlobalLoading(true);
      setLoadingMessage('Creating folder...');
      
      const projectId = getProjectId();
      
      // Prepare API request data according to AddFolderRequest interface
      const addFolderRequest = {
        projectId: projectId,
        parentId: folderData.parentId || 0, // Use 0 for root level folders
        name: folderData.name,
        shareWith: folderData.sharedWith === 'none' ? 0 : folderData.sharedWith === 'role' ? 1 : 2,
        accessIds: '', // Will be set based on actual selection in modal
        heirarchyIds: '', // Will be calculated by backend
        filePath: '',
        isActive: 1, // Active folder
        type: 0, // 0 = folder
        displayOrder: allDocuments.length + 1
      };

      // Call the actual API
      const response = await documentService.addEditFolder(addFolderRequest);
      
      if (response.statusCode === 200) {
        // Refresh documents data from server to get the updated list
        await fetchDocuments();
        
        setIsAddFolderModalOpen(false);

        enqueueSnackbar('Folder created successfully', {
          variant: 'success',
          anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
          autoHideDuration: 3000
        });
      } else {
        throw new Error(response.message || 'Failed to create folder');
      }
    } catch (error: any) {
      console.error('Error creating folder:', error);
      enqueueSnackbar(error.message || 'Failed to create folder', {
        variant: 'error',
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
        autoHideDuration: 3000
      });
    } finally {
      setGlobalLoading(false);
      setLoadingMessage('');
    }
  };

  const handleSaveAndAddNewFolder = async (folderData: {
    name: string;
    parentId: number | null;
    sharedWith: string;
  }) => {
    try {
      setGlobalLoading(true);
      setLoadingMessage('Creating folder...');
      
      const projectId = getProjectId();
      
      // Prepare API request data according to AddFolderRequest interface
      const addFolderRequest = {
        projectId: projectId,
        parentId: folderData.parentId || 0, // Use 0 for root level folders
        name: folderData.name,
        shareWith: folderData.sharedWith === 'none' ? 0 : folderData.sharedWith === 'role' ? 1 : 2,
        accessIds: '', // Will be set based on actual selection in modal
        heirarchyIds: '', // Will be calculated by backend
        filePath: '',
        isActive: 1, // Active folder
        type: 0, // 0 = folder
        displayOrder: allDocuments.length + 1
      };

      // Call the actual API
      const response = await documentService.addEditFolder(addFolderRequest);
      
      if (response.statusCode === 200) {
        // Refresh documents data from server to get the updated list
        await fetchDocuments();
        
        // Keep modal open for adding another folder
        // Don't close the modal here

        enqueueSnackbar('Folder created successfully', {
          variant: 'success',
          anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
          autoHideDuration: 3000
        });
      } else {
        throw new Error(response.message || 'Failed to create folder');
      }
    } catch (error: any) {
      console.error('Error creating folder:', error);
      enqueueSnackbar(error.message || 'Failed to create folder', {
        variant: 'error',
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
        autoHideDuration: 3000
      });
    } finally {
      setGlobalLoading(false);
      setLoadingMessage('');
    }
  };

  const handleUploadDocument = () => {
    setIsAddFileModalOpen(true);
  };

  const handleSaveFile = async (fileData: {
    name: string;
    parentId: number | null;
    sharedWith: string;
    selectedFile?: File;
    accessIds?: string;
  }) => {
    try {
      setGlobalLoading(true);
      //setLoadingMessage('Uploading document...');
      //console.log('Starting file upload with data:', fileData);

      if (!fileData.selectedFile) {
        enqueueSnackbar('Please select a file to upload', {
          variant: 'error',
          anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
          autoHideDuration: 3000
        });
        setGlobalLoading(false);
        setLoadingMessage('');
        return;
      }

      // Prepare FormData for API
      const formData = new FormData();
      const projectId = getProjectId();
      formData.append('projectId', projectId.toString());
      formData.append('parentId', (fileData.parentId || 0).toString());
      formData.append('name', fileData.name);
      
      // Map shareWith to numeric values
      let shareWithValue = 0;
      if (fileData.sharedWith === 'Selected Role') shareWithValue = 1;
      else if (fileData.sharedWith === 'Selected User') shareWithValue = 2;
      
      formData.append('shareWith', shareWithValue.toString());
      formData.append('accessIds', fileData.accessIds || '');
      formData.append('heirarchyIds', (fileData.parentId || 0).toString());
      formData.append('file', fileData.selectedFile);
      
      // Generate file path (simplified - should match backend logic)
      const filePath = `us-east-2-data/${projectId}/documents_management/Root/${fileData.name}`;
      formData.append('filePath', filePath);
      
      // File metadata
      const fileSizeKB = (fileData.selectedFile.size / 1024).toFixed(2);
      formData.append('fileSize', `${fileSizeKB} KB`);
      
      const fileExtension = fileData.selectedFile.name.split('.').pop() || '';
      formData.append('fileExtension', fileExtension);
      
      formData.append('isActive', '1');
      formData.append('type', '1'); // 1 = document
      formData.append('displayOrder', '99999');

      // Call API
      console.log('Calling API with FormData...');
      const response = await documentService.addEditDocument(formData);
      console.log('API response:', response);
      
      if (response && response.statusCode === 200) {
        console.log('Upload successful, refreshing documents...');
        // Refresh documents list
        try {
          await fetchDocuments();
          console.log('Documents refreshed successfully');
        } catch (fetchError) {
          console.error('Error refreshing documents:', fetchError);
          // Don't throw here, just log the error
        }
        
        setIsAddFileModalOpen(false);
        setGlobalLoading(false);
        setLoadingMessage('');

        enqueueSnackbar('Document uploaded successfully', {
          variant: 'success',
          anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
          autoHideDuration: 3000
        });
      } else {
        console.error('Upload failed with response:', response);
        throw new Error(response?.message || 'Failed to upload document');
      }
    } catch (error: any) {
      console.error('Error uploading document:', error);
      enqueueSnackbar(error.message || 'Failed to upload document', {
        variant: 'error',
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
        autoHideDuration: 3000
      });
    } finally {
      setGlobalLoading(false);
      setLoadingMessage('');
    }
  };

  const handleSaveAndAddNewFile = async (fileData: {
    name: string;
    parentId: number | null;
    sharedWith: string;
    selectedFile?: File;
    accessIds?: string;
  }) => {
    try {
      setGlobalLoading(true);
      //setLoadingMessage('Uploading document...');
      console.log('Starting file upload for Save & Add New with data:', fileData);

      if (!fileData.selectedFile) {
        enqueueSnackbar('Please select a file to upload', {
          variant: 'error',
          anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
          autoHideDuration: 3000
        });
        setGlobalLoading(false);
        setLoadingMessage('');
        return;
      }

      // Prepare FormData for API (same as handleSaveFile)
      const formData = new FormData();
      const projectId = getProjectId();
      formData.append('projectId', projectId.toString());
      formData.append('parentId', (fileData.parentId || 0).toString());
      formData.append('name', fileData.name);
      
      // Map shareWith to numeric values
      let shareWithValue = 0;
      if (fileData.sharedWith === 'Selected Role') shareWithValue = 1;
      else if (fileData.sharedWith === 'Selected User') shareWithValue = 2;
      
      formData.append('shareWith', shareWithValue.toString());
      formData.append('accessIds', fileData.accessIds || '');
      formData.append('heirarchyIds', (fileData.parentId || 0).toString());
      formData.append('file', fileData.selectedFile);
      
      // Generate file path (simplified - should match backend logic)
      const filePath = `us-east-2-data/${projectId}/documents_management/Root/${fileData.name}`;
      formData.append('filePath', filePath);
      
      // File metadata
      const fileSizeKB = (fileData.selectedFile.size / 1024).toFixed(2);
      formData.append('fileSize', `${fileSizeKB} KB`);
      
      const fileExtension = fileData.selectedFile.name.split('.').pop() || '';
      formData.append('fileExtension', fileExtension);
      
      formData.append('isActive', '1');
      formData.append('type', '1'); // 1 = document
      formData.append('displayOrder', '99999');

      // Call API
      console.log('Calling API with FormData for Save & Add New...');
      const response = await documentService.addEditDocument(formData);
      console.log('API response for Save & Add New:', response);
      
      if (response && response.statusCode === 200) {
        console.log('Upload successful for Save & Add New, refreshing documents...');
        // Refresh documents list
        try {
          await fetchDocuments();
          console.log('Documents refreshed successfully for Save & Add New');
        } catch (fetchError) {
          console.error('Error refreshing documents:', fetchError);
          // Don't throw here, just log the error
        }
        
        // Keep modal open for adding another file
        // setIsAddFileModalOpen(false); // Don't close modal

        enqueueSnackbar('Document uploaded successfully. Add another document.', {
          variant: 'success',
          anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
          autoHideDuration: 3000
        });
      } else {
        console.error('Upload failed for Save & Add New with response:', response);
        throw new Error(response?.message || 'Failed to upload document');
      }
    } catch (error: any) {
      console.error('Error uploading document for Save & Add New:', error);
      enqueueSnackbar(error.message || 'Failed to upload document', {
        variant: 'error',
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
        autoHideDuration: 3000
      });
    } finally {
      setGlobalLoading(false);
      setLoadingMessage('');
    }
  };



  // Handle toggle expand/collapse for folders
  const handleToggleExpand = (documentId: number) => {
    setAllDocuments(prev => {
      const updatedDocs = prev.map(doc => 
        doc.id === documentId ? { ...doc, isExpanded: !doc.isExpanded } : doc
      );
      
      // Immediately update visible documents
      const visibleData = getVisibleDocuments(updatedDocs, searchTerm);
      setDocuments(visibleData);
      
      return updatedDocs;
    });
  };

  // Handle edit folder save
  const handleEditFolderSave = async (folderData: {
    id: number;
    projectId: number;
    name: string;
    shareWith: number;
    accessIds: string;
    isActive: number;
  }) => {
    try {
      setGlobalLoading(true);
      setLoadingMessage('Refreshing documents...');
      
      // Refresh documents data from server to get updated folder information
      await fetchDocuments();

      setIsEditFolderModalOpen(false);
      setSelectedFolderForEdit(null);

      enqueueSnackbar('Folder updated successfully', {
        variant: 'success',
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
        autoHideDuration: 3000
      });
    } catch (error: any) {
      console.error('Error refreshing documents:', error);
      enqueueSnackbar(error.message || 'Failed to refresh documents', {
        variant: 'error',
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
        autoHideDuration: 3000
      });
    } finally {
      setGlobalLoading(false);
      setLoadingMessage('');
    }
  };

  // Handle delete folder
  const handleDeleteFolder = async (folderId: number) => {
    try {
      setGlobalLoading(true);
      setLoadingMessage('Deleting folder...');
      
      // TODO: Implement API call to delete folder
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Remove the folder and its children from allDocuments
      setAllDocuments(prev => {
        const updatedDocs = prev.filter(doc => {
          // Remove the folder itself
          if (doc.id === folderId) return false;
          
          // Remove any children of this folder (recursive)
          const isChildOfFolder = (docId: number, parentId: number): boolean => {
            const doc = prev.find(d => d.id === docId);
            if (!doc) return false;
            if (doc.parentId === parentId) return true;
            if (doc.parentId) return isChildOfFolder(doc.parentId, parentId);
            return false;
          };
          
          return !isChildOfFolder(doc.id, folderId);
        });
        
        // Update visible documents
        const visibleData = getVisibleDocuments(updatedDocs, searchTerm);
        setDocuments(visibleData);
        
        return updatedDocs;
      });

      setIsEditFolderModalOpen(false);
      setSelectedFolderForEdit(null);

      enqueueSnackbar('Folder deleted successfully', {
        variant: 'success',
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
        autoHideDuration: 3000
      });
    } catch (error: any) {
      console.error('Error deleting folder:', error);
      enqueueSnackbar(error.message || 'Failed to delete folder', {
        variant: 'error',
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
        autoHideDuration: 3000
      });
    } finally {
      setGlobalLoading(false);
      setLoadingMessage('');
    }
  };

  // Handle edit file save
  const handleEditFileSave = async (fileData: {
    id: number;
    projectId: number;
    name: string;
    shareWith: number;
    accessIds: string;
    isActive: number;
  }) => {
    try {
      setGlobalLoading(true);
      setLoadingMessage('Refreshing documents...');
      
      // Refresh documents data from server to get updated file information
      await fetchDocuments();

      setIsEditFileModalOpen(false);
      setSelectedFileForEdit(null);

      enqueueSnackbar('File updated successfully', {
        variant: 'success',
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
        autoHideDuration: 3000
      });
    } catch (error: any) {
      console.error('Error refreshing documents:', error);
      enqueueSnackbar(error.message || 'Failed to refresh documents', {
        variant: 'error',
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
        autoHideDuration: 3000
      });
    } finally {
      setGlobalLoading(false);
      setLoadingMessage('');
    }
  };

  // Handle delete file
  const handleDeleteFile = async (fileId: number) => {
    try {
      setGlobalLoading(true);
      setLoadingMessage('Refreshing documents...');
      
      // Refresh documents data from server to get updated list after deletion
      await fetchDocuments();

      setIsEditFileModalOpen(false);
      setSelectedFileForEdit(null);

      enqueueSnackbar('File deleted successfully', {
        variant: 'success',
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
        autoHideDuration: 3000
      });
    } catch (error: any) {
      console.error('Error refreshing documents:', error);
      enqueueSnackbar(error.message || 'Failed to refresh documents', {
        variant: 'error',
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
        autoHideDuration: 3000
      });
    } finally {
      setGlobalLoading(false);
      setLoadingMessage('');
    }
  };

  // Handle row drag end for reordering root folders
  const handleRowDragEnd = useCallback((event: any) => {
    const { node, overNode } = event;
    
    if (!node || !overNode || !node.data || !overNode.data) return;
    
    const draggedData = node.data;
    const targetData = overNode.data;
    
    // Only allow reordering of root folders - silently ignore invalid drags
    if (draggedData.type !== 'folder' || draggedData.parentId !== null) {
      return;
    }
    
    if (targetData.type !== 'folder' || targetData.parentId !== null) {
      return;
    }
    
    // Prevent unnecessary updates if dragging to the same position
    if (draggedData.id === targetData.id) {
      return;
    }
    
    // Store original display order if this is the first change
    if (!hasDisplayOrderChanges) {
      const originalOrder: {[key: number]: number} = {};
      allDocuments.forEach(doc => {
        if (doc.type === 'folder' && doc.parentId === null) {
          originalOrder[doc.id] = doc.displayOrder;
        }
      });
      setOriginalDisplayOrder(originalOrder);
    }
    
    // Update display order in local state with batch update
    setAllDocuments(prevDocuments => {
      const updatedDocuments = [...prevDocuments];
      const draggedIndex = updatedDocuments.findIndex(doc => doc.id === draggedData.id);
      const targetIndex = updatedDocuments.findIndex(doc => doc.id === targetData.id);
      
      if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
        // Remove dragged item and insert at target position
        const [draggedItem] = updatedDocuments.splice(draggedIndex, 1);
        updatedDocuments.splice(targetIndex, 0, draggedItem);
        
        // Update display order for root folders only
        const rootFolders = updatedDocuments.filter(doc => doc.type === 'folder' && doc.parentId === null);
        rootFolders.forEach((folder, index) => {
          folder.displayOrder = index + 1;
        });
        
        return updatedDocuments;
      }
      
      return prevDocuments;
    });
    
    setHasDisplayOrderChanges(true);
  }, [allDocuments, hasDisplayOrderChanges]);

  // Save display order changes
  const handleSaveDisplayOrder = async () => {
    try {
      setGlobalLoading(true);
      setLoadingMessage('Saving display order...');
      
      // TODO: Implement API call to save display order
      // This will be implemented when you provide the API endpoint
      
      // For now, just simulate the save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setHasDisplayOrderChanges(false);
      setOriginalDisplayOrder({});
      
      enqueueSnackbar('Display order saved successfully', {
        variant: 'success',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 3000
      });
    } catch (error: any) {
      console.error('Error saving display order:', error);
      enqueueSnackbar(error.message || 'Failed to save display order', {
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        autoHideDuration: 3000
      });
    } finally {
      setGlobalLoading(false);
      setLoadingMessage('');
    }
  };

  // Cancel display order changes
  const handleCancelDisplayOrder = () => {
    // Restore original display order
    const restoredDocuments = [...allDocuments];
    Object.entries(originalDisplayOrder).forEach(([id, displayOrder]) => {
      const doc = restoredDocuments.find(d => d.id === parseInt(id));
      if (doc) {
        doc.displayOrder = displayOrder;
      }
    });
    
    // Sort by original display order
    restoredDocuments.sort((a, b) => a.displayOrder - b.displayOrder);
    
    setAllDocuments(restoredDocuments);
    setHasDisplayOrderChanges(false);
    setOriginalDisplayOrder({});
    
    enqueueSnackbar('Display order changes cancelled', {
      variant: 'info',
      anchorOrigin: { vertical: 'top', horizontal: 'right' },
      autoHideDuration: 3000
    });
  };

  return (
    <Layout>
      <Head>
        <title>{pageHeading} Management | 1Channel</title>
      </Head>
      
      <TailwindPageLayout
        header={
          <DocumentsHeader
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onSearch={handleSearch}
            onExport={exportDocuments}
            onCreateFolder={handleCreateFolder}
            onUploadDocument={handleUploadDocument}
            exporting={exporting}
            pageHeading={pageHeading}
          />
        }
      >
        <div className="h-full w-full overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center min-h-[60vh]">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500 mb-4">No {pageHeading} found</div>
              <p className="text-gray-400">Try changing your filter settings or upload a new document</p>
            </div>
          ) : (
            <>
              <DocumentDataGrid
                documents={documents}
                allDocuments={allDocuments}
                loading={loading}
                onDocumentEdit={handleEditDocument}
                onDocumentDelete={handleDeleteDocument}
                onDocumentDownload={handleDownloadDocument}
                onDocumentShare={handleShareDocument}
                searchText={searchTerm}
                onToggleExpand={handleToggleExpand}
                onRowDragEnd={handleRowDragEnd}
              />
              
              {/* Save Display Order Button - Show only when there are changes */}
              {hasDisplayOrderChanges && (
                <div className="flex items-center justify-center p-4 bg-blue-50 border-t border-blue-200">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-blue-700 font-medium">
                      Display order has been changed
                    </span>
                    <button
                      onClick={handleCancelDisplayOrder}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={globalLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDisplayOrder}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      disabled={globalLoading}
                    >
                      {globalLoading && (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      )}
                      Save Display Order
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </TailwindPageLayout>

      {/* Add Folder Modal */}
      <AddFolderModal
        isOpen={isAddFolderModalOpen}
        onClose={() => {
          setIsAddFolderModalOpen(false);
          setGlobalLoading(false);
          setLoadingMessage('');
        }}
        onSave={handleSaveFolder}
        onSaveAndAddNew={handleSaveAndAddNewFolder}
        existingFolders={allDocuments}
        isLoading={globalLoading}
      />

      {/* Add File Modal */}
      <AddFileModal
        isOpen={isAddFileModalOpen}
        onClose={() => {
          setIsAddFileModalOpen(false);
          setGlobalLoading(false);
          setLoadingMessage('');
        }}
        onSave={handleSaveFile}
        onSaveAndAddNew={handleSaveAndAddNewFile}
        existingFiles={allDocuments}
        isLoading={globalLoading}
      />

      {/* Edit Folder Modal */}
      {selectedFolderForEdit && (
        <EditFolderModal
          isOpen={isEditFolderModalOpen}
          onClose={() => {
            setIsEditFolderModalOpen(false);
            setSelectedFolderForEdit(null);
            setGlobalLoading(false);
            setLoadingMessage('');
          }}
          onSave={handleEditFolderSave}
          onDelete={handleDeleteFolder}
          folderData={selectedFolderForEdit}
          existingFolders={allDocuments}
          isLoading={globalLoading}
        />
      )}

      {/* Edit File Modal */}
      {isEditFileModalOpen && selectedFileForEdit && (
        <EditFileModal
          isOpen={isEditFileModalOpen}
          onClose={() => {
            setIsEditFileModalOpen(false);
            setSelectedFileForEdit(null);
            setGlobalLoading(false);
            setLoadingMessage('');
          }}
          onSave={handleEditFileSave}
          onDelete={handleDeleteFile}
          fileData={selectedFileForEdit}
          existingFiles={allDocuments}
          isLoading={globalLoading}
        />
      )}

      {/* Global Loading Overlay */}
      {globalLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
          <div className="rounded-lg p-8 flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            {/*<p className="text-lg font-medium text-gray-900">{loadingMessage || 'Processing...'}</p>
            <p className="text-sm text-gray-500">Please wait while we complete your request</p>*/}
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Documents;
