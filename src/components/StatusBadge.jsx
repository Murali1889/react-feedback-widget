import React from 'react';
import { Chip } from '../ui/primitives/Chip.jsx';

const STATUS_TO_VARIANT = {
  new: { variant: 'accent', dot: true, label: 'New' },
  open: { variant: 'neutral', dot: true, label: 'Open' },
  in_progress: { variant: 'warning', dot: true, label: 'In Progress' },
  under_review: { variant: 'neutral', dot: true, label: 'Under Review' },
  on_hold: { variant: 'neutral', dot: true, label: 'On Hold' },
  resolved: { variant: 'success', dot: true, label: 'Resolved' },
  closed: { variant: 'neutral', dot: false, label: 'Closed' },
  wont_fix: { variant: 'neutral', dot: false, label: "Won't Fix" },
};

export function StatusBadge({ status, size = 'md', customStatuses }) {
  const map = customStatuses || STATUS_TO_VARIANT;
  const entry = map[status] || { variant: 'neutral', dot: true, label: status || 'Unknown' };
  return (
    <Chip variant={entry.variant} dot={entry.dot} size={size}>
      {entry.label || status}
    </Chip>
  );
}

StatusBadge.displayName = 'StatusBadge';
export default StatusBadge;
