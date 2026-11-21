import { FC, useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Select from "react-select";
import { Button } from "../../../ui/tailwind";
import styles from '@/styles/addEditForm.module.css';
import settingsService from '@/lib/services/settingsService';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import { cloneDeep } from 'lodash';
import { CustomAttributePreDefLookupEnum } from '@/lib/constants/CustomAttributePreDefLookupEnum';
import ImageUpload from '../../../common/viewer/ImageViewer/ImageUpload';
import AudioVideoUpload from '../../../common/viewer/AudioVideoViewer/AudioVideoUpload';
import RefDocumentViewer from '../../../common/viewer/RefDocumentViewer/RefDocumentViewer';
import productService from '@/lib/services/productService';
// Material UI styled notifications
import { useSnackbar } from 'notistack';
import { useEntityHeading } from '@/hooks/useEntityHeading';

interface AddFormProps {
  onCancel: () => void;
  onSuccess?: () => void; // Optional callback when submission is successful
  isLoading?: boolean;
}

const AddForm: FC<AddFormProps> = ({
  onCancel,
  onSuccess,
  isLoading: initialLoading = false,
}) => {
  // Access notistack's enqueueSnackbar function for Material UI styled notifications
  const { enqueueSnackbar } = useSnackbar();
  const openDivs = useRef<any[]>([]);
  const projectId = JSON.parse(localStorage.getItem('selectedProject') || '{}');
  const fieldVisibilityConfig = useRef<any[]>([]);
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [isSubmitting, setIsSubmitting] = useState(false); // Track form submission state
  const fieldVisibilityNotAttributeIds = [CustomAttributeTypeEnum.RADIO, CustomAttributeTypeEnum.CALCULATED_FIELD, CustomAttributeTypeEnum.OTP_VALIDATION, CustomAttributeTypeEnum.HEADER_TEXT, CustomAttributeTypeEnum.NORMAL_TEXT, CustomAttributeTypeEnum.PAGE_SEPARATOR, CustomAttributeTypeEnum.REFERENCE_DOCUMENTS];

  const [customAttributesList, setCustomAttributesList] = useState<any[]>([]);
  const [defaultValues, setDefaultValues] = useState<any>({}); // Dynamic form default values
  
  // State to track loading status of field data
  const [isFieldDataLoading, setIsFieldDataLoading] = useState<boolean>(true);
  const [search, setSearch] = useState('');
  const fieldVisibilitySettingsAppliedForFirstTime = useRef<boolean>(false);
  // Add this state to track disabled fields
  const [disabledFields, setDisabledFields] = useState<string[]>([]);
  const customAttributesListRef = useRef<any[]>([]);
  
  // File upload related state
  const [fileArray, setFileArray] = useState<{ [key: string]: any }>({});
  const [uploadQueue, setUploadQueue] = useState<{ [key: string]: number }>({});
  
  // Dropdown loading state
  const [dropdownLoading, setDropdownLoading] = useState<{ [key: string]: boolean }>({});

  const documentIconUrlMap = new Map([
    ["pdf", "/svg/icons/general/PDF-File.svg"],
    ["docx", "/svg/icons/general/file-alt-solid.svg"],
    ["xlsx", "/svg/icons/general/file-excel-solid.svg"],
    ["pptx", "/svg/icons/general/file-powerpoint-solid.svg"]
  ]);

// Get entity-specific heading using the custom hook
  const pageHeading = useEntityHeading('Products');

  // Initialize useForm with dynamic defaults
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    getValues,
    unregister,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues, // Will be updated once defaults are set
  });
  
  useEffect(() => {
    // Load all field data on component mount
    loadAllFieldData();
  }, []);

  // Coordinator function to load all field data sequentially
  const loadAllFieldData = async () => {
    setIsFieldDataLoading(true);
    try {
      // First fetch visibility settings
      await getFieldVisibilitySettingsData();
      
      // Then fetch field details
      await getFieldDetailsData();
      
    } catch (error) {
      console.error('Error in loadAllFieldData:', error);
      fieldVisibilityConfig.current = [];
    } finally {
      setIsFieldDataLoading(false);
    }
  }
  
  // Function to fetch field visibility settings
  const getFieldVisibilitySettingsData = async () => {
    try {
      const visibilityResponse = await settingsService.getFieldVisibilitySettings(projectId, 1, true);
      
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
      const [linkedDataListDetailsResponse, fieldApiResponse, dataListDetailsResponse] = await Promise.all([
        settingsService.getLinkedDataListDetails(projectId,SystemAttributeEnum.PRODUCT_MODULE),
        settingsService.getFieldDetails(projectId, SystemAttributeEnum.PRODUCT_MODULE),
        settingsService.getFieldDetails(projectId, SystemAttributeEnum.DATA_LIST_MODULE)
      ]);
            
      // Extract responseData from each response
      const linkedDataListDetails = linkedDataListDetailsResponse?.responseData || [];
      let fieldData = fieldApiResponse?.responseData || [];
      const dataListDetails = dataListDetailsResponse?.responseData || [];
      
      // Process the data - await completion of all lookup setup operations
      await lookupSetupForAttributes(fieldData, dataListDetails);
      // Store the field details in state - this only happens after all lookups are complete
     fieldData = processGetFieldApiResponse(fieldData, linkedDataListDetails);

      let customAttributesList = [];
      (fieldData as Array<any>).forEach(field => {
        customAttributesList.push(field);
        if (field.attributeType.id == CustomAttributeTypeEnum.DATA_LIST && field.childAttributeList !== null && field.childAttributeList.length > 0) {
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
        setValue(fields.combinedAttributeName,fieldsconfig.value.split(',').map(String));
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
        setValue(fields.combinedAttributeName,+fieldsconfig.value);
        if (fields.parentId === 0 && fields.hasChildAttribute) {
          invokeChildMethod(+fieldsconfig.value, fields);
        }
      }
      fields['isHidden'] = true
    }
    else {
      if (!fieldVisibilitySettingsAppliedForFirstTime.current) {
        setValue(fields.combinedAttributeName,fieldsconfig.value);
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
          setValue(fields.combinedAttributeName, fieldsconfig.value.split(',').map(Number));
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
  async function lookupSetupForAttributes (responseData: any[], getDataListDetails: any[]) {
    
    // Collection of all promises to await
    const promises: Promise<void>[] = [];
    
    // First collect all attributes by type to optimize API calls
    const dropdownAttributes: any[] = [];
    const dateAttributes: any[] = [];
    const dataListAttributes: any[] = [];
    const regularAttributeIds: number[] = [];
    const attributeMap: Record<number, any> = {};
    
    // Sort attributes by type
    for (const attribute of responseData) {
      if (attribute.isActive === 1) {
        const attributeTypeId = attribute.attributeType.id;
        const attributeId = attribute.id;
        
        // Store attribute in map for easy lookup
        attributeMap[attributeId] = attribute;
        
        switch (attributeTypeId) {
          case CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN:
          case CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN:
            if (attribute.systemAttribute?.id === SystemAttributeEnum.PRODUCT_STATUS) {
              // Special case for product status to set default "Active" value
              dropdownAttributes.push(attribute);
            } else {
              // Regular dropdown attributes that can be batched
              regularAttributeIds.push(attributeId);
            }
            break;
          case CustomAttributeTypeEnum.DATE:
          case CustomAttributeTypeEnum.DATE_TIME:
            dateAttributes.push(attribute);
            break;
          case CustomAttributeTypeEnum.DATA_LIST:
            dataListAttributes.push(attribute);
            break;
          default:
            break;
        }
      }
    }
    
    // Process special dropdown attributes that need their own API calls
    for (const attribute of dropdownAttributes) {
      promises.push(setLookupFieldValue(attribute.id, attribute));
    }
    
    // Process date attributes
    for (const attribute of dateAttributes) {
      promises.push(setCustomDateTypeAttributes(attribute.id, attribute));
    }
    
    // Process data list attributes
    for (const attribute of dataListAttributes) {
      promises.push(setLookupForDataList(attribute.id, attribute, getDataListDetails));
    }
    
    // Batch process regular dropdown attributes with a single API call
    if (regularAttributeIds.length > 0) {
      promises.push(batchFetchLookupValues(regularAttributeIds, attributeMap));
    }
    
    // Wait for all promises to resolve
    await Promise.all(promises);
  };
  
  // Fetch lookup values for multiple attributes in a single batch
  const batchFetchLookupValues = async (attributeIds: number[], attributeMap: Record<number, any>) => {
    try {
      // Create a map of promises for each attribute ID
      const lookupPromises = attributeIds.map(id => {
        return settingsService.getAttribLookup(id).then(response => ({
          attributeId: id,
          response: response
        }));
      });
      
      // Wait for all lookup promises to complete
      const results = await Promise.all(lookupPromises);
      
      // Map the results back to their respective attributes
      for (const result of results) {
        const { attributeId, response } = result;
        const attribute = attributeMap[attributeId];
        
        if (response?.statusCode === 200 && attribute) {
          attribute.lookupValues = response.responseData;
        }
      }
    } catch (error) {
      console.error('Error batch fetching lookup values:', error);
    }
  };

  const setLookupFieldValue = async (attribId: number, editCustomVal: any) => {
try {
        const row = await settingsService.getAttribLookup(attribId);
        if (row['statusCode'] == 200) {
          if(editCustomVal.systemAttribute?.id==SystemAttributeEnum.PRODUCT_STATUS){
            row['responseData'].forEach((item: any) => {
              if(item.lookupValue=='Active'){
                setValue(editCustomVal.combinedAttributeName, item.id);
              }
            });
          }
          editCustomVal.lookupValues = row['responseData'];
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
  
  
  function processGetFieldApiResponse(fieldData: any[], linkedDataListDetails: any[] = []) {

    // Process fields and set up default values
    const linkedDlMap: Map<number, any> = (linkedDataListDetails ?? []).reduce((map, obj) => {
      map.set(obj.id, obj);
      return map;
    }, new Map<string, number>());
    const validationSchema = {};

    fieldData = fieldData.filter(ele => {
      if(ele.isActive === 1){
        return ele.systemAttribute?.id !== SystemAttributeEnum.CONTACT_GEO_FIELD_ID;
      }
      return false;
    });
  
    fieldData.forEach((field) => {
      // Set default based on field type
      let value :any = "";
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
          if (field.minCharacters) validationRules.minLength = {
            value: field.minCharacters,
            message: field.minLengthErrorMsg || `Minimum ${field.minCharacters} characters required`
          };
          if (field.maxCharacters) validationRules.maxLength = {
            value: field.maxCharacters,
            message: field.maxLengthErrorMsg || `Maximum ${field.maxCharacters} characters allowed`
          };
          if (field.pattern) validationRules.pattern = {
            value: new RegExp(field.pattern),
            message: field.patternErrorMsg || 'Invalid format'
          };
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
          if (field.minNumber !== undefined && field.minNumber !== null) {
            validationRules.min = {
              value: field.minNumber,
              message: field.minValueErrorMsg || `Minimum value is ${field.minNumber}`
            };
          }
          if (field.maxNumber !== undefined && field.maxNumber !== null) {
            validationRules.max = {
              value: field.maxNumber,
              message: field.maxValueErrorMsg || `Maximum value is ${field.maxNumber}`
            };
          }
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
              if (childElement.attributeType.id == 1) {
                if (childElement.systemAttribute === null) {
                  childElement.systemAttribute = {};
                }
                if (childElement.mandatoryFlag == 1 && childElement.parentId === 0) {
                  validationRulesForChildDataList.required = childElement.mandatoryFlag ? (field.requiredErrorMsg || "This field is required") : false;
                  //this.addConcatForm.addControl(childElement.combinedAttributeName, new FormControl('', Validators.compose([Validators.required])));
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
          let fileArrayTemp =[]
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
      // Store validation rules in the schema
      validationSchema[field.combinedAttributeName] = validationRules;
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
  function createDivId(customAttr: any): string {
    return 'div_' + customAttr.combinedAttributeName + '_' + customAttr.id;
  }

  // Add validators function similar to Angular implementation
function addValidators(combinedAttributeName: string, mandatoryFlag: boolean, attributeTypeId: number, decimalFlag: boolean, systemAttrib: any) {

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

  // Numeric validation with patterns
  if (attributeTypeId === CustomAttributeTypeEnum.NUMERIC) {
    const numericPattern = /^[0-9]+$/;
    const decimalPattern = /^\d+(\.\d+)?$/;
    const systemAttribNumericPattern = /^[0-9]+$/;
    const systemAttribDecimalPattern = /^\d+(\.\d+)?$/;
    
    let pattern = systemAttrib ? systemAttribNumericPattern : numericPattern;
    if (decimalFlag) {
      pattern = systemAttrib ? systemAttribDecimalPattern : decimalPattern;
    }
    
    validationRules.pattern = {
      value: pattern,
      message: decimalFlag ? 'Please enter a valid decimal number' : 'Please enter a valid number'
    };
  }
  // Email validation
  else if (attributeTypeId === CustomAttributeTypeEnum.EMAIL) {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    validationRules.pattern = {
      value: emailPattern,
      message: 'Please enter a valid email address'
    };
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
   // Add this to force register the field with React Hook Form
  // and ensure it's properly tracked in the form state
  //register(combinedAttributeName);

}

function findChildAttribByIdAndCombinedName(id: number, combinedAttributeName: string): any {
  return  customAttributesListRef.current.find(item => item.id == id && item.combinedAttributeName == combinedAttributeName);
}

function resetAllChildFields(parentField: any): void {
  const attributeId = parentField.attributeType.id == CustomAttributeTypeEnum.DATA_LIST ? 
    parentField.parentDataListId : parentField.id;
  const parentLinkedDataListAttribId = parentField.attributeType.id == CustomAttributeTypeEnum.DATA_LIST ? 
    parentField.id : (parentField.parentLinkedDataListAttribId || 0);

  // Find all open divs for this parent attribute
  const openDivIndex = openDivs.current.map(item => item.attributeId).indexOf(attributeId);
  
  if (openDivIndex > -1) {
    // Reset all child fields
    openDivs.current[openDivIndex].value.forEach(childDiv => {
      if (childDiv.parentLinkedDataListAttribId === parentLinkedDataListAttribId || parentLinkedDataListAttribId === 0) {
        // Reset form value
        setValue(childDiv.combinedAttributeName, null);
        
        // Hide the div
        const division = document.getElementById(childDiv.divId);
        if (division) {
          division.classList.add('hidden');
        }
        
        // Find and reset nested child fields recursively
        const childAttrib = findChildAttribByIdAndCombinedName(childDiv.id, childDiv.combinedAttributeName);
        if (childAttrib && childAttrib.hasChildAttribute) {
          resetAllChildFields(childAttrib);
        }
      }
    });
    
    // Clear the openDivs entry for this parent
    if (parentLinkedDataListAttribId === 0) {
      openDivs.current.splice(openDivIndex, 1);
    } else {
      openDivs.current[openDivIndex].value = openDivs.current[openDivIndex].value.filter(
        childDiv => childDiv.parentLinkedDataListAttribId !== parentLinkedDataListAttribId
      );
    }
  }
}

  async function resetChildAttribsAndinvokeChildMethod(childAttrib: any): Promise<void> {
  // Reset the form control for the specific child attribute
  const fieldExists = childAttrib.combinedAttributeName in getValues();

  if (fieldExists) {
    // Reset this specific field
    setValue(childAttrib.combinedAttributeName, null);
    
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
async function invokeChildMethod(lookupId: number, field: any): Promise<void> {

  let attributeId = field.id;
  let parentLinkedDataListAttribId = 0;
  if(lookupId>0){
    setValue(field.combinedAttributeName, lookupId, { shouldValidate: true });
  }

  // Datalist child field condition
  if (field.attributeType.id == CustomAttributeTypeEnum.DATA_LIST) {
    attributeId = field.parentDataListId;
    parentLinkedDataListAttribId = field.id;
  }
  else if (field.moduleType == SystemAttributeEnum.DATA_LIST_MODULE) {
    parentLinkedDataListAttribId = field.parentLinkedDataListAttribId;
  }

  if(field.hasChildAttribute && lookupId>0) {
    // Set loading state for this dropdown
    setDropdownLoading(prev => ({
      ...prev,
      [field.combinedAttributeName]: true
    }));
    
    try {
      const childFieldData = await settingsService.getFieldRelation(attributeId, lookupId);
      childFieldData['responseData'] = childFieldData['responseData'].filter(ele => {
        return ele.status == 1;
      });
  

    let childAttribDivIds = [];
    if(childFieldData['responseData'] && childFieldData['responseData'].length > 0) {
    childFieldData['responseData'].forEach(childAttrib => {

      if (field.attributeType.id == CustomAttributeTypeEnum.DATA_LIST) {
        childAttrib.combinedAttributeName = field.combinedAttributeName + childAttrib.combinedAttributeName;
        childAttrib.mandatoryFlag = field.mandatoryFlag;
      }
      else if (field.moduleType == SystemAttributeEnum.DATA_LIST_MODULE && field.parentCombinedAttributeName) {
        childAttrib.combinedAttributeName = field.parentCombinedAttributeName + childAttrib.combinedAttributeName;
        childAttrib.mandatoryFlag = field.mandatoryFlag;
      }

      const openDivIndex = openDivs.current.map(function (item) { return item.attributeId; }).indexOf(attributeId);

      const divId = createDivId(childAttrib);
      childAttribDivIds.push(divId);

      if(openDivIndex > -1){
        const removeIndexInside = openDivs.current[openDivIndex].value.map(function (item) { return item.divId; }).indexOf(String(divId));
        if(removeIndexInside > -1){
          console.log('if small div exsits');
          //yes exists then no need to do anything
        } else {
          console.log('if small div doesnt exsit');
          const updatedOpenDivs = [...openDivs.current];
          updatedOpenDivs[openDivIndex].value.push({
            divId: divId, combinedAttributeName: childAttrib.combinedAttributeName,
            id: childAttrib.id, parentLinkedDataListAttribId: parentLinkedDataListAttribId
          });

          // Set the state with the updated copy
          openDivs.current = updatedOpenDivs;

          const childDiv = document.getElementById(divId);
          if (childDiv) {
            // Add validators for the child attribute field
            addValidators(
              childAttrib.combinedAttributeName,
              childAttrib.mandatoryFlag,
              childAttrib.attributeType.id,
              childAttrib.decimalFlag,
              childAttrib.systemAttribute
            );
            childDiv.classList.remove('hidden');
          }
        }
      }else{
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
                parentLinkedDataListAttribId: parentLinkedDataListAttribId
              }
            ]
          }
        ];        

        const childDiv = document.getElementById(divId);
        if (childDiv) {
          // Add validators for the child attribute field
          addValidators(
            childAttrib.combinedAttributeName,
            childAttrib.mandatoryFlag,
            childAttrib.attributeType.id,
            childAttrib.decimalFlag,
            childAttrib.systemAttribute
          );
          childDiv.classList.remove('hidden');
        }

      }
      const existingChildAttrib = findChildAttribByIdAndCombinedName(childAttrib.id, childAttrib.combinedAttributeName);
                if (existingChildAttrib) {
                  existingChildAttrib.lookupValues = childAttrib.lookupValues;
                  if (childAttrib.lookupValues.find(x => x.id == getValues(existingChildAttrib.combinedAttributeName))) {
                    invokeChildMethod(getValues(existingChildAttrib.combinedAttributeName), existingChildAttrib);
                  } else {
                  resetChildAttribsAndinvokeChildMethod(existingChildAttrib);
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
                  if (parentLinkedDataListAttribId === res.parentLinkedDataListAttribId && !childAttribDivIds.includes(res.divId)) {
                    let division = document.getElementById(res.divId);
                    if (division) {
                        // Reset field value using React Hook Form's setValue
                        setValue(res.combinedAttributeName, null);
                        
                        // Unregister the field to remove any validation rules
                        unregister(res.combinedAttributeName);

                        const childAttrib = findChildAttribByIdAndCombinedName(res.id, res.combinedAttributeName);

                        if (childAttrib) {
                          resetChildAttribsAndinvokeChildMethod(childAttrib);
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
              unregister(res.combinedAttributeName);

              const childAttrib = findChildAttribByIdAndCombinedName(res.id, res.combinedAttributeName);

              if (childAttrib) {
                resetChildAttribsAndinvokeChildMethod(childAttrib);
              }
              
              division.classList.add('hidden');
            }
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
    } catch (error) {
      console.error('Error in invokeChildMethod:', error);
    } finally {
      // Clear loading state for this dropdown
      setDropdownLoading(prev => ({
        ...prev,
        [field.combinedAttributeName]: false
      }));
    }
  }
}

function renderField(field) {
  const name = field.combinedAttributeName;
  if (field.isHidden) return null;
  
  // Get the validation rules for this field
  const validationRules = fieldValidations[name] || {};

  // --- SIMPLE TYPES ---
  if (field.attributeType.id === CustomAttributeTypeEnum.TEXT_SINGLE_LINE) {
    const currentValue = watch(name) || '';
    const maxChars = field.maxCharacters || null;
    
    return (
      <div key={name} className={styles.formField}>
        <label>
          {field.attributeName}
          {field.mandatoryFlag ? <span className="text-[#F64E60]">*</span> : null}
        </label>
        <div className={styles.fieldInputContainer}>
          <div className="relative">
            <input
              {...register(name, validationRules)}
              disabled={disabledFields.includes(field.combinedAttributeName)}
              maxLength={maxChars}
              className={`${styles.input} ${maxChars ? 'pr-8' : ''}`}
            />
          </div>
          <div className="flex justify-between items-center mt-1">
            {errors[name] && !disabledFields.includes(field.combinedAttributeName) && (
              <p className={styles.errorText}>{String(errors[name]?.message)}</p>
            )}
            {maxChars && (
              <span className="text-xs text-gray-500 ml-auto">
                {currentValue.length} / {maxChars}
              </span>
            )}
          </div>
          {field.instructions && <p className={styles.instructionText}>{field.instructions}</p>}
        </div>
      </div>
    );
  }

  if (field.attributeType.id === CustomAttributeTypeEnum.NUMERIC) {
    const hasLimits = field.minNumber || field.maxNumber;
    
    return (
      <div key={name} className={styles.formField}>
        <label>
          {field.attributeName}
          {field.mandatoryFlag ? <span className="text-[#F64E60]">*</span> : null}
        </label>
        <div className={styles.fieldInputContainer}>
          <div className="relative">
            <input
              type="number"
              {...register(name, validationRules || {
                min: field.minNumber,
                max: field.maxNumber,
              })}
              disabled={disabledFields.includes(field.combinedAttributeName)}
              className={`${styles.input} pr-8`}
              min={field.minNumber}
              max={field.maxNumber}
            />
          </div>
          <div className="flex justify-between items-center mt-1">
            {errors[name] && !disabledFields.includes(field.combinedAttributeName) && (
              <p className={styles.errorText}>{String(errors[name]?.message)}</p>
            )}
            {hasLimits && (
              <span className="text-xs text-gray-500 ml-auto">
                {field.minNumber && field.maxNumber ? `${field.minNumber}-${field.maxNumber}` : 
                 field.minNumber ? `Min: ${field.minNumber}` : 
                 field.maxNumber ? `Max: ${field.maxNumber}` : ''}
              </span>
            )}
          </div>
          {field.instructions && <p className={styles.instructionText}>{field.instructions}</p>}
        </div>
      </div>
    );
  }

  // --- SELECTS ---
  if (field.attributeType.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN||field.attributeType.id === CustomAttributeTypeEnum.DATA_LIST) {
    return (
      <div key={name} className={styles.formField}>
        <label>
          {field.attributeName}
          {field.mandatoryFlag ? <span className="text-[#F64E60]">*</span> : null}
        </label>
        <div className={styles.fieldInputContainer}>
          <Controller
            name={name}
            control={control}
            rules={validationRules || {}}
            render={({ field: controllerField }) => (
              <Select
                options={(field.lookupValues || []).map(opt => ({
                  value: opt.id,
                  label: opt.lookupValue
                }))}
                value={
                  (field.lookupValues || [])
                    .map(opt => ({ value: opt.id, label: opt.lookupValue }))
                    .find(opt => opt.value === controllerField.value) || null
                }
                onChange={(selectedOption) => {
                  const selectedValue = selectedOption?.value ?? "";
                  controllerField.onChange(selectedValue);
                  
                  // First reset all child fields before loading new ones
                  if (field.hasChildAttribute) {
                    resetAllChildFields(field);
                  }
                  
                  invokeChildMethod(+selectedValue, field); // Important for dependent fields
                }}
                isDisabled={disabledFields.includes(field.combinedAttributeName)}
                isLoading={dropdownLoading[field.combinedAttributeName] || false}
                placeholder="Select an option..."
                className={styles.singleSelect}
                classNamePrefix="select"
                menuPlacement="auto"
              />  
            )}
          />
          {errors[name] && !disabledFields.includes(field.combinedAttributeName) && (
            <p className={styles.errorText}>{String(errors[name]?.message)}</p>
          )}
          {field.instructions && <p className={styles.instructionText}>{field.instructions}</p>}
        </div>
      </div>
    );
  }

  if (field.attributeType.id === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
    const selected = watch(name) || [];
    const isLocked = field.isEdit === false;
    
    // Convert lookupValues to format expected by react-select
    const options = (field.lookupValues || []).map(opt => ({
      value: opt.id,
      label: opt.lookupValue
    }));
    
    // Get selected values in format for react-select
    const selectedOptions = options.filter(opt => selected.includes(opt.value));
    
    // Select All functionality
    const allFilteredOptions = options.filter(opt => 
      opt.label.toLowerCase().includes(search.toLowerCase())
    );
    const allFilteredIds = allFilteredOptions.map(opt => opt.value);
    
    // Custom Select All option
    const SelectAllOption = {
      value: 'select-all',
      label: 'Select All',
      isFixed: true
    };
    
    // Handle selection changes including Select All functionality
    const handleSelectChange = (selectedItems, actionMeta) => {
      // Check if user clicked the Select All option
      if (actionMeta.option?.value === 'select-all') {
        if (selected.length === allFilteredIds.length) {
          // If all are selected, clear the selection
          setValue(name, [], { shouldValidate: true });
        } else {
          // Otherwise select all filtered options
          setValue(name, allFilteredIds, { shouldValidate: true });
        }
        return;
      }
      
      // Normal option selection
      const newValues = selectedItems ? selectedItems.map(item => item.value) : [];
      setValue(name, newValues, { shouldValidate: true });
    };
    
    // Display custom Select All option at the top
    const customOptions = search.trim() !== '' 
      ? allFilteredOptions
      : [SelectAllOption, ...options];
    
    return (
      <div key={name} className={styles.formField}>
        <label>
          {field.attributeName}
          {field.mandatoryFlag ? <span className="text-[#F64E60]">*</span> : null}
          {isLocked && (
            <span className="inline-block ml-2 align-middle text-gray-400">
              <svg width="16" height="16" fill="currentColor"><path d="M8 1a3 3 0 00-3 3v3H3a1 1 0 00-1 1v7a1 1 0 001 1h10a1 1 0 001-1V8a1 1 0 00-1-1h-2V4a3 3 0 00-3-3zm-1 3a1 1 0 112 0v3H7V4zm-2 4h6v6H5V8z"/></svg>
            </span>
          )}
        </label>
        <div className={styles.fieldInputContainer}>
        <Controller
          name={name}
          control={control}
          rules={validationRules || {}}
          render={({ field: controllerField }) => (
            <Select
              isMulti
              options={customOptions}
              value={selectedOptions}
              onChange={handleSelectChange}
              onInputChange={(input) => setSearch(input)}
              inputValue={search}
              isDisabled={disabledFields.includes(field.combinedAttributeName)}
              placeholder="Select options..."
              className={styles.multiSelect}
              classNamePrefix="select"
              menuPlacement="auto"
              closeMenuOnSelect={false}
              hideSelectedOptions={false}
              formatOptionLabel={(option, {context}) => {
                if (context === 'menu') {
                  if (option.value === 'select-all') {
                    const allSelected = selected.length === allFilteredIds.length && allFilteredIds.length > 0;
                    return (
                      <div className={styles.multiSelectOption}>
                        <div className={styles.multiSelectCheckboxContainer}>
                          <input 
                            type="checkbox" 
                            checked={allSelected}
                            readOnly 
                            className={styles.multiSelectCheckbox}
                          />
                        </div>
                        <span className={styles.multiSelectLabel}>Select All</span>
                      </div>
                    );
                  }
                  return (
                    <div className={styles.multiSelectOption}>
                      <div className={styles.multiSelectCheckboxContainer}>
                        <input 
                          type="checkbox" 
                          checked={selected.includes(option.value)}
                          readOnly 
                          className={styles.multiSelectCheckbox}
                        />
                      </div>
                      <span className={styles.multiSelectLabel}>{option.label}</span>
                    </div>
                  );
                }
                // Default rendering for selected items
                return option.label;
              }}
            />
          )}
        />
          {errors[name] && !disabledFields.includes(field.combinedAttributeName) && (
            <p className={styles.errorText}>{String(errors[name]?.message)}</p>
          )}
          {field.instructions && <p className={styles.instructionText}>{field.instructions}</p>}
        </div>
      </div>
    );
  }

  // --- DATE ---
  if (field.attributeType.id === CustomAttributeTypeEnum.DATE || field.attributeType.id === CustomAttributeTypeEnum.DATE_TIME) {
    return (
      <div key={name} className={styles.formField}>
        <label>
          {field.attributeName}
          {field.mandatoryFlag ? <span className="text-[#F64E60]">*</span> : null}
        </label>
        <div className={styles.fieldInputContainer}>
          <Controller
            name={name}
            control={control}
            rules={validationRules || {}}
            render={({ field: controllerField }) => {
              // Format the date value for HTML input
              let formattedValue = "";
              const value = controllerField.value;
              
              if (value) {
                try {
                  // Handle ISO format dates (with timezone info)
                  const dateObj = new Date(value);
                  if (!isNaN(dateObj.getTime())) {
                    // Valid date object
                    if (field.attributeType.id === CustomAttributeTypeEnum.DATE) {
                      // For date fields: YYYY-MM-DD
                      const yyyy = dateObj.getFullYear();
                      const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
                      const dd = String(dateObj.getDate()).padStart(2, "0");
                      formattedValue = `${yyyy}-${mm}-${dd}`;
                    } else {
                      // For datetime-local fields: YYYY-MM-DDThh:mm
                      // Note: we remove seconds and timezone info
                      const yyyy = dateObj.getFullYear();
                      const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
                      const dd = String(dateObj.getDate()).padStart(2, "0");
                      const hh = String(dateObj.getHours()).padStart(2, "0");
                      const min = String(dateObj.getMinutes()).padStart(2, "0");
                      formattedValue = `${yyyy}-${mm}-${dd}T${hh}:${min}`;
                    }
                  } else if (typeof value === 'string') {
                    // If it's not a valid date object but is a string, try to use it directly
                    formattedValue = value;
                  }
                } catch (e) {
                  formattedValue = value;
                }
              }
              
              return (
                <input
                  type={field.attributeType.id === CustomAttributeTypeEnum.DATE ? "date" : "datetime-local"}
                  value={formattedValue} 
                  onChange={(e) => {
                    controllerField.onChange(e.target.value);
                  }}
                  onBlur={controllerField.onBlur}
                  className={styles.dateInput}
                  min={field.dateAttributes?.minDate}
                  max={field.dateAttributes?.maxDate}
                  disabled={disabledFields.includes(field.combinedAttributeName)}
                />
              );
            }}
          />
          {errors[name] && !disabledFields.includes(field.combinedAttributeName) && (
            <p className={styles.errorText}>{String(errors[name]?.message)}</p>
          )}
          {field.instructions && <p className={styles.instructionText}>{field.instructions}</p>}
        </div>
      </div>
    );
  }
  
  // --- RADIO ---
  if (field.attributeType.id === CustomAttributeTypeEnum.RADIO) {
    return (
      <div key={name} className={styles.formField}>
        <label>
          {field.attributeName}
          {field.mandatoryFlag ? <span className="text-[#F64E60]">*</span> : null}
        </label>
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
          {errors[name] && !disabledFields.includes(field.combinedAttributeName) && (
            <p className={styles.errorText}>{String(errors[name]?.message)}</p>
          )}
          {field.instructions && <p className={styles.instructionText}>{field.instructions}</p>}
        </div>
      </div>
    );
  }
  
  // --- TEXT MULTI-LINE ---
  if (field.attributeType.id === CustomAttributeTypeEnum.TEXT_MULTI_LINE) {
    const currentValue = watch(name) || '';
    const maxChars = field.maxCharacters || null;
    
    return (
      <div key={name} className={styles.formField}>
        <label>
          {field.attributeName}
          {field.mandatoryFlag ? <span className="text-[#F64E60]">*</span> : null}
        </label>
        <div className={styles.fieldInputContainer}>
          <div className="relative">
            <textarea
              {...register(name, validationRules || {
                maxLength: field.maxCharacters,
                minLength: field.minCharacters,
              })}
              disabled={disabledFields.includes(field.combinedAttributeName)}
              maxLength={maxChars}
              className={`${styles.textarea} ${maxChars ? 'pr-8' : ''}`}
            />
          </div>
          <div className="flex justify-between items-center mt-1">
            {errors[name] && !disabledFields.includes(field.combinedAttributeName) && (
              <p className={styles.errorText}>{String(errors[name]?.message)}</p>
            )}
            {maxChars && (
              <span className="text-xs text-gray-500 ml-auto">
                {currentValue.length} / {maxChars}
              </span>
            )}
          </div>
          {field.instructions && <p className={styles.instructionText}>{field.instructions}</p>}
        </div>
      </div>
    );
  }

  // --- FILES (IMAGE/DOCUMENT/VIDEO UPLOADS) ---
  if (field.attributeType.id === CustomAttributeTypeEnum.IMAGE) {
    return (
      <div key={name} className={styles.formField}>
        <label>
          {field.attributeName}
          {field.mandatoryFlag ? <span className="text-[#F64E60]">*</span> : null}
        </label>
        <Controller
          control={control}
          name={name}
          rules={validationRules || {}}
          render={({ field: { onChange, value } }) => (
            <ImageUpload 
              customAttr={field}
              onChange={onChange}
              value={value}
              disabled={disabledFields.includes(field.combinedAttributeName)}
              isControlHasError={(controlName, rule) =>
                !disabledFields.includes(field.combinedAttributeName) &&
                Boolean(
                  errors[controlName] &&
                    (rule === 'required' ? errors[controlName].type === 'required' : true)
                )}
            />
          )}
        />
      </div>
    );
  }
  
  // Handle AUDIO_VIDEO type with specialized component
  if (field.attributeType.id === CustomAttributeTypeEnum.AUDIO_VIDEO) {
    return (
      <div key={name} className={styles.formField}>
        <label>
          {field.attributeName}
          {field.mandatoryFlag ? <span className="text-[#F64E60]">*</span> : null}
        </label>
        <Controller
          control={control}
          name={name}
          rules={validationRules || {}}
          render={({ field: { onChange, value } }) => (
            <AudioVideoUpload
              customAttr={field}
              onChange={onChange}
              value={value}
              disabled={disabledFields.includes(field.combinedAttributeName)}
              isControlHasError={(controlName, rule) =>
                !disabledFields.includes(field.combinedAttributeName) &&
                Boolean(
                  errors[controlName] &&
                    (rule === 'required' ? errors[controlName].type === 'required' : true)
                )}
            />
          )}
        />
      </div>
    );
  }
  
  // DOCUMENT_UPLOAD
  if (field.attributeType.id === CustomAttributeTypeEnum.DOCUMENT_UPLOAD) {
    return (
      <div key={name} className={styles.formField}>
        <label>
          {field.attributeName}
          {field.mandatoryFlag ? <span className="text-[#F64E60]">*</span> : null}
        </label>
        <div className={styles.fieldInputContainer}>
          <input
            type="file"
            {...register(name, validationRules || {})}
            disabled={disabledFields.includes(field.combinedAttributeName)}
            className={styles.fileInput}
            accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
          />
          {errors[name] && !disabledFields.includes(field.combinedAttributeName) && (
            <p className={styles.errorText}>{String(errors[name]?.message)}</p>
          )}
          {field.instructions && <p className={styles.instructionText}>{field.instructions}</p>}
        </div>
      </div>
    );
  }

  // REFERENCE_DOCUMENTS
  if (field.attributeType.id === CustomAttributeTypeEnum.REFERENCE_DOCUMENTS) {
    return (
      <div key={name} className={styles.formField}>
        <label>
          {field.attributeName}
          {field.mandatoryFlag ? <span className="text-[#F64E60]">*</span> : null}
        </label>
        <RefDocumentViewer
          customAttr={field}
          fileArray={fileArray}
          baseUrl="https://static.qa.1channel.co/"
        />
      </div>
    );
  }

  // -- Extend for other types like EMAIL, TIME, etc. as needed --

  return null;
}

// Handle form submission with API call and toast notifications
function handleFormSubmit(e) {
  // Prevent submission if already submitting to avoid multiple clicks
  if (isSubmitting) return;
  
  handleSubmit(
    // Success case - form is valid
    async () => {
      try {
        setIsLoading(true);
        setIsSubmitting(true); // Disable the button
        const requestBody = addProduct();
        const response = await productService.addEditProduct(requestBody);
        
        // Close the modal regardless of response status
        onCancel();
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          // Show success notification with Material UI style
          enqueueSnackbar('Successfully added', { 
            variant: 'success',
          });
          
          // Call optional success callback if provided
          if (onSuccess) {
            onSuccess();
          }
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
      }
    },
    // Error case - validation failed
    (errors) => {
      setIsSubmitting(false); // Re-enable the button for validation errors
    }
  )(e);
};

function addProduct() {

  // TODO: Add actual API call to add Product

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
        element.attributeType.id == CustomAttributeTypeEnum.DATA_LIST) ) {
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
              resultArrayOfImages.push(
                {
                  'name': resultImage
                }
              )
            })
          }

          customAttributeValues.push({
            "attributeId": element.id,
            "value": resultArrayOfImages
          })
        }
      }
    });
    let addData = {
      "appVersion": null,
      "deviceInfo": null,
      "gps": null,
      "isActive": 1,
      "projectId": projectId,
      "customAttributeValues": customAttributeValues,
      "transTimeZone": "IST",
      "userTime": new Date().toISOString().slice(0, 19).replace('T', ' ')
      };

    return addData;
}

// ...
  return (
    <>
    <form  className={styles.formContainer}>
    {isFieldDataLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
          </div>
        ) : (
      <div className={styles.formContent}>
        <h3 className={styles.formTitle}>Add New {pageHeading}</h3>
          <div className={styles.formGrid}>
            {customAttributesList.map(field => (
              <div
                key={field.id}
                className={`${styles.fieldWrapper} ${field.parentId !== 0 && field.parentId !== null ? 'hidden' : ""}`}
                id={`div_${field.combinedAttributeName}_${field.id}`}
              >
                {renderField(field)}
              </div>
            ))}
          </div>
        
        
        <div className={styles.formActions}>
          <Button type="button" variant="outline" onClick={onCancel} className={styles.cancelBtn}>Cancel</Button>
          <Button 
            type="submit" 
            className={styles.submitBtn}
            disabled={isLoading || isFieldDataLoading || isSubmitting}
            onClick={(e) => {
              e.preventDefault(); // Prevent any default behavior
              handleFormSubmit(e);
            }}
          >
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    )}
    </form>
    </>
  );
};
export default AddForm;
