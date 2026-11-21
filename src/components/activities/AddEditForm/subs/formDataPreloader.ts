import settingsService from '@/lib/services/settingsService';
import customerService from '@/lib/services/customerService';
import activitiesService from '@/lib/services/activitiesService';
import productService from '@/lib/services/productService';
import targetService from '@/lib/services/targetService';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import { cloneDeep } from 'lodash';
import opportunityService from '@/lib/services/opportunityService';

export interface PreloadedFormData {
  visibilityResponse: any;
  linkedDataListDetailsResponse: any;
  fieldApiResponse: any;
  dataListDetailsResponse: any;
  linkedFieldDetailResponse: any;
  activityDetailResponse?: any; // Activity detail data for edit form
  isProcessed: boolean; // Flag to indicate lookup data has been processed
  // Product form related data
  productFormFieldsMap?: Map<number, Map<number, any[]>>; // Map<attributeId, Map<parentFormId, fieldList>>
  productList?: any[]; // List of products for product form dropdown
  productFormSettingsMap?: Map<number, any>; // Map<parentFormId, settingDetails>
}

/**
 * Preload all form data including lookup values for AddForm
 */
export async function preloadFormData(
  projectId: any,
  activityTypeId: number,
  source: number
): Promise<PreloadedFormData> {
  // Call all initial APIs in parallel
  const [visibilityResponse, linkedDataListDetailsResponse, fieldApiResponse, dataListDetailsResponse, linkedFieldDetailResponse] = await Promise.all([
    settingsService.getFieldVisibilitySettings(projectId, activityTypeId, true),
    settingsService.getLinkedDataListDetails(projectId, activityTypeId),
    settingsService.getFieldDetails(projectId, activityTypeId),
    settingsService.getFieldDetails(projectId, SystemAttributeEnum.DATA_LIST_MODULE),
    settingsService.getLinkedFieldDetails(projectId, activityTypeId)
  ]);

  // Extract response data
  const fieldData = fieldApiResponse?.responseData || [];
  const dataListDetails = dataListDetailsResponse?.responseData || [];
  const linkedFieldDetails = linkedFieldDetailResponse?.responseData || [];

  // Process lookup attributes (this makes additional API calls)
  await lookupSetupForAttributes(fieldData, dataListDetails, linkedFieldDetails, projectId, activityTypeId, source);

  // Process product form fields - create map of attributeId to parentFormId and fetch product form fields
  const { productFormFieldsMap, productList, productFormSettingsMap } = await setupProductFormFields(fieldData, projectId, source);

  return {
    visibilityResponse,
    linkedDataListDetailsResponse,
    fieldApiResponse,
    dataListDetailsResponse,
    linkedFieldDetailResponse,
    isProcessed: true,
    productFormFieldsMap,
    productList,
    productFormSettingsMap
  };
}

/**
 * Setup product form fields - creates map of attributeId to parentFormId and fetches product form fields
 * Returns a map of maps: attributeId -> Map<parentFormId, fieldList>
 */
