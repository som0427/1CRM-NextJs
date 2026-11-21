import React, { useMemo } from 'react';
import Select from '../input-fields/Select';
import { useAdvanceFilterContext } from '../../../contexts/AdvanceFilterContext';

interface Props {
  rule: {
    id: string;
  };
  autoOpen?: boolean;
}

const EntityFieldSelect: React.FC<Props> = ({ rule, autoOpen = false }) => {
  const { control, entityFields, filterRules, handleFieldChange, clearErrors } = useAdvanceFilterContext();

  // Hide fields already chosen by other rules so the same field can't be
  // picked twice. The current row's own selection stays visible, so its
  // label keeps rendering correctly.
  const availableFields = useMemo(() => {
    const usedByOthers = new Set<number>();
    filterRules.forEach(r => {
      if (r.id !== rule.id && r.entityFieldId && r.entityFieldId !== 0) {
        usedByOthers.add(r.entityFieldId);
      }
    });
    return entityFields.filter(f => !usedByOthers.has(f.id));
  }, [entityFields, filterRules, rule.id]);

  const handleChange = (value: string) => {
    const selectedField = entityFields.find(field => field.id.toString() === value);
    if (selectedField) {
      clearErrors(`entityField_${rule.id}`);
      handleFieldChange(rule.id, selectedField);
    }
  };

  return (
    <Select
      name={`entityField_${rule.id}`}
      control={control}
      options={[
        ...availableFields.map(entityField => ({
          value: entityField.id.toString(),
          label: entityField.attributeName,
        })),
      ]}
      placeholder="Select entity field"
      validationRules={{ required: 'Entity field cannot be blank' }}
      maxWidth="w-full"
      onChange={handleChange}
      autoOpen={autoOpen}
    />
  );
};

export default React.memo(EntityFieldSelect);
