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

const SEVERITY_ORDER = ['P0', 'P1', 'P2', 'P3'];

function countBySeverity(items) {
  const out = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const it of items) {
    const s = it?.severity;
    if (s && out[s] != null) out[s] += 1;
  }
  return out;
}

const ClearAll = styled.button`
  background: none;
  border: 1px solid ${pickToken('color.border')};
  color: ${pickToken('color.textFaint')};
  font-family: inherit;
  font-size: ${pickToken('font.size.xs')};
  padding: 4px 9px;
  border-radius: 999px;
  cursor: pointer;
  margin-left: auto;
  &:hover { color: ${pickToken('color.text')}; border-color: ${pickToken('color.borderStrong')}; }
`;

export function SummaryBar({ items = [] }) {
  const { filters, dispatch } = useCommandCenter();
  const statusCounts = useMemo(() => getStatusCounts(items), [items]);
  const attn = useMemo(() => getAttentionCounts(items), [items]);
  const sevCounts = useMemo(() => countBySeverity(items), [items]);

  const anyFilterActive =
    filters.statuses.size > 0 || filters.severities.size > 0 || filters.flags.size > 0 || (filters.search || '').length > 0;

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
      {SEVERITY_ORDER.map((s) => (
        <Chip
          key={s}
          variant={filters.severities.has(s) ? 'accent' : 'neutral'}
          onClick={() => dispatch({ type: 'TOGGLE_SEVERITY_FILTER', value: s })}
          aria-pressed={filters.severities.has(s)}
        >
          {s} · {sevCounts[s] || 0}
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
      {anyFilterActive && (
        <ClearAll onClick={() => dispatch({ type: 'CLEAR_FILTERS' })}>Clear all</ClearAll>
      )}
    </Bar>
  );
}
export default SummaryBar;
