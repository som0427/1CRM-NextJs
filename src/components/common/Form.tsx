import React, { ReactNode, FormEvent } from 'react';

/**
 * Form Component
 *
 * A reusable form wrapper with consistent styling including white background,
 * vertical spacing between form elements, and top padding. Designed to work
 * primarily with FormField components, but also accepts other form elements.
 *
 * @component
 *
 * @example
 * // Basic usage with FormField (preferred)
 * <Form onSubmit={handleSubmit(onSubmit)}>
 *   <FormField label="Name" required>
 *     <TextInput name="name" control={control} />
 *   </FormField>
 *   <FormField label="Email">
 *     <TextInput name="email" control={control} />
 *   </FormField>
 * </Form>
 *
 * @example
 * // With other elements (buttons, divs, etc.)
 * <Form onSubmit={handleSubmit(onSubmit)}>
 *   <FormField label="Name" required>
 *     <TextInput name="name" control={control} />
 *   </FormField>
 *   <div className="flex justify-end">
 *     <Button type="submit">Submit</Button>
 *   </div>
 * </Form>
 *
 * @example
 * // With custom background and spacing
 * <Form onSubmit={handleSubmit(onSubmit)} bgColor="bg-gray-50" spaceY={6} pt={2}>
 *   <FormField label="Description">
 *     <TextArea name="description" control={control} />
 *   </FormField>
 * </Form>
 *
 * Props:
 * ------
 * @param {(e: FormEvent<HTMLFormElement>) => void} onSubmit - Form submit handler
 * @param {ReactNode} children - Form content (preferably FormField components, but accepts any valid React node)
 * @param {string} [bgColor="bg-white"] - Background color class
 * @param {number} [spaceY=4] - Vertical spacing between children (space-y-{n})
 * @param {number|null} [pt=null] - Top padding (pt-{n}), null for no padding
 * @param {string} [className] - Additional CSS classes
 */

interface FormProps {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
  bgColor?: string;
  spaceY?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  pt?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | null;
  className?: string;
  id?: string;
}

// Tailwind requires full class names at build time
const spaceYClasses: Record<number, string> = {
  0: 'space-y-0',
  1: 'space-y-1',
  2: 'space-y-2',
  3: 'space-y-3',
  4: 'space-y-4',
  5: 'space-y-5',
  6: 'space-y-6',
  7: 'space-y-7',
  8: 'space-y-8',
};

const ptClasses: Record<number, string> = {
  0: 'pt-0',
  1: 'pt-1',
  2: 'pt-2',
  3: 'pt-3',
  4: 'pt-4',
  5: 'pt-5',
  6: 'pt-6',
  7: 'pt-7',
  8: 'pt-8',
};

const Form: React.FC<FormProps> = ({
  onSubmit,
  children,
  bgColor = 'bg-white',
  spaceY = 4,
  pt = null,
  className = '',
  id,
}) => {
  return (
    <div className={bgColor}>
      <form
        id={id}
        className={`${spaceYClasses[spaceY]} ${pt !== null ? ptClasses[pt] : ''} ${className}`}
        onSubmit={onSubmit}
      >
        {children}
      </form>
    </div>
  );
};

Form.displayName = 'Form';

export default Form;
