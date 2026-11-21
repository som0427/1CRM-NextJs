import { FC, useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import styles from '@/styles/addEditForm.module.css';
import settingsService from '@/lib/services/settingsService';
import { SystemAttributeEnum } from '@/lib/constants/SystemAttributeEnum.constant';
import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';
import { cloneDeep } from 'lodash';
import { CustomAttributePreDefLookupEnum } from '@/lib/constants/CustomAttributePreDefLookupEnum';
import userService from '@/lib/services/userService';
import customerService from '@/lib/services/customerService';
import TextInput from '@/components/common/input-fields/TextInput';
import TextArea from '@/components/common/input-fields/TextArea';
import Select from '@/components/common/input-fields/Select';
import MultiSelect from '@/components/common/input-fields/MultiSelect';
import DateInput from '@/components/common/input-fields/DateInput';
import DateTimeInput from '@/components/common/input-fields/DateTimeInput';
import DisplayText from '@/components/common/input-fields/DisplayText';
import UploadInput from '@/components/common/input-fields/UploadInput';
import ReferenceDocuments from '@/components/common/input-fields/ReferenceDocuments';
import opportunityService from '@/lib/services/opportunityService';
import { useSnackbar } from 'notistack';
import { useEntityHeading } from '@/hooks/useEntityHeading';
import { PreloadedOpportunityFormData } from '@/components/opportunities/AddEditForm/subs/formDataPreloader';
import Form from '@/components/common/Form';
import Spinner from '@/components/common/Spinner';
import FormField from '@/components/common/input-fields/FormField';


interface EditFormProps {
  onCancel: () => void;
  onSuccess?: () => void;
  onSubmittingChange?: (isSubmitting: boolean) => void;
  onApiLoadingChange?: (isLoading: boolean) => void;
  onApiError?: (error: string | null) => void;
  isLoading?: boolean;
  source?: 'self' | 'team' | 'all';
  opportunityId?: any;
  isEditAllowed?: boolean;
  preloadedData?: PreloadedOpportunityFormData;
  hideInternalActions?: boolean;
  hideHeading?: boolean;
  approvalFieldVisibilityConfig?: any[];
  onApprovalFormDataReady?: (getFormData: () => any) => void;
}


const EditForm: FC<EditFormProps> = ({
 // onSubmit,
  onCancel,
  onSuccess,
  onSubmittingChange,
  onApiLoadingChange,
  onApiError,
  isLoading: initialLoading = false,
  source = 'self',
  opportunityId,
  isEditAllowed = true,
  preloadedData,
  hideInternalActions = false,
  hideHeading = false,
  approvalFieldVisibilityConfig,
  onApprovalFormDataReady,
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
  const [serialNo, setSerialNo] = useState<string>('');
  const fieldVisibilitySettingsAppliedForFirstTime = useRef<boolean>(false);
  // Add this state to track disabled fields
  const [disabledFields, setDisabledFields] = useState<string[]>([]);
  const customAttributesListRef = useRef<any[]>([]);

  const [isApiLoading, setIsApiLoading] = useState<boolean>(false);
  
  // File upload related state
  const [fileArray, setFileArray] = useState<{ [key: string]: any }>({});

  const documentIconUrlMap = new Map([
    ["pdf", "/svg/icons/general/PDF-File.svg"],
    ["docx", "/svg/icons/general/file-alt-solid.svg"],
    ["xlsx", "/svg/icons/general/file-excel-solid.svg"],
    ["pptx", "/svg/icons/general/file-powerpoint-solid.svg"]
  ]);


// Get entity-specific heading using the custom hook
  const pageHeading = useEntityHeading('Opportunities');


  // Initialize useForm with dynamic defaults
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    getValues,
    unregister,
    formState: { errors },
  } = useForm({
    defaultValues, // Will be updated once defaults are set
    mode: 'onChange',
  });

  useEffect(() => {
      processPreloadedData();
  }, []);

  // Apply approval field visibility to a field and its children
  const applyApprovalVisibilityToFieldAndChildren = (field: any, approvalVisibility: number, disabledFieldsToAdd: string[]) => {
    if (approvalVisibility === 2) {
      if (!fieldVisibilityNotAttributeIds.includes(field.attributeType.id)) {
        field['isHidden'] = true;
      }
    } else if (approvalVisibility === 1) {
      if (!fieldVisibilityNotAttributeIds.includes(field.attributeType.id) && !field['isHidden']) {
        if (!disabledFieldsToAdd.includes(field.combinedAttributeName)) {
          disabledFieldsToAdd.push(field.combinedAttributeName);
        }
        field['isEdit'] = false;
      }
    }

    if (field.childAttributeList && field.childAttributeList.length > 0) {
      field.childAttributeList.forEach((child: any) => {
        applyApprovalVisibilityToFieldAndChildren(child, approvalVisibility, disabledFieldsToAdd);
      });
    }
  };

  // Effect to apply approval field visibility config
  useEffect(() => {
    // Only apply approval visibility if we have config (even empty array means approval mode)
    if (!approvalFieldVisibilityConfig) return;
    if (!customAttributesListRef.current || customAttributesListRef.current.length === 0) return;

    const disabledFieldsToAdd: string[] = [];
    const fieldsToEnable: string[] = []; // Fields with visibility=3 should be enabled

    // Build a map of parent field id -> fieldVisibility for child lookup
    const parentVisibilityMap = new Map<number, number>();

    // Helper to collect fields to enable (for visibility=3)
    const collectFieldsToEnable = (field: any) => {
      if (!fieldVisibilityNotAttributeIds.includes(field.attributeType?.id)) {
        fieldsToEnable.push(field.combinedAttributeName);
        field['isEdit'] = true;
        field['isHidden'] = false;
      }
      if (field.childAttributeList && field.childAttributeList.length > 0) {
        field.childAttributeList.forEach((child: any) => collectFieldsToEnable(child));
      }
    };

    // First pass: Process top-level fields (parentId === 0 or null/undefined)
    customAttributesListRef.current
      .filter((field) => field.parentId === 0 || field.parentId === null || field.parentId === undefined)
      .forEach((field) => {
        const approvalConfig = approvalFieldVisibilityConfig.find((c: any) => c.attributeId == field.id);
        
        // Determine visibility: from config or default to 1 (locked)
        const fieldVisibility = approvalConfig ? approvalConfig.fieldVisibility : 1;
        
        // Store parent's visibility for child lookup
        parentVisibilityMap.set(field.id, fieldVisibility);
        
        if (fieldVisibility === 3) {
          // Enable field and its children
          collectFieldsToEnable(field);
        } else {
          // Apply visibility 1 (locked) or 2 (hidden) to field and its childAttributeList
          applyApprovalVisibilityToFieldAndChildren(field, fieldVisibility, disabledFieldsToAdd);
        }
      });

    // Second pass: Process child fields that exist as separate entries (parentId > 0)
    // These inherit their parent's visibility
    const remainingChildFields = customAttributesListRef.current.filter(
      (field) => field.parentId && field.parentId > 0
    );
    
    let unresolved = [...remainingChildFields];
    let safetyCounter = 0;
    
    while (unresolved.length > 0 && safetyCounter < remainingChildFields.length + 5) {
      const nextUnresolved: any[] = [];
      
      unresolved.forEach((field) => {
        const parentVisibility = parentVisibilityMap.get(field.parentId);
        const fieldVisibility = parentVisibility !== undefined ? parentVisibility : undefined;
        
        if (fieldVisibility === undefined) {
          nextUnresolved.push(field);
          return;
        }
        
        parentVisibilityMap.set(field.id, fieldVisibility);
        
        if (fieldVisibility === 3) {
          collectFieldsToEnable(field);
        } else {
          applyApprovalVisibilityToFieldAndChildren(field, fieldVisibility, disabledFieldsToAdd);
        }
      });
      
      if (nextUnresolved.length === unresolved.length) {
        nextUnresolved.forEach((field) => {
          parentVisibilityMap.set(field.id, 1);
          applyApprovalVisibilityToFieldAndChildren(field, 1, disabledFieldsToAdd);
        });
        break;
      }
      
      unresolved = nextUnresolved;
      safetyCounter += 1;
    }

    // Update disabled fields: add new disabled ones and remove enabled ones
    setDisabledFields((prev) => {
      let updated = [...prev];
      // Add new disabled fields
      disabledFieldsToAdd.forEach((f) => {
        if (!updated.includes(f)) {
          updated.push(f);
        }
      });
      // Remove fields that should be enabled (visibility=3)
      if (fieldsToEnable.length > 0) {
        updated = updated.filter((f) => !fieldsToEnable.includes(f));
      }
      return updated;
    });

    setCustomAttributesList([...customAttributesListRef.current]);
  }, [approvalFieldVisibilityConfig]);

  const processPreloadedData = () => {
    setIsFieldDataLoading(true);
    onApiLoadingChange?.(true);
    try {
      if (preloadedData?.visibilityResponse?.responseData) {
        let allConfig: any[] = [];
        preloadedData.visibilityResponse.responseData
          .filter((x: any) => x['fieldVisibilityConfig'])
          .forEach((x: any) => {
            allConfig.push(...x['fieldVisibilityConfig']);
          });
        fieldVisibilityConfig.current = allConfig;
      }

      const fieldData = preloadedData?.fieldApiResponse?.responseData || [];
      const opportunityData = preloadedData?.opportunityDetailResponse?.responseData?.[0];

      const processedFieldData = processGetFieldApiResponse(fieldData, opportunityData);

      let customAttributesListTemp: any[] = [];
      (processedFieldData as Array<any>).forEach(field => {
        customAttributesListTemp.push(field);
        if (field.attributeType.id == CustomAttributeTypeEnum.DATA_LIST && field.childAttributeList !== null && field.childAttributeList.length > 0) {
          customAttributesListTemp.push(...field.childAttributeList);
        }
      });
      customAttributesListTemp = customAttributesListTemp.map(x => {
        x['isHidden'] = false;
        x['isEdit'] = true;
        return x;
      });

      customAttributesListRef.current = customAttributesListTemp;
      setupfieldVisibilityConfigurationAndValue();
      setCustomAttributesList(customAttributesListTemp);
    } catch (error) {
      console.error('Error processing preloaded data:', error);
    } finally {
      setIsFieldDataLoading(false);
      onApiLoadingChange?.(false);
    }
  };

  function removeValidationForHiddenField(fieldName: string) {
     setFieldValidations(prev => {
       const updated = { ...prev };
       if (updated[fieldName]) {
         delete updated[fieldName];
       }
       return updated;
     });
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

    if (approvalFieldVisibilityConfig && approvalFieldVisibilityConfig.length > 0) {
      const disabledFieldsToAdd: string[] = [];
      const fieldsToEnable: string[] = [];
      const parentVisibilityMap = new Map<number, number>();

      const collectFieldsToEnable = (field: any) => {
        if (!fieldVisibilityNotAttributeIds.includes(field.attributeType?.id)) {
          fieldsToEnable.push(field.combinedAttributeName);
          field['isEdit'] = true;
          field['isHidden'] = false;
        }
        if (field.childAttributeList && field.childAttributeList.length > 0) {
          field.childAttributeList.forEach((child: any) => collectFieldsToEnable(child));
        }
      };

      customAttributesListRef.current
        .filter((field) => field.parentId === 0 || field.parentId === null || field.parentId === undefined)
        .forEach((field) => {
          const approvalConfig = approvalFieldVisibilityConfig.find((c: any) => c.attributeId == field.id);
          const fieldVisibility = approvalConfig ? approvalConfig.fieldVisibility : 1;
          parentVisibilityMap.set(field.id, fieldVisibility);
          if (fieldVisibility === 3) {
            collectFieldsToEnable(field);
          } else {
            applyApprovalVisibilityToFieldAndChildren(field, fieldVisibility, disabledFieldsToAdd);
          }
        });

      const remainingChildFields = customAttributesListRef.current.filter(
        (field) => field.parentId && field.parentId > 0
      );
      
      let unresolved = [...remainingChildFields];
      let safetyCounter = 0;
      
      while (unresolved.length > 0 && safetyCounter < remainingChildFields.length + 5) {
        const nextUnresolved: any[] = [];
        
        unresolved.forEach((field) => {
          const parentVisibility = parentVisibilityMap.get(field.parentId);
          const fieldVisibility = parentVisibility !== undefined ? parentVisibility : undefined;
          
          if (fieldVisibility === undefined) {
            nextUnresolved.push(field);
            return;
          }
          
          parentVisibilityMap.set(field.id, fieldVisibility);
          
          if (fieldVisibility === 3) {
            collectFieldsToEnable(field);
          } else {
            applyApprovalVisibilityToFieldAndChildren(field, fieldVisibility, disabledFieldsToAdd);
          }
        });
        
        if (nextUnresolved.length === unresolved.length) {
          nextUnresolved.forEach((field) => {
            parentVisibilityMap.set(field.id, 1);
            applyApprovalVisibilityToFieldAndChildren(field, 1, disabledFieldsToAdd);
          });
          break;
        }
        
        unresolved = nextUnresolved;
        safetyCounter += 1;
      }

      setDisabledFields((prev) => {
        let updated = [...prev];
        disabledFieldsToAdd.forEach((f) => {
          if (!updated.includes(f)) {
            updated.push(f);
          }
        });
        if (fieldsToEnable.length > 0) {
          updated = updated.filter((f) => !fieldsToEnable.includes(f));
        }
        return updated;
      });
    }

    fieldVisibilitySettingsAppliedForFirstTime.current = true;
    setCustomAttributesList(customAttributesListRef.current);
   }

   // Add this function to your component
function isEmptyValue(value: any): boolean {
  // Check for null or undefined first
  if (value === null || value === undefined) {
    return true;
  }
  
  // Special case for numbers - NEVER consider them empty
  if (typeof value === 'number') {
    return false; // All numbers (including 0) are NOT empty
  }
  
  // For strings
  if (typeof value === 'string') {
    return value.trim() === '';
  }
  return !value;
}

  // Function to handle field visibility for hidden fields
 function setupFieldVisibilityForHidden(fields: any, fieldsconfig: any) {
    if (fields.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN && fields.parentLinkedDataListAttribId) {
      if (fieldsconfig.parentDataListId == fields.parentLinkedDataListAttribId) {
        if (isEmptyValue(watch(fields.combinedAttributeName)) && fieldsconfig.value) {
          setValue(fields.combinedAttributeName, Number(fieldsconfig.value));
        }
        fields['isHidden'] = true;
      }
    } else if (fields.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN && [SystemAttributeEnum.OPPORTUNITY_GEO_FIELD_ID].includes(fields.systemAttribute?.id)) {
      const countryStateCityVals = (fieldsconfig.value as string).split("->")
      if (!fieldVisibilitySettingsAppliedForFirstTime.current) {
        // Using setValue instead of Angular-style form controls
        setValue('countryName', countryStateCityVals[0]);
        setValue('stateName', countryStateCityVals[1]);
        setValue('cityName', countryStateCityVals[2]);
      }
      fields['isHidden'] = true;
    } else if (fields.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN && fields.parentLinkedDataListAttribId == null) {
      if (isEmptyValue(watch(fields.combinedAttributeName)) && fieldsconfig.value) {
        setValue(fields.combinedAttributeName, Number(fieldsconfig.value));
      }
      fields['isHidden'] = true;
    } else if (fields.attributeType.id == CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
      if (isEmptyValue(watch(fields.combinedAttributeName)) && fieldsconfig.value) {
        const rawIds = fieldsconfig.value.split(',').map((v: any) => String(v).trim()).filter(Boolean);
        const allowed = new Set((fields.lookupValues || []).map((opt: any) => String(opt.id)));
        const filteredIds = rawIds.filter((id: string) => allowed.has(id));
        setValue(fields.combinedAttributeName, filteredIds);
      }
      fields['isHidden'] = true;
    } else if (fields.attributeType.id == CustomAttributeTypeEnum.IMAGE || fields.attributeType.id == CustomAttributeTypeEnum.DOCUMENT_UPLOAD || fields.attributeType.id == CustomAttributeTypeEnum.AUDIO_VIDEO) {
      if (isEmptyValue(watch(fields.combinedAttributeName)) && fieldsconfig.value) {
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
      if (isEmptyValue(watch(fields.combinedAttributeName)) && fieldsconfig.value) {
        setValue(fields.combinedAttributeName,+fieldsconfig.value);
        if (fields.parentId === 0 && fields.hasChildAttribute) {
          invokeChildMethod(+fieldsconfig.value, fields, true); // true = isCalledInternally (initial load)
        }
      }
      fields['isHidden'] = true
    }
    else {
      if (isEmptyValue(watch(fields.combinedAttributeName)) && fieldsconfig.value) {
        setValue(fields.combinedAttributeName,fieldsconfig.value);
      }
      fields['isHidden'] = true
    }
  }
  async function setupFieldVisibilityforViewOnly(fields: any, fieldsconfig: any) {
    if (fields.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN && fields.parentLinkedDataListAttribId) {
      if (fieldsconfig.parentDataListId == fields.parentLinkedDataListAttribId) {
        if (isEmptyValue(watch(fields.combinedAttributeName)) && fieldsconfig.value) {
          setValue(fields.combinedAttributeName, +fieldsconfig.value);
        }
        setDisabledFields(prev => [...prev, fields.combinedAttributeName]);
        fields['isEdit'] = false;
      }
    } else if (fields.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN && fields.parentLinkedDataListAttribId == null) {
      if (fieldsconfig.value) {
        if (isEmptyValue(watch(fields.combinedAttributeName)) && fieldsconfig.value) {
          setValue(fields.combinedAttributeName, +fieldsconfig.value);
          if (fields.hasChildAttribute) {
            await invokeChildMethod(fieldsconfig.value, fields, true); // true = isCalledInternally (initial load)
          }
        }
      }
      setDisabledFields(prev => [...prev, fields.combinedAttributeName]);
      fields['isEdit'] = false;
    } else if (fields.attributeType.id == CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
      if (fieldsconfig.value) {
        if (isEmptyValue(watch(fields.combinedAttributeName)) && fieldsconfig.value) {
          const rawIds = fieldsconfig.value.split(',').map((v: any) => String(v).trim()).filter(Boolean);
          const allowed = new Set((fields.lookupValues || []).map((opt: any) => String(opt.id)));
          const filteredIds = rawIds.filter((id: string) => allowed.has(id));
          setValue(fields.combinedAttributeName, filteredIds);
        }
      }
      setDisabledFields(prev => [...prev, fields.combinedAttributeName]);
      fields['isEdit'] = false;
    } else if (fields.attributeType.id == CustomAttributeTypeEnum.IMAGE || fields.attributeType.id == CustomAttributeTypeEnum.DOCUMENT_UPLOAD || fields.attributeType.id == CustomAttributeTypeEnum.AUDIO_VIDEO) {
      let files = [];
      this.fileArray[fields.combinedAttributeName].showUploadIcon = false;
      this.fileArray[fields.combinedAttributeName].showDeleteOption = false;
      if (fieldsconfig.value) {
        if (isEmptyValue(watch(fields.combinedAttributeName)) && fieldsconfig.value) {
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
        if (isEmptyValue(getValues(fields.combinedAttributeName))) {
          setValue(fields.combinedAttributeName, +fieldsconfig.value);
          if (fields.parentId === 0 && fields.hasChildAttribute) {
            await invokeChildMethod(+fieldsconfig.value, fields, true); // true = isCalledInternally (initial load)
          }
        }
      }
      setDisabledFields(prev => [...prev, fields.combinedAttributeName]);
      fields['isEdit'] = false;
    }
    else {
      if (fieldsconfig.value) {
        if (isEmptyValue(watch(fields.combinedAttributeName)) && fieldsconfig.value) {
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
    
    for (const attribute of responseData) {
      if (attribute.isActive === 1) {
        const attributeTypeId = attribute.attributeType.id;
        const attributeId = attribute.id;

        switch (attributeTypeId) {
          case CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN:
          case CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN:
            promises.push(setLookupFieldValue(attributeId, attribute));
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

  const setLookupFieldValue = async (attribId: number, editCustomVal: any) => {
try {
    if(editCustomVal.systemAttribute?.id==SystemAttributeEnum.OPPORTUNITY_OWNER_FIELD_ID){
      const row = await userService.getOwner(projectId, SystemAttributeEnum.OPPORTUNITY_MODULE);
      if (row['statusCode'] == 200) {
        // Get current user ID from localStorage
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const userId = userData.userId ? +userData.userId : null;

        // Process lookup values
        row['responseData'].forEach((item: any) => {
          item.lookupValue = item.fullName;
          
          // Find the current user in the options list
          if (userId && item.id === userId) {
            // Set the form value for the owner field
            setValue(editCustomVal.combinedAttributeName, userId);
          }
        });
        
        editCustomVal.lookupValues = row['responseData'];
      }
    }else if(editCustomVal.systemAttribute?.id==SystemAttributeEnum.OPPORTUNITY_COMPANY_NAME_FIELD_ID){
      // Convert source string to number: self=1, team=2, all=3
      const sourceNum = source === 'self' ? 1 : source === 'team' ? 2 : 3;
      const row = await customerService.getCompanyIdName(projectId, SystemAttributeEnum.OPPORTUNITY_MODULE, sourceNum);
      if (row['statusCode'] == 200) {
        row['responseData'].forEach((item: any) => {
          item.lookupValue = item.name;
        });
        editCustomVal.lookupValues = row['responseData'];
      }
    } else if(editCustomVal.systemAttribute?.id==SystemAttributeEnum.OPPORTUNITY_CONTACT_FIELD_ID){
      const row = await opportunityService.getUserContacts(projectId);
      if (row['statusCode'] == 200) {
        row['responseData'].forEach((res: any) => {
          res.lookupValue = res.contactName;
          res.id = res.contactId;
        });
        editCustomVal.lookupValues = row['responseData'];
      }
    }
    else{
        const row = await settingsService.getAttribLookup(attribId);
        if (row['statusCode'] == 200) {
          editCustomVal.lookupValues = row['responseData'];
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
  
  
  function processGetFieldApiResponse(fieldData: any[], editOpportunityData: any) {

    // Process fields and set up default values
    const validationSchema = {};

    fieldData = fieldData.filter(ele => {
      if(ele.isActive === 1){
        return ele.systemAttribute?.id !== SystemAttributeEnum.OPPORTUNITY_GEO_FIELD_ID;
      }
      return false;
    });

    if (editOpportunityData && editOpportunityData.serialNo) {
      setSerialNo(editOpportunityData.serialNo);
      setValue('serialNo', editOpportunityData.serialNo);
    }
  
    fieldData.forEach(async (field) => {
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

          if (!isEditAllowed) {
            setDisabledFields(prev => [...prev, field.combinedAttributeName]);

          }

          editOpportunityData.customAttributeValues.forEach(ele => {
            if (ele.attributeId == field.id) {
              if (ele.value.length > 0) {
                setValue(field.combinedAttributeName, ele.value[0].name);
              }
            }
          })
          break;

        case CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN:
          let controlValue = 0;
          if (!isEditAllowed) {
            setDisabledFields(prev => [...prev, field.combinedAttributeName]);

          }
          editOpportunityData.customAttributeValues.forEach(ele => {
            if (ele.attributeId == field.id) {
              if (ele.value.length > 0) {
                setValue(field.combinedAttributeName, +ele.value[0].id);
                controlValue = ele.value[0].id;
                if (field.systemAttribute && field.systemAttribute.id == SystemAttributeEnum.OPPORTUNITY_COMPANY_NAME_FIELD_ID){ // for company based contacts
                  getContactsBasedOnCompanyId(projectId, +ele.value[0].id, customAttributesListRef, setCustomAttributesList);
                }

              }
            }
          });

         

          if (field.parentId === 0 && field.hasChildAttribute) {
            setTimeout(() => {
              invokeChildMethod(controlValue, field, true); // true = isCalledInternally (initial load)
            }, 10);
          }
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

          if (!isEditAllowed) {
            setDisabledFields(prev => [...prev, field.combinedAttributeName]);
          }
          let multiSelectArray: string[] = [];
          editOpportunityData.customAttributeValues.forEach(ele => {
            if (ele.attributeId == field.id) {
              if (ele.value.length > 0) {
                if (ele.value.length > 0) {
                  const allowed = new Set((field.lookupValues || []).map((opt: any) => String(opt.id)));
                  ele.value.forEach(res => {
                    const idStr = String(res.id);
                    if (allowed.has(idStr)) {
                      multiSelectArray.push(idStr);
                    }
                  });
                  setValue(field.combinedAttributeName, multiSelectArray);
                }
              }
            }
          })
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
          
          // Set edit permissions for numeric fields (moved outside the validation block)
          if (!isEditAllowed) {
            setDisabledFields(prev => [...prev, field.combinedAttributeName]);
          }

          // Process numeric field data from API (moved outside the validation block)
          editOpportunityData.customAttributeValues.forEach(ele => {
            if (ele.attributeId == field.id) {
              if (ele.value.length > 0) {
                setValue(field.combinedAttributeName, +ele.value[0].name);
              }
            }
          });
          break;
        case CustomAttributeTypeEnum.RADIO:
          if (!isEditAllowed) {
            setDisabledFields(prev => [...prev, field.combinedAttributeName]);
          }

          editOpportunityData.customAttributeValues.forEach(ele => {
            if (ele.attributeId == field.id) {
              if (ele.value.length > 0) {
                setValue(field.combinedAttributeName, +ele.value[0].id);
              }
            }
          })
          break;
        case CustomAttributeTypeEnum.DATE:      
        case CustomAttributeTypeEnum.DATE_TIME:
          // Process date field values
          const dateAttributes = processDateField(field);
          // Add the validation rules
          validationRules.validate = dateAttributes.validationRules?.validate || {};
          
          // Add minDate and maxDate to the field
          if (!field.dateAttributes) field.dateAttributes = {};
          field.dateAttributes.minDate = dateAttributes.minDate;
          field.dateAttributes.maxDate = dateAttributes.maxDate;
          
          // Set date value from opportunity data if available
          if (editOpportunityData && editOpportunityData.customAttributeValues) {
            editOpportunityData.customAttributeValues.forEach(ele => {
              if (ele.attributeId === field.id && ele.value && ele.value.length > 0) {
                const dateValue = ele.value[0].name;
                
                // Set the date value in the correct format
                if (field.attributeType.id === CustomAttributeTypeEnum.DATE_TIME) {
                  const formattedValue = dateValue.includes(' ') ? 
                    dateValue.replace(' ', 'T') : dateValue;
                  setValue(field.combinedAttributeName, formattedValue);
                } else {
                  // For regular date fields
                  setValue(field.combinedAttributeName, dateValue);
                }
              }
            });
          }
          
          break;
        case CustomAttributeTypeEnum.IMAGE:
        case CustomAttributeTypeEnum.DOCUMENT_UPLOAD:
        case CustomAttributeTypeEnum.AUDIO_VIDEO:
          value = [];
          
          // Process image/document/video data from API response
          if (editOpportunityData && editOpportunityData.customAttributeValues) {
            editOpportunityData.customAttributeValues.forEach(ele => {
              if (ele.attributeId == field.id && ele.value && ele.value.length > 0) {
                // Create file objects with proper structure for UploadInput component
                const baseUrl = process.env.NEXT_PUBLIC_STATIC_FILE_BASE_URL || '';
                const filesArray = ele.value.map((file: any) => {
                  let serverPath = file.name;
                  if (serverPath && serverPath.startsWith('https://')) {
                    // Extract path after the domain (find first / after https://)
                    const urlParts = serverPath.replace('https://', '').split('/');
                    urlParts.shift(); // Remove domain part
                    serverPath = urlParts.join('/');
                  }
                  const fileName = serverPath?.split('/').pop() || serverPath;
                  return {
                    name: fileName,
                    serverUrl: serverPath,
                    url: `${baseUrl}${serverPath}`, // Full URL for display
                    size: 0,
                    type: '', // Will be determined by extension in component
                    isUploading: false
                  };
                });
                setValue(field.combinedAttributeName, filesArray);
              }
            });
          }
          break;

        case CustomAttributeTypeEnum.DATA_LIST:
  
          if (field.mandatoryFlag == 1 && field.parentId === 0) {
            validationRules.required = field.mandatoryFlag ? (field.requiredErrorMsg || "This field is required") : false;
          } else {
            validationRules.required = false;
          }

         // START::setting value to main datalist field
         let attributeValue = 0;
        editOpportunityData.customAttributeValues.forEach(ele => {

          if (ele.attributeId == field.id) {

            if (ele.value.length > 0) {
              const selectedValue = ele.value[0]?.id ?? ele.value[0]?.name;
              if (selectedValue !== undefined && selectedValue !== null && String(selectedValue).length > 0) {
                setValue(field.combinedAttributeName, selectedValue);
                attributeValue = selectedValue;
              }
            }
          }
        });
  
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
                  //this.addOpportunityForm.addControl(childElement.combinedAttributeName, new FormControl('', Validators.compose([Validators.required])));
                } else {
                  validationRulesForChildDataList.required = false;
                }
              }
              validationSchema[childElement.combinedAttributeName] = validationRulesForChildDataList;

              if (!isEditAllowed) {
                setDisabledFields(prev => [...prev, field.combinedAttributeName]);
              }
              // START::setting value to child datalist field
              editOpportunityData.customAttributeValues.forEach(ele => {

                if (ele.attributeId == childElement.id && ele.parentLinkedDatalistAttribId == childElement.parentLinkedDataListAttribId) {

                  if (ele.value.length > 0) {
                    const selectedValue = ele.value[0]?.id ?? ele.value[0]?.name;
                    if (selectedValue !== undefined && selectedValue !== null && String(selectedValue).length > 0) {
                      setValue(childElement.combinedAttributeName, selectedValue);
                    }
                  }
                }
              });
            }
            );
            if (field.hasChildAttribute && attributeValue > 0) {
              await invokeChildMethod(attributeValue, field, true); // true = isCalledInternally (initial load)
            }
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
  async function getContactsBasedOnCompanyId(projectId: any, lookupId: number, customAttributesListRef, setCustomAttributesList) {
    const row = await opportunityService.getCustomerContact(projectId, lookupId);
  
    if (row['statusCode'] == 200) {
      row['responseData'].forEach((res: any) => {
        res.lookupValue = res.contactName;
        res.id = res.contactId;
      });
      const matchedAttribute = customAttributesListRef.current.find(
        (ele: any) => ele.systemAttribute?.id == SystemAttributeEnum.OPPORTUNITY_CONTACT_FIELD_ID
      );
  
      if (matchedAttribute) {
        matchedAttribute.lookupValues = row['responseData'];
        setCustomAttributesList([...customAttributesListRef.current]);
      }
    }
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
  
}

function findChildAttribByIdAndCombinedName(id: number, combinedAttributeName: string): any {
  return  customAttributesListRef.current.find(item => item.id == id && item.combinedAttributeName == combinedAttributeName);
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
      /*
      // Check if fileArray exists and has files for this field
      if (fileArray && fileArray[childAttrib.combinedAttributeName]?.files?.length > 0) {
        const selectedFileLength = fileArray[childAttrib.combinedAttributeName].files.length;
        // Remove all files
        for (let index = 0; index < selectedFileLength; index++) {
          removeFile(childAttrib.combinedAttributeName, 0);
        }
      }
        */
      setValue(childAttrib.combinedAttributeName, []);
    }
    
    // For dropdowns, invoke child method to clear dependent fields
    if (childAttrib.attributeType.id === CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN) {
       invokeChildMethod(0, childAttrib);
    }
  }
}
async function invokeChildMethod(lookupId: number, field: any, isCalledInternally: boolean = false): Promise<void> {
  // Set loading state at the very beginning
    setIsApiLoading(true);
    onApiLoadingChange?.(true);
  
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
    if(field.systemAttribute && field.systemAttribute.id == SystemAttributeEnum.OPPORTUNITY_COMPANY_NAME_FIELD_ID){ // for company based contacts
      await getContactsBasedOnCompanyId(projectId, lookupId, customAttributesListRef, setCustomAttributesList);
    }

  
  
    if(field.hasChildAttribute) {
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
                    
                    // Check if this is a file-type field (IMAGE, DOCUMENT_UPLOAD, AUDIO_VIDEO)
                    const isFileType = [
                      CustomAttributeTypeEnum.IMAGE,
                      CustomAttributeTypeEnum.DOCUMENT_UPLOAD,
                      CustomAttributeTypeEnum.AUDIO_VIDEO
                    ].includes(existingChildAttrib.attributeType?.id);
                    const currentFileValue = getValues(existingChildAttrib.combinedAttributeName);
                    const hasExistingFileValue = isFileType && Array.isArray(currentFileValue) && currentFileValue.length > 0;
                    
                    if (hasExistingFileValue && isCalledInternally) {
                      // On initial load (isCalledInternally=true), preserve existing file values - don't reset
                    } else if (childAttrib.lookupValues && childAttrib.lookupValues.find(x => x.id == watch(existingChildAttrib.combinedAttributeName))) {
                      invokeChildMethod(getValues(existingChildAttrib.combinedAttributeName), existingChildAttrib, isCalledInternally);
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
    }else{
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
              // Remove validation for this hidden field
              removeValidationForHiddenField(res.combinedAttributeName);
            }
            division.classList.add('hidden');
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
    
    }
    // Reset loading state after invokeChildMethod completes
    setIsApiLoading(false);
    onApiLoadingChange?.(false);
}

// 4. Render dynamic fields
const buildSelectOptions = (lookupValues: any[], currentValue: any) => {
  const options = (lookupValues || []).map(opt => ({
    value: String(opt.id),
    label: opt.lookupValue
  }));

  // Build lookupMap as Map<string, SelectOption[]> (label -> array of options) for Select.tsx search
  const lookupMap = new Map<string, { value: string; label: string }[]>();
  options.forEach(opt => {
    const key = opt.label ? opt.label.toString().toLowerCase().trim() : '';
    if (!lookupMap.has(key)) {
      lookupMap.set(key, []);
    }
    lookupMap.get(key)!.push(opt);
  });

  const LIMIT = 100;
  let limitedOptions = options;
  if (options.length > LIMIT) {
    const currentValueStr = String(currentValue);
    const currentOption = options.find(opt => opt.value === currentValueStr);
    limitedOptions = options.slice(0, LIMIT);
    if (currentOption && !limitedOptions.find(opt => opt.value === currentValueStr)) {
      limitedOptions.push(currentOption);
    }
  }

  return { limitedOptions, lookupMap, allOptions: options };
};

const renderGridRow = (field: any, content: any) => (
  <FormField label={field.attributeName} required={field.mandatoryFlag == 1 ? true : false}>
    {content}
  </FormField>
);

function renderField(field) {
  const name = field.combinedAttributeName;
  if (field.isHidden) return null;
  
  // Get the validation rules for this field
  const validationRules = fieldValidations[name] || {};

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

  if (field.attributeType.id === CustomAttributeTypeEnum.EMAIL) {
    return renderGridRow(
      field,
      <TextInput
        name={name}
        control={control}
        validationRules={validationRules}
        disabled={disabledFields.includes(field.combinedAttributeName)}
        type="email"
        placeholder={field.placeholder || "Enter email..."}
        hint={field.instructions}
        maxWidth="w-full"
      />
    );
  }

  if (field.attributeType.id === CustomAttributeTypeEnum.NUMERIC) {
    const numericPattern = field.decimalFlag ? /^\d*\.?\d*$/ : /^\d*$/;
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
          invokeChildMethod(+selectedValue, field);
        }}
      />
    );
  }
  if (field.attributeType.id === CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN) {
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
        moduleType={SystemAttributeEnum.OPPORTUNITY_MODULE}
        projectId={projectId}
        maxFiles={field.maxImagesAllowed || undefined}
        validationRules={validationRules || {}}
        disabled={disabledFields.includes(field.combinedAttributeName)}
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
        moduleType={SystemAttributeEnum.OPPORTUNITY_MODULE}
        projectId={projectId}
        maxFiles={field.maxVideosAllowed || undefined}
        validationRules={validationRules || {}}
        disabled={disabledFields.includes(field.combinedAttributeName)}
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
        moduleType={SystemAttributeEnum.OPPORTUNITY_MODULE}
        projectId={projectId}
        maxFiles={field.maxDocumentsAllowed || undefined}
        validationRules={validationRules || {}}
        disabled={disabledFields.includes(field.combinedAttributeName)}
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

  // -- Extend for other types like EMAIL, TIME, etc. as needed --

  return null;
}

// 5. Submit handler (will get all values as { [combinedAttributeName]: value })
// Watch all form values

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
        onSubmittingChange?.(true);
        const requestBody = addOpportunity();
        const response = await opportunityService.addEditOpportunity(requestBody);
        
        // Close the modal regardless of response status
        onCancel();
        
        if (response.statusCode >= 200 && response.statusCode < 300) {
          // Show success notification with Material UI style
          enqueueSnackbar('Successfully updated', { 
            variant: 'success',
          });
          
          // Call optional success callback if provided
          if (onSuccess) {
            onSuccess();
          }
        } else {
          // Show error notification with Material UI style
          enqueueSnackbar('Unable to update, please try again later', { 
            variant: 'error',
          });
        }
      } catch (error) {        
        // Close modal and show error notification
        onCancel();
        enqueueSnackbar('Unable to update, please try again later', { 
          variant: 'error',
        });
      } finally {
        setIsLoading(false);
        setIsSubmitting(false); // Re-enable the button
        onSubmittingChange?.(false);
      }
    },
    // Error case - validation failed
    (errors) => {
      setIsSubmitting(false); // Re-enable the button for validation errors
      onSubmittingChange?.(false);
      
      // Show validation error notification
      enqueueSnackbar('Please fix the form errors before submitting', { 
        variant: 'error',
      });
    }
  )(e);
};
function addOpportunity() {

  let customAttributeValues = [];
    //dyniamic fields
    customAttributesList.forEach(element => {

      if ((element.attributeType.id == CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN ||
        element.attributeType.id == CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN ||
        element.attributeType.id == CustomAttributeTypeEnum.RADIO ||
        element.attributeType.id == CustomAttributeTypeEnum.TEXT_SINGLE_LINE ||
        element.attributeType.id == CustomAttributeTypeEnum.QR_CODE_SCANNER ||
        element.attributeType.id == CustomAttributeTypeEnum.NUMERIC ||
        element.attributeType.id == CustomAttributeTypeEnum.TEXT_MULTI_LINE ||
        element.attributeType.id == CustomAttributeTypeEnum.EMAIL ||
        element.attributeType.id == CustomAttributeTypeEnum.DATA_LIST) &&
        (element.systemAttribute?.id !== SystemAttributeEnum.OPPORTUNITY_GEO_FIELD_ID)) {
        customAttributeValues.push({
          "attributeId": element.id,
          "parentLinkedDatalistAttribId": element.moduleType == SystemAttributeEnum.DATA_LIST_MODULE ? element.parentLinkedDataListAttribId : null,
          "value": [
            {
              "name": String(watch(element.combinedAttributeName) == null ? '' : watch(element.combinedAttributeName).toString().trim())
            }
          ]
        });
      } 

      if (element.attributeType.id == CustomAttributeTypeEnum.DATE) {
        customAttributeValues.push({
          "attributeId": element.id,
          "value": [
            {
              'name': formatDate(watch(element.combinedAttributeName))
            }
          ]
        })
      }
      if (element.attributeType.id == CustomAttributeTypeEnum.DATE_TIME) {
        customAttributeValues.push({
          "attributeId": element.id,
          "value": [
            {
              'name': watch(element.combinedAttributeName)?.replace('T', ' ')
            }
          ]
        })
      }
      if (element.attributeType.id == CustomAttributeTypeEnum.TIME_DURATION) {
        customAttributeValues.push({
          "attributeId": element.id,
          "value": [
            {
              'name': watch(element.combinedAttributeName)
            }
          ]
        })
      }

      if (element.attributeType.id == CustomAttributeTypeEnum.IMAGE ||
        element.attributeType.id == CustomAttributeTypeEnum.DOCUMENT_UPLOAD ||
        element.attributeType.id == CustomAttributeTypeEnum.AUDIO_VIDEO) {
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
    let addData = {
      "opportunityId": opportunityId,
      "appVersion": null,
      "deviceInfo": null,
      "gps": null,
      "isActive": 1,
      "projectId": projectId,
      "customAttributeValues": customAttributeValues

      };

    return addData;
}

// Function to build form data for approval submission (exactly like Customer EditForm)
function editOpportunity() {
  let customAttributeValues = [];
  // Dynamic fields
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
      (element.systemAttribute?.id !== SystemAttributeEnum.OPPORTUNITY_GEO_FIELD_ID)) {
      customAttributeValues.push({
        "attributeId": element.id,
        "parentLinkedDatalistAttribId": element.parentLinkedDataListAttribId ?? null,
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
        "parentLinkedDatalistAttribId": element.parentLinkedDataListAttribId ?? null,
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
        "parentLinkedDatalistAttribId": element.parentLinkedDataListAttribId ?? null,
        "value": [
          {
            'name': getValues(element.combinedAttributeName)?.replace('T', ' ') || ''
          }
        ]
      })
    }
    if (element.attributeType.id == CustomAttributeTypeEnum.TIME_DURATION) {
      customAttributeValues.push({
        "attributeId": element.id,
        "parentLinkedDatalistAttribId": element.parentLinkedDataListAttribId ?? null,
        "value": [
          {
            'name': String(getValues(element.combinedAttributeName) == null ? '' : getValues(element.combinedAttributeName).toString().trim())
          }
        ]
      })
    }
    if (element.attributeType.id == CustomAttributeTypeEnum.IMAGE ||
      element.attributeType.id == CustomAttributeTypeEnum.DOCUMENT_UPLOAD ||
      element.attributeType.id == CustomAttributeTypeEnum.AUDIO_VIDEO) {
      let fileValue = getValues(element.combinedAttributeName);
      const valueArray = (fileValue && Array.isArray(fileValue) && fileValue.length > 0)
        ? fileValue
            .map(url => ({ "name": typeof url === 'object' ? url.serverUrl : url }))
            .filter(x => x.name)
        : [];
      customAttributeValues.push({
        "attributeId": element.id,
        "parentLinkedDatalistAttribId": element.parentLinkedDataListAttribId ?? null,
        "value": valueArray
      })
    }
  });
  let editData = {
    "customAttributeValues": customAttributeValues
  };

  return editData;
}

// Expose form data getter for approval screen
useEffect(() => {
  if (onApprovalFormDataReady && !isFieldDataLoading) {
    onApprovalFormDataReady(editOpportunity);
  }
}, [onApprovalFormDataReady, isFieldDataLoading, customAttributesList]);

return (
  <>
    <Form spaceY={4}
      id="edit-opportunity-form"
      onSubmit={handleFormSubmit}
    >
      {isFieldDataLoading ? (
        <Spinner size='medium' className='mt-10' customLoadingName='Loading...' />
      ) : (
        <>
          {serialNo && (
            <div className={styles.fieldWrapper}>
              <FormField label="Serial No" required={false}>
                <TextInput
                  name="serialNo"
                  control={control}
                  disabled={true}
                  type="text"
                />
              </FormField>
            </div>
          )}
          {customAttributesList.map((field, index) => {
            const isChildOfParent = field.parentId !== 0 && field.parentId !== null && field.parentId !== undefined;
            const isHidden = isChildOfParent;

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
export default EditForm;


