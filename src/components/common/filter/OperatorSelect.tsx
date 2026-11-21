import React, { useEffect } from 'react';
import Select from '../input-fields/Select';
import { useAdvanceFilterContext } from '../../../contexts/AdvanceFilterContext';

interface Props {
  rule: {
    id: string;
    entityFieldId: number;
    attributeTypeId: number;
  };
}

const OperatorSelect: React.FC<Props> = ({ rule }) => {
  const { control, operatorListMap, operatorOverridesByFieldId, handleOperatorChange } = useAdvanceFilterContext();

  const overrideOperators = operatorOverridesByFieldId?.get(rule.entityFieldId);

  const operators = overrideOperators || operatorListMap.get(rule.attributeTypeId) || [];
  const options = rule.attributeTypeId !== 0
    ? (operators.map(operator => ({
        value: operator.key.toString(),
        label: operator.value,
      })) || [])
    : [];

  return (
    <Select
      name={`operator_${rule.id}`}
      control={control}
      options={options}
      placeholder="Select operator"
      disabled={rule.entityFieldId === 0 || rule.attributeTypeId === 0}
      validationRules={{ required: 'Please select an operator' }}
      maxWidth="w-full"
      onChange={(value) => {
        if (value) {
          handleOperatorChange(rule.id, parseInt(value), rule.attributeTypeId);
        }
      }}
    />
  );
};

export default React.memo(OperatorSelect);
