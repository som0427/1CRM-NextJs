import settingsService from '@/lib/services/settingsService';
import customerService from '@/lib/services/customerService';
import userService from '@/lib/services/userService';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import { cloneDeep } from 'lodash';

export interface PreloadedCustomerFormData {
  visibilityResponse: any;
  fieldApiResponse: any;
  dataListDetailsResponse: any;
  customerDetailResponse?: any; // Customer detail data for edit form
  isProcessed: boolean; // Flag to indicate lookup data has been processed
}

/**
 * Preload all form data including lookup values for Customer AddForm
 * Note: Customer module does not use linkedDataListDetails, linkedFieldDetails, or productForm
 */
export async function preloadCustomerFormData(
  projectId: any,
  source: number
): Promise<PreloadedCustomerFormData> {
  // Call all initial APIs in parallel
  // Note: Customer module uses COMPANY_MODULE for field details
  const [visibilityResponse, fieldApiResponse, dataListDetailsResponse] = await Promise.all([
    settingsService.getFieldVisibilitySettings(projectId, SystemAttributeEnum.COMPANY_MODULE, true),
    settingsService.getFieldDetails(projectId, SystemAttributeEnum.COMPANY_MODULE),
    settingsService.getFieldDetails(projectId, SystemAttributeEnum.DATA_LIST_MODULE)
  ]);

  // Extract response data
  const fieldData = fieldApiResponse?.responseData || [];
  const dataListDetails = dataListDetailsResponse?.responseData || [];

  // Process lookup attributes (this makes additional API calls)
  await lookupSetupForAttributes(fieldData, dataListDetails, projectId, source);

  return {
    visibilityResponse,
    fieldApiResponse,
    dataListDetailsResponse,
    isProcessed: true
  };
}

/**
 * Preload all form data including lookup values for Customer EditForm
 */
export async function preloadCustomerEditFormData(
  projectId: any,
  companyId: number,
  source: number
): Promise<PreloadedCustomerFormData> {
  // Call all initial APIs in parallel including customer detail
  const [visibilityResponse, fieldApiResponse, dataListDetailsResponse, customerDetailResponse] = await Promise.all([
    settingsService.getFieldVisibilitySettings(projectId, SystemAttributeEnum.COMPANY_MODULE, true),
    settingsService.getFieldDetails(projectId, SystemAttributeEnum.COMPANY_MODULE),
    settingsService.getFieldDetails(projectId, SystemAttributeEnum.DATA_LIST_MODULE),
    customerService.getParticularCustomer(companyId, projectId)
  ]);

  // Extract response data
  const fieldData = fieldApiResponse?.responseData || [];
  const dataListDetails = dataListDetailsResponse?.responseData || [];

  // Process lookup attributes (this makes additional API calls)
  await lookupSetupForAttributes(fieldData, dataListDetails, projectId, source);

  return {
    visibilityResponse,
    fieldApiResponse,
    dataListDetailsResponse,
    customerDetailResponse,
    isProcessed: true
  };
}

/**
 * Setup lookup values for all attributes that need them
 * This handles SINGLE_SELECT_DROPDOWN, MULTI_SELECT_DROPDOWN, DATA_LIST, and system attributes
 */
async function lookupSetupForAttributes(
  fieldData: any[],
  dataListDetails: any[],
  projectId: any,
  source: number
): Promise<void> {
  const promises: Promise<void>[] = [];

  for (const field of fieldData) {
    // Skip fields that don't need lookup setup
    if (!field.attributeType || field.isActive !== 1) continue;

    const attributeTypeId = field.attributeType.id;
    const attributeId = field.id;

    switch (attributeTypeId) {
      case CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN:
      case CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN:
        promises.push(setLookupFieldValue(attributeId, field, projectId, source));
        break;
      case CustomAttributeTypeEnum.DATE:
      case CustomAttributeTypeEnum.DATE_TIME:
        promises.push(setCustomDateTypeAttributes(attributeId, field));
        break;
      case CustomAttributeTypeEnum.DATA_LIST:
        promises.push(setLookupForDataList(attributeId, field, dataListDetails));
        break;
      default:
        break;
    }
  }

  await Promise.all(promises);
}

/**
 * Set lookup field values for select/multiselect fields
 */
async function setLookupFieldValue(
  attribId: number,
  field: any,
  projectId: any,
  source: number
): Promise<void> {
  try {
    // Handle Company Owner field (systemAttribute 5)
    if (field.systemAttribute?.id === SystemAttributeEnum.COMPANY_OWNER_FIELD_ID) {
      const row = await userService.getOwner(projectId, SystemAttributeEnum.COMPANY_MODULE);
      if (row['statusCode'] === 200) {
        row['responseData'].forEach((item: any) => {
          item.lookupValue = item.name || item.userName || `${item.firstName || ''} ${item.lastName || ''}`.trim();
        });
        field.lookupValues = row['responseData'];
      }
      return;
    }

    // Handle other system attributes if needed
    // For regular dropdown fields, fetch lookup values from API
    if (field.linkedAttributeId) {
      const row = await settingsService.getAttribLookup(field.linkedAttributeId);
      if (row['statusCode'] === 200) {
        field.lookupValues = row['responseData'];
      }
    } else {
      const row = await settingsService.getAttribLookup(attribId);
      if (row['statusCode'] === 200) {
        field.lookupValues = row['responseData'];
      }
    }
  } catch (error) {
    console.error(`Error setting lookup values for field ${field.attributeName}:`, error);
  }
}

/**
 * Set custom date type attributes
 */
async function setCustomDateTypeAttributes(attributeId: number, field: any): Promise<void> {
  try {
    const response = await settingsService.getCustomDateAttribute(attributeId);
    if (response && response.statusCode === 200) {
      field.dateAttributes = response.responseData;
    }
  } catch (error) {
    console.error(`Error fetching date attributes for field ${field.attributeName}:`, error);
  }
}

/**
 * Set lookup for data list fields
 */
async function setLookupForDataList(attributeId: number, field: any, dataListDetails: any[]): Promise<void> {
  // Handle dependent fields
  if (field.addDataListDependentFields === 1) {
    dataListDetails.forEach(data => {
      if (data.id === field.parentDataListId) {
        field.childAttributeList = cloneDeep(data.childAttributeList);
      }
    });
  }

  try {
    const response = await settingsService.getDataListLookupValues(attributeId);
    if (response && response.statusCode === 200) {
      const responseData = response.responseData;
      field.lookupValues = responseData.lookupValues;
      field.parentLookupValues = responseData.parentLookupValues;
      field.parentRelationList = responseData.parentRelationList;
      field.selectedDependentFields = responseData.selectedDependentFields;
      field.selectedParentFiledValues = responseData.selectedParentFiledValues;
    }
  } catch (error) {
    console.error(`Error fetching data list lookup values for field ${field.attributeName}:`, error);
  }
}
