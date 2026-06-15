import React from 'react';
import { Select } from '../../ui/primitives/Select.jsx';
import { Chip } from '../../ui/primitives/Chip.jsx';

const OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];
const VARIANT = { low: 'neutral', medium: 'neutral', high: 'warning', critical: 'danger' };

export function SeverityRow({ item, onChange }) {
  const sev = item.severity || 'medium';
  return (
    <Select
      options={OPTIONS}
      value={sev}
      onChange={(next) => onChange?.(item.id, next)}
      placeholder="Set severity"
      renderTrigger={(_open, selected) => (
        <Chip variant={VARIANT[(selected?.value || sev)]} dot size="md">
          {selected?.label || OPTIONS.find(o => o.value === sev)?.label || sev}
        </Chip>
      )}
    />
  );
}
export default SeverityRow;
