import apiClient from "../services/apiClient";
import settingsService from "../services/settingsService";

// Raw API response structure for attribute data
export interface AttributeGridData {
  // Basic identifiers
  id: number;
  attributeName: string;
  attributeIdentifierName: string;
  combinedAttributeName: string;

  // Display fields (transformed for grid)
  fieldName?: string;
  fieldType?: string;
  mandatory?: string;
  visibility?: string;
  status?: string;
  actions?: string;

  // Type information
  attributeType: {
    id: number;
    typeName: string;
    isActive: number;
    displayOrder: number;
  } | null;

  // Core properties
  projectId: number;
  moduleType: number;
  isActive: number;
  instructions: string | null;
  mandatoryFlag: number;
  hasUniqueValues: number;
  displayOrder: number;
  fieldSpec: number | string;
  behaviourType?: number;

  // System attribute
  systemAttribute: {
    id: number;
    name: string;
  } | null;

  // Text field properties
  characterType: number;
  minCharacters: number | null;
  maxCharacters: number | null;

  // Numeric field properties
  numericValidationType: number;
  minDigits: number | null;
  maxDigits: number | null;
  minNumber: number | null;
  maxNumber: number | null;
  decimalFlag: number | null;

  // Image field properties
  allowBrowsing: number;
  maxImagesAllowed: number | null;

  // Document field properties
  documentType: string | null;
  maxDocumentsAllowed?: number | null;

  // Video field properties
  maxVideosAllowed?: number | null;

  // Reference document properties
  referenceDocumentUrl: string[] | null;

  // Options properties
  isOptionsAlphabetically: number;
  showOptionPreselected: number;

  // Calculation field properties
  calculationFormula: string | null;
  calculationExpression: string | null;

  // OTP Validation properties
  otpValidation: number;
  linkedAttributeId: number | null;
  linkedAttributeModuleId: number | null;

  // Parent/Child hierarchy
  parentId: number;
  parentAttributeId: number | null;
  hasChildAttribute: boolean;
  childAttributeList: AttributeGridData[] | null;
  path: string[];

  // Data List properties
  parentDataListId: number | null;
  addDataListDependentFields: number | null;
  showAllDataListValues: number | null;

  // Lookup values (for Single/Multi Select and Data List)
  lookupValues?: Array<{
    id: number;
    lookupValue: string;
    dataListId?: number | null;
    dataListValueId?: number | null;
    isActive: number;
  }> | null;

  // Parent field values (for Data List with parent)
  // Note: API uses "selectedParentFiledValues" (typo in "Filed")
  parentFieldValues?: Array<{
    id: number;
    dataListId: number;
    dataListValueId: number;
    isActive: number;
  }> | null;

  // Selected parent field values from API (note: API has typo "Filed" instead of "Field")
  selectedParentFiledValues?: Array<{
    id: number;
    dataListId: number;
    dataListValueId: number;
    isActive: number;
  }> | null;

  // Selected dependent fields (for Data List child values)
  selectedDependentFields?: Array<{
    id: number;
    dataListId: number;
    dataListValueId: number;
    isActive: number;
  }> | null;

  // Form properties
  parentFormId: number | null;
  allowPreviousForm: number;
  previousFormActivity: string | null;

  // Validation properties
  addValidation: number | null;
  regexExpression: string | null;
  errorMessage: string | null;

  // Portal visibility
  showInPortal: number;

  // System field status (computed)
  showSystemFieldStatus?: boolean;
}

/**
 * Fetch attributes for a specific module type
 * @param projectId - The project ID
 * @param moduleType - The module type (2 for Customer, 1 for Contact, etc.)
 */
export async function fetchAttributes(projectId: number, moduleType: number = 2, signal?: AbortSignal): Promise<AttributeGridData[]> {
  try {
    const response = await settingsService.getFieldDetails(projectId, moduleType, signal);

    if (response.statusCode === 200) {
      return response.responseData;
    }
    return [];
  } catch (error) {
    // Silent handling for aborted requests (logged in apiClient)
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    if ((error as DOMException)?.name === 'AbortError' ||
        errorMessage.includes('Abort Request:')) {
      throw error;
    }
    console.error('Error fetching attributes:', error);
    return [];
  }
}



/**
 * Fetch attributes for a specific module type
 * @param moduleType - The module type (2 for Customer, 1 for Contact, etc.)
 */
export async function fetchAttributeTypeList( moduleType: number, signal?: AbortSignal): Promise<any> {
  try {
    const response = await settingsService.getAllAttributeTypes(moduleType, signal);

    return response;
  } catch (error) {
    // Silent handling for aborted requests (logged in apiClient)
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    if ((error as DOMException)?.name === 'AbortError' ||
        errorMessage.includes('Abort Request:')) {
      throw error;
    }
    console.error('Error fetching attribute types:', error);
    return [];
  }
}

/**
 * Fetch module owner options for special fields (systemAttribute 34, 35, 65)
 * @param projectId - The project ID
 * @param moduleId - The module type ID
 */
export async function fetchModuleOwnerOptions(projectId: number, moduleId: number): Promise<any> {
  try {
    const response = await apiClient.get<{ responseData: any[]; statusCode: number }>(
      `${process.env.NEXT_PUBLIC_API_URL}/login/api/users/fetchModuleOwnerOptions?projectId=${projectId}&moduleId=${moduleId}`
    );

    if (response.statusCode === 200 && response.responseData) {
      return response.responseData;
    }
    return [];
  } catch (error) {
    console.error('Error fetching module owner options:', error);
    return [];
  }
}

