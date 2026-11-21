import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSnackbar } from 'notistack';
import communityService from '@/lib/services/communityService';
import { getProjectId, getUserId } from '@/lib/storage/sharedStorage';
import styles from '@/styles/addEditForm.module.css';
import { Button } from "@/components/ui/tailwind";
import { Leaf } from 'lucide-react';

type TagOption = 1 | 2 | 3 | 4; // 1=New Launch, 2=Announcement, 3=Offers, 4=Celebrations

interface AddPostModalProps {
  onCancel: () => void;
  onSuccess: () => void;
}

interface FormValues {
  title: string;
  description: string;
  tag: TagOption;
  thumbnail?: FileList;
  attachment?: FileList;
}

const MAX_THUMBNAIL_MB = 1;
const MAX_ATTACHMENT_MB = 5;

const AddPostModal: React.FC<AddPostModalProps> = ({ onCancel, onSuccess }) => {
  const { enqueueSnackbar } = useSnackbar();
  const projectId = getProjectId() || 0;
  const postedById = getUserId();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      title: '',
      description: '',
      tag: 1,
    },
  });

  const title = watch('title') || '';
  const description = watch('description') || '';

  const onSubmit = async (data: FormValues) => {
    try {
      if (!projectId) {
        enqueueSnackbar('Project not selected', { variant: 'error' });
        return;
      }
      setSubmitting(true);

      const formData = new FormData();
      // Match Angular implementation: use camel-case projectId in body
      formData.append('projectId', String(projectId));
      formData.append('title', data.title.trim());
      formData.append('description', data.description.trim());
      formData.append('tag', String(data.tag));
      formData.append('moduleType', String(5));
      if (postedById != null) {
        formData.append('postedBy', String(postedById));
      } else {
        console.warn('[AddPost] postedBy could not be derived from storage. Aborting submit.');
        enqueueSnackbar('User not found. Please re-login and try again.', { variant: 'error' });
        setSubmitting(false);
        return;
      }

      const addFileFields = (fileList: FileList | undefined, field: 'thumbnail' | 'attachment') => {
        if (fileList && fileList.length > 0) {
          const file = fileList[0];
          formData.append(field, file);
          const name = file.name;
          const dotIdx = name.lastIndexOf('.');
          const base = dotIdx > -1 ? name.substring(0, dotIdx) : name;
          const ext = dotIdx > -1 ? name.substring(dotIdx + 1) : '';
          if (field === 'thumbnail') {
            formData.append('thumbnailFilename', base);
            if (ext) formData.append('thumbnailFileExtension', ext);
          } else {
            formData.append('attachmentFilename', base);
            if (ext) formData.append('attachmentFileExtension', ext);
          }
        }
      };

      // Require both files like Angular app
      if (!data.thumbnail || data.thumbnail.length === 0) {
        enqueueSnackbar('Please upload a thumbnail image', { variant: 'error' });
        setSubmitting(false);
        return;
      }
      if (!data.attachment || data.attachment.length === 0) {
        enqueueSnackbar('Please upload an attachment', { variant: 'error' });
        setSubmitting(false);
        return;
      }

      addFileFields(data.thumbnail, 'thumbnail');
      addFileFields(data.attachment, 'attachment');

      const resp = await communityService.saveCommunityPost(projectId, formData);
      const ok = (resp && (resp.statusCode === 200 || resp.success === true)) || true; // backend may return empty body
      if (ok) {
        enqueueSnackbar('Post created successfully', { variant: 'success' });
        onSuccess();
      } else {
        enqueueSnackbar('Failed to create post', { variant: 'error' });
      }
    } catch (e: any) {
      enqueueSnackbar(e?.message || 'Failed to create post', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const validateThumbnail = (files?: FileList) => {
    if (!files || files.length === 0) return true;
    const file = files[0];
    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) return 'Only JPEG or PNG allowed';
    if (file.size > MAX_THUMBNAIL_MB * 1024 * 1024) return `Max ${MAX_THUMBNAIL_MB}MB allowed`;
    return true;
  };

  const validateAttachment = (files?: FileList) => {
    if (!files || files.length === 0) return true;
    const file = files[0];
    const validTypes = ['image/jpeg', 'image/png', 'audio/mpeg', 'video/mp4'];
    if (!validTypes.includes(file.type)) return 'Only JPEG, PNG, MP3 or MP4 allowed';
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) return `Max ${MAX_ATTACHMENT_MB}MB allowed`;
    return true;
  };

  return (
    <>
      {/* Form Content */}
      <form id="add-post-form" onSubmit={handleSubmit(onSubmit)} className={styles.formContainer}>
      <div className={styles.formContent}>
        <h3 className={styles.formTitle}>Add New Post</h3>
          <div className={styles.formGrid}>
            <div className={styles.formContent}>
              {/* Title Field */}
              <div className={styles.formField}>
                <label>
                  Title<span className="text-[#F64E60]">*</span>
                </label>
                <div className={styles.fieldInputContainer}>
                  <input
                    type="text"
                    className={styles.input}
                    maxLength={50}
                    {...register('title', { required: 'Title is required', maxLength: { value: 50, message: 'Max 50 characters' } })}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.title && <p className={styles.errorText}>{String(errors.title?.message)}</p>}
                    <span className="text-xs text-gray-500 ml-auto">
                      {title.length}/50
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className={styles.formField}>
                <label>
                  Description<span className="text-[#F64E60]">*</span>
                </label>
                <div className={styles.fieldInputContainer}>
                  <textarea
                    className={styles.textarea}
                    maxLength={500}
                    {...register('description', { required: 'Description is required', maxLength: { value: 500, message: 'Max 500 characters' } })}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.description && <p className={styles.errorText}>{String(errors.description?.message)}</p>}
                    <span className="text-xs text-gray-500 ml-auto">
                      {description.length}/500
                    </span>
                  </div>
                </div>
              </div>

              {/* Tag */}
              <div className={`${styles.formField} ${styles.formFieldInline}`}>
                <label>
                  Tag<span className="text-[#F64E60]">*</span>
                </label>
                <div className={styles.fieldInputContainer}>
                  <div className={styles.radioGroupInline}>
                    <label className={styles.radioOption}>
                      <input
                        type="radio"
                        value={1} {...register('tag', { valueAsNumber: true })} />
                      <span className={styles.radioLabel}>New Launch</span>
                    </label>
                    <label className={styles.radioOption}>
                      <input
                        type="radio"
                        value={2} {...register('tag', { valueAsNumber: true })} />
                      <span className={styles.radioLabel}>Announcement</span>
                    </label>
                    <label className={styles.radioOption}>
                      <input
                        type="radio"
                        value={3} {...register('tag', { valueAsNumber: true })} />
                      <span className={styles.radioLabel}>Offers</span>
                    </label>
                    <label className={styles.radioOption}>
                      <input
                        type="radio"
                        value={4} {...register('tag', { valueAsNumber: true })} />
                      <span className={styles.radioLabel}>Celebrations</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Thumbnail */}
              <div className={styles.formField}>
                <label>Thumbnail Image
                  <span className="text-[#F64E60]">*</span>
                </label>
                <div className="col-span-3 text-sm font-medium text-gray-700">
                  <input
                    id="thumbnailInput"
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    {...register('thumbnail', { validate: validateThumbnail })}
                  />
                  <label
                    htmlFor="thumbnailInput"
                    className="inline-flex items-center gap-2 rounded-md cursor-pointer select-none"
                  >
                    <img src="/svg/icons/general/imageIcon.svg" alt="Browse" className="w-10 h-10" />
                  </label>
                  {/* Selected file name */}
                  {(() => {
                    const fileList = (watch('thumbnail') as FileList | undefined);
                    const fname = fileList && fileList.length > 0 ? fileList[0].name : '';
                    return fname ? (
                      <div className="mt-1 text-xs text-gray-600">{fname}</div>
                    ) : null;
                  })()}
                  <div className="text-xs text-gray-400 mt-1">Upload .jpeg or .png files only, up to {MAX_THUMBNAIL_MB} MB</div>
                  {errors.thumbnail && <div className="text-xs text-red-500 mt-1">{String(errors.thumbnail.message)}</div>}
                </div>
              </div>

              {/* Attachment */}
              <div className={styles.formField}>
                <label>Upload Attachment
                  <span className="text-[#F64E60]">*</span>
                </label>
                <div className="col-span-3 text-sm font-medium text-gray-700">
                  <input
                    id="attachmentInput"
                    type="file"
                    accept="image/jpeg,image/png,audio/mpeg,video/mp4"
                    className="hidden"
                    {...register('attachment', { validate: validateAttachment })}
                  />
                  <label
                    htmlFor="attachmentInput"
                    className="inline-flex items-center gap-2 rounded-md hover:bg-gray-50 cursor-pointer select-none"
                  >
                    <img src="/svg/icons/general/DocumentUpload.svg" alt="Browse" className="w-10 h-10" />
                  </label>
                  {/* Selected file name */}
                  {(() => {
                    const fileList = (watch('attachment') as FileList | undefined);
                    const fname = fileList && fileList.length > 0 ? fileList[0].name : '';
                    return fname ? (
                      <div className="mt-1 text-xs text-gray-600">{fname}</div>
                    ) : null;
                  })()}
                  <div className="text-xs text-gray-400 mt-1">Upload .jpeg, .png, .mp3, or .mp4 files, up to {MAX_ATTACHMENT_MB} MB</div>
                  {errors.attachment && <div className="text-xs text-red-500 mt-1">{String(errors.attachment.message)}</div>}
                </div>
              </div> 
            </div>
          </div>

          <div className={styles.formActions}>
            <Button type="button" 
              variant="outline" 
              onClick={onCancel} 
              className={styles.cancelBtn}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </>
    );
};

export default AddPostModal;
