interface AttributeFieldValidationDescriptor {
  id: number;
  key: string;
  label: string;
}

const descriptors: AttributeFieldValidationDescriptor[] = [
  { id: 1, key: 'attributeName', label: 'Attribute Name' },
  { id: 2, key: 'attributeIdentifierName', label: 'Attribute Identifier Name' },
  { id: 3, key: 'instructions', label: 'Instructions' },
  { id: 4, key: 'attributeType', label: 'Attribute Type' },
  { id: 5, key: 'parentAttribId', label: 'Parent Attribute ID' },
  { id: 6, key: 'parentFormId', label: 'Parent Form ID' },
  { id: 7, key: 'fieldSpec', label: 'Field Spec' },
  { id: 8, key: 'hasUniqueValues', label: 'Has Unique Values' },
  { id: 9, key: 'allowPreviousForm', label: 'Allow Previous Form' },
  { id: 10, key: 'previousFormActivity', label: 'Previous Form Activity' },
  { id: 11, key: 'mandatoryFlag', label: 'Mandatory Flag' },
  { id: 12, key: 'isOptionsAlphabetically', label: 'Show Options Alphabetically' },
  { id: 13, key: 'characterType', label: 'Validation Type' },
  { id: 14, key: 'minCharacters', label: 'Min Characters' },
  { id: 15, key: 'maxCharacters', label: 'Max Characters' },
  { id: 16, key: 'allowBrowsing', label: 'Allow Browsing' },
  { id: 17, key: 'maxImagesAllowed', label: 'Max Images Allowed' },
  { id: 18, key: 'numericValidationType', label: 'Validation Type' },
  { id: 19, key: 'minDigits', label: 'Min Digits' },
  { id: 20, key: 'maxDigits', label: 'Max Digits' },
  { id: 21, key: 'minNumber', label: 'Min Number' },
  { id: 22, key: 'maxNumber', label: 'Max Number' },
  { id: 23, key: 'decimalFlag', label: 'Decimal Flag' },
  { id: 24, key: 'status', label: 'Status' },
  { id: 25, key: 'calculationFormula', label: 'Calculation Formula' },
  { id: 26, key: 'referenceDocumentUrl', label: 'Reference Document URL' },
  { id: 27, key: 'documentType', label: 'Document Type' },
  { id: 28, key: 'parentDataListId', label: 'Parent Data List ID' },
  { id: 29, key: 'addDataListDependentFields', label: 'Add Data List Dependent Fields' },
  { id: 30, key: 'showAllDataListValues', label: 'Show All Data List Values' },
  { id: 31, key: 'otpValidation', label: 'OTP Validation' },
  { id: 32, key: 'addValidation', label: 'Add Validation' },
  { id: 33, key: 'regexExpression', label: 'Regex Expression' },
  { id: 34, key: 'errorMessage', label: 'Error Message' },
  { id: 35, key: 'showOptionPreselected', label: 'Show Option Preselected' },
  { id: 36, key: 'showInPortal', label: 'Show In Portal' },
  { id: 37, key: 'combinedAttributeName', label: 'Combined Attribute Name' },
  { id: 38, key: 'lookupValues', label: 'Lookup Values' },
  { id: 39, key: 'dateAttributes', label: 'Date Attributes' },
  { id: 40, key: 'parentFieldValues', label: 'Parent Field Values' },
  { id: 41, key: 'isAllowQuantityTransfer', label: 'Is Allow Quantity Transfer' },
  { id: 42, key: 'productQuantityTransferDetail', label: 'Product Quantity Transfer Detail' },
  { id: 43, key: 'productFilterByDetails', label: 'Product Filter By Details' },
  { id: 44, key: 'fieldVisibilityStatus', label: 'Field Visibility Status' }
];

export const ATTRIBUTE_FIELD_VALIDATION_LABELS: Record<number, string> = descriptors.reduce(
  (acc, descriptor) => {
    acc[descriptor.id] = descriptor.label;
    return acc;
  },
  {} as Record<number, string>
);

export const ATTRIBUTE_FIELD_VALIDATION_KEY_LABELS: Record<string, string> = descriptors.reduce(
  (acc, descriptor) => {
    acc[descriptor.key.toLowerCase()] = descriptor.label;
    return acc;
  },
  {} as Record<string, string>
);

export const getAttributeFieldValidationLabel = (value?: number | string | null): string => {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && ATTRIBUTE_FIELD_VALIDATION_LABELS[numeric]) {
    return ATTRIBUTE_FIELD_VALIDATION_LABELS[numeric];
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return '-';
    return ATTRIBUTE_FIELD_VALIDATION_KEY_LABELS[normalized] || value;
  }

  return '-';
};
