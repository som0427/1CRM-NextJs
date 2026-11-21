import React from 'react';
import { Control } from 'react-hook-form';
import TextInput from '../TextInput';

interface SerialKeyInputProps {
  name: string;
  control: Control<any>;
  placeholder?: string;
  validationRules?: any;
  hint?: any;
  maxWidth?: string;
}

const SerialKeyInput: React.FC<SerialKeyInputProps> = ({
  name,
  control,
  placeholder = 'Serial No.',
  validationRules,
  hint,
  maxWidth = 'w-full',
}) => {
  return (
    <TextInput
      name={name}
      control={control}
      placeholder={placeholder}
      disabled={true}
      validationRules={validationRules}
      hint={hint}
      maxWidth={maxWidth}
    />
  );
};

SerialKeyInput.displayName = 'SerialKeyInput';

export default SerialKeyInput;
