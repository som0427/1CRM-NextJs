import React from 'react';
import { Controller, Control } from 'react-hook-form';

/**
 * ColorPickerInput Component
 *
 * A color picker with React Hook Form integration, featuring a visual color preview box
 * and native color picker.
 *
 * @component
 *
 * @example
 * // Basic usage
 * <ColorPickerInput name="brandColor" control={control} />
 *
 * @example
 * // With validation
 * <ColorPickerInput
 *   name="themeColor"
 *   control={control}
 *   validationRules={{ required: 'Please select a color' }}
 * />
 *
 * @example
 * // With onChange callback and hint
 * <ColorPickerInput
 *   name="backgroundColor"
 *   control={control}
 *   onChange={(color) => console.log('Selected color:', color)}
 *   hint="Select a background color"
 * />
 *
 * @example
 * // Disabled state
 * <ColorPickerInput name="lockedColor" control={control} disabled={true} />
 *
 * Props:
 * ------
 * @param {string} name - Form field name (required)
 * @param {Control<any>} control - React Hook Form control object (required)
 * @param {any} [validationRules] - React Hook Form validation rules
 * @param {boolean} [disabled=false] - Disabled state
 * @param {any} [hint] - Hint text displayed below color picker
 * @param {(value: string) => void} [onChange] - Callback when color changes (hex value)
 *
 * Features:
 * ---------
 * - React Hook Form integration via Controller
 * - 56x56px color preview box
 * - Native browser color picker
 * - Hidden input for clean UI
 * - Default color: #000000
 * - Error message display
 * - Hint text support
 */
interface ColorPickerInputProps {
    name: string;
    control: Control<any>;
    validationRules?: any;
    disabled?: boolean;
    hint?: any;
    onChange?: (value: string) => void;
}

const ColorPickerInput: React.FC<ColorPickerInputProps> = ({ 
    name,
    control,
    validationRules,
    disabled = false,
    hint,
    onChange
}) => {
    return (
        <Controller
            name={name}
            control={control}
            rules={validationRules}
            render={({ field, fieldState }) => (
                <div>
                    <div className="relative">
                        <input
                            type="color"
                            value={field.value || '#000000'}
                            onChange={(e) => {
                                if (!disabled) {
                                    field.onChange(e.target.value);
                                    if (onChange) {
                                        onChange(e.target.value);
                                    }
                                }
                            }}
                            disabled={disabled}
                            className="absolute opacity-0 w-16 h-16 cursor-pointer z-10"
                        />
                        <div
                            className={`w-14 h-14 rounded-lg ${
                                disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            style={{ backgroundColor: field.value || '#000000' }}
                        />
                    </div>
                    {fieldState.error && !disabled && (
                        <div className="text-xs text-red-500 mt-1">
                            {fieldState.error.message}
                        </div>
                    )}
                    {hint && (
                        <div className="text-xs text-gray-500 mt-1">
                            {hint}
                        </div>
                    )}
                </div>
            )}
        />
    );
};

export default ColorPickerInput;