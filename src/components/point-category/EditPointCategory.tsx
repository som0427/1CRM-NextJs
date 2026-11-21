import React, { useState, useEffect } from 'react';
import { EditPointCategoryRequest, PointCategoryData } from '../../lib/models/point-category/point-category.model';
import pointCategoryService from '../../lib/services/pointCategoryService';
import { getProjectId } from '../../lib/storage/sharedStorage';
import styles from '@/styles/generalSettings.module.css';
import { Button } from "@/components/ui/tailwind";

interface EditPointCategoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  pointCategoryData: PointCategoryData | null;
}

const EditPointCategory: React.FC<EditPointCategoryProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  pointCategoryData 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    pointCategoryType: 'CREDIT' as 'CREDIT' | 'DEBIT',
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

  // Populate form with point category data when modal opens
  useEffect(() => {
    if (isOpen && pointCategoryData) {
      console.log('EditPointCategory - Received data:', pointCategoryData);
      setFormData({
        name: pointCategoryData.name || '',
        description: pointCategoryData.description || '',
        pointCategoryType: (pointCategoryData.pointCategoryType as 'CREDIT' | 'DEBIT') || 'CREDIT',
        status: pointCategoryData.status !== undefined && pointCategoryData.status !== null ? pointCategoryData.status : 1
      });
      setErrors({});
      setLoading(false);
    }
  }, [isOpen, pointCategoryData]);

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
    
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm() || !pointCategoryData) {
      return;
    }

    try {
      setLoading(true);
      
      const requestData: EditPointCategoryRequest = {
        projectId: projectId || 618,
        pointCategoryId: pointCategoryData.pointCategoryId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status,
        pointCategoryType: formData.pointCategoryType
      };

      await pointCategoryService.addEditPointCategory(requestData);
      
      showToast('success', 'Point category updated successfully');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error updating point category:', error);
      showToast('error', error?.response?.data?.message || 'Failed to update point category');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[10000] px-4 py-3 rounded-lg shadow-lg ${
          toast.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="fixed inset-0 flex items-center justify-center z-[9999] modalBackground p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Edit Points Category</h2>
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
                    <p className={styles.instructionText}>Select the category type</p>
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
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className={styles.cancelBtn}
            >
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

export default EditPointCategory;
