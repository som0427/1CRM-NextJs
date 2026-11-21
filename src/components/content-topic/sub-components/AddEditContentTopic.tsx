import React, { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useSnackbar } from 'notistack';
import TwinModal from '@/components/common/TwinModal';
import { Button } from '@/components/ui/tailwind';
import TextInput from '@/components/common/input-fields/TextInput';
import UploadImage from '@/components/common/input-fields/UploadImage';
import Select from '@/components/common/input-fields/Select';
import FormField from '@/components/common/input-fields/FormField';
import ConfirmationDialog from '@/components/common/ConfirmationDialog';
import { ContentTopicDetail, SaveContentTopicPayload, saveContentTopic } from '@/lib/services/contentTopicService';
import { getProjectId } from '@/lib/storage/sharedStorage';
import uploadService from '@/lib/services/uploadService';

type FormValues = {
  topicName: string;
  description: string;
  status: string;
  certificateTemplate: any;
  thumbnailUrl: string;
};

const defaultValues: FormValues = {
  topicName: '',
  description: '',
  status: '1',
  certificateTemplate: null,
  thumbnailUrl: '',
};

interface AddEditContentTopicProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  topicId?: string | number;
  preloadedData?: ContentTopicDetail | null;
}

const AddEditContentTopic: React.FC<AddEditContentTopicProps> = ({
  open,
  onClose,
  onSuccess,
  topicId,
  preloadedData,
}) => {
  const isEditMode = topicId !== undefined && topicId !== null;
  const { enqueueSnackbar } = useSnackbar();

  const { control, handleSubmit, reset, watch, setValue, setError, clearErrors, formState: { isDirty } } = useForm<FormValues>({
    defaultValues,
    mode: 'onChange',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (open && isEditMode && preloadedData) {
      setValue('topicName', preloadedData.topicName || '');
      setValue('description', preloadedData.description || '');
      setValue('status', String(preloadedData.status ?? 1));

      // Certificate template data from backend intentionally ignored — field hidden for now

      if (preloadedData.thumbnailUrl) {
        setValue('thumbnailUrl', preloadedData.thumbnailUrl);
      }
    }
  }, [open, isEditMode, preloadedData, setValue]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      reset(defaultValues);
    }
  }, [open, reset]);

  const onSubmit = async (data: FormValues) => {
    const projectId = getProjectId();
    if (!projectId) {
      enqueueSnackbar('Project not found', { variant: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      // Certificate template hidden — always send null
      const certificateUrl = null;

      const payload: SaveContentTopicPayload & { projectId: number } = {
        id: isEditMode ? Number(topicId) : null,
        topicName: data.topicName.trim(),
        description: data.description.trim(),
        status: Number(data.status),
        certificateTemplateUrl: certificateUrl,
        thumbnailUrl: data.thumbnailUrl,
        projectId,
      };

      const result = await saveContentTopic(payload);

      if (result) {
        enqueueSnackbar(
          isEditMode ? 'Content Topic updated successfully' : 'Content Topic added successfully',
          { variant: 'success' }
        );
        onSuccess();
      } else {
        enqueueSnackbar('Failed to save Content Topic', { variant: 'error' });
      }
    } catch (error: any) {
      console.error('Error saving content topic:', error);
      enqueueSnackbar('Failed to save Content Topic. Please try again.', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const hasUnsavedChanges = isDirty;

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      onClose();
    }
  };

  const handleConfirmCancel = () => {
    setShowUnsavedDialog(false);
    onClose();
  };

  const handleCancelDialog = () => {
    setShowUnsavedDialog(false);
  };

  const projectId = getProjectId();

  const handleThumbnailSelect = useCallback(async (file: File) => {
    clearErrors('thumbnailUrl');
    setIsUploadingThumbnail(true);

    const acceptedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!acceptedTypes.includes(file.type)) {
      setIsUploadingThumbnail(false);
      setError('thumbnailUrl', { type: 'manual', message: 'Invalid image. Please upload JPEG or PNG files only.' });
      return;
    }

    const img = new Image();
    img.onload = async () => {
      URL.revokeObjectURL(img.src);
      if (img.width !== 512 || img.height !== 512) {
        setIsUploadingThumbnail(false);
        setError('thumbnailUrl', { type: 'manual', message: 'Invalid image. Image must be exactly 512x512 pixels.' });
        return;
      }

      try {
        const uploadResult = await uploadService.uploadImage(9, file, projectId ?? 0);
        if (uploadResult?.responseData?.path) {
          clearErrors('thumbnailUrl');
          setValue('thumbnailUrl', uploadResult.responseData.path);
        } else {
          throw new Error('Upload failed');
        }
      } catch {
        setError('thumbnailUrl', { type: 'manual', message: 'Failed to upload image.' });
      } finally {
        setIsUploadingThumbnail(false);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      setIsUploadingThumbnail(false);
      setError('thumbnailUrl', { type: 'manual', message: 'Unable to process image file.' });
    };
    img.src = URL.createObjectURL(file);
  }, [projectId, setValue, setError, clearErrors]);

  const handleThumbnailRemove = useCallback(() => {
    setValue('thumbnailUrl', '');
  }, [setValue]);

  return (
    <>
      <TwinModal
        open={open}
        onClose={handleCancel}
        header={
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#3F4254]">
              {isEditMode ? 'Edit Content Topic' : 'Add Content Topic'}
            </h2>
          </div>
        }
        footer={
          <>
            <Button
              className="bg-[#E4E6EF] hover:bg-gray-300 text-[#3F4254] rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Cancel"
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#3699FF] hover:bg-blue-600 text-white rounded h-10 px-4 py-2 flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
              aria-label="Save"
              type="submit"
              onClick={handleSubmit(onSubmit)}
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : (
                'Save'
              )}
            </Button>
          </>
        }
        modalClassName="max-w-[800px]"
        mainHeightClassName="h-auto top-0 max-h-[70vh]"
        allowBorder
        closeOnOutsideClick={false}
      >
        <div className="bg-white">
          <form className="space-y-4 pt-1" onSubmit={handleSubmit(onSubmit)}>
            {/* Topic Name */}
            <FormField label="Topic Name" required>
              <TextInput
                name="topicName"
                control={control}
                placeholder="Enter topic name"
                validationRules={{ required: 'Topic Name is required' }}
                disabled={isSaving}
              />
            </FormField>

            {/* Description */}
            <FormField label="Description">
              <TextInput
                name="description"
                control={control}
                placeholder="Enter description"
                disabled={isSaving}
              />
            </FormField>

            {/* Thumbnail Image */}
            <FormField label="Thumbnail Image" required>
              <UploadImage
                name="thumbnailUrl"
                control={control}
                validationRules={{ required: 'Thumbnail image is required' }}
                onFileSelect={handleThumbnailSelect}
                onRemove={handleThumbnailRemove}
                acceptedTypes={['image/jpeg', 'image/png', 'image/jpg']}
                isUploading={isUploadingThumbnail}
                hint="Upload .jpeg, .png files only, Dimensions 512*512 pixels"
                disabled={isSaving}
              />
            </FormField>

            {/* Status */}
            <FormField label="Status" required>
              <Select
                name="status"
                control={control}
                options={[
                  { value: '1', label: 'Active' },
                  { value: '0', label: 'Inactive' },
                ]}
                placeholder="Select status"
                validationRules={{ required: 'Status is required' }}
                disabled={isSaving}
              />
            </FormField>

            {/* Certificate Template — hidden for now, kept for future use */}

          </form>
        </div>
      </TwinModal>

      {/* Unsaved Changes Confirmation Dialog */}
      <ConfirmationDialog
        open={showUnsavedDialog}
        onClose={handleCancelDialog}
        onConfirm={handleConfirmCancel}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to close? All your changes will be lost."
        confirmText="Yes"
        cancelText="No"
        confirmButtonClass="bg-red-500 hover:bg-red-600 text-white"
        icon="warning"
      />
    </>
  );
};

export default AddEditContentTopic;
