import React, { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import TwinModal from '@/components/common/TwinModal';
import Form from '@/components/common/Form';
import FormField from '@/components/common/input-fields/FormField';
import TextInput from '@/components/common/input-fields/TextInput';
import { Button } from '@/components/ui/tailwind/Button';
import CancelButton from '../common/buttons/CancelButton';
import SaveButton from '../common/buttons/SaveButton';

interface ProductFormAddModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (payload: { name: string; key: string }) => void | Promise<void>;
}

interface ProductFormFormValues {
  name: string;
  key: string;
}

const ProductFormAddModal: React.FC<ProductFormAddModalProps> = ({
  open,
  onClose,
  onSave
}) => {
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting }
  } = useForm<ProductFormFormValues>({
    defaultValues: { name: '', key: '' }
  });

  useEffect(() => {
    if (open) {
      reset({ name: '', key: '' });
    }
  }, [open, reset]);

  const onSubmit = useCallback(
    async (values: ProductFormFormValues) => {
      const payload = {
        name: values.name.trim(),
        key: values.key.trim()
      };

      if (!payload.name || !payload.key) {
        return;
      }

      await onSave?.(payload);
    },
    [onSave]
  );

  return (
    <TwinModal
      open={open}
      onClose={onClose}
      header="Add Form"
      modalClassName="max-w-3xl"
      mainHeightClassName='h-auto max-h-[90vh]'
      allowBorder
      closeOnOutsideClick={false}
      footer={
       <>
       <CancelButton
       onClick={onClose}
       disabled={isSubmitting}
       />
       <SaveButton
       onClick={handleSubmit(onSubmit)}
       loading={isSubmitting}
       disabled={isSubmitting}
       />
       </>
      }
    >
      <Form
        onSubmit={handleSubmit(onSubmit)}
        spaceY={4}
      >
        <FormField
          label="Form Name"
          required
        >
          <TextInput
            name="name"
            control={control}
            placeholder="Type..."
            maxLength={50}
            showCharacterCount
            validationRules={{
              required: 'Form name is required',
              validate: value => value?.trim().length > 0 || 'Form name is required'
            }}

          />
        </FormField>

        <FormField
          label="Key"
          required
        >
          <TextInput
            name="key"
            control={control}
            placeholder="Type..."
            maxLength={5}
            showCharacterCount
            validationRules={{
              required: 'Key is required',
              validate: value => value?.trim().length > 0 || 'Key is required'
            }}
          />
        </FormField>

      </Form>
    </TwinModal>
  );
};

export default ProductFormAddModal;
