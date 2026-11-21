import { FC, useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import styles from '@/styles/addEditForm.module.css';
import settingsService from '@/lib/services/settingsService';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import { cloneDeep } from 'lodash';
import { CustomAttributePreDefLookupEnum } from '@/lib/constants/CustomAttributePreDefLookupEnum';
import customerService from '@/lib/services/customerService';
import activityService from '@/lib/services/activitiesService';

// Material UI styled notifications
import { useSnackbar } from 'notistack';
import ReferenceDocuments from '@/components/common/input-fields/ReferenceDocuments';
// Import common input components
import TextInput from '@/components/common/input-fields/TextInput';
import TextArea from '@/components/common/input-fields/TextArea';
import Select from '@/components/common/input-fields/Select';
import MultiSelect from '@/components/common/input-fields/MultiSelect';
import opportunityService from '@/lib/services/opportunityService';
import UploadInput from '@/components/common/input-fields/UploadInput';
import DateInput from '@/components/common/input-fields/DateInput';
import DateTimeInput from '@/components/common/input-fields/DateTimeInput';
import TimeInput from '@/components/common/input-fields/TimeInput';
import DisplayText from '@/components/common/input-fields/DisplayText';
import Form from '@/components/common/Form';
import Spinner from '@/components/common/Spinner';
import FormField from '@/components/common/input-fields/FormField';
import ProductFormField from '@/components/activities/AddEditForm/subs/ProductFormField';
import productService from '@/lib/services/productService';
import targetService from '@/lib/services/targetService';

import { PreloadedFormData } from '@/components/activities/AddEditForm/subs/formDataPreloader';

interface AddFormProps {
  onCancel: () => void;
  onSuccess?: () => void; // Optional callback when submission is successful
  onSubmittingChange?: (isSubmitting: boolean) => void; // Callback when submission state changes
  onApiLoadingChange?: (isLoading: boolean) => void; // Callback when API loading state changes
  onApiError?: (error: string | null) => void; // Callback when API error occurs
  isLoading?: boolean;
  activityView?: "self" | "team" | "all"; // Activity view: self, team, or all
  moduleType?: number; // Module type for the form (e.g., 101 for ACTIVITY_MODULE)
  activityName?: string; // Name of the activity being added
  activityTypeId?: number; // The specific activity type ID
  preloadedData?: PreloadedFormData; // Preloaded API data to skip API calls
  hideInternalActions?: boolean;
  hideHeading?: boolean;
}

type SelectOption = {
  value: string;
  label: string;
};

const AddForm: FC<AddFormProps> = ({
  onCancel,
  onSuccess,
  onSubmittingChange,
  onApiLoadingChange,
  onApiError,
  isLoading: initialLoading = false,
  activityView = "self",
  moduleType,
  activityName,
  activityTypeId,
  preloadedData,
  hideInternalActions = false,
  hideHeading = false,
}) => {
  // Access notistack's enqueueSnackbar function for Material UI styled notifications
  const { enqueueSnackbar } = useSnackbar();
  const openDivs = useRef<any[]>([]);
  const projectId = JSON.parse(localStorage.getItem('selectedProject') || '{}');
  const fieldVisibilityConfig = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(initialLoading);

  // Convert activityView string to numeric source for API calls
  const source = activityView === "self" ? 1 : activityView === "team" ? 2 : 3;
  const [isSubmitting, setIsSubmitting] = useState(false); // Track form submission state
  const fieldVisibilityNotAttributeIds = [CustomAttributeTypeEnum.RADIO, CustomAttributeTypeEnum.CALCULATED_FIELD, CustomAttributeTypeEnum.OTP_VALIDATION, CustomAttributeTypeEnum.HEADER_TEXT, CustomAttributeTypeEnum.NORMAL_TEXT, CustomAttributeTypeEnum.PAGE_SEPARATOR, CustomAttributeTypeEnum.REFERENCE_DOCUMENTS];

  const [customAttributesList, setCustomAttributesList] = useState<any[]>([]);
  const [defaultValues, setDefaultValues] = useState<any>({}); // Dynamic form default values

  // State to track loading status of field data
  const [isFieldDataLoading, setIsFieldDataLoading] = useState<boolean>(true);
  const [search, setSearch] = useState('');
  const fieldVisibilitySettingsAppliedForFirstTime = useRef<boolean>(false);
  const [isFileUploading, setIsFileUploading] = useState(false);

  // System attribute arrays - persistent throughout component lifecycle
  const systemAttributeopportunityListArray = useRef<any[]>([]);
  const systemAttributecompanyListArray = useRef<any[]>([]);
  const systemAttributecontactsListArray = useRef<any[]>([]);
  const systemAttributeEstimateArray = useRef<any[]>([]);
  // Add this state to track disabled fields
  const [disabledFields, setDisabledFields] = useState<string[]>([]);
  const customAttributesListRef = useRef<any[]>([]);

  // State for API loading after modal opens (for dependent field API calls)
  const [isApiLoading, setIsApiLoading] = useState<boolean>(false);

  // File upload related state
  const [fileArray, setFileArray] = useState<{ [key: string]: any }>({});
  const [uploadQueue, setUploadQueue] = useState<{ [key: string]: number }>({});

  // Product form related state
  const [productFormFields, setProductFormFields] = useState<{ [key: string]: any }>({});
  const [productList, setProductList] = useState<any[]>([]);
  const productFormIdWithProductIdNameMap = useRef<Map<number, any[]>>(new Map());
  // Map<attributeId, Map<parentFormId, fieldList[]>> - from formDataPreloader
  const productFormFieldsMap = useRef<Map<number, Map<number, any[]>>>(new Map());
  // Map<parentFormId, settingDetails> - from formDataPreloader
  const productFormSettingsMap = useRef<Map<number, any>>(new Map());
  // Map<attributeId, {discountAmount, discountPercent}> - stores discount values from ProductFormField
  const productFormDiscountValues = useRef<Map<number, { discountAmount: number; discountPercent: number }>>(new Map());
  // Set of product form field IDs that should be rendered (populated when invokeChildMethod finds matching product form)
  const [visibleProductFormIds, setVisibleProductFormIds] = useState<Set<number>>(new Set());

  const documentIconUrlMap = new Map([
    ["pdf", "/svg/icons/general/PDF-File.svg"],
    ["docx", "/svg/icons/general/file-alt-solid.svg"],
    ["xlsx", "/svg/icons/general/file-excel-solid.svg"],
    ["pptx", "/svg/icons/general/file-powerpoint-solid.svg"]
  ]);
  // Initialize useForm with dynamic defaults
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    getValues,
    unregister,
    formState: { errors },
  } = useForm({
    defaultValues, // Will be updated once defaults are set
    mode: 'onChange', // Validate on every change for immediate feedback
  });

  useEffect(() => {
    // Load all field data on component mount
    if (preloadedData) {
      // Use preloaded data - skip API calls
      processPreloadedData();
    } else {
      // No preloaded data - call APIs
      loadAllFieldData();
    }
  }, []);

  // Process preloaded data without making API calls
  const processPreloadedData = async () => {
    setIsFieldDataLoading(true);
    try {
      // Process visibility settings from preloaded data
      if (preloadedData?.visibilityResponse?.responseData) {
        let allConfig: any[] = [];
        preloadedData.visibilityResponse.responseData.filter((x: any) => x['fieldVisibilityConfig'])
          .forEach((x: any) => {
            allConfig.push(...x['fieldVisibilityConfig']);
          });
        fieldVisibilityConfig.current = allConfig;
      } else {
        fieldVisibilityConfig.current = [];
      }

      // Process field details from preloaded data
      const linkedDataListDetails = preloadedData?.linkedDataListDetailsResponse?.responseData || [];
      let fieldData = preloadedData?.fieldApiResponse?.responseData || [];
      const linkedFieldDetails = preloadedData?.linkedFieldDetailResponse?.responseData || [];

      // Store product form fields map, product list, and settings from preloader
      if (preloadedData?.productFormFieldsMap) {
        productFormFieldsMap.current = preloadedData.productFormFieldsMap;
      }
      if (preloadedData?.productList) {
        setProductList(preloadedData.productList);
      }
      if (preloadedData?.productFormSettingsMap) {
        productFormSettingsMap.current = preloadedData.productFormSettingsMap;
      }

      // Skip lookupSetupForAttributes - data is already processed by preloadFormData utility
      // Just process the field API response
      fieldData = processGetFieldApiResponse(fieldData, linkedDataListDetails, linkedFieldDetails);

      let customAttributesList: any[] = [];
      (fieldData as Array<any>).forEach(field => {
        customAttributesList.push(field);
        if (field.attributeType.id == CustomAttributeTypeEnum.DATA_LIST && field.childAttributeList !== null && field.childAttributeList.length > 0) {
          customAttributesList.push(...field.childAttributeList);
        }
        if (field.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN &&
          field.linkedAttributeId !== null && field.childAttributeList?.length > 0) {
          customAttributesList.push(...field.childAttributeList);
        }
      });
      customAttributesList = customAttributesList.map(x => {
        x['isHidden'] = false;
        x['isEdit'] = true;
        return x;
      });

      customAttributesListRef.current = customAttributesList;
      setupfieldVisibilityConfigurationAndValue();
      setCustomAttributesList(customAttributesList);

    } catch (error) {
      console.error('Error processing preloaded data:', error);
      fieldVisibilityConfig.current = [];
    } finally {
      setIsFieldDataLoading(false);
    }
  };

  // Coordinator function to load all field data sequentially (only called when no preloaded data)
  const loadAllFieldData = async () => {
    setIsFieldDataLoading(true);
    try {
      // First fetch visibility settings
      await getFieldVisibilitySettingsData();

      // Then fetch field details
      await getFieldDetailsData();

    } catch (error) {
      fieldVisibilityConfig.current = [];
    } finally {
      setIsFieldDataLoading(false);
    }
  }

  // Function to fetch field visibility settings
  const getFieldVisibilitySettingsData = async () => {
    try {
      const visibilityResponse = await settingsService.getFieldVisibilitySettings(projectId, activityTypeId, true);

      if (visibilityResponse && visibilityResponse.responseData) {
        let allConfig = [];
        visibilityResponse.responseData.filter(x => x['fieldVisibilityConfig'])
          .forEach(x => {
            allConfig.push(...x['fieldVisibilityConfig']);
          })
        fieldVisibilityConfig.current = allConfig;
      } else {
        fieldVisibilityConfig.current = [];
      }

      return visibilityResponse;
    } catch (error) {
      fieldVisibilityConfig.current = [];
      throw error; // Re-throw to be caught by the coordinator
    }
  }

  // Function to fetch field details
  const getFieldDetailsData = async () => {
    try {
      // Make multiple API calls in parallel using Promise.all (equivalent to forkJoin in Angular)
      const [linkedDataListDetailsResponse, fieldApiResponse, dataListDetailsResponse, linkedFieldDetailResponse] = await Promise.all([
        settingsService.getLinkedDataListDetails(projectId, activityTypeId),
        settingsService.getFieldDetails(projectId, activityTypeId),
        settingsService.getFieldDetails(projectId, SystemAttributeEnum.DATA_LIST_MODULE),
        settingsService.getLinkedFieldDetails(projectId, activityTypeId)
      ]);

      // Extract responseData from each response
      const linkedDataListDetails = linkedDataListDetailsResponse?.responseData || [];
      let fieldData = fieldApiResponse?.responseData || [];
      const dataListDetails = dataListDetailsResponse?.responseData || [];
      const linkedFieldDetails = linkedFieldDetailResponse?.responseData || [];

      // Process the data - await completion of all lookup setup operations
      await lookupSetupForAttributes(fieldData, dataListDetails, linkedFieldDetails);
      // Store the field details in state - this only happens after all lookups are complete
      fieldData = processGetFieldApiResponse(fieldData, linkedDataListDetails, linkedFieldDetails);

      let customAttributesList = [];
      (fieldData as Array<any>).forEach(field => {
        customAttributesList.push(field);
        if (field.attributeType.id == CustomAttributeTypeEnum.DATA_LIST && field.childAttributeList !== null && field.childAttributeList.length > 0) {
          customAttributesList.push(...field.childAttributeList);
        }
        if (field.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN &&
          field.linkedAttributeId !== null && field.childAttributeList?.length > 0) {
          customAttributesList.push(...field.childAttributeList);
        }

      });
      customAttributesList = customAttributesList.map(x => {
        x['isHidden'] = false;
        x['isEdit'] = true;
        return x;
      });

      customAttributesListRef.current = customAttributesList;
      setupfieldVisibilityConfigurationAndValue();

      setCustomAttributesList(customAttributesList);

      return {
        linkedDataListDetails,
        fieldData,
        dataListDetails
      };
    } catch (error) {
      console.error('Error fetching field details and related data:', error);
      throw error; // Re-throw to be caught by the coordinator
    }
  }
  function setupfieldVisibilityConfigurationAndValue() {
    fieldVisibilityConfig.current.forEach(fieldsconfig => {
      customAttributesListRef.current.forEach(fields => {
        if (fieldsconfig.attributeId == fields.id) {
          if (fieldsconfig.fieldVisibility == 1) {
            if (!fieldVisibilityNotAttributeIds.includes(fields.attributeType.id)) {
              setupFieldVisibilityForHidden(fields, fieldsconfig);
            }
          } else if (fieldsconfig.fieldVisibility == 2 && !fieldVisibilityNotAttributeIds.includes(fields.attributeType.id)) {
            setupFieldVisibilityforViewOnly(fields, fieldsconfig);
          }
        }
      })
    })
    fieldVisibilitySettingsAppliedForFirstTime.current = true;
    setCustomAttributesList(customAttributesListRef.current);
  }
  // Function to handle field visibility for hidden fields
  function setupFieldVisibilityForHidden(fields: any, fieldsconfig: any) {
    if (fields.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN && fields.parentLinkedDataListAttribId) {
      if (fieldsconfig.parentDataListId == fields.parentLinkedDataListAttribId) {
        if (!fieldVisibilitySettingsAppliedForFirstTime) {
          setValue(fields.combinedAttributeName, Number(fieldsconfig.value));
        }
        fields['isHidden'] = true;
      }
    } else if (fields.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN && [SystemAttributeEnum.COMPANY_GEO_FIELD_ID].includes(fields.systemAttribute?.id)) {
      const countryStateCityVals = (fieldsconfig.value as string).split("->")
      if (!fieldVisibilitySettingsAppliedForFirstTime.current) {
        // Using setValue instead of Angular-style form controls
        setValue('countryName', countryStateCityVals[0]);
        setValue('stateName', countryStateCityVals[1]);
        setValue('cityName', countryStateCityVals[2]);
      }
      fields['isHidden'] = true;
    } else if (fields.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN && fields.parentLinkedDataListAttribId == null) {
      if (!fieldVisibilitySettingsAppliedForFirstTime.current) {
        setValue(fields.combinedAttributeName, Number(fieldsconfig.value));
      }
      fields['isHidden'] = true;
    } else if (fields.attributeType.id == CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
      if (!fieldVisibilitySettingsAppliedForFirstTime.current) {
        setValue(fields.combinedAttributeName, fieldsconfig.value.split(',').map(Number));
      }
      fields['isHidden'] = true;
    } else if (fields.attributeType.id == CustomAttributeTypeEnum.IMAGE || fields.attributeType.id == CustomAttributeTypeEnum.DOCUMENT_UPLOAD || fields.attributeType.id == CustomAttributeTypeEnum.AUDIO_VIDEO) {
      if (!fieldVisibilitySettingsAppliedForFirstTime.current) {
        setValue(fields.combinedAttributeName, fieldsconfig.value.split(',').map(String));
        let files = [];
        const fileAttr = this.fileArray[fields.combinedAttributeName];
        let fileValues = fieldsconfig.value.split(',').map(String);
        if (fileValues?.length > 0) {
          for (let i = 0; i < fileValues.length; i++) {
            files.push(fileValues[i]);
            fileAttr.files = files;
            fileAttr.uploaded = files.length;
            if (fields.attributeType.id == CustomAttributeTypeEnum.DOCUMENT_UPLOAD) {
              let fileType = fileValues[i].split('.').pop().toLowerCase();
              fileAttr.documentIcons.push(documentIconUrlMap.get(fileType));
            }
          }
        }
      }
      fields['isHidden'] = true
    }
    else if (fields.attributeType.id == CustomAttributeTypeEnum.DATA_LIST) {
      if (!fieldVisibilitySettingsAppliedForFirstTime.current) {
        setValue(fields.combinedAttributeName, +fieldsconfig.value);
        if (fields.parentId === 0 && fields.hasChildAttribute) {
          invokeChildMethod(+fieldsconfig.value, fields);
        }
      }
      fields['isHidden'] = true
    }
    else {
      if (!fieldVisibilitySettingsAppliedForFirstTime.current) {
        setValue(fields.combinedAttributeName, fieldsconfig.value);
      }
      fields['isHidden'] = true
    }
  }
  async function setupFieldVisibilityforViewOnly(fields: any, fieldsconfig: any) {
    if (fields.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN && fields.parentLinkedDataListAttribId) {
      if (fieldsconfig.parentDataListId == fields.parentLinkedDataListAttribId) {
        if (!fieldVisibilitySettingsAppliedForFirstTime.current) {
          setValue(fields.combinedAttributeName, +fieldsconfig.value);
        }
        setDisabledFields(prev => [...prev, fields.combinedAttributeName]);
        fields['isEdit'] = false;
      }
    } else if (fields.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN && fields.parentLinkedDataListAttribId == null) {
      if (fieldsconfig.value) {
        if (!fieldVisibilitySettingsAppliedForFirstTime.current) {
          setValue(fields.combinedAttributeName, +fieldsconfig.value);
          if (fields.hasChildAttribute) {
            await invokeChildMethod(fieldsconfig.value, fields);
          }
        }
      }
      setDisabledFields(prev => [...prev, fields.combinedAttributeName]);
      fields['isEdit'] = false;
    } else if (fields.attributeType.id == CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
      if (fieldsconfig.value) {
        if (!fieldVisibilitySettingsAppliedForFirstTime.current) {
          setValue(fields.combinedAttributeName, fieldsconfig.value.split(','));
        }
      }
      setDisabledFields(prev => [...prev, fields.combinedAttributeName]);
      fields['isEdit'] = false;
    } else if (fields.attributeType.id == CustomAttributeTypeEnum.IMAGE || fields.attributeType.id == CustomAttributeTypeEnum.DOCUMENT_UPLOAD || fields.attributeType.id == CustomAttributeTypeEnum.AUDIO_VIDEO) {
      let files = [];
      this.fileArray[fields.combinedAttributeName].showUploadIcon = false;
      this.fileArray[fields.combinedAttributeName].showDeleteOption = false;
      if (fieldsconfig.value) {
        if (!fieldVisibilitySettingsAppliedForFirstTime.current) {
          setValue(fields.combinedAttributeName, fieldsconfig.value.split(',').map(String));
          const fileAttr = this.fileArray[fields.combinedAttributeName];
          let fileValues = fieldsconfig.value.split(',').map(String);
          if (fileValues?.length > 0) {
            for (let i = 0; i < fileValues.length; i++) {
              files.push(fileValues[i]);
              fileAttr.files = files;
              fileAttr.uploaded = files.length;
              fileAttr.showUploadIcon = false;
              fileAttr.showDeleteOption = false;
              if (fields.attributeType.id == CustomAttributeTypeEnum.DOCUMENT_UPLOAD) {
                let fileType = fileValues[i].split('.').pop().toLowerCase();
                fileAttr.documentIcons.push(this.documentIconUrlMap.get(fileType));
              }
            }
          }
        }
      }
      setDisabledFields(prev => [...prev, fields.combinedAttributeName]);
      fields['isEdit'] = false;
    } else if (fields.attributeType.id == CustomAttributeTypeEnum.DATA_LIST) {
      if (fieldsconfig.value) {
        if (!fieldVisibilitySettingsAppliedForFirstTime.current) {
          setValue(fields.combinedAttributeName, +fieldsconfig.value);
          if (fields.parentId === 0 && fields.hasChildAttribute) {
            await invokeChildMethod(+fieldsconfig.value, fields);
          }
        }
      }
      setDisabledFields(prev => [...prev, fields.combinedAttributeName]);
      fields['isEdit'] = false;
    }
    else {
      if (fieldsconfig.value) {
        if (!fieldVisibilitySettingsAppliedForFirstTime.current) {
          setValue(fields.combinedAttributeName, fieldsconfig.value);
        }
      }
      setDisabledFields(prev => [...prev, fields.combinedAttributeName]);
      fields['isEdit'] = false;
    }
  }
  // Process and set up attributes for lookups
  async function lookupSetupForAttributes(responseData: any[], getDataListDetails: any[], linkedFieldDetails: any[]) {

    // Collection of all promises to await
    const promises: Promise<void>[] = [];

    for (const attribute of responseData) {
      if (attribute.isActive === 1) {
        const attributeTypeId = attribute.attributeType.id;
        const attributeId = attribute.id;

        switch (attributeTypeId) {
          case CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN:
          case CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN:
            promises.push(setLookupFieldValue(attributeId, attribute, linkedFieldDetails));
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

    // Wait for all promises to resolve
    await Promise.all(promises);
  };

  const setLookupFieldValue = async (attribId: number, editCustomVal: any, linkedFieldDetails: any) => {
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
        const row = await customerService.getCompanyIdName(projectId, activityTypeId, source);
        if (row['statusCode'] == 200) {
          row['responseData'].forEach((item: any) => {
            item.lookupValue = item.name;
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

            linkedFieldDetails.forEach(async (field: any) => {
              if (editCustomVal.id == field.id) {
                field.childAttributeList.forEach(async d => {
                  if (d.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN ||
                    d.attributeType.id == CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN
                  ) {

                    const childRow = await settingsService.getAttribLookup(d.id);
                    if (childRow['statusCode'] == 200) {
                      d.lookupValues = childRow['responseData'];
                    }
                  }

                })
              }
            })
          }

        } else {
          const row = await settingsService.getAttribLookup(attribId);
          if (row['statusCode'] == 200) {
            editCustomVal.lookupValues = row['responseData'];
          }
        }

      }
    }
    catch (error) {
      console.error('Error setting lookup values:', error);
    }

  };


  // Helper method to set custom date type attributes
  const setCustomDateTypeAttributes = async (attributeId: number, attribute: any) => {
    try {
      const response = await settingsService.getCustomDateAttribute(attributeId);
      if (response && response.statusCode === 200) {
        attribute.dateAttributes = response.responseData;
      }
    } catch (error) {
      console.error('Error fetching date attributes:', error);
    }
  };

  // Helper method to set lookup for data list
  const setLookupForDataList = async (attributeId: number, attribute: any, dataListDetails: any[]) => {
    // Handle dependent fields if present
    if (attribute.addDataListDependentFields === 1) {
      dataListDetails.forEach(data => {
        if (data.id === attribute.parentDataListId) {
          attribute.childAttributeList = cloneDeep(data.childAttributeList);
        }
      });
    }

    try {
      // Get data list lookup values from API
      const response = await settingsService.getDataListLookupValues(attributeId);

      if (response && response.statusCode === 200) {
        const responseData = response.responseData;
        // Update attribute with all necessary values
        attribute.lookupValues = responseData.lookupValues;
        attribute.parentLookupValues = responseData.parentLookupValues;
        attribute.parentRelationList = responseData.parentRelationList;
        attribute.selectedDependentFields = responseData.selectedDependentFields;
        attribute.selectedParentFiledValues = responseData.selectedParentFiledValues;

      }
    } catch (error) {
      console.error('Error fetching data list lookup values:', error);
    }
  };

  // Process the field API response
  // Store field validations globally to use in the form
  const [fieldValidations, setFieldValidations] = useState<Record<string, any>>({});

  // Helper method for numeric field validation rules
  const getNumericValidationRules = (field: any) => {
    const rules: any = {};

    const systemAttribLength = field.systemAttribute ? Object.keys(field.systemAttribute).length : 0;
    const isSystemAttrib = systemAttribLength > 0;
    const numericPattern = /^[0-9]+$/;
    const decimalPattern = /^\d+(\.\d+)?$/;
    const systemAttribNumericPattern = /^[0-9]+$/;
    const systemAttribDecimalPattern = /^\d+(\.\d+)?$/;

    const pattern = field.decimalFlag
      ? (isSystemAttrib ? systemAttribDecimalPattern : decimalPattern)
      : (isSystemAttrib ? systemAttribNumericPattern : numericPattern);

    rules.pattern = {
      value: pattern,
      message: field.patternErrorMsg || (field.decimalFlag ? 'Please enter a valid decimal number' : 'Please enter a valid number')
    };

    if (field.minNumber !== undefined && field.minNumber !== null) {
      rules.min = {
        value: field.minNumber,
        message: `Minimum value allowed is ${field.minNumber}`
      };
    }

    if (field.maxNumber !== undefined && field.maxNumber !== null) {
      rules.max = {
        value: field.maxNumber,
        message: `Maximum value allowed is ${field.maxNumber}`
      };
    }

    if (field.minDigits !== undefined && field.minDigits !== null) {
      rules.minLength = {
        value: field.minDigits,
        message: `Minimum ${field.minDigits} digits required`
      };
    }

    if (field.maxDigits !== undefined && field.maxDigits !== null) {
      rules.maxLength = {
        value: field.maxDigits,
        message: `Maximum ${field.maxDigits} digits allowed`
      };
    }

    // Custom regex validation (overrides default pattern)
    if (!field.decimalFlag && field.addValidation) {
      rules.pattern = {
        value: new RegExp(field.regexExpression),
        message: field.errorMessage
      };
    }

    return rules;
  };

  // Helper method for text field validation rules (TEXT_SINGLE_LINE and TEXT_MULTI_LINE)
  const getTextValidationRules = (field: any) => {
    const rules: any = {};

    // Min/Max character validations
    if (field.minCharacters) {
      rules.minLength = {
        value: field.minCharacters,
        message: `Minimum ${field.minCharacters} characters required`
      };
    }

    if (field.maxCharacters) {
      rules.maxLength = {
        value: field.maxCharacters,
        message: `Maximum ${field.maxCharacters} characters allowed`
      };
    }

    // Character type pattern validation (takes priority)
    if (field.characterType == 3) {
      rules.pattern = {
        value: /^[a-zA-Z ]*$/,
        message: "Only Alphabets are allowed"
      };
    } else if (field.characterType == 2) {
      rules.pattern = {
        value: /^[a-zA-Z0-9 ]*$/,
        message: "Only Alpha-Numeric characters are allowed"
      };
    } else if (field.pattern) {
      rules.pattern = {
        value: new RegExp(field.pattern),
        message: field.patternErrorMsg || 'Invalid format'
      };
    }

    if (field.addValidation && field.regexExpression) {
      rules.pattern = {
        value: new RegExp(field.regexExpression),
        message: field.errorMessage || 'Invalid format'
      };
    }

    return rules;
  };


  function processGetFieldApiResponse(fieldData: any[], linkedDataListDetails: any[] = [], linkedFieldDetails: any[] = []) {

    // Process fields and set up default values
    const linkedDlMap: Map<number, any> = (linkedDataListDetails ?? []).reduce((map, obj) => {
      map.set(obj.id, obj);
      return map;
    }, new Map<string, number>());

    const linkedFlMap: Map<number, any> = (linkedFieldDetails ?? []).reduce((map, obj) => {
      map.set(obj.id, obj);
      return map;
    }, new Map<String, number>());

    const validationSchema = {};

    fieldData = fieldData.filter(ele => {
      if (ele.isActive === 1) {
        return ele.systemAttribute?.id !== SystemAttributeEnum.COMPANY_GEO_FIELD_ID;
      }
      return false;
    });

    // Separate regular fields from product form fields
    const regularFields: any[] = [];
    
    fieldData.forEach((field) => {
      if (field.parentFormId && field.parentFormId >= SystemAttributeEnum.PRODUCT_FORM_MODULE) {
        // This field indicates a product form - skip it as product form fields are loaded from formDataPreloader
        // Product form will be added separately using preloaded data
      } else {
        // Only add non-product-form fields to regularFields
        regularFields.push(field);
      }
    });

    // Process regular fields (non-product form fields)
    regularFields.forEach((field) => {
      // Set default based on field type
      let value: any = "";
      // Create validation rules object for this field
      const validationRules: any = {};

      // Common validations for all field types
      if (field.mandatoryFlag) {
        validationRules.required = field.mandatoryFlag ? (field.requiredErrorMsg || "This field is required") : false;
      }

      switch (field.attributeType.id) {
        case CustomAttributeTypeEnum.TEXT_SINGLE_LINE:
        case CustomAttributeTypeEnum.TEXT_MULTI_LINE:
          // Text validations
          Object.assign(validationRules, getTextValidationRules(field));
          break;

        case CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN:
          // Add validation for min/max selections if needed
          if (field.minSelection) validationRules.validate = {
            ...validationRules.validate,
            minSelection: (value) => !value || value.length >= field.minSelection ||
              `Select at least ${field.minSelection} options`
          };
          if (field.maxSelection) validationRules.validate = {
            ...validationRules.validate,
            maxSelection: (value) => !value || value.length <= field.maxSelection ||
              `Select at most ${field.maxSelection} options`
          };
          break;

        case CustomAttributeTypeEnum.NUMERIC:
          // Numeric validations
          Object.assign(validationRules, getNumericValidationRules(field));
          break;
        case CustomAttributeTypeEnum.DATE:
        case CustomAttributeTypeEnum.DATE_TIME:
          const dateResult = processDateField(field);
          value = dateResult.value;
          Object.assign(validationRules, dateResult.validationRules);
          break;
        case CustomAttributeTypeEnum.IMAGE:
        case CustomAttributeTypeEnum.DOCUMENT_UPLOAD:
        case CustomAttributeTypeEnum.AUDIO_VIDEO:
          value = [];
          break;

        case CustomAttributeTypeEnum.DATA_LIST:
          if (linkedDlMap.has(+field.id)) {
            const linkedDataList = linkedDlMap.get(field.id);
            field.addDataListDependentFields = linkedDataList.addDataListDependentFields;
            field.childAttributeList = linkedDataList.childAttributeList;
            field.hasChildAttribute = linkedDataList.hasChildAttribute;
            field.lookupValues = linkedDataList.lookupValues;
            field.parentDataListId = linkedDataList.parentDataListId;
            field.hasChildAttribute = linkedDataList.hasChildAttribute;
          }

          if (field.mandatoryFlag == 1 && field.parentId === 0) {
            validationRules.required = field.mandatoryFlag ? (field.requiredErrorMsg || "This field is required") : false;
          } else {
            validationRules.required = false;
          }

          if (field.childAttributeList?.length > 0) {
            const validationRulesForChildDataList: any = {};
            field.childAttributeList.forEach(childElement => {
              const attributeName = childElement.attributeName.replace(/[^a-zA-Z0-9]/g, ' ').split(' ').join('')
              childElement.parentId = field.parentDataListId;
              childElement.combinedAttributeName = field.combinedAttributeName + attributeName;
              childElement.parentCombinedAttributeName = field.combinedAttributeName;
              childElement.mandatoryFlag = field.mandatoryFlag;
              childElement.parentLinkedDataListAttribId = field.id;
              if (childElement.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN) {
                if (childElement.systemAttribute === null) {
                  childElement.systemAttribute = {};
                }
                if (childElement.mandatoryFlag == 1 && childElement.parentId === 0) {
                  validationRulesForChildDataList.required = childElement.mandatoryFlag ? (field.requiredErrorMsg || "This field is required") : false;
                } else {
                  validationRulesForChildDataList.required = false;
                }
              }
              validationSchema[childElement.combinedAttributeName] = validationRulesForChildDataList;
            }
            )
          }
          break;

        case CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN:
          if (linkedFlMap.has(+field.id)) {
            const linkedFieldList = linkedFlMap.get(field.id);
            field.addDataListDependentFields = linkedFieldList.addDataListDependentFields;
            field.childAttributeList = linkedFieldList.childAttributeList;
            field.hasChildAttribute = linkedFieldList.hasChildAttribute;
            // field.lookupValues = linkedFieldList.lookupValues;
            field.parentDataListId = linkedFieldList.parentDataListId;
            field.hasChildAttribute = linkedFieldList.hasChildAttribute;
          }

          if (field.addDataListDependentFields == 1 && field.childAttributeList?.length > 0) {
            const validationRulesForChildDataList: any = {};
            field.childAttributeList.forEach(childElement => {
              const attributeName = childElement.attributeName.replace(/[^a-zA-Z0-9]/g, ' ').split(' ').join('')
              //childElement.parentId = field.parentDataListId;
              childElement.combinedAttributeName = field.combinedAttributeName + attributeName;
              childElement.parentCombinedAttributeName = field.combinedAttributeName;
              childElement.mandatoryFlag = field.mandatoryFlag;
              childElement.parentLinkedFieldAttribId = field.id;
              if (childElement.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN) {
                if (childElement.systemAttribute === null) {
                  childElement.systemAttribute = {};
                }
                if (childElement.mandatoryFlag == 1 && childElement.parentId === 0) {
                  validationRulesForChildDataList.required = childElement.mandatoryFlag ? (field.requiredErrorMsg || "This field is required") : false;
                } else {
                  validationRulesForChildDataList.required = false;
                }
              }
              validationSchema[childElement.combinedAttributeName] = validationRulesForChildDataList;
            }
            )
          }
          break;

        case CustomAttributeTypeEnum.REFERENCE_DOCUMENTS:
          let fileArrayTemp = []
          fileArrayTemp[field.combinedAttributeName] = {
            "attributeName": field.combinedAttributeName,
            "files": [],
            "documentIcons": [],
            "maxUpload": field.maxImagesAllowed,
            "showUploadIcon": false,
            "uploaded": 0,
            "hasError": false
          };
          const fileAttr = fileArrayTemp[field.combinedAttributeName];

          (field.referenceDocumentUrl as Array<string>).forEach(file => {
            fileAttr.files.push(file);
            let fileType = file.split('.').pop().toLowerCase();
            const icon = documentIconUrlMap.get(fileType);
            fileAttr.documentIcons.push(icon ? icon : file);
          });

          setFileArray(prev => ({
            ...prev,
            ...fileArrayTemp
          }));
          break;

        default:
          value = field.defaultValue ?? "";
      }
      defaultValues[field.combinedAttributeName] = value;
      // Store validation rules in the schema - only for non-child fields
      if(field.parentId==0){
        validationSchema[field.combinedAttributeName] = validationRules;
      }


      if (field.linkedAttributeId != null) {

        if (field.linkedAttributeModuleId == SystemAttributeEnum.OPPORTUNITY_MODULE) {
          systemAttributeopportunityListArray.current.push(field);
        }
        if (field.linkedAttributeModuleId == SystemAttributeEnum.COMPANY_MODULE) {
          systemAttributecompanyListArray.current.push(field);
        }
        if (field.linkedAttributeModuleId == SystemAttributeEnum.CONTACT_MODULE) {
          systemAttributecontactsListArray.current.push(field);
        }

      }

      //CONDITION FOR ESTIMATE LIST
      if (field.systemAttribute?.id == SystemAttributeEnum.ACTIVITY_SELECT_ESTIMATE_FIELD_ID) {
        systemAttributeEstimateArray.current.push(field);
      }
    });

    // Store validation rules for use in renderField
    setFieldValidations(validationSchema);
    return fieldData;

  }

  function processDateField(field: any) {
    const validationRules: any = {};
    const now = new Date();
    let minDate: string | null = null;
    let maxDate: string | null = null;

    if (field.dateAttributes) {
      const attr = field.dateAttributes;
      const stdLookup = attr.stdLookupAttribute?.id;

      if (stdLookup != null) {
        // Predefined lookups
        if ([CustomAttributePreDefLookupEnum.TODAY, CustomAttributePreDefLookupEnum.TODAY_DT].includes(stdLookup)) {
          minDate = formatDate(now);
          maxDate = formatDate(now);
        } else if ([CustomAttributePreDefLookupEnum.YESTERDAY, CustomAttributePreDefLookupEnum.YESTERDAY_DT].includes(stdLookup)) {
          const yest = new Date(now);
          yest.setDate(yest.getDate() - 1);
          minDate = formatDate(yest);
          maxDate = formatDate(yest);
        } else if ([CustomAttributePreDefLookupEnum.CURRENT_WEEK, CustomAttributePreDefLookupEnum.CURRENT_WEEK_DT].includes(stdLookup)) {
          const firstDay = new Date(now);
          firstDay.setDate(now.getDate() - now.getDay());
          const lastDay = new Date(now);
          lastDay.setDate(now.getDate() - now.getDay() + 6);
          minDate = formatDate(firstDay);
          maxDate = formatDate(lastDay);
        } else if ([CustomAttributePreDefLookupEnum.CURRENT_MONTH_TILL_DATE, CustomAttributePreDefLookupEnum.CURRENT_MONTH_TILL_DATE_DT].includes(stdLookup)) {
          minDate = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
          maxDate = formatDate(now);
        } else if ([CustomAttributePreDefLookupEnum.CURRENT_MONTH, CustomAttributePreDefLookupEnum.CURRENT_MONTH_DT].includes(stdLookup)) {
          minDate = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
          maxDate = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        } else if ([CustomAttributePreDefLookupEnum.CURRENT_YEAR_TILL_DATE, CustomAttributePreDefLookupEnum.CURRENT_YEAR_TILL_DATE_DT].includes(stdLookup)) {
          minDate = formatDate(new Date(now.getFullYear(), 0, 1));
          maxDate = formatDate(now);
        } else if ([CustomAttributePreDefLookupEnum.CURRENT_YEAR, CustomAttributePreDefLookupEnum.CURRENT_YEAR_DT].includes(stdLookup)) {
          minDate = formatDate(new Date(now.getFullYear(), 0, 1));
          maxDate = formatDate(new Date(now.getFullYear(), 11, 31));
        }
      } else {
        // Custom allowed range
        if (attr.previousDateAllowed == null && attr.futureDateAllowed == null) {
          minDate = null;
          maxDate = null;
        } else {
          if (attr.previousDateAllowed != null) {
            const min = new Date(now);
            min.setDate(now.getDate() - attr.previousDateAllowed);
            minDate = formatDate(min);
          }
          if (attr.futureDateAllowed != null) {
            const max = new Date(now);
            max.setDate(now.getDate() + attr.futureDateAllowed);
            maxDate = formatDate(max);
          }
        }
      }

      // For DATE_TIME fields, append "T00:00:00"
      if (field.attributeType.id === CustomAttributeTypeEnum.DATE_TIME) {
        if (minDate) minDate = `${minDate}T00:00:00`;
        if (maxDate) maxDate = `${maxDate}T00:00:00`;
      }

      field.dateAttributes.minDate = minDate;
      field.dateAttributes.maxDate = maxDate;
    }

    // Validation for min/max
    if (field.dateAttributes?.minDate) {
      validationRules.validate = {
        ...validationRules.validate,
        minDate: (value) =>
          !value ||
          value >= field.dateAttributes.minDate ||
          `Date must be after ${field.dateAttributes.minDate}`,
      };
    }
    if (field.dateAttributes?.maxDate) {
      validationRules.validate = {
        ...validationRules.validate,
        maxDate: (value) =>
          !value ||
          value <= field.dateAttributes.maxDate ||
          `Date must be before ${field.dateAttributes.maxDate}`,
      };
    }

    return {
      value: field.defaultValue ?? "",
      validationRules,
      minDate: field.dateAttributes?.minDate,
      maxDate: field.dateAttributes?.maxDate,
    };
  }

  // Date format utility
  // Date format utility
  function formatDate(date: Date | string | null) {
    if (!date) return '';

    // Convert string to Date if needed
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Validate it's a valid date
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return '';
    }

    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  function createDivId(customAttr: any, isLinkedField: boolean = false, fieldList: any[] = []): string {
    if (isLinkedField) {
      const linkedField = fieldList.find(x => x.linkedAttributeId === customAttr.id);
      if (linkedField) {
        return 'div_' + linkedField.combinedAttributeName + '_' + linkedField.id;
      }
    }
    return 'div_' + customAttr.combinedAttributeName + '_' + customAttr.id;
  }

  // Add validators function similar to Angular implementation
  function addValidators(combinedAttributeName: string, mandatoryFlag: boolean, attributeTypeId: number, decimalFlag: boolean, systemAttrib: any, field?: any) {
    // Skip validation for certain types
    if ([CustomAttributeTypeEnum.HEADER_TEXT, CustomAttributeTypeEnum.NORMAL_TEXT, CustomAttributeTypeEnum.REFERENCE_DOCUMENTS].includes(attributeTypeId)) {
      return;
    }

    // Initialize validation rules object
    const validationRules: any = {};

    // Required validation
    if (mandatoryFlag) {
      validationRules.required = { value: true, message: 'This field is required' };
    }

    // Text field validations (TEXT_SINGLE_LINE and TEXT_MULTI_LINE)
    if (attributeTypeId === CustomAttributeTypeEnum.TEXT_SINGLE_LINE || attributeTypeId === CustomAttributeTypeEnum.TEXT_MULTI_LINE) {
      const textRules = getTextValidationRules(field || {});
      Object.assign(validationRules, textRules);
    }
    // Numeric validation with patterns
    else if (attributeTypeId === CustomAttributeTypeEnum.NUMERIC) {
      const numericRules = getNumericValidationRules(field);
      Object.assign(validationRules, numericRules);
    }
    // Email validation
    else if (attributeTypeId === CustomAttributeTypeEnum.EMAIL) {
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      validationRules.pattern = {
        value: emailPattern,
        message: 'Please enter a valid email address'
      };
    }
    // Date and DateTime validation
    else if (attributeTypeId === CustomAttributeTypeEnum.DATE || attributeTypeId === CustomAttributeTypeEnum.DATE_TIME) {
      if (field) {
        const dateResult = processDateField(field);
        Object.assign(validationRules, dateResult.validationRules);
      }
    }

    // Set validation rules in the field validations object
    setFieldValidations(prev => ({
      ...prev,
      [combinedAttributeName]: validationRules
    }));

    // If the field already exists in the form, update its validation
    if (getValues(combinedAttributeName) !== undefined) {
      const existingValue = getValues(combinedAttributeName);
      unregister(combinedAttributeName);
      register(combinedAttributeName, validationRules);
      setValue(combinedAttributeName, existingValue);
    }

  }

  function findChildAttribByIdAndCombinedName(id: number, combinedAttributeName: string, isLinkedField: boolean, attributeTypeId: number): any {

    if (isLinkedField && attributeTypeId !== 18) {
      if (isLinkedField && attributeTypeId == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN) {
        return customAttributesListRef.current.find(item => item.id == id && item.combinedAttributeName == combinedAttributeName);
      }
      return customAttributesListRef.current.find(item => item.linkedAttributeId == id);
    }
    return customAttributesListRef.current.find(item => item.id == id && item.combinedAttributeName == combinedAttributeName);
  }

  // Helper function to remove all validations for a hidden field
  function removeValidationForHiddenField(fieldName: string) {
    setFieldValidations(prev => {
      const updated = { ...prev };
      if (updated[fieldName]) {
        // Remove all validations for hidden fields
        delete updated[fieldName];
      }
      return updated;
    });
  }

  const normalizeLookupLabel = (label: string) => label ? label.toString().toLowerCase().trim() : '';
  const SELECT_VISIBLE_LIMIT = 30;

  function buildSelectOptions(
    lookupValues: any[] = [],
    selectedValue: any = null
  ): { limitedOptions: SelectOption[]; lookupMap: Map<string, SelectOption[]>; allOptions: SelectOption[] } {
    const allOptions = (lookupValues || []).map((opt: any) => ({
      value: String(opt.id),
      label: opt.lookupValue
    }));

    const lookupMap = new Map<string, SelectOption[]>();
    allOptions.forEach(opt => {
      const key = normalizeLookupLabel(opt.label);
      if (!lookupMap.has(key)) {
        lookupMap.set(key, []);
      }
      lookupMap.get(key)!.push(opt);
    });

    const selectedKey = selectedValue !== undefined && selectedValue !== null && selectedValue !== ''
      ? String(selectedValue)
      : null;

    let limitedOptions = allOptions.slice(0, SELECT_VISIBLE_LIMIT);

    if (selectedKey) {
      const selectedOption = allOptions.find(opt => opt.value === selectedKey);
      if (selectedOption && !limitedOptions.some(opt => opt.value === selectedKey)) {
        limitedOptions = [selectedOption, ...limitedOptions].slice(0, SELECT_VISIBLE_LIMIT);
      }
    }

    return { limitedOptions, lookupMap, allOptions };
  }


  const renderGridRow = (
    field: any,
    content: any,
    options?: { error?: any; instruction?: any; rowClassName?: string }
  ) => (<FormField label={field.attributeName} required={field.mandatoryFlag == 1 ? true : false}>
    {content}
  </FormField>
  );

  async function resetChildAttribsAndinvokeChildMethod(childAttrib: any, clearValue: boolean = false): Promise<void> {
    // Reset the form control for the specific child attribute
    const fieldExists = childAttrib.combinedAttributeName in getValues();

    if (fieldExists) {
      // Reset this specific field
      if (clearValue) {
        setValue(childAttrib.combinedAttributeName, null);
      }

      // Remove validation for this field when it's being reset/hidden
      removeValidationForHiddenField(childAttrib.combinedAttributeName);

      // Handle file upload fields
      if ([
        CustomAttributeTypeEnum.IMAGE,
        CustomAttributeTypeEnum.DOCUMENT_UPLOAD,
        CustomAttributeTypeEnum.AUDIO_VIDEO
      ].includes(childAttrib.attributeType.id)) {
        setValue(childAttrib.combinedAttributeName, null);
      }

      // For dropdowns, invoke child method to clear dependent fields
      if (childAttrib.attributeType.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN) {
        invokeChildMethod(0, childAttrib);
      }
    }
  }


  async function getAllCompanyDependentInputs(id: number) {
    //api to prefill opportunity inputs
    setIsApiLoading(true);
    onApiLoadingChange?.(true);
    onApiError?.(null); // Clear any previous error
    customerService.getParticularCustomer(id, projectId).then(res => {
      const responseData = res['responseData'][0];
      systemAttributecompanyListArray.current.forEach(res => {
        if (res.systemAttribute && res.systemAttribute.id == 25) return;

        if (![CustomAttributeTypeEnum.IMAGE, CustomAttributeTypeEnum.DOCUMENT_UPLOAD, CustomAttributeTypeEnum.AUDIO_VIDEO].includes(res.attributeType.id)) {

          const fieldExists = res.combinedAttributeName in getValues();

          if (fieldExists) {
            setValue(res.combinedAttributeName, null, { shouldValidate: true, shouldTouch: true });
            if (res.attributeType.id === CustomAttributeTypeEnum.DATA_LIST) {
              if (res.childAttributeList && res.childAttributeList.length > 0) {
                res.childAttributeList.forEach(child => {

                  if (getValues(child.combinedAttributeName) !== undefined) {
                    setValue(child.combinedAttributeName, null, { shouldValidate: true, shouldTouch: true });
                    unregister(child.combinedAttributeName);
                  }

                });
              }

              if (responseData.customAttributeValues?.find(x => ((x.attributeId == res.linkedAttributeId) === undefined)
                || (x.attributeId == res.linkedAttributeId) && x.value?.length == 0)) {
                invokeChildMethod(0, res, false);
              }


            } else if (res.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN) {
              if (res.addDataListDependentFields == 1) {
                if (res.childAttributeList && res.childAttributeList.length > 0) {
                  res.childAttributeList.forEach(child => {

                    if (getValues(child.combinedAttributeName) !== undefined) {
                      setValue(child.combinedAttributeName, null, { shouldValidate: true, shouldTouch: true });
                      unregister(child.combinedAttributeName);

                    }

                  });
                }
              }
              if (responseData.customAttributeValues?.find(x => ((x.attributeId == res.linkedAttributeId) === undefined)
                || (x.attributeId == res.linkedAttributeId) && x.value?.length == 0)) {
                invokeChildMethod(0, res, false);
              }

            }


          }
        }
      });

      if (responseData) {
        responseData.customAttributeValues.forEach(res1 => {
          let checkedAttribs: number[] = [];

          systemAttributecompanyListArray.current.forEach(res => {
            if (res.systemAttribute && res.systemAttribute.id == SystemAttributeEnum.ACTIVITY_COMPANY_FIELD_ID) return;
            if (checkedAttribs.includes(res.id)) return;
            checkedAttribs.push(res.id);

            if (res1.value.length > 0) {
              if (res1.attributeId == res.linkedAttributeId && (res1.attributeTypeId == 1)) {


                if (res.attributeType.id == CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
                  let arraynew: string[] = [];
                  res1.value.forEach(d => {
                    arraynew.push(String(d.id));
                  })
                  setValue(res.combinedAttributeName, arraynew, { shouldValidate: true, shouldTouch: true });

                } else if (res.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN) {
                  let value = res1.value[0]?.id;
                  setValue(res.combinedAttributeName, value ? +value : null, { shouldValidate: true, shouldTouch: true });
                  invokeChildMethod(value, res);

                  if (res.addDataListDependentFields == 1 && res.childAttributeList && res.childAttributeList.length > 0) {
                    res.childAttributeList.forEach((child) => {
                      responseData.customAttributeValues.forEach(resp => {
                        if (child.parentLinkedFieldAttribId == res.id && child.id == resp.attributeId) {

                          let childValue = null;
                          if (child.attributeType.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN) {
                            const raw = resp.value?.[0]?.id ?? null;
                            childValue = raw != null ? Number(raw) : null;
                          } else if (child.attributeType.id === CustomAttributeTypeEnum.NUMERIC) {
                            const raw = resp.value?.[0]?.name;
                            childValue = raw != null ? Number(raw) : null;
                          } else if (child.attributeType.id === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
                            let arraynew = [];
                            resp.value.forEach(d => {
                              arraynew.push(String(d.id));
                            });
                            childValue = arraynew;
                          } else {
                            childValue = resp.value?.[0]?.name ?? null;
                          }
                          setValue(child.combinedAttributeName, childValue ? childValue : null, { shouldValidate: true, shouldTouch: true });
                        }
                      })
                    });
                  }

                } else {
                  setValue(res.combinedAttributeName, res1.value[0].id, { shouldValidate: true, shouldTouch: true });

                }



              }
              if (res1.attributeId == res.linkedAttributeId && (res1.attributeTypeId !== CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN)) {

                if (res1.attributeTypeId === CustomAttributeTypeEnum.DATA_LIST) {
                  let value = res1.value[0]?.id;
                  setValue(res.combinedAttributeName, value ? +value : null, { shouldValidate: true, shouldTouch: true });
                  invokeChildMethod(value, res);
                  if (res.childAttributeList && res.childAttributeList.length > 0) {
                    res.childAttributeList.forEach((child, idx) => {
                      responseData.customAttributeValues.forEach(resp => {
                        if (child.parentLinkedDataListAttribId == res.id && child.id == resp.attributeId && res.linkedAttributeId == resp.parentLinkedDatalistAttribId) {
                          let childValue = resp.value[0]?.id;
                          setValue(child.combinedAttributeName, childValue ? +childValue : null, { shouldValidate: true, shouldTouch: true });
                        }
                      })
                    });
                  }
                }
                else if (res.attributeType.id == CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
                  var arraynew = [];
                  res1.value.forEach(d => {
                    arraynew.push(String(d.id));
                  })
                  setValue(res.combinedAttributeName, arraynew, { shouldValidate: true, shouldTouch: true });
                }
                else if ([CustomAttributeTypeEnum.IMAGE, CustomAttributeTypeEnum.DOCUMENT_UPLOAD, CustomAttributeTypeEnum.AUDIO_VIDEO].includes(res.attributeType.id)) {
                  // this.assignFilesToLinkedFieldFormControl(res, res1.value);

                } else {
                  let value = res1.value[0].name;
                  if (res1.systemAttribute && res1.systemAttribute.id == 2) {
                    value = id;
                  }
                  setValue(res.combinedAttributeName, value, { shouldValidate: true, shouldTouch: true });
                }
              }
            }
          })
        })
      }
    }).catch(error => {
      console.error('Error fetching company dependent inputs:', error);
      onApiError?.('Some error occurred');
    }).finally(() => {
      setIsApiLoading(false);
      onApiLoadingChange?.(false);
    });
  }
  async function getAllOpportunities(companyId: number) {
    const projectFlag = activityTypeId >= 100 && source === 3 ? true : false;
    const index = customAttributesListRef.current.findIndex(
      item => item.systemAttribute?.id === SystemAttributeEnum.ACTIVITY_OPPORTUNITY_FIELD_ID
    );

    if (index > -1) {
      setIsApiLoading(true);
      onApiLoadingChange?.(true);
      onApiError?.(null); // Clear any previous error
      customAttributesListRef.current.find(item => item.systemAttribute?.id == SystemAttributeEnum.ACTIVITY_OPPORTUNITY_FIELD_ID)
      opportunityService.getAllOpportunityDetails(companyId, projectId, false, projectFlag).then((data) => {
        data['responseData'].forEach((res: any) => {
          res.lookupValue = res.opportunityName;
          res.id = res.opportunityId;
        });
        customAttributesListRef.current[index].lookupValues = data['responseData'];
        customAttributesListRef.current[index].hasChildAttribute = true;
        setCustomAttributesList([...customAttributesListRef.current]);
        getAllOpportunitiesDependentInputs(0);

      }).catch(error => {
        console.error('Error fetching opportunities:', error);
        onApiError?.('Some error occurred');
      }).finally(() => {
        setIsApiLoading(false);
        onApiLoadingChange?.(false);
      });

    }
  }

  async function getAllOpportunitiesDependentInputs(id) {
    if (id == 0) {
      systemAttributeopportunityListArray.current.forEach(res => {

        if (res.systemAttribute && res.systemAttribute.id == SystemAttributeEnum.ACTIVITY_OPPORTUNITY_FIELD_ID) {
          setValue(res.combinedAttributeName, null);
          return;
        }

        if (![CustomAttributeTypeEnum.IMAGE, CustomAttributeTypeEnum.DOCUMENT_UPLOAD, CustomAttributeTypeEnum.AUDIO_VIDEO].includes(res.attributeType.id)) {
          const fieldExists = res.combinedAttributeName in getValues();

          if (fieldExists) {
            setValue(res.combinedAttributeName, null, { shouldValidate: true, shouldTouch: true });
            if (res.attributeType.id === CustomAttributeTypeEnum.DATA_LIST) {
              if (res.childAttributeList && res.childAttributeList.length > 0) {
                res.childAttributeList.forEach(child => {

                  if (getValues(child.combinedAttributeName) !== undefined) {
                    setValue(child.combinedAttributeName, null, { shouldValidate: true, shouldTouch: true });
                    unregister(child.combinedAttributeName);
                  }

                });
              }
              invokeChildMethod(0, res);

            } else if (res.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN) {
              if (res.addDataListDependentFields == 1) {
                if (res.childAttributeList && res.childAttributeList.length > 0) {
                  res.childAttributeList.forEach(child => {

                    if (getValues(child.combinedAttributeName) !== undefined) {
                      setValue(child.combinedAttributeName, null, { shouldValidate: true, shouldTouch: true });
                      unregister(child.combinedAttributeName);

                    }

                  });
                }
              }
              invokeChildMethod(0, res, false);

            }


          }
        }

      });
      return;
    }
    //api to prefill opportunity inputs
    setIsApiLoading(true);
    onApiLoadingChange?.(true);
    onApiError?.(null); // Clear any previous error
    opportunityService.getParticularOpportunity(id, projectId).then(res => {
      const responseData = res['responseData'][0];

      systemAttributeopportunityListArray.current.forEach(res => {


        if (res.systemAttribute && res.systemAttribute.id == SystemAttributeEnum.ACTIVITY_OPPORTUNITY_FIELD_ID) return;

        if (![CustomAttributeTypeEnum.IMAGE, CustomAttributeTypeEnum.DOCUMENT_UPLOAD, CustomAttributeTypeEnum.AUDIO_VIDEO].includes(res.attributeType.id)) {

          const fieldExists = res.combinedAttributeName in getValues();

          if (fieldExists) {
            setValue(res.combinedAttributeName, null, { shouldValidate: true, shouldTouch: true });
            if (res.attributeType.id === CustomAttributeTypeEnum.DATA_LIST) {
              if (res.childAttributeList && res.childAttributeList.length > 0) {
                res.childAttributeList.forEach(child => {

                  if (getValues(child.combinedAttributeName) !== undefined) {
                    setValue(child.combinedAttributeName, null, { shouldValidate: true, shouldTouch: true });
                    unregister(child.combinedAttributeName);
                  }

                });
              }
              if (responseData.customAttributeValues?.find(x => ((x.attributeId == res.linkedAttributeId) === undefined)
                || (x.attributeId == res.linkedAttributeId) && x.value?.length == 0)) {
                invokeChildMethod(0, res, false);
              }

            } else if (res.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN) {
              if (res.addDataListDependentFields == 1) {
                if (res.childAttributeList && res.childAttributeList.length > 0) {
                  res.childAttributeList.forEach(child => {

                    if (getValues(child.combinedAttributeName) !== undefined) {
                      setValue(child.combinedAttributeName, null, { shouldValidate: true, shouldTouch: true });
                      unregister(child.combinedAttributeName);

                    }

                  });
                }
              }
              if (responseData.customAttributeValues?.find(x => ((x.attributeId == res.linkedAttributeId) === undefined)
                || (x.attributeId == res.linkedAttributeId) && x.value?.length == 0)) {
                invokeChildMethod(0, res, false);
              }

            }
          }
        }

      });

      if (responseData) {
        responseData.customAttributeValues.forEach(res1 => {
          let checkedAttribs: number[] = [];

          systemAttributeopportunityListArray.current.forEach(res => {
            if (res.systemAttribute && res.systemAttribute.id == SystemAttributeEnum.ACTIVITY_OPPORTUNITY_FIELD_ID) return;
            if (checkedAttribs.includes(res.id)) return;
            checkedAttribs.push(res.id);

            if (res1.value.length > 0) {
              if (res1.attributeId == res.linkedAttributeId && (res1.attributeTypeId == 1)) {


                if (res.attributeType.id == CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
                  let arraynew = [];
                  res1.value.forEach(d => {
                    arraynew.push(String(d.id));
                  })
                  setValue(res.combinedAttributeName, arraynew, { shouldValidate: true, shouldTouch: true });

                } else if (res.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN) {
                  let value = res1.value[0]?.id;
                  setValue(res.combinedAttributeName, value ? +value : null, { shouldValidate: true, shouldTouch: true });
                  invokeChildMethod(value, res);

                  if (res.addDataListDependentFields == 1 && res.childAttributeList && res.childAttributeList.length > 0) {
                    res.childAttributeList.forEach((child) => {
                      responseData.customAttributeValues.forEach(resp => {
                        if (child.parentLinkedFieldAttribId == res.id && child.id == resp.attributeId) {

                          let childValue = null;
                          if (child.attributeType.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN) {
                            const raw = resp.value?.[0]?.id ?? null;
                            childValue = raw != null ? Number(raw) : null;
                          } else if (child.attributeType.id === CustomAttributeTypeEnum.NUMERIC) {
                            const raw = resp.value?.[0]?.name;
                            childValue = raw != null ? Number(raw) : null;
                          } else if (child.attributeType.id === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
                            let arraynew = [];
                            resp.value.forEach(d => {
                              arraynew.push(String(d.id));
                            });
                            childValue = arraynew;
                          } else {
                            childValue = resp.value?.[0]?.name ?? null;
                          }
                          setValue(child.combinedAttributeName, childValue ? childValue : null, { shouldValidate: true, shouldTouch: true });
                        }
                      })
                    });
                  }

                } else {
                  setValue(res.combinedAttributeName, res1.value[0].id, { shouldValidate: true, shouldTouch: true });

                }



              }
              if (res1.attributeId == res.linkedAttributeId && (res1.attributeTypeId !== CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN)) {

                if (res1.attributeTypeId === CustomAttributeTypeEnum.DATA_LIST) {
                  let value = res1.value[0]?.id;
                  setValue(res.combinedAttributeName, value ? +value : null, { shouldValidate: true, shouldTouch: true });
                  invokeChildMethod(value, res);
                  if (res.childAttributeList && res.childAttributeList.length > 0) {
                    res.childAttributeList.forEach((child, idx) => {
                      responseData.customAttributeValues.forEach(resp => {
                        if (child.parentLinkedDataListAttribId == res.id && child.id == resp.attributeId && res.linkedAttributeId == resp.parentLinkedDatalistAttribId) {
                          let childValue = resp.value[0]?.id;
                          setValue(child.combinedAttributeName, childValue ? +childValue : null, { shouldValidate: true, shouldTouch: true });
                        }
                      })
                    });
                  }
                }
                else if (res.attributeType.id == CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
                  let arraynew = [];
                  res1.value.forEach(d => {
                    arraynew.push(String(d.id));
                  })
                  setValue(res.combinedAttributeName, arraynew, { shouldValidate: true, shouldTouch: true });
                }
                else if ([CustomAttributeTypeEnum.IMAGE, CustomAttributeTypeEnum.DOCUMENT_UPLOAD, CustomAttributeTypeEnum.AUDIO_VIDEO].includes(res.attributeType.id)) {
                  // this.assignFilesToLinkedFieldFormControl(res, res1.value);

                } else {
                  let value = res1.value[0].name;
                  if (res1.systemAttribute && res1.systemAttribute.id == SystemAttributeEnum.COMPANY_NAME_FIELD_ID) {
                    value = id;
                  }
                  setValue(res.combinedAttributeName, value, { shouldValidate: true, shouldTouch: true });
                }
              }
            }
          })
        })
      }
    }).catch(error => {
      console.error('Error fetching opportunity dependent inputs:', error);
      onApiError?.('Some error occurred');
    }).finally(() => {
      setIsApiLoading(false);
      onApiLoadingChange?.(false);
    });
  }
  async function invokeChildMethod(lookupId: number, field: any, isCalledInternally: boolean = true): Promise<void> {
    // Set loading state at the very beginning
    setIsApiLoading(true);
    onApiLoadingChange?.(true);
    onApiError?.(null); // Clear any previous error

    let attributeId = field.id;
    let parentLinkedDataListAttribId = 0;
    let parentLinkedFieldAttribId = 0;
    if (lookupId > 0) {
      setValue(field.combinedAttributeName, lookupId, { shouldValidate: true, shouldTouch: true });
    }
    if (field.attributeType.id == CustomAttributeTypeEnum.DATA_LIST && (field.addDataListDependentFields ?? 0) === 0) {
      setIsApiLoading(false);
      onApiLoadingChange?.(false);
      return;
    }
    if ((field.linkedAttributeId !== null && (field.parentDataListId == null) && ![SystemAttributeEnum.ACTIVITY_COMPANY_FIELD_ID,
    SystemAttributeEnum.ACTIVITY_OPPORTUNITY_FIELD_ID,
    SystemAttributeEnum.ACTIVITY_CONTACT_FIELD_ID]
      .includes(field.systemAttribute?.id)) && (field.addDataListDependentFields ?? 0) === 0) {
      setIsApiLoading(false);
      onApiLoadingChange?.(false);
      return;
    }

    // Datalist child field condition
    if (field.attributeType.id == CustomAttributeTypeEnum.DATA_LIST) {
      attributeId = field.parentDataListId;
      parentLinkedDataListAttribId = field.id;
    }
    else if (field.moduleType == SystemAttributeEnum.DATA_LIST_MODULE) {
      parentLinkedDataListAttribId = field.parentLinkedDataListAttribId;
    } else if (field.attributeType.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN && field.linkedAttributeId !== null) {
      attributeId = field.linkedAttributeId;
      parentLinkedFieldAttribId = field.id;
    } else if (field.parentLinkedFieldAttribId) {
      parentLinkedFieldAttribId = field.parentLinkedFieldAttribId;
    }



    if (field.systemAttribute && field.systemAttribute.id == SystemAttributeEnum.ACTIVITY_COMPANY_FIELD_ID) { // for select customer field
      getAllOpportunities(lookupId);
      getAllCompanyDependentInputs(lookupId);


    }
    if (field.systemAttribute && field.systemAttribute.id == SystemAttributeEnum.ACTIVITY_OPPORTUNITY_FIELD_ID) {

      systemAttributeopportunityListArray.current.forEach(rep => {
        const divId = createDivId(rep);
        const division = document.getElementById(divId);

        if (division) {
          addValidators(rep.combinedAttributeName, rep.mandatoryFlag === 1, rep.attributeType.id, rep.decimalFlag === 1, field.systemAttribute?.id, field);
          division.classList.remove('hidden');
        }
      });


      getAllOpportunitiesDependentInputs(lookupId);
    }

    //if(field.hasChildAttribute) {
    let childFieldData;
    try {
      childFieldData = await settingsService.getFieldRelation(attributeId, lookupId);
      childFieldData['responseData'] = childFieldData['responseData'].filter(ele => {
        return ele.status == 1;
      });
    } catch (error) {
      console.error('Error fetching field relation:', error);
      onApiError?.('Some error occurred');
      setIsApiLoading(false);
      onApiLoadingChange?.(false);
      return;
    }


    let childAttribDivIds = [];
    if (childFieldData['responseData'] && childFieldData['responseData'].length > 0) {
      childFieldData['responseData'].forEach(childAttrib => {

        if (field.linkedAttributeId !== null) {
          const linkedField = customAttributesListRef.current.find(x => x.linkedAttributeId === childAttrib.id);
          if (linkedField) {
            childAttrib.combinedAttributeName = linkedField.combinedAttributeName;
            childAttrib.mandatoryFlag = linkedField.mandatoryFlag;
          }
        }
        
        // Handle product form fields that are children of single-select
        // Find the product form field in customAttributesList that has id matching childAttrib.id
        const productFormField = customAttributesListRef.current.find(x => 
          x.id === childAttrib.id && 
          x.parentFormId && 
          x.parentFormId >= SystemAttributeEnum.PRODUCT_FORM_MODULE
        );
        if (productFormField) {
          childAttrib.combinedAttributeName = productFormField.combinedAttributeName;
          childAttrib.id = productFormField.id;
          childAttrib.mandatoryFlag = productFormField.mandatoryFlag;
          // Add this product form ID to visible set so it gets rendered
          setVisibleProductFormIds(prev => new Set(prev).add(productFormField.id));
        }

        if (field.attributeType.id == CustomAttributeTypeEnum.DATA_LIST) {
          childAttrib.combinedAttributeName = field.combinedAttributeName + childAttrib.combinedAttributeName;
          childAttrib.mandatoryFlag = field.mandatoryFlag;
        }
        else if (field.moduleType == SystemAttributeEnum.DATA_LIST_MODULE && field.parentCombinedAttributeName) {
          childAttrib.combinedAttributeName = field.parentCombinedAttributeName + childAttrib.combinedAttributeName;
          childAttrib.mandatoryFlag = field.mandatoryFlag;
          setCustomAttributesList(prev =>
            prev.map(attr =>
              attr.combinedAttributeName === childAttrib.combinedAttributeName
                ? { ...attr, lookupValues: childAttrib.lookupValues }
                : attr
            )
          );

        } else if (field.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN &&
          field.linkedAttributeId !== null) {
          childAttrib.combinedAttributeName = field.combinedAttributeName + childAttrib.combinedAttributeName;
          childAttrib.mandatoryFlag = field.mandatoryFlag;
          setCustomAttributesList(prev =>
            prev.map(attr =>
              attr.combinedAttributeName === childAttrib.combinedAttributeName
                ? { ...attr, lookupValues: childAttrib.lookupValues }
                : attr
            )
          );

        } else if (field.parentLinkedFieldAttribId) {
          childAttrib.combinedAttributeName = field.parentCombinedAttributeName + childAttrib.combinedAttributeName;
          childAttrib.mandatoryFlag = field.mandatoryFlag;
          setCustomAttributesList(prev =>
            prev.map(attr =>
              attr.combinedAttributeName === childAttrib.combinedAttributeName
                ? { ...attr, lookupValues: childAttrib.lookupValues }
                : attr
            )
          );
        }

        const openDivIndex = openDivs.current.map(function (item) { return item.attributeId; }).indexOf(attributeId);

        const divId = createDivId(childAttrib, false, customAttributesListRef.current);
        childAttribDivIds.push(divId);

        if (openDivIndex > -1) {
          const removeIndexInside = openDivs.current[openDivIndex].value.map(function (item) { return item.divId; }).indexOf(String(divId));
          if (removeIndexInside > -1) {
            console.log('if small div exsits');
            //yes exists then no need to do anything

          } else {
            console.log('if small div doesnt exsit');
            const updatedOpenDivs = [...openDivs.current];
            updatedOpenDivs[openDivIndex].value.push({
              divId: divId, combinedAttributeName: childAttrib.combinedAttributeName,
              id: childAttrib.id, parentLinkedDataListAttribId: parentLinkedDataListAttribId, parentLinkedFieldAttribId: parentLinkedFieldAttribId
            });

            // Set the state with the updated copy
            openDivs.current = updatedOpenDivs;

            const childDiv = document.getElementById(divId);

            if (childDiv) {

              const existingChildAttrib = findChildAttribByIdAndCombinedName(childAttrib.id, childAttrib.combinedAttributeName, false, field.attributeType.id);

              // Add validators for the child attribute field
              addValidators(
                childAttrib.combinedAttributeName,
                childAttrib.mandatoryFlag,
                childAttrib.attributeType.id,
                childAttrib.decimalFlag,
                childAttrib.systemAttribute,
                existingChildAttrib ? existingChildAttrib : childAttrib
              );
              childDiv.classList.remove('hidden');
            }
          }
        } else {
          // Use the functional update pattern to ensure we're working with latest state
          openDivs.current = [
            ...openDivs.current,
            {
              attributeId: attributeId,
              value: [
                {
                  divId: divId,
                  combinedAttributeName: childAttrib.combinedAttributeName,
                  id: childAttrib.id,
                  parentLinkedDataListAttribId: parentLinkedDataListAttribId,
                  parentLinkedFieldAttribId: parentLinkedFieldAttribId
                }
              ]
            }
          ];

          const childDiv = document.getElementById(divId);
          if (childDiv) {
            const existingChildAttrib = findChildAttribByIdAndCombinedName(childAttrib.id, childAttrib.combinedAttributeName, false, field.attributeType.id);

            // Add validators for the child attribute field
            addValidators(
              childAttrib.combinedAttributeName,
              childAttrib.mandatoryFlag,
              childAttrib.attributeType.id,
              childAttrib.decimalFlag,
              childAttrib.systemAttribute,
              existingChildAttrib ? existingChildAttrib : childAttrib
            );
            childDiv.classList.remove('hidden');
          }

        }

        const existingChildAttrib = findChildAttribByIdAndCombinedName(childAttrib.id, childAttrib.combinedAttributeName, false, field.attributeType.id);
        if (existingChildAttrib) {
          existingChildAttrib.lookupValues = childAttrib.lookupValues;
          setCustomAttributesList(prev =>
            prev.map(attr =>
              attr.combinedAttributeName === existingChildAttrib.combinedAttributeName
                ? { ...attr, lookupValues: childAttrib.lookupValues }
                : attr
            )
          );

          if (childAttrib.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN) {
            const currentValue = getValues(existingChildAttrib.combinedAttributeName);
            if (childAttrib.lookupValues.find(x => x.id == currentValue) && isCalledInternally) {
              invokeChildMethod(getValues(existingChildAttrib.combinedAttributeName), existingChildAttrib);
            } else {
              resetChildAttribsAndinvokeChildMethod(existingChildAttrib, true);
            }
          } else {
            resetChildAttribsAndinvokeChildMethod(existingChildAttrib, !isCalledInternally);
          }

        }

      });
      // ----------------> START:: hiding the divs of child attrib when such a value selected for parent attrib 
      // where there's no relation mapping with child attrib
      let removeIndex = openDivs.current.map(function (item) { return item.attributeId; }).indexOf(attributeId);
      let childAttribsToKeep = [];
      if (removeIndex > -1) {
        //close all open divs
        openDivs.current[removeIndex].value.forEach(res => {
          if ((parentLinkedDataListAttribId === res.parentLinkedDataListAttribId && !childAttribDivIds.includes(res.divId))) {
            let division = document.getElementById(res.divId);
            if (division) {
              // Reset field value using React Hook Form's setValue
              setValue(res.combinedAttributeName, null);

              const childAttrib = findChildAttribByIdAndCombinedName(res.id, res.combinedAttributeName, field.linkedAttributeId !== null, field.attributeType.id);

              if (childAttrib) {
                resetChildAttribsAndinvokeChildMethod(childAttrib, true);
              }

              division.classList.add('hidden');
            }
          } else {
            childAttribsToKeep.push(res);
          }
        });
      };
      const updatedOpenDivs = [...openDivs.current];
      if (updatedOpenDivs[removeIndex]) {
        updatedOpenDivs[removeIndex] = {
          attributeId: attributeId,
          value: []
        };
        updatedOpenDivs[removeIndex].value = childAttribsToKeep;
      }

      openDivs.current = updatedOpenDivs;
      // <---------------- END
    } else {
      // -> hiding the divs of child attrib whose relationships doesn't exist anymore
      const removeIndex = openDivs.current.map(function (item) { return item.attributeId; }).indexOf(attributeId);
      const markToRemovedChildDivIds: string[] = [];
      if (removeIndex > -1) {
        //close all open divs
        openDivs.current[removeIndex].value.forEach(res => {
          if (res.parentLinkedDataListAttribId === parentLinkedDataListAttribId) { // proceed only if parentLinkedDataListAttribId is matched
            markToRemovedChildDivIds.push(res.divId);
            const division = document.getElementById(res.divId);
            if (division) {
              setValue(res.combinedAttributeName, null);

              // Unregister the field to remove any validation rules
              //unregister(res.combinedAttributeName);

              const childAttrib = findChildAttribByIdAndCombinedName(res.id, res.combinedAttributeName, field.linkedAttributeId !== null, field.attributeType.id);

              if (childAttrib) {
                resetChildAttribsAndinvokeChildMethod(childAttrib, true);
              }

              division.classList.add('hidden');
              // Remove validation for this hidden field
              removeValidationForHiddenField(res.combinedAttributeName);
            }
            division.classList.add('hidden');
            
            // Remove product form from visible set if it was a product form child
            setVisibleProductFormIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(res.id);
              return newSet;
            });
          }
        });
        //remove key an pairs
        if (openDivs.current[removeIndex].value) {
          if (openDivs.current[removeIndex].value.length === markToRemovedChildDivIds.length) { // remove the whole
            openDivs.current.splice(removeIndex, 1);
          }
          else if (openDivs.current[removeIndex].value.length !== markToRemovedChildDivIds.length) { // remove only the mark for remove ones
            openDivs.current[removeIndex].value = openDivs.current[removeIndex].value.filter(x => !markToRemovedChildDivIds.includes(x.divId));
          }
        }
        // <- END
      }
    }

    // Reset loading state after invokeChildMethod completes
    setIsApiLoading(false);
    onApiLoadingChange?.(false);
  }



  // 4. Render dynamic fields
  function renderField(field) {
    const name = field.combinedAttributeName;
    if (field.isHidden) return null;

    // Get the validation rules for this field
    const validationRules = fieldValidations[name] || {};

    // --- HEADER / NORMAL TEXT (DISPLAY ONLY) ---
    if (field.attributeType.id === CustomAttributeTypeEnum.HEADER_TEXT) {
      return (
        <div key={name} className="grid grid-cols-12 p-4 gap-6 items-center">
          <div className="col-span-12">
            <DisplayText
              label={field.attributeName}
              required={!!field.mandatoryFlag}
              instructions={field.instructions}
              variant="header"
            />
          </div>
        </div>
      );
    }

    if (field.attributeType.id === CustomAttributeTypeEnum.NORMAL_TEXT) {
      return (
        <div key={name} className="grid grid-cols-12 p-4 gap-6 items-center">
          <div className="col-span-12">
            <DisplayText
              label={field.attributeName}
              required={!!field.mandatoryFlag}
              instructions={field.instructions}
              variant="normal"
            />
          </div>
        </div>
      );
    }

    // --- SIMPLE TYPES ---
    if (field.attributeType.id === CustomAttributeTypeEnum.TEXT_SINGLE_LINE) {
      return renderGridRow(
        field,
        <TextInput
          name={name}
          control={control}
          validationRules={validationRules}
          disabled={disabledFields.includes(field.combinedAttributeName)}
          type="text"
          placeholder={field.placeholder || "Enter text..."}
          showCharacterCount={field.showCharacterCount || false}
          hint={field.instructions}
          maxWidth="w-full"
        />
      );
    }

    if (field.attributeType.id === CustomAttributeTypeEnum.NUMERIC) {
      // For numeric fields, we'll use TextInput with numeric pattern validation
      // Lenient typing pattern; strict validation still resides in validationRules
      const numericPattern = field.decimalFlag
        ? /^\d*\.?\d*$/ // Allow decimals while typing
        : /^\d*$/; // Only integers

      return renderGridRow(
        field,
        <div className={styles.fieldInputContainer}>
          <TextInput
            name={name}
            control={control}
            validationRules={validationRules || {}}
            placeholder=""
            type="text"
            pattern={numericPattern}
            blockInvalidInput
            inputProps={{
              inputMode: field.decimalFlag ? 'decimal' : 'numeric'
            }}
            disabled={disabledFields.includes(field.combinedAttributeName)}
            hint={field.instructions}
          />
        </div>
      );
    }

    // --- SELECTS ---
    if (field.attributeType.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN || field.attributeType.id === CustomAttributeTypeEnum.DATA_LIST) {

      const { limitedOptions, lookupMap, allOptions } = buildSelectOptions(field.lookupValues, getValues(name));

      return renderGridRow(
        field,
        <Select
          name={name}
          control={control}
          validationRules={validationRules || {}}
          options={limitedOptions}
          allOptions={allOptions}
          lookupMap={lookupMap}
          placeholder={field.placeholder || "Select an option..."}
          disabled={disabledFields.includes(field.combinedAttributeName)}
          hint={field.instructions}
          maxWidth="w-full"
          onChange={(selectedValue) => {
            // Important: Keep the invokeChild logic intact for dependent fields
            invokeChildMethod(+selectedValue, field, false);
          }}
        />
      );
    }
    if (field.attributeType.id === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
      // Convert lookupValues to format expected by MultiSelect (string values)
      const options = (field.lookupValues || []).map(opt => ({
        value: String(opt.id),
        label: opt.lookupValue
      }));

      return renderGridRow(
        field,
        <div className={styles.fieldInputContainer}>
          <MultiSelect
            name={name}
            control={control}
            validationRules={validationRules || {}}
            options={options}
            placeholder="Select options..."
            disabled={disabledFields.includes(field.combinedAttributeName)}
            hint={field.instructions}
          />
        </div>
      );
    }

    // --- DATE ---
    if (field.attributeType.id === CustomAttributeTypeEnum.DATE) {
      const normalizeLimit = (val?: string) => (val ? val.split('T')[0] : undefined);
      return renderGridRow(
        field,
        <div className={styles.fieldInputContainer}>
          <DateInput
            name={name}
            control={control}
            validationRules={validationRules || {}}
            disabled={disabledFields.includes(field.combinedAttributeName)}
            minDate={normalizeLimit(field.dateAttributes?.minDate)}
            maxDate={normalizeLimit(field.dateAttributes?.maxDate)}
            hint={field.instructions}
          />
        </div>
      );
    }

    // --- DATE_TIME (id 21) ---
    if (field.attributeType.id === CustomAttributeTypeEnum.DATE_TIME) {
      return renderGridRow(
        field,
        <div className={styles.fieldInputContainer}>
          <DateTimeInput
            name={name}
            control={control}
            validationRules={validationRules || {}}
            disabled={disabledFields.includes(field.combinedAttributeName)}
            minDateTime={field.dateAttributes?.minDate}
            maxDateTime={field.dateAttributes?.maxDate}
            hint={field.instructions}
          />
        </div>
      );
    }

    // --- TIME (id 22) ---
    if (field.attributeType.id === CustomAttributeTypeEnum.TIME_DURATION) {
      return renderGridRow(
        field,
        <div className={styles.fieldInputContainer}>
          <TimeInput
            name={name}
            control={control}
            validationRules={validationRules || {}}
            disabled={disabledFields.includes(field.combinedAttributeName)}
            hint={field.instructions}
          />
        </div>
      );
    }

    // --- RADIO ---
    if (field.attributeType.id === CustomAttributeTypeEnum.RADIO) {
      return renderGridRow(
        field,
        <div className={styles.fieldInputContainer}>
          <Controller
            name={name}
            control={control}
            rules={validationRules || {}}
            render={({ field: controllerField }) => (
              <div className={styles.radioGroup}>
                {field.lookupValues?.map(opt => (
                  <div key={opt.id} className={styles.radioOption}>
                    <input
                      type="radio"
                      id={`${name}-${opt.id}`}
                      value={opt.id}
                      checked={controllerField.value === opt.id}
                      onChange={() => controllerField.onChange(opt.id)}
                      className={styles.radioInput}
                      disabled={disabledFields.includes(field.combinedAttributeName)}
                    />
                    <label htmlFor={`${name}-${opt.id}`} className={styles.radioLabel}>
                      {opt.lookupValue}
                    </label>
                  </div>
                ))}
              </div>
            )}
          />
          {errors[name] && <p className={styles.errorText}>{String(errors[name]?.message)}</p>}
          {field.instructions && <p className={styles.instructionText}>{field.instructions}</p>}
        </div>
      );
    }

    // --- TEXT MULTI-LINE ---
    if (field.attributeType.id === CustomAttributeTypeEnum.TEXT_MULTI_LINE) {
      return renderGridRow(
        field,
        <>
          <TextArea
            name={name}
            control={control}
            validationRules={validationRules || {
              maxLength: field.maxCharacters,
              minLength: field.minCharacters,
            }}
            disabled={disabledFields.includes(field.combinedAttributeName)}
            maxLength={field.maxCharacters || 500}
            placeholder={field.placeholder || "Type here..."}
            rows={field.rows || 1}
            showCharacterCount={true}
            className="w-full"
          />
          {field.instructions && <p className={styles.instructionText}>{field.instructions}</p>}
        </>
      );
    }

    // --- FILES (IMAGE/DOCUMENT/VIDEO UPLOADS) ---
    if (field.attributeType.id === CustomAttributeTypeEnum.IMAGE) {
      return renderGridRow(
        field,
        <UploadInput
          name={name}
          control={control}
          attributeTypeId={CustomAttributeTypeEnum.IMAGE}
          multiple={true}
          moduleType={moduleType}
          projectId={projectId}
          onUploadingChange={setIsFileUploading}
          maxFiles={field.maxImagesAllowed || undefined}
          validationRules={validationRules || {}}
          disabled={disabledFields.includes(field.combinedAttributeName)}
          hint={<div className="text-[10px]">Upload images (.jpg, .jpeg, .png, .gif, .webp, .svg)</div>}
        />
      );
    }

    // Handle AUDIO_VIDEO type with specialized component
    if (field.attributeType.id === CustomAttributeTypeEnum.AUDIO_VIDEO) {
      return renderGridRow(
        field,
        <UploadInput
          name={name}
          control={control}
          attributeTypeId={CustomAttributeTypeEnum.AUDIO_VIDEO}
          multiple={true}
          moduleType={activityTypeId}
          projectId={projectId}
          onUploadingChange={setIsFileUploading}
          maxFiles={field.maxVideosAllowed || undefined}
          validationRules={validationRules || {}}
          disabled={disabledFields.includes(field.combinedAttributeName)}
          hint={<div className="text-[10px]">Upload audio/video files (.mp3, .wav, .ogg, .mp4, .webm, .mov)</div>}
        />
      );
    }

    // DOCUMENT_UPLOAD
    if (field.attributeType.id === CustomAttributeTypeEnum.DOCUMENT_UPLOAD) {
      return renderGridRow(
        field,
        <UploadInput
          name={name}
          control={control}
          attributeTypeId={CustomAttributeTypeEnum.DOCUMENT_UPLOAD}
          multiple={true}
          moduleType={activityTypeId}
          projectId={projectId}
          onUploadingChange={setIsFileUploading}
          maxFiles={field.maxDocumentsAllowed || undefined}
          validationRules={validationRules || {}}
          disabled={disabledFields.includes(field.combinedAttributeName)}
          hint={<div className="text-[10px]">Upload documents (.pdf, .docx, .xlsx, .pptx)</div>}
        />
      );
    }

    // REFERENCE_DOCUMENTS
    if (field.attributeType.id === CustomAttributeTypeEnum.REFERENCE_DOCUMENTS) {

      return renderGridRow(
        field,
        <ReferenceDocuments
          customAttr={field}
          fileArray={fileArray[field.combinedAttributeName]?.files || []}
        />
      );
    }

    // PRODUCT FORM - identified by parentFormId property (>= 200 is PRODUCT_FORM_MODULE)
    if (field.parentFormId && field.parentFormId >= SystemAttributeEnum.PRODUCT_FORM_MODULE) {
      // Check if this is a child product form (has parentId > 0)
      // If so, only render when invokeChildMethod has been called and added this field.id to visibleProductFormIds
      const isProductFormChildOfSingleSelect = field.parentId > 0;
      if (isProductFormChildOfSingleSelect && !visibleProductFormIds.has(field.id)) {
        // Don't render ProductFormField component until invokeChildMethod is called
        return null;
      }
      
      const products = productFormIdWithProductIdNameMap.current.get(field.parentFormId) || productList;
      
      // Get product form fields from preloaded map using field.id as key and parentFormId as inner key
      const fieldInnerMap = productFormFieldsMap.current.get(field.id);
      const productFormFieldsList = fieldInnerMap?.get(field.parentFormId) || [];
      
      // Get product form settings from preloaded map using parentFormId as key
      const productFormSettings = productFormSettingsMap.current.get(field.parentFormId);
      
      // Product form has special layout - label on top, table below (full width)
      return (
        <div className="w-full">
          <div className="text-sm font-medium text-gray-700 mb-2">
            {field.attributeName}
            {field.mandatoryFlag === 1 && <span className="text-[#F64E60] ml-1">*</span>}
          </div>
          <ProductFormField
            name={name}
            control={control}
            field={field}
            productList={products}
            productFormConfig={productFormSettings}
            productFormFieldsList={productFormFieldsList}
            attributeId={field.id}
            combinedAttributeName={field.combinedAttributeName}
            disabled={disabledFields.includes(field.combinedAttributeName)}
            setValue={setValue}
            getValues={getValues}
            moduleType={moduleType}
            projectId={projectId}
            onUploadingChange={setIsFileUploading}
            onDiscountChange={(discountAmount, discountPercent) => {
              // Store discount values for this product form field
              productFormDiscountValues.current.set(field.id, { discountAmount, discountPercent });
            }}
            parentMandatoryFlag={field.mandatoryFlag === 1}
          />
        </div>
      );
    }

    // -- Extend for other types like EMAIL, TIME, etc. as needed --

    return null;
  }


  // Handle form submission with API call and toast notifications
  function handleFormSubmit(e) {
    if (isSubmitting) return;

    handleSubmit(


      // Success case - form is valid
      async () => {
        try {

          setIsLoading(true);
          setIsSubmitting(true); // Disable the button
          onSubmittingChange?.(true); // Notify parent that submission started
          const requestBody = addActivity();
          const response = await activityService.addEditActivity(requestBody);

          // Close the modal regardless of response status
          onCancel();

          if (response.statusCode >= 200 && response.statusCode < 300) {
            // Show success notification with Material UI style
            enqueueSnackbar('Successfully added', {
              variant: 'success',
            });
            // Call success callback to refresh the grid
            onSuccess?.();
          } else {
            // Show error notification with Material UI style
            enqueueSnackbar('Unable to add, please try again later', {
              variant: 'error',
            });
          }
        } catch (error) {
          // Close modal and show error notification
          onCancel();
          enqueueSnackbar('Unable to add, please try again later', {
            variant: 'error',
          });
        } finally {
          setIsLoading(false);
          setIsSubmitting(false); // Re-enable the button
          onSubmittingChange?.(false); // Notify parent that submission ended
        }
      },
      // Error case - validation failed
      (errors) => {
        setIsSubmitting(false); // Re-enable the button for validation errors

        // Show validation error notification
        enqueueSnackbar('Please fix the form errors before submitting', {
          variant: 'error',
        });
      }
    )(e);
  };
  function addActivity() {


    let customAttributeValues = [];
    //dyniamic fields
    customAttributesList.forEach(element => {
      var id = element.combinedAttributeName;

      if ((element.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN ||
        element.attributeType.id == CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN ||
        element.attributeType.id == CustomAttributeTypeEnum.RADIO ||
        element.attributeType.id == CustomAttributeTypeEnum.TEXT_SINGLE_LINE ||
        element.attributeType.id == CustomAttributeTypeEnum.QR_CODE_SCANNER ||
        element.attributeType.id == CustomAttributeTypeEnum.NUMERIC ||
        element.attributeType.id == CustomAttributeTypeEnum.TEXT_MULTI_LINE ||
        element.attributeType.id == CustomAttributeTypeEnum.EMAIL ||
        element.attributeType.id == CustomAttributeTypeEnum.DATA_LIST) &&
        (element.systemAttribute?.id !== SystemAttributeEnum.COMPANY_GEO_FIELD_ID)) {

        if (element.parentLinkedFieldAttribId != null) {
          customAttributeValues.push({
            "attributeId": element.id,
            "parentLinkedFieldAttribId": (element.moduleType == SystemAttributeEnum.COMPANY_MODULE ||
              element.moduleType == SystemAttributeEnum.OPPORTUNITY_MODULE ||
              element.moduleType == SystemAttributeEnum.CONTACT_MODULE
            ) ? element.parentLinkedFieldAttribId : null,
            "value": [
              {
                "name": String(getValues(element.combinedAttributeName) == null ? '' : getValues(element.combinedAttributeName).toString().trim())
              }
            ]
          });
        } else {
          customAttributeValues.push({
            "attributeId": element.id,
            "parentLinkedDatalistAttribId": element.moduleType == SystemAttributeEnum.DATA_LIST_MODULE ? element.parentLinkedDataListAttribId : null,
            "value": [
              {
                "name": String(getValues(element.combinedAttributeName) == null ? '' : getValues(element.combinedAttributeName).toString().trim())
              }
            ]
          });
        }

      }

      if (element.attributeType.id == CustomAttributeTypeEnum.DATE) {
        customAttributeValues.push({
          "attributeId": element.id,
          "value": [
            {
              'name': formatDate(getValues(element.combinedAttributeName))
            }
          ]
        })
      }
      if (element.attributeType.id == CustomAttributeTypeEnum.DATE_TIME) {
        customAttributeValues.push({
          "attributeId": element.id,
          "value": [
            {
              'name': getValues(element.combinedAttributeName)?.replace('T', ' ')
            }
          ]
        })
      }
      if (element.attributeType.id == CustomAttributeTypeEnum.TIME_DURATION) {
        customAttributeValues.push({
          "attributeId": element.id,
          "value": [
            {
              'name': getValues(element.combinedAttributeName)
            }
          ]
        })
      }

      if (element.attributeType.id == CustomAttributeTypeEnum.IMAGE || element.attributeType.id == CustomAttributeTypeEnum.DOCUMENT_UPLOAD || element.attributeType.id == CustomAttributeTypeEnum.AUDIO_VIDEO) {
        if (getValues(element.combinedAttributeName)) {
          var resultArrayOfImages = [];
          if (getValues(element.combinedAttributeName) != null) {
            getValues(element.combinedAttributeName)?.forEach(resultImage => {
              // Extract serverUrl from the file object and send only that in name property
              const serverUrl = typeof resultImage === 'object' ? resultImage.serverUrl : resultImage;
              if (serverUrl) {
                resultArrayOfImages.push({
                  'name': serverUrl
                });
              }
            })
          }

          customAttributeValues.push({
            "attributeId": element.id,
            "value": resultArrayOfImages
          })
        }
      }
    });

    // Process product form data - matching Angular structure
    // Product form data should be added to customAttributeValues array with:
    // - attributeId (parent product form field ID)
    // - productFormRowsData (array of row data with field values)
    // - productFormSummaryDiscountData (discount info)
    
    // Find product form fields in customAttributesList (fields with parentFormId >= 200)
    customAttributesList.forEach(element => {
      if (element.parentFormId && element.parentFormId >= SystemAttributeEnum.PRODUCT_FORM_MODULE) {
        const combinedAttributeName = element.combinedAttributeName;
        const rows = getValues(combinedAttributeName) || [];
        
        // Get product form fields from preloaded map
        const fieldInnerMap = productFormFieldsMap.current.get(element.id);
        const productFormFieldsList = fieldInnerMap?.get(element.parentFormId) || [];
        
        // Get product form settings for discount info
        const productFormSettings = productFormSettingsMap.current.get(element.parentFormId);
        
        if (rows.length > 0 && productFormFieldsList.length > 0) {
          // Build productFormData array - each entry is a row with formMasterId and field values
          const productFormData: any[] = [];
          
          rows.forEach((row: any, rowIndex: number) => {
            const rowData: any = {
              formMasterId: null, // null for AddForm (this is the row's primary ID, populated only in EditForm)
              value: []
            };
            
            // For each field in the product form, add to the row's value array
            productFormFieldsList.forEach((field: any) => {
              const fieldKey = field.attributeName?.replace(/[^a-zA-Z0-9]/g, '') || field.combinedAttributeName;
              let value = row[fieldKey];
              
              // Handle different field types
              if (field.attributeType?.id === CustomAttributeTypeEnum.IMAGE ||
                  field.attributeType?.id === CustomAttributeTypeEnum.DOCUMENT_UPLOAD ||
                  field.attributeType?.id === CustomAttributeTypeEnum.AUDIO_VIDEO) {
                // For file fields, extract serverUrl and join with comma
                if (Array.isArray(value)) {
                  value = value.map((file: any) => typeof file === 'object' ? file.serverUrl : file).filter(Boolean).join(',');
                }
              } else if (field.attributeType?.id === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
                // For multi-select, convert array to JSON string
                if (Array.isArray(value)) {
                  value = JSON.stringify(value);
                }
              }
              
              // Add field data to row
              if (value !== undefined && value !== null && value !== '') {
                rowData.value.push({
                  id: field.id,
                  name: String(value)
                });
              }
            });
            
            if (rowData.value.length > 0) {
              productFormData.push(rowData);
            }
          });
          
          // Build summary discount data
          // Get discount values from the stored ref (set by ProductFormField's onDiscountChange callback)
          const discountData = productFormDiscountValues.current.get(element.id) || { discountAmount: 0, discountPercent: 0 };
          
          const productFormSummaryDiscountData = {
            value: discountData.discountAmount,
            percent: discountData.discountPercent
          };
          
          // Add product form entry to customAttributeValues array (matching Angular structure)
          if (productFormData.length > 0) {
            customAttributeValues.push({
              "attributeId": element.id,
              "productFormData": productFormData,
              "productFormSummaryDiscountData": productFormSummaryDiscountData
            });
          }
        }
      }
    });

    let addData = {
      "appVersion": null,
      "deviceInfo": null,
      "gps": null,
      "isActive": 1,
      "projectId": projectId,
      "moduleType": activityTypeId,
      "planId": null,
      "previousProductFormActivityMappings": [],
      "customAttributeValues": customAttributeValues

    };
    return addData;
  }


  return (
    <>
      <Form spaceY={4}
        id="add-activity-form"
        onSubmit={handleFormSubmit}
      >
        {isFieldDataLoading ? (
          <Spinner size='medium' className='mt-10' customLoadingName='Loading...' />
        ) : (
          <>
            {customAttributesList.map((field, index) => {
              // Field visibility is determined by fieldVisibilityConfig for all fields including product forms
              // Product form fields are identified by parentFormId property (>= 200)
              // Also hide product form fields that are children of single-select (have linkedAttributeId)
              const isChildOfParent = field.parentId !== 0 && field.parentId !== null && field.parentId !== undefined;
              const isProductFormChildOfSingleSelect = field.parentFormId && 
                field.parentFormId >= SystemAttributeEnum.PRODUCT_FORM_MODULE && field.parentId>0;
              const isHidden = isChildOfParent || isProductFormChildOfSingleSelect;

              return (
                <div
                  key={`${field.combinedAttributeName}_${field.id}_${index}`}
                  className={`${styles.fieldWrapper} ${isHidden ? 'hidden' : ""}`}
                  id={`div_${field.combinedAttributeName}_${field.id}`}
                >
                  {renderField(field)}
                </div>
              );
            })}
          </>
        )}
      </Form>
    </>
  );
};
export default AddForm;
