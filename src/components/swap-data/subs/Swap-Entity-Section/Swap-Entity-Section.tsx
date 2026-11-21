import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import Select from "@/components/common/input-fields/Select";
import MultiSelect from "@/components/common/input-fields/MultiSelect";
import AddActionButton from "@/components/common/buttons/action-button/AddActionButton";
import RemoveActionButton from "@/components/common/buttons/action-button/RemoveActionButton";
import CheckBox from "@/components/common/input-fields/CheckBox";
import swapDataService, { AttributeFilter } from "@/lib/services/swapDataService";
import generalSettingsService from "@/lib/services/generalSettingsService";
import settingsService from "@/lib/services/settingsService";
import { SystemAttributeEnum } from "@/lib/constants/SystemAttributeEnum.constant";
import { CustomAttributeTypeEnum } from "@/lib/constants/CustomAttributeTypeEnum.constant";
import { GeneralResponse } from "@/lib/models/general-response.model";
import { RoleItem } from "@/lib/models/general-settings/projectSettingsModels";
import SpinLoader from "@/components/common/loader/SpinLoader";

interface MultiOption {
  value: string;
  label: string;
}

interface FilterRow {
  id: number;
  field: string;
  value: string;
}

interface EntityItem {
  id: number;
  name: string;
  serial: string;
}

interface SwapEntitySectionProps {
  projectId?: number | null;
  ownerId?: string | number;
  entityId: number;
  entityTitle?: string;
  onSelectionChange?: (entityId: number, selectedIds: number[], attributeFilters: AttributeFilter[], isSelectAll: boolean) => void;
}

