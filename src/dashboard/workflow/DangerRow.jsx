import React from 'react';
import { ConfirmButton } from '../ConfirmButton.jsx';

export function DangerRow({ item, isDeveloper, onDelete }) {
  if (!isDeveloper || !onDelete) return null;
  return (
    <ConfirmButton
      variant="danger"
      size="sm"
      confirmLabel="Confirm delete"
      onConfirm={() => onDelete(item.id)}
    >
      Delete
    </ConfirmButton>
  );
}
export default DangerRow;