async function setupProductFormFields(
  fieldData: any[],
  projectId: any,
  source: number
): Promise<{
  productFormFieldsMap: Map<number, Map<number, any[]>>;
  productList: any[];
  productFormSettingsMap: Map<number, any>;
}> {
  // Map of attributeId -> parentFormId for fields that have parentFormId
  const parentFormIdMap = new Map<number, number>();
  
  // Map of attributeId -> Map<parentFormId, fieldList>
  const productFormFieldsMap = new Map<number, Map<number, any[]>>();
  
  // Map of parentFormId -> settingDetails
  const productFormSettingsMap = new Map<number, any>();
  
  // Product list for dropdown
  let productList: any[] = [];
  
  // Collect unique parentFormIds and their associated attributeIds
  const parentFormIds = new Set<number>();
  
  for (const field of fieldData) {
    if (field.parentFormId && field.parentFormId >= SystemAttributeEnum.PRODUCT_FORM_MODULE) {
      parentFormIdMap.set(field.id, field.parentFormId);
      parentFormIds.add(field.parentFormId);
    }
  }
  
  // If no product form fields found, return empty maps and list
  if (parentFormIds.size === 0) {
    return { productFormFieldsMap, productList, productFormSettingsMap };
  }
  
  // Fetch product list for product form dropdown
  try {
    const productResponse = await productService.getProducts(projectId);
    if (productResponse?.statusCode === 200 && productResponse.responseData) {
      productList = productResponse.responseData;
    }
  } catch (error) {
    console.error('Error fetching product list:', error);
  }
  
  // Fetch product form fields and settings for each unique parentFormId
  const fetchPromises: Promise<void>[] = [];
  
  Array.from(parentFormIds).forEach((parentFormId) => {
    fetchPromises.push(
      (async () => {
        try {
          // Call both getFieldDetails and getProductFormSetting APIs in parallel
          const [fieldsResponse, settingsResponse] = await Promise.all([
            settingsService.getFieldDetails(projectId, parentFormId),
            targetService.getProductFormSetting(parentFormId)
          ]);
          
          // Process field details
          if (fieldsResponse?.statusCode === 200 && fieldsResponse.responseData) {
            const productFormFields = fieldsResponse.responseData;
            
            // Setup lookup values for product form fields (similar to normal fields)
            await setupLookupForProductFormFields(productFormFields, projectId, source, productList);
            
            // Store the fields for each attributeId that has this parentFormId
            Array.from(parentFormIdMap.entries()).forEach(([attributeId, pfId]) => {
              if (pfId === parentFormId) {
                if (!productFormFieldsMap.has(attributeId)) {
                  productFormFieldsMap.set(attributeId, new Map());
                }
                productFormFieldsMap.get(attributeId)!.set(parentFormId, productFormFields);
              }
            });
          }
          
          // Store product form settings
          if (settingsResponse?.responseData) {
            productFormSettingsMap.set(parentFormId, settingsResponse.responseData);
          }
        } catch (error) {
          console.error(`Error fetching product form data for parentFormId ${parentFormId}:`, error);
        }
      })()
    );
  });
  
  await Promise.all(fetchPromises);
  
  return { productFormFieldsMap, productList, productFormSettingsMap };
}

/**
 * Setup lookup values for product form fields (similar to setLookupFieldValue)
 */
async function setupLookupForProductFormFields(
  productFormFields: any[],
  projectId: any,
  source: number,
  productList: any[]
) {
  const promises: Promise<void>[] = [];
  

  
  for (const field of productFormFields) {
    if (field.isActive !== 1) continue;
    
    const attributeTypeId = field.attributeType?.id;
    
    // Handle DATE and DATE_TIME fields - reuse setCustomDateTypeAttributes
    if (attributeTypeId === CustomAttributeTypeEnum.DATE ||
        attributeTypeId === CustomAttributeTypeEnum.DATE_TIME) {
      promises.push(setCustomDateTypeAttributes(field.id, field));
    }
    
    // Handle dropdown fields in product form
    if (attributeTypeId === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN ||
        attributeTypeId === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
      promises.push(
        (async () => {
          try {
            if (field.linkedAttributeId) {
              const row = await settingsService.getAttribLookup(field.linkedAttributeId);
              if (row['statusCode'] === 200) {
                field.lookupValues = row['responseData'];
              }
            } else {
              const row = await settingsService.getAttribLookup(field.id);
              if (row['statusCode'] === 200) {
                field.lookupValues = row['responseData'];
              }
            }
          } catch (error) {
            console.error(`Error fetching lookup for product form field ${field.id}:`, error);
          }
        })()
      );
    }
    
    // Handle Link from other entities (Product field - systemAttribute 48)
    if (attributeTypeId === CustomAttributeTypeEnum.LINK_FROM_OTHER_ENTITIES ||
        field.systemAttribute?.id === SystemAttributeEnum.PRODUCT_FORM_PRODUCT) {
      // Populate lookupValues with product list for PRODUCT_FORM_PRODUCT field
      if (productList && productList.length > 0) {
        // Create full lookup values array
        const allLookupValues = productList.map((product: any) => ({
          id: product.productId || product.id,
          lookupValue: product.productName || product.name,
          name: product.productName || product.name,
          price: product.price || product.listPrice || 0
        }));
        
        // Store first 30 in lookupValues for initial display
        field.lookupValues = allLookupValues.slice(0, 30);
        
        // Create lookupMap for efficient search (keyed by normalized label)
        const lookupMap = new Map<string, any[]>();
        allLookupValues.forEach((item: any) => {
          const key = (item.lookupValue || item.name || '').toString().toLowerCase().trim();
          if (!lookupMap.has(key)) {
            lookupMap.set(key, []);
          }
          lookupMap.get(key)!.push(item);
        });
        field.lookupMap = lookupMap;
        
        // Also store allLookupValues for reference
        field.allLookupValues = allLookupValues;
      }
    }
  }
  
  await Promise.all(promises);
}

