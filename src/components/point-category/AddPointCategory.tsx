import React, { useState, useEffect } from 'react';
import { AddPointCategoryRequest } from '../../lib/models/point-category/point-category.model';
import pointCategoryService from '../../lib/services/pointCategoryService';
import { getProjectId } from '../../lib/storage/sharedStorage';
import styles from '@/styles/generalSettings.module.css';
import { Button } from "@/components/ui/tailwind";

interface AddPointCategoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const AddPointCategory: React.FC<AddPointCategoryProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pointCategoryType: '' as 'CREDIT' | 'DEBIT' | '',
    status: 1
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });

  const projectId = getProjectId();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        description: '',
        pointCategoryType: '',
        status: 1
      });
      setErrors({});
      setLoading(false);
    }
  }, [isOpen]);

  // Toast utility function
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ show: true, type, message });
    // Auto-hide toast after 5 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Category Name is required';
    }
    
    if (!formData.pointCategoryType) {
      newErrors.pointCategoryType = 'Category Type is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const requestData: AddPointCategoryRequest = {
        projectId: projectId || 618,
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
        pointCategoryType: formData.pointCategoryType as 'CREDIT' | 'DEBIT'
      };

      await pointCategoryService.addEditPointCategory(requestData);
      
      showToast('success', 'Point category added successfully');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error adding point category:', error);
      showToast('error', error?.response?.data?.message || 'Failed to add point category');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center z-[9999] modalBackground p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Add Points Category</h2>
      </div>

      {/* Form Content */}
      <div className={`${styles.tabContent} flex-1 overflow-y-auto`} style={{padding: '24px'}}>
        {/* Category Name */}
        <div className={styles.tabField}>
          <label>
            Category Name <span className="text-[#F64E60]">*</span>
          </label>
          <div className={styles.fieldInputContainer}>
            <div className="mt-1">
              <div className="relative">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={styles.input}
                  maxLength={200}
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                {errors.name ? (
                  <p className="text-xs text-red-500">{errors.name}</p>
                ) : (
                  <p className={styles.instructionText}>Enter the point category name here</p>
                )}
                <p className="text-xs text-gray-500">{formData.name.length}/200</p>
              </div>
            </div>
          </div>
        </div>

        {/* Category Type */}
        <div className={styles.tabField}>
          <label>
            Category Type <span className="text-[#F64E60]">*</span>
          </label>
          <div className={styles.fieldInputContainer}>
            <div className="mt-1">
              <div className="relative">
                <select
                  value={formData.pointCategoryType}
                  onChange={(e) => handleInputChange('pointCategoryType', e.target.value as 'CREDIT' | 'DEBIT')}
                  className={styles.select}
                >
                  <option value="">Select the category type</option>
                  <option value="CREDIT">Credit</option>
                  <option value="DEBIT">Debit</option>
                </select>
              </div>
              <div className="flex justify-between items-center mt-1">
                {errors.pointCategoryType ? (
                  <p className="text-xs text-red-500">{errors.pointCategoryType}</p>
                ) : (
                  <p className={styles.instructionText}>Select the category type</p>
                )}
                <p className="text-xs text-gray-500"></p>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className={styles.tabField}>
          <label>
            Description <span className="text-[#F64E60]">*</span>
          </label>
          <div className={styles.fieldInputContainer}>
            <div className="mt-1">
              <div className="relative">
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={2}
                  className={styles.textarea}
                  maxLength={255}
                />
              </div>
              <div className="flex justify-between items-center">
                {errors.description ? (
                  <p className="text-xs text-red-500">{errors.description}</p>
                ) : (
                  <p className={styles.instructionText}>Enter description</p>
                )}
                <p className="text-xs text-gray-500">{formData.description.length}/255</p>
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className={styles.tabField}>
          <label>
            Status <span className="text-[#F64E60]">*</span>
          </label>
          <div className={styles.fieldInputContainer}>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', parseInt(e.target.value))}
              className={styles.select}
            >
              <option value={1}>Active</option>
              <option value={0}>Inactive</option>
            </select>
            <p className={styles.instructionText}>Select status</p>
          </div>
        </div>
      </div>

      {/* Footer Buttons */}
      <div className={styles.tabActions}>
        <Button type="button" 
          variant="outline" 
          onClick={onClose} 
          className={styles.cancelBtn}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
      disabled={loading || !formData.name.trim() || !formData.description.trim() || !formData.pointCategoryType}
          className={styles.submitBtn}
        >
          {loading ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>      
    </div>
    </>
  );
};

export default AddPointCategory;
