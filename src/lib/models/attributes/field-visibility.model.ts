import { LooupValues } from '../looup-values.model';
import { DateAttributes } from '../date-attributes.model';
import { AttributeType } from '../attribute-type.model';

/**
 * Field Visibility Setting Model
 * Maps which roles can see which fields and with what default values
 */
export interface FieldVisibilitySetting {
  id?: number;
  attributeId: number;
  roleId: number;
  fieldVisibility: number; // 1 = Read Only, 2 = Read/Write, 3 = Hidden
  value?: string | null;
  projectId: number;
  moduleType: number;
  parentDataListId?: number | null;
}

/**
 * Custom Attribute with extended properties for field visibility
 */
export interface CustomAttribute {
  id: number;
  attributeName: string;
  attributeIdentifierName?: string;
  combinedAttributeName: string;
  attributeType: AttributeType;
  mandatoryFlag: number;
  hasChildAttribute?: boolean;
  parentId?: number;
  linkedAttributeId?: number | null;
  linkedAttributeModuleId?: number | null;
  parentAttributeId?: number | null;
  parentFormId?: number | null;
  parentDataListId?: number | null;
  parentLinkedDataListAttribId?: number | null;
  systemAttribute?: SystemAttribute | null;
  lookupValues?: LooupValues[];
  parentLookupValues?: LooupValues[];
  parentRelationList?: any[];
  selectedDependentFields?: any[];
  selectedParentFiledValues?: any[];
  childAttributeList?: CustomAttribute[] | null;
  dateAttributes?: DateAttributes | null;
  characterType?: number | null;
  patternErrorMsg?: string;
  decimalFlag?: number | boolean | null;
  maxImagesAllowed?: number;
  documentType?: string | null;
  referenceDocumentUrl?: string[] | null;
  moduleType?: number;
  parentCombinedAttributeName?: string;
  status?: number;
  isActive?: number;
  instructions?: string | null;
  projectId?: number;
  fieldSpec?: number;
  displayOrder?: number;
  hasUniqueValues?: number;
  minCharacters?: number | null;
  maxCharacters?: number | null;
  allowBrowsing?: number;
  numericValidationType?: number;
  minDigits?: number;
  maxDigits?: number;
  minNumber?: number | null;
  maxNumber?: number | null;
  calculationFormula?: string | null;
  calculationExpression?: string | null;
  isOptionsAlphabetically?: number;
  otpValidation?: number;
  path?: string[];
  addDataListDependentFields?: any | null;
  showAllDataListValues?: any | null;
  allowPreviousForm?: number;
  previousFormActivity?: any | null;
  addValidation?: any | null;
  regexExpression?: string | null;
  errorMessage?: string | null;
  showOptionPreselected?: number;
  showInPortal?: number;
  isEdit?: boolean;
  isHidden?: boolean;
}

/**
 * System Attribute identifier
 */
export interface SystemAttribute {
  id: number;
  name?: string;
}

/**
 * Countries Model for address fields
 */
export interface Country {
  countryId: number;
  countryName: string;
  countryCode: string;
}

/**
 * States Model
 */
export interface State {
  stateId: number;
  stateName: string;
  stateCode: string;
  countryId: number;
}

/**
 * Cities Model
 */
export interface City {
  cityId: number;
  cityName: string;
  stateId: number;
}

/**
 * File Array structure for image/document uploads
 */
export interface FileArrayItem {
  attributeName: string;
  files: string[];
  documentIcons?: string[];
  allowedDocText?: string;
  validDocType?: DocumentType[];
  maxUpload: number;
  showUploadIcon: boolean;
  uploaded: number;
  hasError: boolean;
}

/**
 * Document Type configuration
 */
export interface DocumentType {
  type: string;
  extension: string;
  matchString: string;
}

/**
 * Upload Queue item
 */
export interface UploadQueueItem {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
}

/**
 * Open Divs Object for managing dynamic field visibility
 */
export interface OpenDivItem {
  attributeId: number;
  value: Array<{
    divId: string;
    combinedAttributeName: string;
    id: number;
    parentLinkedDataListAttribId: number;
  }>;
}

/**
 * Field Access Form Data by Role
 */
export interface RoleFieldAccessData {
  roleName: string;
  roleId: number;
  fieldVisibility: string; // '1', '2', or '3'
  fields: Record<string, any>; // field values keyed by combinedAttributeName
}

/**
 * Save Field Visibility Request Payload
 */
export interface SaveFieldVisibilityPayload {
  projectId: number;
  moduleType: number;
  attributeId: number;
  fieldVisibilitySettings: Array<{
    roleId: number;
    fieldVisibility: number;
    value?: string | null;
    parentDataListId?: number | null;
  }>;
}
