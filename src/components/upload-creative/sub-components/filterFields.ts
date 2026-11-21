import { CustomAttributeTypeEnum } from '@/lib/constants/CustomAttributeTypeEnum.constant';

/**
 * Builds the entity-field options for the creative's attribute filter, flattening a
 * DATA_LIST field and its child fields into the same list so each one can be filtered
 * on independently.
 *
 * A DATA_LIST field is a small tree: the field on the entity carries the list itself,
 * and its dependent fields are separate attributes living in the data-list module,
 * linked back by `parentLinkedDatalistAttribId`. In the entity form a child is only
 * reachable once its parent has a value, but the saved value rows are keyed by
 * (attributeId, parentLinkedDatalistAttribId), so a child can be filtered on its own.
 * That is what this list exposes.
 */

/**
 * Separates a child attribute's id from its parent's in an option key. A child is not
 * unique by attribute id alone — the same child can hang off more than one data list —
 * so both halves are needed to identify the row the filter means.
 */
const CHILD_KEY_SEPARATOR = '@';

/** Types whose values can be picked from a list, and so can be filtered on. */
const SELECTABLE_TYPES = new Set<number>([
  CustomAttributeTypeEnum.SINGLE_SELECT_DROPDOWN,
  CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN,
]);

/**
 * Multi-select is held back from the field dropdown for now. Set this to true to offer
 * it again; nothing else has to change.
 */
const ALLOW_MULTI_SELECT_FILTERS = false;

/**
 * The types actually offered in the dropdown. Narrower than SELECTABLE_TYPES on purpose:
 * a type left out here is still resolved from a saved filter, so a creative saved against
 * a multi-select field still opens showing that field and its values rather than an empty
 * row that would be silently rewritten on the next save.
 */
const isOfferedType = (typeId: number): boolean => (
  SELECTABLE_TYPES.has(typeId)
  && (ALLOW_MULTI_SELECT_FILTERS || typeId !== CustomAttributeTypeEnum.MULTI_SELECT_DROPDOWN)
);

/** Separates a child's name from its parent's in the option label. */
const LABEL_SEPARATOR = ' › ';

export interface FilterFieldOption {
  value: string;
  label: string;
}

export interface FilterFieldMeta {
  /** The attribute row as the fields API returned it. */
  field: any;
  /**
   * The entity's DATA_LIST attribute id when this option is one of its child fields,
   * null for an ordinary entity attribute and for the DATA_LIST field itself. Every
   * descendant carries the id of the DATA_LIST field at the top, whatever its depth,
   * which is how the entity form writes `parentLinkedDatalistAttribId` on save.
   */
  parentDataListId: number | null;
}

export const buildFilterFieldKey = (
  attributeId: string | number,
  parentDataListId: string | number | null | undefined,
): string => (
  parentDataListId == null
    ? String(attributeId)
    : `${attributeId}${CHILD_KEY_SEPARATOR}${parentDataListId}`
);

export const parseFilterFieldKey = (key: string): { fieldId: string; parentDataListId: number | null } => {
  const [fieldId, parentDataListId] = key.split(CHILD_KEY_SEPARATOR);
  const parsedParent = Number(parentDataListId);
  return {
    fieldId,
    parentDataListId: parentDataListId && !isNaN(parsedParent) ? parsedParent : null,
  };
};

/**
 * Child fields are not reliably present on the entity fields response, so fall back to
 * the data-list module's own copy, joined on `parentDataListId` the way the entity
 * forms do it.
 */
const resolveChildAttributes = (field: any, dataListMasters: any[]): any[] => {
  if (field.childAttributeList?.length) return field.childAttributeList;
  const master = dataListMasters.find((m: any) => m.id === field.parentDataListId);
  return master?.childAttributeList ?? [];
};

/**
 * Child rows come from the data-list module and do not always carry `isActive`, so an
 * absent flag is read as active — only an explicit 0 hides the field.
 */
const isActiveChild = (field: any): boolean => field?.status !== 0 && field?.isActive !== 0;

const collectChildOptions = (
  children: any[],
  dataListFieldId: number,
  labelPrefix: string,
  options: FilterFieldOption[],
  metaMap: Record<string, FilterFieldMeta>,
  /** Ids on the path to here, so a data list that somehow points back at itself cannot loop. */
  pathIds: Set<number>,
): void => {
  children.forEach((child: any) => {
    if (child?.id == null || pathIds.has(child.id) || !isActiveChild(child)) return;

    const label = `${labelPrefix}${LABEL_SEPARATOR}${child.attributeName}`;

    if (SELECTABLE_TYPES.has(child.attributeType?.id)) {
      const key = buildFilterFieldKey(child.id, dataListFieldId);
      // The shallowest occurrence wins, so a child reachable by two routes is offered once.
      if (!metaMap[key]) {
        if (isOfferedType(child.attributeType.id)) options.push({ value: key, label });
        metaMap[key] = { field: child, parentDataListId: dataListFieldId };
      }
    }

    if (child.childAttributeList?.length) {
      collectChildOptions(
        child.childAttributeList,
        dataListFieldId,
        label,
        options,
        metaMap,
        new Set(pathIds).add(child.id),
      );
    }
  });
};

/**
 * @param formFields entity attributes, as getFormFields returns them
 * @param dataListMasters data-list module attributes, used only to supply child fields
 *                        the entity response left out
 */
export const buildFilterFieldOptions = (
  formFields: any[],
  dataListMasters: any[] = [],
): { options: FilterFieldOption[]; metaMap: Record<string, FilterFieldMeta> } => {
  const options: FilterFieldOption[] = [];
  const metaMap: Record<string, FilterFieldMeta> = {};

  formFields.forEach((field: any) => {
    if (field.status !== 1 || field.isActive !== 1) return;

    const typeId = field.attributeType?.id;
    const isDataList = typeId === CustomAttributeTypeEnum.DATA_LIST;
    if (!isDataList && !SELECTABLE_TYPES.has(typeId)) return;

    const key = buildFilterFieldKey(field.id, null);
    // A DATA_LIST field is always offered; a dropdown only if its type is being offered
    if (isDataList || isOfferedType(typeId)) {
      options.push({ value: key, label: field.attributeName });
    }
    metaMap[key] = { field, parentDataListId: null };

    if (!isDataList) return;

    collectChildOptions(
      resolveChildAttributes(field, dataListMasters),
      field.id,
      field.attributeName,
      options,
      metaMap,
      new Set<number>([field.id]),
    );
  });

  return { options, metaMap };
};
