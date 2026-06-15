import React from 'react';
import { Chip } from '../../ui/primitives/Chip.jsx';

export function CustomerRow({ item, isDeveloper, onChange }) {
  if (!isDeveloper) return null;
  const v = item.customerValue;
  const display = v === undefined || v === null ? '—' : String(v);
  const handle = () => {
    if (!onChange) return;
    const next = window.prompt('Customer value', display);
    if (next != null) onChange(item.id, next);
  };
  return <Chip variant="accent" onClick={onChange ? handle : undefined}>{display}</Chip>;
}
export default CustomerRow;
