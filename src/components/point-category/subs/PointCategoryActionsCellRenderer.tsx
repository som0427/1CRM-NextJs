import React from 'react';
import { PointCategoryData } from '../../../lib/models/point-category/point-category.model';
import EditActionButton from '@/components/common/buttons/action-button/EditActionButton';

interface PointCategoryActionsCellRendererProps {
  params: any;
  onPointCategoryEdit?: (pointCategory: PointCategoryData) => void;
}

const PointCategoryActionsCellRenderer: React.FC<PointCategoryActionsCellRendererProps> = ({
  params,
  onPointCategoryEdit
}) => {
  const pointCategory: PointCategoryData = params.data;

  const handleEdit = (id: number) => {
    if (onPointCategoryEdit) {
      onPointCategoryEdit(pointCategory);
    }
  };

  return (
    <div 
      className="flex items-center justify-center w-full h-full">
        <EditActionButton 
          id={params.data.id}
          variant='new'
          onEdit={handleEdit}
          className="space-between-icon"
        />
    </div>
  );
};

export default PointCategoryActionsCellRenderer;