const SwapEntitySection: React.FC<SwapEntitySectionProps> = ({
  projectId,
  ownerId,
  entityId,
  entityTitle,
  onSelectionChange
}) => {
  const { control, watch, setValue } = useForm<Record<string, any>>({ defaultValues: {} });
  const [filters, setFilters] = useState<FilterRow[]>([{ id: 1, field: "", value: "" }]);
  const [items, setItems] = useState<EntityItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [roleOptions, setRoleOptions] = useState<MultiOption[]>([]);
  const [attributeOptions, setAttributeOptions] = useState<MultiOption[]>([]);
  const [attributeValueMap, setAttributeValueMap] = useState<Record<string, MultiOption[]>>({});
  const [attributeTypeMap, setAttributeTypeMap] = useState<Record<string, number>>({});
  // Store full attribute data for checking hasChildAttribute, parentDataListId, moduleType
  const [attributeDataMap, setAttributeDataMap] = useState<Record<string, any>>({});
  // Track which child fields are visible (child field ID -> boolean)
  const [childFieldsVisibilityMap, setChildFieldsVisibilityMap] = useState<Record<string, boolean>>({});
  // Track parent -> child relationships (parent field ID -> array of child field IDs)
  const [parentWithChildMap, setParentWithChildMap] = useState<Record<string, string[]>>({});
  const [isDependentFieldLoading, setIsDependentFieldLoading] = useState(false);
  const [roleAttributeId, setRoleAttributeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  // Pagination state
  const [pageNum, setPageNum] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<AttributeFilter[]>([]);
  const [totalEntityCount, setTotalEntityCount] = useState(0);
  const [isSelectAllActive, setIsSelectAllActive] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const PAGE_SIZE = 100;

  const sectionKey = useMemo(
    () => entityTitle?.toLowerCase().replace(/\s+/g, "-") || `section-${entityId}`,
    [entityId, entityTitle]
  );
  const isUserModule = entityId === SystemAttributeEnum.USER_MODULE;

  const handleAddFilter = () => {
    setFilters(prev => [...prev, { id: Date.now(), field: "", value: "" }]);
  };

  const handleRemoveFilter = (id: number) => {
    setFilters(prev => (prev.length === 1 ? prev : prev.filter(row => row.id !== id)));
  };

  const handleToggleEntity = (itemId: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
    // If unchecking an item, deactivate select all
    if (selected.has(itemId)) {
      setIsSelectAllActive(false);
    }
  };

  const handleToggleAll = () => {
    const shouldClear = isSelectAllActive || (selected.size === items.length && items.length > 0);
    if (shouldClear) {
      setSelected(new Set<number>());
      setIsSelectAllActive(false);
    } else {
      setSelected(new Set(items.map(i => i.id)));
      setIsSelectAllActive(true);
    }
  };

  const getSelectedCount = () => isSelectAllActive ? totalEntityCount : (selected.size ?? 0);

  const getFields = (): Promise<any[]> => {
    return settingsService.getFormFields(projectId!, entityId);
  }

  const getUserRoles = (): Promise<GeneralResponse<RoleItem[]>> => {
    if (!isUserModule) {
      return Promise.resolve({ responseData: [], statusCode: 200, message: "" });
    }
    return generalSettingsService.getRoles(projectId);
  }

  useEffect(() => {
    const loadUserFilters = async () => {
      if (!projectId) return;
      setLoading(true);
      try {
        const [roleResp, fieldResp] = await Promise.all([
          getUserRoles(),
          getFields()
        ]);

        const rolesPayload = roleResp?.responseData ?? [];
        const mappedRoles = Array.isArray(rolesPayload)
          ? rolesPayload
            .map((role: any) => {
              const value =
                role?.id?.toString() ??
                role?.roleId?.toString() ??
                role?.roleID?.toString() ??
                "";
              if (!value) return null;
              return {
                value,
                label: role?.roleName || role?.name || "Role"
              };
            })
            .filter(Boolean) as MultiOption[]
          : [];
        setRoleOptions(mappedRoles);

        const fieldsPayload = fieldResp ?? [];
        const allowedTypes = new Set([
          CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN,
          CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN,
          CustomAttributeTypeEnum.DATA_LIST
        ]);
        const excludedSystemFieldIds = [
          SystemAttributeEnum.USER_ROLE_FIELD_ID,
          SystemAttributeEnum.USER_REPORTS_TO_FIELD_ID,
          SystemAttributeEnum.USER_SET_PASSWORD_CHECKBOX_FIELD_ID,
          SystemAttributeEnum.COMPANY_OWNER_FIELD_ID,
          SystemAttributeEnum.COMPANY_GEO_FIELD_ID,
          SystemAttributeEnum.OPPORTUNITY_COMPANY_NAME_FIELD_ID,
          SystemAttributeEnum.OPPORTUNITY_OWNER_FIELD_ID,
          SystemAttributeEnum.OPPORTUNITY_GEO_FIELD_ID,
          SystemAttributeEnum.CONTACT_COMPANY_FIELD_ID,
          SystemAttributeEnum.CONTACT_GEO_FIELD_ID,
          SystemAttributeEnum.CONTACT_OWNER_FIELD_ID
        ];

        const attrOptions: MultiOption[] = [];
        const valueMap: Record<string, MultiOption[]> = {};
        const typeMap: Record<string, number> = {};
        const dataMap: Record<string, any> = {};

        // Find and save role attribute ID for user module
        if (isUserModule) {
          const roleField = fieldsPayload.find((field: any) => 
            field?.systemAttribute?.id === SystemAttributeEnum.USER_ROLE_FIELD_ID
          );
          if (roleField?.id) {
            setRoleAttributeId(Number(roleField.id));
          }
        }

        fieldsPayload.forEach((field: any) => {
          const attrId = field?.id?.toString();
          const typeId = field?.attributeType?.id;
          const systemId = field?.systemAttribute?.id;
          if (!attrId || !allowedTypes.has(typeId) || excludedSystemFieldIds.includes(systemId) || field.status === 0) {
            return;
          }
          attrOptions.push({
            value: attrId,
            label: field?.attributeName || field?.attributeIdentifierName || "Attribute"
          });
          typeMap[attrId] = typeId;
          dataMap[attrId] = field;

          const lookupSource = Array.isArray(field.lookupValues) ? field.lookupValues : [];
          valueMap[attrId] = lookupSource
            .map((lv: any) => ({
              value: lv?.id?.toString(),
              label: lv?.lookupValue
            }))
            .filter(v => v.value);

          if (typeId === CustomAttributeTypeEnum.DATA_LIST && field.childAttributeList?.length > 0) {
            field.childAttributeList.forEach((childField: any) => {
              childField.parentDataListId = field.id;
              typeMap[getChildFieldUniqueId(field, childField)] = childField.attributeType?.id;
              dataMap[getChildFieldUniqueId(field, childField)] = childField;
            });
          }
        });

        setAttributeOptions(attrOptions);
        setAttributeValueMap(valueMap);
        setAttributeTypeMap(typeMap);
        setAttributeDataMap(dataMap);
      } catch (error) {
        setRoleOptions([]);
        setAttributeOptions([]);
        setAttributeValueMap({});
        setAttributeTypeMap({});
        setAttributeDataMap({});
      } finally {
        setLoading(false);
      }
    };

    loadUserFilters();
  }, [projectId, isUserModule]);

  // Sync MultiSelect values to filters state
  useEffect(() => {
    const subscription = watch((formValues) => {
      setFilters(prev => prev.map(row => {
        const fieldType = attributeTypeMap[row.field];
        if (fieldType === CustomAttributeTypeEnum.DATA_LIST) {
          return row; // Select handles its own onChange
        }
        const multiSelectValue = formValues[`attrVal-${sectionKey}-${row.id}`];
        if (Array.isArray(multiSelectValue)) {
          return { ...row, value: multiSelectValue.join(",") };
        }
        return row;
      }));
    });
    return () => subscription.unsubscribe();
  }, [watch, sectionKey, attributeTypeMap]);

  const fetchEntities = async (attributeFilters: AttributeFilter[] = [], page: number = 1, append: boolean = false, selectAll: boolean = false) => {
    if (!projectId || !ownerId) return;

    if (append) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await swapDataService.getEntityIdentifiers(
        projectId,
        entityId,
        Number(ownerId ?? 0),
        PAGE_SIZE,
        page,
        { attributeFilters }
      );
      const entities = response?.responseData?.entityDetails || [];
      const mapped: EntityItem[] = entities.map((e: any) => {
        const serial = e?.entitySerialNo ?? "";
        const id = Number(e?.entityId);
        const name = e?.entityValue;
        return { id, name, serial };
      });

      const totalCount = +response.responseData.totalEntityCount || 0;

      if (append) {
        // Append to existing items
        setItems(prev => [...prev, ...mapped]);
        setHasMore((items.length + mapped.length) < totalCount);
        
        // If select all is active, auto-select new items
        if (selectAll && mapped.length > 0) {
          setSelected(prev => {
            const newSelected = new Set(prev);
            mapped.forEach(item => newSelected.add(item.id));
            return newSelected;
          });
        }
      } else {
        // Replace items (initial load or filter change)
        setItems(mapped.length > 0 ? mapped : []);
        setCurrentFilters(attributeFilters);
        setPageNum(1);
        // Save total count on initial/filter load
        setTotalEntityCount(totalCount);
        // Check if there are more items to load
        setHasMore(mapped.length < totalCount);
        // Reset select all and selection on filter change
        setIsSelectAllActive(false);
        setSelected(new Set());
      }
    } catch (error) {
      if (!append) {
        setItems([]);
        setSelected(new Set());
      }
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
      if (!append) {
        setLoading(false);
      }
    }
  };

  const buildAttributeFilters = (): AttributeFilter[] => {
    const attributeFilters: AttributeFilter[] = filters
      .filter(f => f.field && f.value)
      .map(f => ({
        attributeId: Number(attributeDataMap[f.field].id),
        parentDataListId: getParentDataListId(f),
        attributeValue: f.value
      }));

    // Include role filter for user module
    if (isUserModule && roleAttributeId) {
      const selectedRoles = watch(`role-${sectionKey}`);
      if (selectedRoles && selectedRoles.length > 0) {
        attributeFilters.push({
          attributeId: roleAttributeId,
          parentDataListId: null,
          attributeValue: selectedRoles.join(',')
        });
      }
    }

    return attributeFilters;
  };

  const handleApplyFilter = () => {
    fetchEntities(buildAttributeFilters());
  };

  // Helper to generate unique ID for child fields
  const getChildFieldUniqueId = (parentAttribute: any, childAttribute: any): string => {
    if (parentAttribute.attributeType?.id === CustomAttributeTypeEnum.DATA_LIST) {
      return `${childAttribute.id}@${parentAttribute.id}`;
    }
    if (parentAttribute.moduleType === SystemAttributeEnum.DATA_LIST_MODULE) {
      return `${childAttribute.id}@${parentAttribute.parentDataListId}`;
    }
    return `${childAttribute.id}@${parentAttribute.id}`;
  };

  // Handle datalist value change - fetch dependent fields
  const onAttributeValueChange = async (lookupId: string, fieldId: string, rowId: number) => {
    const attribute = attributeDataMap[fieldId];
    if (!attribute) return;

    const typeId = attribute.attributeType?.id;
    const hasChildAttr = attribute.hasChildAttribute || (attribute.childAttributeList?.length > 0);
    const isDataListModule = attribute.moduleType === SystemAttributeEnum.DATA_LIST_MODULE;

    // Check if field is datalist type with child attributes OR is a datalist module
    if (!((typeId === CustomAttributeTypeEnum.DATA_LIST && hasChildAttr) || isDataListModule)) {
      return;
    }

    setIsDependentFieldLoading(true);

    try {
      // Determine which attribute ID to use for fetching relations
      const attribIdToFetchRelation = typeId === CustomAttributeTypeEnum.DATA_LIST 
        ? attribute.parentDataListId 
        : attribute.id;

      const response = await settingsService.getFieldRelation(attribIdToFetchRelation, Number(lookupId));
      const childAttributes = (response?.responseData || []).filter((child: any) => child.status === 1);

      // Build new child IDs list
      const newChildIds: string[] = childAttributes.map((childAttr: any) => 
        getChildFieldUniqueId(attribute, childAttr)
      );

      // Update parent-child mapping and get old child IDs in one operation
      let oldChildIds: string[] = [];
      setParentWithChildMap(prev => {
        oldChildIds = prev[fieldId] || [];
        return { ...prev, [fieldId]: newChildIds };
      });

      // Hide old child fields that are no longer valid and remove their filter rows
      oldChildIds.forEach(oldChildId => {
        if (!newChildIds.includes(oldChildId)) {
          // Hide the child field
          setChildFieldsVisibilityMap(prev => ({ ...prev, [oldChildId]: false }));

          // Remove from attribute options
          setAttributeOptions(prev => prev.filter(opt => opt.value !== oldChildId));

          // Remove filter rows that had this child field selected
          setFilters(prev => {
            const filtered = prev.filter(row => row.field !== oldChildId);
            // Ensure at least one filter row remains
            return filtered.length > 0 ? filtered : [{ id: Date.now(), field: "", value: "" }];
          });
        }
      });

      // Process new child attributes
      childAttributes.forEach((childAttr: any) => {
        const childUniqueId = getChildFieldUniqueId(attribute, childAttr);

        // Mark child field as visible
        setChildFieldsVisibilityMap(prev => ({ ...prev, [childUniqueId]: true }));

        // Add child field to attribute options if not already present
        const parentFieldName = attribute.attributeName;
        const childFieldName = childAttr.attributeName;
        setAttributeOptions(prev => {
          const exists = prev.some(opt => opt.value === childUniqueId);
          if (!exists) {
            return [...prev, {
              value: childUniqueId,
              label: `${parentFieldName} - ${childFieldName}`
            }];
          }
          return prev;
        });

        // Update child field data and type only if not already present
        setAttributeDataMap(prev => prev[childUniqueId] ? prev : { ...prev, [childUniqueId]: childAttr });
        setAttributeTypeMap(prev => prev[childUniqueId] ? prev : { ...prev, [childUniqueId]: childAttr.attributeType?.id });

        // Store child field lookup values
        const lookupSource = Array.isArray(childAttr.lookupValues) ? childAttr.lookupValues : [];
        setAttributeValueMap(prev => ({
          ...prev,
          [childUniqueId]: lookupSource.map((lv: any) => ({
            value: lv?.id?.toString(),
            label: lv?.lookupValue
          })).filter((v: MultiOption) => v.value)
        }));
      });

    } catch (error) {
      console.error('Error fetching dependent fields:', error);
    } finally {
      setIsDependentFieldLoading(false);
    }
  };

  // Initial load without filters
  useEffect(() => {
    fetchEntities();
  }, [projectId, ownerId, entityId]);

  // Load more entities when scrolling near bottom
  const loadMoreEntities = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    const nextPage = pageNum + 1;
    setPageNum(nextPage);
    fetchEntities(currentFilters, nextPage, true, isSelectAllActive);
  }, [isLoadingMore, hasMore, pageNum, currentFilters, isSelectAllActive]);

  // Handle scroll event for infinite scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    // Calculate if we're near the bottom (within ~2 items worth of space, roughly 50px)
    const nearBottom = scrollHeight - scrollTop - clientHeight < 50;
    if (nearBottom && hasMore && !isLoadingMore) {
      loadMoreEntities();
    }
  }, [hasMore, isLoadingMore, loadMoreEntities]);

  const getParentDataListId = (f: FilterRow): any => {
    return attributeDataMap[f.field].moduleType === SystemAttributeEnum.DATA_LIST_MODULE ? attributeDataMap[f.field]?.parentDataListId || null : null;
  }

  // Notify parent when selection or filters change
  useEffect(() => {
    onSelectionChange?.(entityId, isSelectAllActive ? [] : Array.from(selected), buildAttributeFilters(), isSelectAllActive);
  }, [selected, filters, entityId, onSelectionChange, attributeDataMap, isSelectAllActive]);

  return (
    <div className="mt-4">
      <div className="border-t border-b border-gray-200 overflow-hidden bg-white relative h-[285px]">
        {(loading || isDependentFieldLoading) && <SpinLoader />}
        <div className="grid grid-cols-12 divide-x divide-gray-200 h-full">
          {/* Left filter panel */}
          <div className="col-span-12 lg:col-span-6 h-full relative">
            <div className="flex items-center justify-start py-4 pl-6 pr-6 border-b border-gray-200 h-[56px]">
              <button
                type="button"
                onClick={handleApplyFilter}
                disabled={isDependentFieldLoading}
                className="px-4 py-2 bg-[#3699FF] text-white rounded-md shadow-sm text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Filter
              </button>
            </div>

            <div className="py-4 px-6 overflow-y-auto absolute top-[56px] bottom-4 left-0 right-0">
              {isUserModule && (
                <div className="grid grid-cols-12 gap-4 items-center">
                  <label className="text-sm text-gray-700 col-span-3">Role</label>
                  <div className="col-span-7">
                    <MultiSelect
                      name={`role-${sectionKey}`}
                      control={control}
                      options={roleOptions}
                      placeholder="Select"
                      maxWidth="w-full"
                    />
                  </div>
                </div>
              )}

              {filters.map((row, index) => {
                // Filter out attributes already selected in other rows
                const selectedFields = new Set(
                  filters.filter(f => f.id !== row.id && f.field).map(f => f.field)
                );
                const availableOptions = attributeOptions.filter(
                  opt => !selectedFields.has(opt.value) || opt.value === row.field
                );

                return (
                <div key={row.id} className="grid grid-cols-12 gap-3 items-center mt-4">
                  <div className="col-span-3">
                    <Select
                      name={`attr-${sectionKey}-${row.id}`}
                      control={control}
                      options={availableOptions}
                      placeholder="Attribute"
                      onChange={(val) => {
                        // Reset the value field in react-hook-form for all attribute types
                        setValue(`attrVal-${sectionKey}-${row.id}`, '');
                        setFilters(prev =>
                          prev.map(item =>
                            item.id === row.id ? { ...item, field: val, value: "" } : item
                          )
                        );
                      }}
                      maxWidth="w-full"
                    />
                  </div>
                  <div className="col-span-7">
                    {attributeTypeMap[row.field] === CustomAttributeTypeEnum.DATA_LIST || 
                      attributeDataMap[row.field]?.moduleType === SystemAttributeEnum.DATA_LIST_MODULE ? (
                      <Select
                        key={`attrVal-${sectionKey}-${row.id}-${row.field || "none"}`}
                        name={`attrVal-${sectionKey}-${row.id}`}
                        control={control}
                        options={(attributeValueMap || {})[row.field] || []}
                        placeholder="Select"
                        disabled={!row.field || isDependentFieldLoading}
                        onChange={(val) => {
                          setFilters(prev =>
                            prev.map(item =>
                              item.id === row.id ? { ...item, value: val || "" } : item
                            )
                          );
                          // Fetch dependent fields if applicable
                          if (val) {
                            onAttributeValueChange(val, row.field, row.id);
                          }
                        }}
                        maxWidth="w-full"
                      />
                    ) : (
                      <MultiSelect
                        key={`attrVal-${sectionKey}-${row.id}-${row.field || "none"}`}
                        name={`attrVal-${sectionKey}-${row.id}`}
                        control={control}
                        options={(attributeValueMap || {})[row.field] || []}
                        placeholder="Select"
                        disabled={!row.field}
                        maxWidth="w-full"
                      />
                    )}
                  </div>
                  <div className="col-span-2 flex items-center gap-1 mt-2">
                    <RemoveActionButton
                      id={row.id}
                      onRemove={() => handleRemoveFilter(row.id)}
                      className="h-8 w-8 !opacity-100"
                    />
                    {index === filters.length - 1 && (
                      <AddActionButton
                        onAdd={handleAddFilter}
                        className="h-8 w-8 !opacity-100"
                      />
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* Right entity list */}
          <div className="col-span-12 lg:col-span-6 h-full relative">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 h-[56px]">
              <div className="flex items-center gap-3 text-sm text-gray-800">
                <CheckBox
                  name={`select-all-${sectionKey}`}
                  label={entityTitle || "Entities"}
                  checkState={
                    isSelectAllActive || selected.size === items.length ? 1 : selected.size > 0 ? -1 : 0
                  }
                  onChange={handleToggleAll}
                  className="!ml-0"
                />
              </div>
              <span className="text-sm text-[#3699FF]">
                {`${getSelectedCount()} of ${totalEntityCount} Selected`}
              </span>
            </div>

            <div 
              ref={listContainerRef}
              onScroll={handleScroll}
              className="overflow-y-auto absolute top-[56px] bottom-4 left-0 right-0"
            >
              {(items || []).map(item => (
                <div key={item.id} className="flex items-center gap-3 text-sm text-gray-800 py-4 px-6 border-b border-gray-200">
                  <CheckBox
                    name={`entity-${sectionKey}-${item.id}`}
                    checked={selected.has(item.id)}
                    label={`${item.name} - ${item.serial}`}
                    onChange={() => handleToggleEntity(item.id)}
                    className="!ml-0"
                  />
                </div>
              ))}
              {isLoadingMore && (
                <div className="text-center text-sm text-gray-500 py-2">
                  Loading...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapEntitySection;
