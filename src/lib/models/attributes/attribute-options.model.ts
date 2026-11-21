/**
 * Dropdown option type for attribute form selects
 */
export interface AttributeDropdownOption {
  value: string;
  label: string;
}

/**
 * Behaviour options for Single/Multi Select fields
 */
export const BEHAVIOUR_OPTIONS: AttributeDropdownOption[] = [
  { value: '1', label: 'Check Box' },
  { value: '2', label: 'Radio Button' },
  { value: '3', label: 'Default' },
];

/**
 * Status options for attribute status
 */
export const STATUS_OPTIONS: AttributeDropdownOption[] = [
  { value: '0', label: 'Inactive' },
  { value: '1', label: 'Active' },
];

/**
 * Numeric field validation type options
 */
export const NUMERIC_VALIDATION_TYPE_OPTIONS: AttributeDropdownOption[] = [
  { value: '1', label: 'Digits' },
  { value: '2', label: 'Value' },
  { value: '3', label: 'Regex' },
];

/**
 * Text field (Single Line) character type options
 */
export const TEXT_VALIDATION_TYPE_OPTIONS: AttributeDropdownOption[] = [
  { value: '1', label: 'All' },
  { value: '2', label: 'Alpha-Numeric' },
  { value: '3', label: 'Alphabet' },
  { value: '4', label: 'Regex' },
];

/**
 * Text field (Multi Line) character type options
 */
export const MULTILINE_TEXT_VALIDATION_TYPE_OPTIONS: AttributeDropdownOption[] = [
  { value: '1', label: 'All' },
  { value: '2', label: 'Alpha-Numeric' },
  { value: '3', label: 'Alphabet' },
  { value: '4', label: 'Regex' },
];

/**
 * Document type options
 */
export const DOCUMENT_TYPE_OPTIONS: AttributeDropdownOption[] = [
  { value: '1', label: 'PDF' },
  { value: '2', label: 'Word' },
  { value: '3', label: 'Excel' },
  { value: '4', label: 'Power Point' },
];



/**
 * Date value type options
 */
export const DATE_VALUE_TYPE_OPTIONS: AttributeDropdownOption[] = [
  { value: 'Standard', label: 'Standard' },
  { value: 'Custom', label: 'Custom' },
];



/**
 * Yes/No options for radio buttons
 */
export const YES_NO_OPTIONS: AttributeDropdownOption[] = [
  { value: '1', label: 'Yes' },
  { value: '0', label: 'No' },
];
