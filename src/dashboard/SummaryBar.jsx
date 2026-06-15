import React, { useMemo } from 'react';
import styled from 'styled-components';
import { Chip } from '../ui/primitives/Chip.jsx';
import { pickToken } from '../ui/ThemeContext.jsx';
import { useCommandCenter } from './CommandCenterContext.jsx';
import { getStatusCounts, getAttentionCounts } from './filtering.js';

const Bar = styled.div`
  display: flex; align-items: center; gap: 10px;
  padding: 12px 18px;
  border-bottom: 1px solid ${pickToken('color.border')};
  background: ${pickToken('color.bg')};
  font-family: ${pickToken('font.sans')};
  flex-wrap: wrap;
`;
const Divider = styled.span`
  width: 1px; height: 22px;
  background: ${pickToken('color.border')};
  margin: 0 4px;
`;

const STATUS_ORDER = ['new', 'open', 'in_progress', 'resolved', 'closed'];
const STATUS_LABEL = { new: 'New', open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };

export function SummaryBar({ items = [] }) {
  const { filters, dispatch } = useCommandCenter();
  const statusCounts = useMemo(() => getStatusCounts(items), [items]);
  const attn = useMemo(() => getAttentionCounts(items), [items]);

  return (
    <Bar>
      {STATUS_ORDER.map((s) => (
        <Chip
          key={s}
          variant={filters.statuses.has(s) ? 'accent' : 'neutral'}
          onClick={() => dispatch({ type: 'TOGGLE_STATUS_FILTER', value: s })}
        >
          {STATUS_LABEL[s]} · {statusCounts[s] || 0}
        </Chip>
      ))}
      <Divider />
      <Chip variant={filters.flags.has('withMedia') ? 'accent' : 'neutral'} onClick={() => dispatch({ type: 'TOGGLE_FLAG_FILTER', value: 'withMedia' })}>
        With media · {attn.withMedia}
      </Chip>
      <Chip variant={filters.flags.has('hasErrors') ? 'accent' : 'neutral'} onClick={() => dispatch({ type: 'TOGGLE_FLAG_FILTER', value: 'hasErrors' })}>
        Has errors · {attn.hasErrors}
      </Chip>
      <Chip variant={filters.flags.has('needsOwner') ? 'accent' : 'neutral'} onClick={() => dispatch({ type: 'TOGGLE_FLAG_FILTER', value: 'needsOwner' })}>
        Needs owner · {attn.needsOwner}
      </Chip>
    </Bar>
  );
}
export default SummaryBar;
