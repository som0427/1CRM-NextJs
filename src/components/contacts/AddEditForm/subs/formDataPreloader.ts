import settingsService from '@/lib/services/settingsService';
import contactService from '@/lib/services/contactService';
import userService from '@/lib/services/userService';
import customerService from '@/lib/services/customerService';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';

export interface PreloadedContactFormData {
  visibilityResponse: any;
  fieldApiResponse: any;
  dataListDetailsResponse: any;
  contactDetailResponse?: any;
  isProcessed: boolean;
}

/**
 * Preload all form data including lookup values for Contact AddForm
 */
export async function preloadContactFormData(
  projectId: any,
  source: number
): Promise<PreloadedContactFormData> {
  const [visibilityResponse, fieldApiResponse, dataListDetailsResponse] = await Promise.all([
    settingsService.getFieldVisibilitySettings(projectId, SystemAttributeEnum.CONTACT_MODULE, true),
    settingsService.getFieldDetails(projectId, SystemAttributeEnum.CONTACT_MODULE),
    settingsService.getFieldDetails(projectId, SystemAttributeEnum.DATA_LIST_MODULE),
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
    isProcessed: true,
  };
}

/**
 * Preload all form data including lookup values for Contact EditForm
 */
export async function preloadContactEditFormData(
  projectId: any,
  contactId: number,
  source: number
): Promise<PreloadedContactFormData> {
  const [visibilityResponse, fieldApiResponse, dataListDetailsResponse, contactDetailResponse] = await Promise.all([
    settingsService.getFieldVisibilitySettings(projectId, SystemAttributeEnum.CONTACT_MODULE, true),
    settingsService.getFieldDetails(projectId, SystemAttributeEnum.CONTACT_MODULE),
    settingsService.getFieldDetails(projectId, SystemAttributeEnum.DATA_LIST_MODULE),
    contactService.getParticularContact(contactId, projectId),
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
    contactDetailResponse,
    isProcessed: true,
  };
}

/**
 * Setup lookup values for all attributes that need them
 */
async function lookupSetupForAttributes(
  fieldData: any[],
  dataListDetails: any[],
  projectId: any,
  source: number
): Promise<void> {
  const promises: Promise<void>[] = [];

  for (const field of fieldData) {
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
async function setLookupFieldValue(attribId: number, field: any, projectId: any, source: number): Promise<void> {
  try {
    // Initialize lookupValues as empty array if not already set
    if (!Array.isArray(field.lookupValues)) {
      field.lookupValues = [];
    }

    if (field.systemAttribute?.id === SystemAttributeEnum.CONTACT_OWNER_FIELD_ID) {
      const row = await userService.getOwner(projectId, SystemAttributeEnum.CONTACT_MODULE);
      if (row?.statusCode === 200 && Array.isArray(row.responseData)) {
        row.responseData.forEach((item: any) => {
          item.lookupValue = item.fullName;
        });
        field.lookupValues = row.responseData;
      }
    } else if (field.systemAttribute?.id === SystemAttributeEnum.CONTACT_COMPANY_FIELD_ID) {
      // source: 1=self, 2=team, 3=all (use source directly as customerView)
      const row = await customerService.getCompanyIdName(projectId, SystemAttributeEnum.CONTACT_MODULE, source);
      if (row?.statusCode === 200 && Array.isArray(row.responseData)) {
        row.responseData.forEach((item: any) => {
          item.lookupValue = item.name;
        });
        field.lookupValues = row.responseData;
      }
    } else {
      const row = await settingsService.getAttribLookup(attribId);
      if (row?.statusCode === 200 && Array.isArray(row.responseData)) {
        field.lookupValues = row.responseData;
      }
    }
  } catch (error) {
    console.error('Error setting lookup values:', error);
    // Ensure lookupValues is always an array even on error
    if (!Array.isArray(field.lookupValues)) {
      field.lookupValues = [];
    }
  }
}

/**
 * Set custom date type attributes
 */
async function setCustomDateTypeAttributes(attributeId: number, field: any): Promise<void> {
  try {
    const response = await settingsService.getCustomDateAttribute(attributeId);
    if (response?.statusCode === 200) {
      field.customDateAttribute = response.responseData;
    }
  } catch (error) {
    console.error('Error setting custom date attributes:', error);
  }
}

/**
 * Set lookup values for data list fields
 */
async function setLookupForDataList(attributeId: number, field: any, dataListDetails: any[]): Promise<void> {
  // Handle dependent fields (same pattern as Opportunity preloader)
  if (field.addDataListDependentFields === 1) {
    dataListDetails.forEach((data: any) => {
      if (data.id === field.parentDataListId) {
        field.childAttributeList = JSON.parse(JSON.stringify(data.childAttributeList)); // deep clone
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
    console.error('Error setting data list lookup:', error);
  }
}