/**
 * Preload all form data including activity detail for EditForm
 */
export async function preloadEditFormData(
  projectId: any,
  activityTypeId: number,
  activityId: number,
  source: number
): Promise<PreloadedFormData> {
  // Call all initial APIs in parallel including getParticularActivityDetail
  const [visibilityResponse, linkedDataListDetailsResponse, fieldApiResponse, dataListDetailsResponse, linkedFieldDetailResponse, activityDetailResponse] = await Promise.all([
    settingsService.getFieldVisibilitySettings(projectId, activityTypeId, true),
    settingsService.getLinkedDataListDetails(projectId, activityTypeId),
    settingsService.getFieldDetails(projectId, activityTypeId),
    settingsService.getFieldDetails(projectId, SystemAttributeEnum.DATA_LIST_MODULE),
    settingsService.getLinkedFieldDetails(projectId, activityTypeId),
    activitiesService.getParticularActivityDetail(projectId, activityId)
  ]);

  // Extract response data
  const fieldData = fieldApiResponse?.responseData || [];
  const dataListDetails = dataListDetailsResponse?.responseData || [];
  const linkedFieldDetails = linkedFieldDetailResponse?.responseData || [];

  // Process lookup attributes (this makes additional API calls)
  await lookupSetupForAttributes(fieldData, dataListDetails, linkedFieldDetails, projectId, activityTypeId, source);

  // Process product form fields - create map of attributeId to parentFormId and fetch product form fields
  const { productFormFieldsMap, productList, productFormSettingsMap } = await setupProductFormFields(fieldData, projectId, source);

  return {
    visibilityResponse,
    linkedDataListDetailsResponse,
    fieldApiResponse,
    dataListDetailsResponse,
    linkedFieldDetailResponse,
    activityDetailResponse,
    isProcessed: true,
    productFormFieldsMap,
    productList,
    productFormSettingsMap
  };
}

/**
 * Process and set up attributes for lookups
 */
async function lookupSetupForAttributes(
  responseData: any[],
  getDataListDetails: any[],
  linkedFieldDetails: any[],
  projectId: any,
  activityTypeId: number,
  source: number
) {
  const promises: Promise<void>[] = [];

  for (const attribute of responseData) {
    if (attribute.isActive === 1) {
      const attributeTypeId = attribute.attributeType.id;
      const attributeId = attribute.id;

      switch (attributeTypeId) {
        case CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN:
        case CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN:
          promises.push(setLookupFieldValue(attributeId, attribute, linkedFieldDetails, projectId, activityTypeId, source));
          break;
        case CustomAttributeTypeEnum.DATE:
        case CustomAttributeTypeEnum.DATE_TIME:
          promises.push(setCustomDateTypeAttributes(attributeId, attribute));
          break;
        case CustomAttributeTypeEnum.DATA_LIST:
          promises.push(setLookupForDataList(attributeId, attribute, getDataListDetails));
          break;
        default:
          break;
      }
    }
  }

  await Promise.all(promises);
}

/**
 * Set lookup field values for select/multiselect fields
 */
