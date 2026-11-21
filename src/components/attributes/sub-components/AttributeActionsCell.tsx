import React, { useMemo } from "react";
import EditActionButton from "../../common/buttons/action-button/EditActionButton";
import EyeButton from "../../common/buttons/action-button/EyeButton";
import { SystemAttributeEnum } from "@/lib/constants/SystemAttributeEnum.constant";
import { createActionQueue, createPlaceholder, useActionCellProtection } from "../../common/utils/actionQueue";

interface AttributeActionsCellProps {
  data: any;
  onEdit?: (attributeId: number) => void;
  onView?: (attributeId: number) => void;
}

const AttributeActionsCell: React.FC<AttributeActionsCellProps> = ({ data, onEdit, onView }) => {
  // Hook to protect against DOM manipulation via DevTools
  const { containerRef, renderKey } = useActionCellProtection();

  const { displayRelation, disabledRelation, openAccessSetting } = useMemo(() => {
    let displayRelation = false;
    let disabledRelation = false;
    let openAccessSetting = false;
    const systemAttrId = data?.systemAttribute?.id;

    // Disable relation for USER_PASSWORD_FIELD_ID (60)
    if (systemAttrId === SystemAttributeEnum.USER_PASSWORD_FIELD_ID) {
      disabledRelation = true;
    }

    // Display relation for specific fieldSpec or systemAttribute range (excluding attributeType.id == 12)
    // Range: OPPORTUNITY_VALUE_FIELD_ID (7), OPPORTUNITY_STATUS_FIELD_ID (8), OPPORTUNITY_WIN_PROBABILITY_FIELD_ID (9)
    if (
      (data?.fieldSpec === 1 || data?.fieldSpec === 2 || 
       (systemAttrId > SystemAttributeEnum.OPPORTUNITY_CONTACT_FIELD_ID && 
        systemAttrId < SystemAttributeEnum.CONTACT_TYPE_FIELD_ID)) &&
      data?.attributeType?.id !== 12
    ) {
      displayRelation = true;
    }

    // Hide relation for moduleType > 100 (Activity module) with specific systemAttribute ids
    // Activity fields: ACTIVITY_OPPORTUNITY_FIELD_ID (26), ACTIVITY_OPP_VALUE_FIELD_ID (29),
    // ACTIVITY_OPP_STATUS_FIELD_ID (30), ACTIVITY_OPP_EXP_CLOSURE_DATE_FIELD_ID (31),
    // ACTIVITY_OPP_WIN_PROBABILITY_FIELD_ID (32), ACTIVITY_SELECT_ESTIMATE_FIELD_ID (40)
    if (
      data?.moduleType > 100 &&
      data?.systemAttribute != null &&
      [
        SystemAttributeEnum.ACTIVITY_OPPORTUNITY_FIELD_ID,
        SystemAttributeEnum.ACTIVITY_OPP_VALUE_FIELD_ID,
        SystemAttributeEnum.ACTIVITY_OPP_STATUS_FIELD_ID,
        SystemAttributeEnum.ACTIVITY_OPP_EXP_CLOSURE_DATE_FIELD_ID,
        SystemAttributeEnum.ACTIVITY_OPP_WIN_PROBABILITY_FIELD_ID,
        SystemAttributeEnum.ACTIVITY_SELECT_ESTIMATE_FIELD_ID,
      ].includes(systemAttrId)
    ) {
      displayRelation = false;
    }

    // Show access setting for Contact (1), Company (2), Opportunity (3), and Activity (>=100) modules
    if (
      data?.moduleType === SystemAttributeEnum.CONTACT_MODULE ||
      data?.moduleType === SystemAttributeEnum.COMPANY_MODULE ||
      data?.moduleType === SystemAttributeEnum.OPPORTUNITY_MODULE ||
      data?.moduleType >= 100
    ) {
      openAccessSetting = true;

      // Disable visibility icon for Child/Dependent Field and some standard fields
      // CONTACT_COMPANY_FIELD_ID (11), OPPORTUNITY_COMPANY_NAME_FIELD_ID (5), OPPORTUNITY_CONTACT_FIELD_ID (6),
      // ACTIVITY_COMPANY_FIELD_ID (25), ACTIVITY_OPPORTUNITY_FIELD_ID (26), ACTIVITY_CONTACT_FIELD_ID (27)
      if (
        data?.parentId !== 0 ||
        [
          SystemAttributeEnum.CONTACT_COMPANY_FIELD_ID,
          SystemAttributeEnum.OPPORTUNITY_COMPANY_NAME_FIELD_ID,
          SystemAttributeEnum.OPPORTUNITY_CONTACT_FIELD_ID,
          SystemAttributeEnum.ACTIVITY_COMPANY_FIELD_ID,
          SystemAttributeEnum.ACTIVITY_OPPORTUNITY_FIELD_ID,
          SystemAttributeEnum.ACTIVITY_CONTACT_FIELD_ID,
        ].includes(systemAttrId)
      ) {
        openAccessSetting = false;
      }
    }

    return { displayRelation, disabledRelation, openAccessSetting };
  }, [data]);

  // Build actions using priority queue - user can add in any order
  const queue = createActionQueue();

  // Add edit button or placeholder
  if (onEdit) {
    queue.add(
      <EditActionButton className="w-6 h-6" key="edit" id={data.id} onEdit={onEdit} variant="new" />,
      true
    );
  } else {
    queue.add(createPlaceholder("edit-placeholder"), false);
  }
  

  // Add eye button or placeholder
  if (onView && openAccessSetting) {
    queue.add(
      <EyeButton key="eye" id={data.id} onView={onView} />,
      true
    );
  } else {
    queue.add(createPlaceholder("eye-placeholder"), false);
  }

  return (
    <div ref={containerRef} key={renderKey} className="flex justify-center items-center w-full h-full gap-1">
      {queue.getActions()}
    </div>
  );
};

export default AttributeActionsCell;
