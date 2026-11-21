import { AttributeType } from '../attribute-type.model';
import { LooupValues } from '../looup-values.model';
import { DateAttributes } from '../date-attributes.model';

/**
 * Form-friendly values captured while the Add Attribute modal is open.
 * The object mirrors the Angular form so porting future sections stays simple.
 */
export interface AttributeFormValues {
  attributeTypeId?: string | null;
  attributeName: string;
  logicalFieldName?: string;
  instructions?: string;
  mandatoryFlag: boolean;
  uniqueFlag: boolean;
  allowBrowsingFlag: boolean;
  characterTypeId: string | null;
  minCharacters?: number | null;
  maxCharacters?: number | null;
  numericValidationTypeId?: string | null;
  minDigits?: number | null;
  maxDigits?: number | null;
  minNumber?: number | null;
  maxNumber?: number | null;
  decimalFlag?: boolean;
  maxImagesAllowed?: number | null;
  documentType?: string[] | null;
  referenceDocumentUrl?: string[] | null;
  allowPreviousForm?: boolean;
  previousFormActivity?: number | null;
  linkedAttributeId?: number | null;
  entityValue?: number | null;
  selectionType?: number | null;
  lookupValues?: LooupValues[];
  parentDataListId?: number | null;
  parentFieldValues?: Array<{ dataListValueId: number; dataListId: number }>;
  dependentFieldList?: Array<{ dataListId?: number | null; attributeId?: number | null }>;
  addDatalistDependentFields?: Array<{ dataListId?: number; attributeId?: number }>;
  isAllowQuantityTransfer?: boolean;
  productQuantityTransferDetail?: AttributeQuantityTransferDetail | null;
  dateValueType?: 'Standard' | 'Custom' | '';
  standardTypeValue?: string | null;
  previousDateValue?: number | null;
  futureDateValue?: number | null;
  showOptionPreselected?: boolean;
  addValidation?: boolean;
  regexExpression?: string;
  regexErrorMessage?: string;
  behaviour?: string | null;

}

export interface AttributeQuantityTransferDetail {
  customerTransfer?: number | null;
  entityTransfer?: number | null;
  entityFieldTransfer?: number | null;
  entityFieldValueTransfer?: number | null;
  showValues?: number | null;
}

/**
 * Payload contract for POST /setting/api/customType/addCustomAttribute
 */
export interface AttributePayload {
  attributeName: string;
  projectId: number;
  moduleType: number;
  fieldSpec: number;
  displayOrder: number;
  attributeType: AttributeType;
  mandatoryFlag: number;
  hasUniqueValues: number;
  allowBrowsing: number;
  characterType: number | null;
  minCharacters?: number | null;
  maxCharacters?: number | null;
  minDigits?: number | null;
  maxDigits?: number | null;
  minNumber?: number | null;
  maxNumber?: number | null;
  numericValidationType?: number | null;
  maxImagesAllowed?: number | null;
  documentType?: string[] | null;
  referenceDocumentUrl?: string[] | null;
  instructions?: string;
  parentAttribId?: number | null;
  parentFormId?: number | null;
  linkedAttributeId?: number | null;
  dateAttributes?: DateAttributes | null;
  lookupValues?: LooupValues[];
  parentDataListId?: number | null;
  addDataListDependentFields?: Array<{ dataListId?: number; attributeId?: number }> | null;
  dependentFilelds?: Array<{ dataListId?: number; attributeId?: number }> | null;
  parentFieldValues?: Array<{ dataListValueId: number; dataListId: number; isActive?: number }> | null;
  showAllDataListValues?: number;
  attributeIdentifierName?: string;
  otpValidation?: number;
  decimalFlag?: number;
  isAllowQuantityTransfer?: number;
  productQuantityTransferDetail?: AttributeQuantityTransferDetail | null;
  allowPreviousForm?: number;
  previousFormActivity?: number | null;
  addValidation?: number;
  regexExpression?: string | null;
  errorMessage?: string | null;
  showOptionPreselected?: number;
  status?: number;
  parentFieldId?: number | null;
  parentDataListValueId?: number | null;
  showAllParentFields?: number;
  addValidationFlag?: number;
  otpValidationFlag?: number;
  parentFieldLookupValues?: any;
  parentFieldRelations?: any;
  dateFilterValue?: any;
  addressAttributes?: any;
  userTime?: string;
  transTimeZone?: string;
}
