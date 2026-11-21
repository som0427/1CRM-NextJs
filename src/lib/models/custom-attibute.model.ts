import { AttributeType } from './attribute-type.model';
import { LooupValues } from './looup-values.model';
import { DateAttributes } from './date-attributes.model';
import { SystemAttribute } from './system-attribute.model';

export class CustomAttibute {


    id: number;
    attributeType: AttributeType;
    projectId: number;
    attributeName: string;
    combinedAttributeName: string;
    mandatoryFlag: number;
    status: number| string;
    isActive: number| string;
    moduleType: number| string;
    lookupValues: LooupValues[];
    dateAttributes: DateAttributes

    mandatory?: string;
    active?:string;
    attributeTypeName?: string;
    fieldSpec?: number;
    path: any[];
    systemAttribute: SystemAttribute;
    displayOrder:number;
    allowBrowsing?:number;
    instructions?:string;
    characterType?:number;
    maxCharacters?:number|string;
    maxDigits?:number;
    maxImagesAllowed?:number;
    minCharacters?:number|string;
    minDigits?:number;
    numericValidationType?:number;
    minNumber?:number;
    maxNumber?:number;
    hasUniqueValues?:number;
    hasChildAttribute?:boolean;
    linkedAttributeModuleId?:number;
    linkedAttributeId?:number;
    referenceDocumentUrl?: string[];
    documentType?:string;
    calculationFormula?:string;
    parentAttributeId?: number;
    childAttributeList: any;
    parentLookupValues: any;
    parentRelationList: any;
    parentFormId: number;
    parentId: number;
    parentLinkedDataListAttribId: any;
    parentDataListId: any;
    selectedDependentFields: any;
    addDataListDependentFields: any;
    selectedParentFiledValues: any;
    dataListValueId: number;
    isOptionsAlphabetically: number;
    showAllDataListValues?: number;
    attributeIdentifierName: string;
    calculationExpression: string;
    otpValidation: number;
    decimalFlag: number;
    allowPreviousForm: number;
    previousFormActivity: number;
    addValidation: number;
    regexExpression: string;
    errorMessage: string;
    showOptionPreselected: number;

}
