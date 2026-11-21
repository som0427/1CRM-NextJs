import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Select from "react-select";
import styles from '@/styles/generalSettings.module.css';
import { generalSettingService } from '@/lib/services/generalSettingsService';
import { CustomerSettingsData, CustomerSettingsResponse, CustomerSettingsUpdateRequest } from '@/lib/models/general-settings/customerSettingsModels';
import { getProjectId, getModuleSingularName } from '@/lib/storage/sharedStorage';
export interface CustomerSettingsRef {
  handleSave: () => Promise<void>;
  handleCancel: () => void;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
}

const CustomerSettings = forwardRef<CustomerSettingsRef, {}>((props, ref) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [customerData, setCustomerData] = useState<CustomerSettingsData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  
  // Toast notification states
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ show: false, message: '', type: 'success' });
  
  // Validation states
  const [errors, setErrors] = useState<{
    singularName?: string;
    pruralName?: string;
    serialKey?: string;
    chooseCompanyOwnerFlag?: string;
  }>({});
  

  const [entityFieldList, setEntityFieldList] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [customerAccess, setCustomerAccess] = useState<any[]>([]);
  const [lookupList, setLookupList] = useState<any[]>([]);
  const [lookupListsObj, setLookupListsObj] = useState<any[]>([]);
  const [selectedEntityField, setSelectedEntityField] = useState<any>(null);
  const [isLoadingCustomerAccess, setIsLoadingCustomerAccess] = useState<boolean>(false);
  const [pendingCustomerAccessData, setPendingCustomerAccessData] = useState<any[]>([]);
  
  // Form data state
  const [formData, setFormData] = useState({
    sortBy: '0',
    enforceLocationCapture: false,
    allowLocationUpdateFromApp: false,
    allowLocationFromActivity: false,
    chooseCompanyOwnerFlag: '3',
    singularName: '',
    pruralName: '',
    serialKey: '',
    customerLoginFlag: false,
    geoFencing: false,
    tolerance: 0
  });
  
  // Load form with react-hook-form
  const { register, handleSubmit, setValue, getValues, watch, reset, formState: { errors: formErrors, isDirty } } = useForm<{
    sortBy: string;
    enforceLocationCapture: boolean;
    allowLocationUpdateFromApp: boolean;
    allowLocationFromActivity: boolean;
    chooseCompanyOwnerFlag: string;
    singularName: string;
    pruralName: string;
    serialKey: string;
    customerLoginFlag: boolean;
    geoFencing: boolean;
    tolerance: number;
  }>();

  // Track customer access changes separately (since it's not part of the main form)
  const [customerAccessChanged, setCustomerAccessChanged] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Combined unsaved changes detection - only after data is loaded
  useEffect(() => {
    if (dataLoaded) {
      setHasUnsavedChanges(isDirty || customerAccessChanged);
    }
  }, [isDirty, customerAccessChanged, dataLoaded]);

  // Watch the customerLoginFlag field to show/hide conditional fields
  const customerLoginFlag = watch('customerLoginFlag');
  const enforceLocationCapture = watch('enforceLocationCapture');

  useEffect(() => {
    if (!enforceLocationCapture) {
      if (getValues('allowLocationUpdateFromApp')) {
        setValue('allowLocationUpdateFromApp', false, { shouldDirty: true });
      }
      if (getValues('allowLocationFromActivity')) {
        setValue('allowLocationFromActivity', false, { shouldDirty: true });
      }
    }
  }, [enforceLocationCapture, getValues, setValue]);
  
  // Toast notification helper
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  // Fetch customer settings on component mount
  useEffect(() => {
    fetchCustomerSettings();
  }, []);

  // Handle checkbox change - equivalent to changeCustomerLogin in Angular
  const changeCustomerLogin = async (checked: boolean) => {
    if (!checked) {
      // Clear all data when unchecked
      setCustomerAccess([]);
      setLookupList([]);
      setLookupListsObj([]);
      setEntityFieldList([]);
    } else {
      // Show full-page loader and fetch data when checked
      setLoading(true);
      try {
        await fetchEntityField(2);
      } catch (error) {
        console.error('Error loading customer login data:', error);
        showToast('Failed to load customer login fields', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  // Equivalent to addExtraField in Angular
  const addExtraField = () => {
    // Get the entity field value from the first row if it exists
    const firstRowEntityField = customerAccess.length > 0 ? customerAccess[0].entityField : null;
    
    const newRow = {
      id: Date.now(),
      entityField: firstRowEntityField, // Use the same entity field as first row
      entityFieldValue: null,
      role: null,
      disabled: customerAccess.length > 0
    };
    
    const updatedCustomerAccess = [...customerAccess, newRow];
    setCustomerAccess(updatedCustomerAccess);
    
    // Add lookup options for this row
    const newLookupObj = {
      options: getNewLookupList(updatedCustomerAccess.length - 1, updatedCustomerAccess)
    };
    setLookupListsObj([...lookupListsObj, newLookupObj]);
  };

  // Equivalent to getNewLookupList in Angular
  const getNewLookupList = (idx: number, accessRows = customerAccess) => {
    let existingVals: number[] = [];
    
    accessRows.forEach((row, i) => {
      if (i === idx) return;
      const selectedVals = row.entityFieldValue;
      if (selectedVals) {
        if (Array.isArray(selectedVals)) {
          existingVals.push(...selectedVals.map((x: any) => +x));
        } else {
          existingVals.push(+selectedVals);
        }
      }
    });
    
    return lookupList.filter((x: any) => !existingVals.includes(x.id));
  };

  useEffect(() => {
    changeCustomerLogin(customerLoginFlag || false);
  }, [customerLoginFlag]);

  // Equivalent to fetchEntityField in Angular
  const fetchEntityField = async (entityId: number, fillData = false) => {
    try {
      const projectId = getProjectId();
      
      // Fetch entity fields
      const fieldsResponse = await generalSettingService.getEntityFields(projectId);
      
      if (fieldsResponse.statusCode === 200) {
        // Filter fields like in Angular: attributeType.id === 1 && systemAttribute?.id!==17 && systemAttribute?.id!==16 && isActive === 1
        const filteredFields = fieldsResponse.responseData.filter((result: any) => 
          result.attributeType?.id === 1 && 
          result.systemAttribute?.id !== 17 && 
          result.systemAttribute?.id !== 16 && 
          result.isActive === 1
        );
        
        setEntityFieldList(filteredFields);
        
        // Call setActiveUsersToOwnerField with the filtered fields
        await setActiveUsersToOwnerField(projectId, fillData, filteredFields);
      }
    } catch (error) {
      console.error('Error fetching entity fields:', error);
      showToast('Failed to fetch entity fields', 'error');
    }
  };

  // Fetch roles for the Role dropdown
  const fetchRoles = async (projectId: number) => {
    try {
      const rolesResponse = await generalSettingService.getRoles(projectId);
      
      if (rolesResponse.statusCode === 200) {
        // Sort roles by name
        const activeRoles = (rolesResponse.responseData as any[]).sort((r1: any, r2: any) => {
          const name1 = r1.roleName.toLowerCase();
          const name2 = r2.roleName.toLowerCase();
          return name1.localeCompare(name2);
        });
        
        setRoles(activeRoles);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      showToast('Failed to fetch roles', 'error');
    }
  };

  // Equivalent to setActiveUsersToOwnerField in Angular
  const setActiveUsersToOwnerField = async (projectId: number, fillData = false, entityFieldsData?: any[]) => {
    try {
      const usersResponse = await generalSettingService.getUsers(projectId);
      
      if (usersResponse.statusCode === 200) {
        // Sort users by name like in Angular
        const activeUsers = (usersResponse.responseData as any[]).sort((u1: any, u2: any) => {
          const name1 = `${u1.firstName || ''} ${u1.lastName || ''}`.toLowerCase();
          const name2 = `${u2.firstName || ''} ${u2.lastName || ''}`.toLowerCase();
          return name1.localeCompare(name2);
        });
        
        setUsers(activeUsers);
        
        // Also fetch roles for the Role dropdown
        await fetchRoles(projectId);
        
        // Find owner field (systemAttribute.id === 34) and set lookupValues
        const currentEntityFieldList = entityFieldsData || entityFieldList;
        const updatedEntityFieldList = [...currentEntityFieldList];
        const ownerFieldIndex = updatedEntityFieldList.findIndex((x: any) => x.systemAttribute?.id === 34);
        
        if (ownerFieldIndex !== -1) {
          const userLookupValues = activeUsers.map((x: any) => ({
            id: x.userId,
            lookupValue: `${x.firstName || ''} ${x.lastName || ''}`.trim(),
            isActive: 1,
            stageId: null
          }));
          updatedEntityFieldList[ownerFieldIndex].lookupValues = userLookupValues;
          setEntityFieldList(updatedEntityFieldList);
          console.log('Owner field found and lookup values set:', updatedEntityFieldList[ownerFieldIndex]);
        } else {
          console.log('Owner field not found in entityFieldList');
        }
        
        if (fillData) {
          // TODO: Implement addExtraFieldWithValue when needed
          // addExtraFieldWithValue(resultSet.customerLoginAccess);
        } else {
          // Check if we have pending customer access data to pre-fill
          if (pendingCustomerAccessData.length > 0) {
            // Pre-fill customer access rows with data from API
            const preFilledRows = pendingCustomerAccessData.map((access, index) => ({
              id: index + 1,
              entityField: access.entityFieldId,
              entityFieldValue: access.value,
              role: access.roleId,
              disabled: index > 0
            }));
            
            // Set the customer access rows first
            setCustomerAccess(preFilledRows);
            
            // For the first row, find the selected entity field and populate its lookup values
            if (preFilledRows.length > 0 && preFilledRows[0].entityField) {
              const selectedEntityField = updatedEntityFieldList.find(field => 
                field.id == preFilledRows[0].entityField
              );
              
              if (selectedEntityField && selectedEntityField.lookupValues) {
                // Set the lookup list for Entity Field Value dropdown
                setLookupList(selectedEntityField.lookupValues);
                setSelectedEntityField(preFilledRows[0].entityField);
                
                // Create lookup objects for all rows with proper filtering
                const lookupObjects = preFilledRows.map((row, index) => {
                  let existingVals: number[] = [];
                  preFilledRows.forEach((otherRow, j) => {
                    if (index === j) return;
                    if (otherRow.entityFieldValue) {
                      existingVals.push(+otherRow.entityFieldValue);
                    }
                  });
                  
                  return {
                    options: selectedEntityField.lookupValues.filter((x: any) => 
                      !existingVals.includes(x.id)
                    )
                  };
                });
                setLookupListsObj(lookupObjects);
              }
            }
            
            // Clear pending data
            setPendingCustomerAccessData([]);
          } else {
            // Add first row only if no rows exist
            if (customerAccess.length === 0) {
              addExtraField();
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const addCustomerAccessRow = () => {
    addExtraField();
    // Only mark as changed if data is already loaded
    if (dataLoaded) {
      setCustomerAccessChanged(true);
    }
  };

  const removeCustomerAccessRow = (id: number) => {
    const rowIndex = customerAccess.findIndex(row => row.id === id);
    if (rowIndex !== -1) {
      const updatedCustomerAccess = customerAccess.filter(row => row.id !== id);
      const updatedLookupListsObj = lookupListsObj.filter((_, index) => index !== rowIndex);
      
      setCustomerAccess(updatedCustomerAccess);
      setLookupListsObj(updatedLookupListsObj);
      // Only mark as changed if data is already loaded
      if (dataLoaded) {
        setCustomerAccessChanged(true);
      }
    }
  };

  // Equivalent to changeEntityField in Angular
  const changeEntityField = (attributeId: string, idx: number) => {
    console.log('changeEntityField called with:', attributeId, 'entityFieldList:', entityFieldList);
    const attribute = entityFieldList.find(res => res.id == attributeId || res.id === +attributeId);
    console.log('Found attribute:', attribute);
    if (attribute) {
      // Use the selected attribute's lookup values, not the owner field
      const lookupValues = attribute.lookupValues || [];
      console.log('Lookup values for selected attribute:', lookupValues);
      setLookupList(lookupValues);
      
      setSelectedEntityField(attributeId);
      
      // Update all rows to have the same entity field and clear entity field values
      const updatedCustomerAccess = customerAccess.map(row => ({
        ...row,
        entityField: attributeId,
        entityFieldValue: null // Reset entity field value
      }));
      setCustomerAccess(updatedCustomerAccess);
      
      // Update lookup lists for all rows with the correct lookup values
      const updatedLookupListsObj = updatedCustomerAccess.map((_, index) => ({
        options: lookupValues.filter((option: any) => {
          // Filter out already selected values from other rows
          const existingVals: number[] = [];
          updatedCustomerAccess.forEach((row, i) => {
            if (i === index) return;
            const selectedVals = row.entityFieldValue;
            if (selectedVals) {
              if (Array.isArray(selectedVals)) {
                existingVals.push(...selectedVals.map((x: any) => +x));
              } else {
                existingVals.push(+selectedVals);
              }
            }
          });
          return !existingVals.includes(option.id);
        })
      }));
      setLookupListsObj(updatedLookupListsObj);
    }
  };

  const updateCustomerAccessRow = (id: number, field: string, value: string) => {
    // Only mark as changed if data is already loaded (not during initial data population)
    if (dataLoaded) {
      setCustomerAccessChanged(true);
    }
    
    if (field === 'entityField') {
      // If changing entity field on first row, call changeEntityField
      const rowIndex = customerAccess.findIndex(row => row.id === id);
      if (rowIndex === 0) {
        changeEntityField(value, rowIndex);
      }
    } else {
      // For other fields, update normally
      setCustomerAccess(customerAccess.map(row => 
        row.id === id ? { ...row, [field]: value } : row
      ));
      
      // Update lookup lists when entity field value changes
      if (field === 'entityFieldValue') {
        const updatedLookupListsObj = customerAccess.map((_, index) => ({
          options: getNewLookupList(index)
        }));
        setLookupListsObj(updatedLookupListsObj);
      }
    }
  };

  const fetchCustomerSettings = async () => {
    try {
      setLoading(true);
      const projectId = getProjectId();
      
      if (projectId) {
        const response = await generalSettingService.getCustomerSettings(projectId);
        
        if (response.statusCode === 200 && response.responseData) {
          const data = response.responseData;
          setCustomerData(data);
          
          // Update form data state
          setFormData({
            sortBy: data.sortBy?.toString() || '0',
            enforceLocationCapture: data.enforceLocationCapture === 1,
            allowLocationUpdateFromApp: data.allowLocationUpdateFromApp === 1,
            allowLocationFromActivity: data.allowLocationFromActivity === 1,
            chooseCompanyOwnerFlag: data.chooseCompanyOwnerFlag?.toString() || '3',
            singularName: data.singularName || '',
            pruralName: data.pruralName || '',
            serialKey: data.serialKey || '',
            customerLoginFlag: data.customerLoginFlag === 1,
            geoFencing: data.geoFencing === 1,
            tolerance: data.tolerance || 0
          });
          
          // Set form values
          setValue('sortBy', data.sortBy?.toString() || '0');
          setValue('enforceLocationCapture', data.enforceLocationCapture === 1);
          setValue('allowLocationUpdateFromApp', data.allowLocationUpdateFromApp === 1);
          setValue('allowLocationFromActivity', data.allowLocationFromActivity === 1);
          setValue('chooseCompanyOwnerFlag', data.chooseCompanyOwnerFlag?.toString() || '3');
          setValue('singularName', data.singularName || '');
          setValue('pruralName', data.pruralName || '');
          setValue('serialKey', data.serialKey || '');
          setValue('customerLoginFlag', data.customerLoginFlag === 1);
          setValue('geoFencing', data.geoFencing === 1);
          setValue('tolerance', data.tolerance || 0);
          
          // Store customer access data for later processing after dropdowns are loaded
          if (data.customerLoginAccess && data.customerLoginAccess.length > 0) {
            setPendingCustomerAccessData(data.customerLoginAccess);
          }
          
          // Mark data as loaded after form is populated
          setTimeout(() => setDataLoaded(true), 100);
        }
      }
    } catch (error) {
      console.error('Error fetching customer settings:', error);
      showToast('Failed to load customer settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (data: any) => {
    try {
      // Validate mandatory fields
      const validationErrors: { [key: string]: string } = {};
      
      if (!data.singularName?.trim()) {
        validationErrors.singularName = 'Customer name is required';
      }
      
      if (!data.pruralName?.trim()) {
        validationErrors.pruralName = 'Plural name is required';
      }
      
      if (!data.serialKey?.trim()) {
        validationErrors.serialKey = 'Serial No. Key is required';
      }
      
      if (!data.chooseCompanyOwnerFlag) {
        validationErrors.chooseCompanyOwnerFlag = 'Please select ownership assignment option';
      }
      
      // Validate customer login access if enabled
      if (data.customerLoginFlag) {
        if (customerAccess.length === 0) {
          validationErrors.customerAccess = 'Please add at least one customer access row when "Allow customers to Login" is enabled';
        } else {
          let hasAccessErrors = false;
          customerAccess.forEach((access, index) => {
            if (!access.entityField) {
              validationErrors[`customerAccess_${index}_entityField`] = 'Entity Field is required';
              hasAccessErrors = true;
            }
            if (!access.entityFieldValue) {
              validationErrors[`customerAccess_${index}_entityFieldValue`] = 'Entity Field Value is required';
              hasAccessErrors = true;
            }
            if (!access.role) {
              validationErrors[`customerAccess_${index}_role`] = 'Role is required';
              hasAccessErrors = true;
            }
          });
          
          if (hasAccessErrors) {
            validationErrors.customerAccess = 'All three fields (Entity Field, Entity Field Value, and Role) are mandatory when "Allow customers to Login" is enabled';
          }
        }
      }
      
      // If there are validation errors, show them and return
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        showToast('Please fill in all required fields', 'error');
        return;
      }
      
      // Clear any previous errors
      setErrors({});
      setLoading(true);
      const projectId = getProjectId();
      
      if (projectId && customerData) {
        // Prepare customer login access data
        const customerLoginAccess = customerAccess.map(access => ({
          entityFieldId: access.entityField,
          value: access.entityFieldValue?.toString() || '',
          roleId: access.role
        }));
        
        const updateData = {
          id: customerData.id,
          enforceLocationCapture: data.enforceLocationCapture ? 1 : 0,
          allowLocationUpdateFromApp: data.enforceLocationCapture && data.allowLocationUpdateFromApp ? 1 : 0,
          allowLocationFromActivity: data.enforceLocationCapture && data.allowLocationFromActivity ? 1 : 0,
          singularName: data.singularName,
          pruralName: data.pruralName,
          sortBy: data.sortBy,
          chooseCompanyOwnerFlag: data.chooseCompanyOwnerFlag,
          companyOwnerFlag: 0, // Default value
          geoFencing: data.geoFencing ? 1 : 0,
          tolerance: data.tolerance || 0,
          serialKey: data.serialKey,
          customerLoginFlag: data.customerLoginFlag ? 1 : 0,
          customerLoginAccess: customerLoginAccess
        };
        
        const response = await generalSettingService.updateCustomerSettings(projectId, updateData);
        
        if (response.statusCode === 200) {
          showToast('Customer settings saved successfully!', 'success');
          setErrors({});
          // Reset form state to pristine (like Angular's markAsPristine())
          reset(getValues());
          setCustomerAccessChanged(false);
          setHasUnsavedChanges(false);
        } else if (response.statusCode === 409) {
          showToast('Serial No. Key already exist.', 'error');
        } else {
          showToast(response.message || 'Failed to save customer settings', 'error');
        }
      }
    } catch (error) {
      console.error('Error saving customer settings:', error);
      showToast('Failed to save customer settings. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel - reset form to original values
  const handleCancel = () => {
    if (customerData) {
      // Reset form to original API data
      reset({
        enforceLocationCapture: customerData.enforceLocationCapture === 1,
        allowLocationUpdateFromApp: customerData.allowLocationUpdateFromApp === 1,
        allowLocationFromActivity: customerData.allowLocationFromActivity === 1,
        singularName: customerData.singularName || '',
        pruralName: customerData.pruralName || '',
        sortBy: customerData.sortBy?.toString() || 'name',
        chooseCompanyOwnerFlag: customerData.chooseCompanyOwnerFlag?.toString() || '1',
        geoFencing: customerData.geoFencing === 1,
        tolerance: customerData.tolerance || 0,
        serialKey: customerData.serialKey || '',
        customerLoginFlag: customerData.customerLoginFlag === 1
      });
      
      // Reset customer access to original data
      setCustomerAccess(customerData.customerLoginAccess || []);
      setCustomerAccessChanged(false);
      setHasUnsavedChanges(false);
      setErrors({});
      
      /*showToast('All changes have been cancelled and form reset to original values', 'success');*/
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    handleSave: () => handleSubmit(saveSettings)(),
    handleCancel: handleCancel,
    isLoading: loading,
    hasUnsavedChanges: hasUnsavedChanges
  }));

  const handleSave = handleSubmit(saveSettings);
  
  return (
    <>
      {/* Full Page Loader */}
      {loading && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-transparent rounded-lg p-8 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          </div>
        </div>
      )}
      
      <form className={styles.tabContainer}>
        <div className={styles.tabContent} style={{paddingBottom: '10px'}}>
        
            {/* Default sort in app */}
            <div className={styles.tabField}>
                <label>
                    Default sort in app <span className="text-[#F64E60]">*</span>
                </label>
                  <div className="flex flex-row gap-12">
                      <label className="flex items-center cursor-pointer min-w-fit mr-8">
                          <input
                              type="radio"
                              {...register('sortBy')}
                              value="0"
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              disabled={loading}
                          />
                          <span className="ml-2 text-sm text-gray-700">By Name (A-Z)</span>
                      </label>
                      <label className="flex items-center cursor-pointer min-w-fit">
                          <input
                              type="radio"
                              {...register('sortBy')}
                              value="1"
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              disabled={loading}
                          />
                          <span className="ml-2 text-sm text-gray-700">By Location (Nearest first)</span>
                      </label>
                  </div>
            </div>

            {/* Enforce live location capture */}
            <div className={styles.tabField}>
                <label>
                    Enforce live location capture while adding from app
                </label>
                <div className={styles.fieldInputContainer}>
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            {...register('enforceLocationCapture')}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            disabled={loading}
                        />
                        <span className="ml-2 text-sm text-gray-700">Yes</span>
                    </label>
                    <p className={styles.instructionText}>Select to enforce location capture when adding Customer</p>
                </div>
            </div>

            {enforceLocationCapture && (
              <>
                <div className={styles.tabField}>
                  <label>
                    Allow Location Update from App
                  </label>
                  <div className={styles.fieldInputContainer}>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('allowLocationUpdateFromApp')}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={loading}
                      />
                      <span className="ml-2 text-sm text-gray-700">Yes</span>
                    </label>
                    <p className={styles.instructionText}>Tick this if you want to enable the location update from the app</p>
                  </div>
                </div>

                <div className={styles.tabField}>
                  <label>
                    Set activity performed location as default location if none exists
                  </label>
                  <div className={styles.fieldInputContainer}>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('allowLocationFromActivity')}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        disabled={loading}
                      />
                      <span className="ml-2 text-sm text-gray-700">Yes</span>
                    </label>
                    <p className={styles.instructionText}>Tick this if you want to enable the location fetching from the app</p>
                  </div>
                </div>
              </>
            )}

            {/* Ownership can be assigned to */}
            <div className={styles.tabField}>
                <label>
                    Ownership can be assigned to <span className="text-[#F64E60]">*</span>
                </label>
                <div className="flex items-center gap-12">
                    <label className="flex items-center cursor-pointer min-w-fit">
                        <input
                            type="radio"
                            {...register('chooseCompanyOwnerFlag')}
                            value="1"
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            disabled={loading}
                        />
                        <span className="ml-2 text-sm text-gray-700">Up in the hierarchy</span>
                    </label>
                    <label className="flex items-center cursor-pointer min-w-fit">
                        <input
                            type="radio"
                            {...register('chooseCompanyOwnerFlag')}
                            value="2"
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            disabled={loading}
                        />
                        <span className="ml-2 text-sm text-gray-700">Down the hierarchy</span>
                    </label>
                    <label className="flex items-center cursor-pointer min-w-fit">
                        <input
                            type="radio"
                            {...register('chooseCompanyOwnerFlag')}
                            value="3"
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            disabled={loading}
                        />
                        <span className="ml-2 text-sm text-gray-700">Any user</span>
                    </label>
                </div>
            </div>

            {/* Rename Customer1? */}
            <div className={styles.tabField}>
                <label>
                    Rename Customer1? <span className="text-[#F64E60]">*</span>
                </label>
                <div className={styles.fieldInputContainer}>
                  <div className="mt-1">
                    <div className="relative">
                      <input
                          type="text"
                          {...register('singularName')}
                          className={`${styles.input} ${errors.singularName ? 'border-red-500' : ''}`}
                          maxLength={25}
                          disabled={loading}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                        {errors.singularName ? (
                            <p className="text-xs text-red-500">{errors.singularName}</p>
                        ) : (
                            <p className={styles.instructionText}>Enter customer name...</p>
                        )}
                        <p className="text-xs text-gray-500">{watch('singularName')?.length || 0}/25</p>
                    </div>
                  </div>
                </div>
            </div>

            {/* What would be the plural? */}
            <div className={styles.tabField}>
                <label>
                    What would be the plural? <span className="text-[#F64E60]">*</span>
                </label>
                <div className={styles.fieldInputContainer}>
                  <div className="mt-1">
                    <div className="relative">
                      <input
                          type="text"
                          {...register('pruralName')}
                          className={`${styles.input} ${errors.pruralName ? 'border-red-500' : ''}`}
                          maxLength={25}
                          disabled={loading}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      {errors.pruralName ? (
                          <p className="text-xs text-red-500">{errors.pruralName}</p>
                      ) : (
                          <p className={styles.instructionText}>Enter plural name...</p>
                      )}
                      <p className="text-xs text-gray-500">{watch('pruralName')?.length || 0}/25</p>
                    </div>
                  </div>
                </div>
            </div>

            {/* Serial No. Key */}
            <div className={styles.tabField}>
                <label>
                    Serial No. Key <span className="text-[#F64E60]">*</span>
                </label>
                <div className={styles.fieldInputContainer}>
                  <div className="mt-1">
                    <div className="relative">
                      <input
                          type="text"
                          {...register('serialKey')}
                          className={`${styles.input} ${errors.serialKey ? 'border-red-500' : ''}`}
                          maxLength={5}
                          disabled={loading}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      {errors.serialKey ? (
                          <p className="text-xs text-red-500">{errors.serialKey}</p>
                      ) : (
                          <div>
                            <p className={styles.instructionText}>1 updates left. Changing the serial no. key will start a background re-index of your project, and may break some external integrations.</p>
                          </div>
                      )}
                      <p className="text-xs text-gray-500">{watch('serialKey')?.length || 0}/5</p>
                    </div>
                </div>
              </div>
            </div>

            {/* Allow customers to Login */}
            <div className={styles.tabField}>
                <label>
                    Allow customers to Login
                </label>
                <div className={styles.fieldInputContainer}>
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            {...register('customerLoginFlag')}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            disabled={loading}
                        />
                        <span className="ml-2 text-sm text-gray-700">Yes</span>
                    </label>
                    <p className={styles.instructionText}>Tick this if you want to allow customers to login into 1Channel app and portal</p>
                </div>
            </div>

            {/* Define customer access - Show only when Allow Login is checked */}
            {customerLoginFlag && (
                <div className={styles.tabField}>
                    <label>
                        Define customer access
                    </label>
                    <div className={styles.fieldInputContainer}>
                        {isLoadingCustomerAccess ? (
                            <div className="flex justify-center items-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                <span className="ml-3 text-gray-600">Loading customer access fields...</span>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {customerAccess.map((row, index) => (
                                <div key={row.id}>
                                    {/* Fields Row with - Button */}
                                    <div className="flex flex-wrap md:flex-nowrap gap-4 items-center">
                                         {/* Entity Field Dropdown */}
                                         <div className="flex-1 min-w-[200px]">
                                             <select
                                                 value={row.entityField || ''}
                                                 onChange={(e) => updateCustomerAccessRow(row.id, 'entityField', e.target.value)}
                                                 className={`${styles.select} ${errors[`customerAccess_${index}_entityField`] ? 'border-red-500' : ''}`}
                                                 disabled={loading || index > 0} // Disable for all rows except first
                                             >
                                                 <option value="">Entity Field *</option>
                                                 {entityFieldList.map((field) => (
                                                     <option key={field.id} value={field.id}>
                                                         {field.attributeName}
                                                     </option>
                                                 ))}
                                             </select>
                                             {errors[`customerAccess_${index}_entityField`] && (
                                                 <p className="text-red-500 text-xs mt-1">{errors[`customerAccess_${index}_entityField`]}</p>
                                             )}
                                         </div>

                                         {/* Entity Field Value Dropdown */}
                                         <div className="flex-1 min-w-[200px]">
                                             <select
                                                 value={row.entityFieldValue || ''}
                                                 onChange={(e) => updateCustomerAccessRow(row.id, 'entityFieldValue', e.target.value)}
                                                 className={`${styles.select} ${errors[`customerAccess_${index}_entityFieldValue`] ? 'border-red-500' : ''}`}
                                                 disabled={loading}
                                             >
                                                 <option value="">Entity Field Value *</option>
                                                 {lookupListsObj[index]?.options?.map((option: any) => (
                                                     <option key={option.id} value={option.id}>
                                                         {option.lookupValue}
                                                     </option>
                                                 ))}
                                             </select>
                                             {errors[`customerAccess_${index}_entityFieldValue`] && (
                                                 <p className="text-red-500 text-xs mt-1">{errors[`customerAccess_${index}_entityFieldValue`]}</p>
                                             )}
                                         </div>

                                         {/* Role Dropdown */}
                                         <div className="flex-1 min-w-[200px]">
                                             <select
                                                 value={row.role}
                                                 onChange={(e) => updateCustomerAccessRow(row.id, 'role', e.target.value)}
                                                 className={`${styles.select} ${errors[`customerAccess_${index}_role`] ? 'border-red-500' : ''}`}
                                                 disabled={loading}
                                             >
                                                 <option value="">Role *</option>
                                                 {roles.map((role) => (
                                                     <option key={role.roleId} value={role.roleId}>
                                                         {role.roleName}
                                                     </option>
                                                 ))}
                                             </select>
                                             {errors[`customerAccess_${index}_role`] && (
                                                 <p className="text-red-500 text-xs mt-1">{errors[`customerAccess_${index}_role`]}</p>
                                             )}
                                         </div>

                                        {/* Remove Button (-) - Inline with fields */}
                                        {customerAccess.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeCustomerAccessRow(row.id)}
                                                className="w-8 h-8 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full text-lg font-bold"
                                                disabled={loading}
                                                title="Remove row"
                                            >
                                                -
                                            </button>
                                        )}
                                    </div>

                                    {/* Add Button (+) - Separate line for last row only */}
                                    {index === customerAccess.length - 1 && (
                                        <div className="flex justify-end mt-2">
                                            <button
                                                type="button"
                                                onClick={addCustomerAccessRow}
                                                className="w-8 h-8 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-full text-lg font-bold"
                                                disabled={loading}
                                                title="Add row"
                                            >
                                                +
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
      </form>

        {/* Toast Notification */}
        {toast.show && (
            <div 
                className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-lg shadow-lg text-white font-medium transition-all duration-300 ${
                    toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{ 
                    minWidth: '300px', 
                    maxWidth: '500px',
                    position: 'fixed',
                    zIndex: 9999
                }}
            >
          <div className="flex items-center justify-between">
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(prev => ({ ...prev, show: false }))}
              className="ml-4 text-white hover:text-gray-200 focus:outline-none"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
});

CustomerSettings.displayName = 'CustomerSettings';

export default CustomerSettings;
