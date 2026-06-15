import React from 'react';
import { Select } from '../../ui/primitives/Select.jsx';
import { Chip } from '../../ui/primitives/Chip.jsx';

export function WorkflowStatusControl({ status, statuses = {}, onChange }) {
  const options = Object.entries(statuses).map(([value, def]) => ({
    value,
    label: def.label || value,
  }));
  return (
    <Select
      options={options}
      value={status}
      onChange={(next) => onChange?.(next)}
      placeholder="Set status"
      renderTrigger={(_open, selected) => {
        const label = selected?.label || statuses[status]?.label || status || 'Set status';
        return <Chip variant="accent" dot size="md">{label}</Chip>;
      }}
    />
  );
}
export default WorkflowStatusControl;