async function setLookupFieldValue(
  attribId: number,
  editCustomVal: any,
  linkedFieldDetails: any[],
  projectId: any,
  activityTypeId: number,
  source: number
) {
  try {
    if (editCustomVal.systemAttribute?.id == SystemAttributeEnum.ACTIVITY_COMPANY_FIELD_ID) {
      const row = await customerService.getCompanyIdName(projectId, activityTypeId, source);
      if (row['statusCode'] == 200) {
        row['responseData'].forEach((item: any) => {
          item.lookupValue = item.name;
        });
        editCustomVal.lookupValues = row['responseData'];
      }
    }
    else if (editCustomVal.systemAttribute?.id == SystemAttributeEnum.ACTIVITY_SELECT_ESTIMATE_FIELD_ID) {
      //do nothing as logic is not clear for estimate activity
    }
    else if (editCustomVal.systemAttribute?.id == SystemAttributeEnum.ACTIVITY_OPPORTUNITY_FIELD_ID) {
      const projectFlag = activityTypeId >= 100 && source === 3 ? true : false;

      const row = await opportunityService.getAllOpportunityDetails(0, projectId, false, projectFlag);
      if (row['statusCode'] == 200 || row['statusCode'] == 201) {
        row['responseData'].forEach((item: any) => {
          item.lookupValue = item.opportunityName;
          item.id = item.opportunityId;
        });
        editCustomVal.lookupValues = row['responseData'];
      }
    }
    else {
      if (editCustomVal.linkedAttributeId) {
        const row = await settingsService.getAttribLookup(editCustomVal.linkedAttributeId);
        if (row['statusCode'] == 200) {
          editCustomVal.lookupValues = row['responseData'];
        }
        const linkedFieldDetail = linkedFieldDetails.find((data) => data.id == editCustomVal.id);
        if (linkedFieldDetail && linkedFieldDetail.addDataListDependentFields == 1) {
          const childPromises: Promise<void>[] = [];
          linkedFieldDetails.forEach((field: any) => {
            if (editCustomVal.id == field.id) {
              field.childAttributeList.forEach((d: any) => {
                if (d.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN ||
                  d.attributeType.id == CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN
                ) {
                  childPromises.push(
                    settingsService.getAttribLookup(d.id).then((childRow) => {
                      if (childRow['statusCode'] == 200) {
                        d.lookupValues = childRow['responseData'];
                      }
                    })
                  );
                }
              });
            }
          });
          await Promise.all(childPromises);
        }
      } else {
        const row = await settingsService.getAttribLookup(attribId);
        if (row['statusCode'] == 200) {
          editCustomVal.lookupValues = row['responseData'];
        }
      }
    }
  } catch (error) {
    console.error('Error setting lookup values:', error);
  }
}

/**
 * Set custom date type attributes
 */
async function setCustomDateTypeAttributes(attributeId: number, attribute: any) {
  try {
    const response = await settingsService.getCustomDateAttribute(attributeId);
    if (response && response.statusCode === 200) {
      attribute.dateAttributes = response.responseData;
    }
  } catch (error) {
    console.error('Error fetching date attributes:', error);
  }
}

/**
 * Set lookup for data list
 */
async function setLookupForDataList(attributeId: number, attribute: any, dataListDetails: any[]) {
  if (attribute.addDataListDependentFields === 1) {
    dataListDetails.forEach(data => {
      if (data.id === attribute.parentDataListId) {
        attribute.childAttributeList = cloneDeep(data.childAttributeList);
      }
    });
  }

  try {
    const response = await settingsService.getDataListLookupValues(attributeId);
    if (response && response.statusCode === 200) {
      const responseData = response.responseData;
      attribute.lookupValues = responseData.lookupValues;
      attribute.parentLookupValues = responseData.parentLookupValues;
      attribute.parentRelationList = responseData.parentRelationList;
      attribute.selectedDependentFields = responseData.selectedDependentFields;
      attribute.selectedParentFiledValues = responseData.selectedParentFiledValues;
    }
  } catch (error) {
    console.error('Error fetching data list lookup values:', error);
  }
}
