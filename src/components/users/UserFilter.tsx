import React, { forwardRef, useCallback } from 'react';
import AdvanceFilter, { AdvanceFilterRef, FilterResult } from '../common/filter/AdvanceFilter';
import { SystemAttributeEnum } from '../../lib/constants/SystemAttributeEnum.constant';
import { CustomAttributeTypeEnum } from '../../lib/constants/CustomAttributeTypeEnum.constant';
import { CustomAttibute } from '../../lib/models/custom-attibute.model';
import userService from '../../lib/services/userService';
import settingsService from '../../lib/services/settingsService';

export interface UserFilterRef {
  clearFilters: () => void;
  clear: () => void;
}

interface UserFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterResult[] | null) => void;
  onClear: () => void;
}

// Restricted attribute types for User filter
const restrictedAttributeIds = [
  CustomAttributeTypeEnum.IMAGE,
  CustomAttributeTypeEnum.HEADER_TEXT,
  CustomAttributeTypeEnum.NORMAL_TEXT,
  CustomAttributeTypeEnum.PAGE_SEPARATOR,
  CustomAttributeTypeEnum.DOCUMENT_UPLOAD,
  CustomAttributeTypeEnum.AUDIO_VIDEO,
  CustomAttributeTypeEnum.DATA_LIST,
  CustomAttributeTypeEnum.QR_CODE_SCANNER,
  CustomAttributeTypeEnum.DATE_TIME,
  CustomAttributeTypeEnum.OTP_VALIDATION,
  CustomAttributeTypeEnum.RADIO,
  CustomAttributeTypeEnum.CALCULATED_FIELD,
  CustomAttributeTypeEnum.REFERENCE_DOCUMENTS,
  CustomAttributeTypeEnum.TIME_DURATION
];

const UserFilter = forwardRef<UserFilterRef, UserFilterProps>(
  ({ isOpen, onClose, onApply, onClear }, ref) => {
    
    // Custom field values loader for User-specific system attributes
    const customFieldValuesLoader = useCallback(async (
      field: CustomAttibute, 
      projectId: number
    ): Promise<Array<{ id: number; name: string }> | null> => {
      const systemAttrId = field.systemAttribute?.id;
      
      // Reports To or Parallel Reporting field - load all users
      if ([SystemAttributeEnum.USER_REPORTS_TO_FIELD_ID, SystemAttributeEnum.USER_PARALLEL_REPORTING_FIELD_ID].includes(systemAttrId)) {
        try {
          const response = await userService.getAllUsers(projectId, 2); // 2 = all users
          if (response.statusCode === 200 && response.responseData) {
            return response.responseData.map((user: any) => ({
              id: user.id || user.userId,
              name: user.fullName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()
            }));
          }
        } catch (error) {
          console.error('Error loading users for Reports To or Parallel Reporting:', error);
        }
        return [];
      }
      
      // User Role field (systemAttribute.id === 57)
      if (systemAttrId === 57) {
        try {
          const response = await settingsService.getUserRoles(projectId);
          if (response.statusCode === 200 && response.responseData) {
            return response.responseData.map((role: any) => ({
              id: role.roleId || role.id,
              name: role.roleName || role.name
            }));
          }
        } catch (error) {
          console.error('Error loading user roles:', error);
        }
        return [];
      }
      
      // Return null to fall back to default behavior for other fields
      return null;
    }, []);

    return (
      <AdvanceFilter
        ref={ref as React.Ref<AdvanceFilterRef>}
        isOpen={isOpen}
        onClose={onClose}
        onApply={onApply}
        onClear={onClear}
        moduleId={SystemAttributeEnum.USER_MODULE}
        serialKeyId={SystemAttributeEnum.USER_SERIAL_KEY_ID}
        title="Filters"
        restrictedAttributeIds={restrictedAttributeIds}
        customFieldValuesLoader={customFieldValuesLoader}
      />
    );
  }
);

UserFilter.displayName = 'UserFilter';

export default UserFilter;
