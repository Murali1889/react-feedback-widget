import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Field } from '../ui/primitives/Field.jsx';
import { Stack } from '../ui/primitives/Stack.jsx';
import { pickToken } from '../ui/ThemeContext.jsx';
import { TriageListRow } from './TriageListRow.jsx';
import { useCommandCenter, useSelection } from './CommandCenterContext.jsx';
import { getFilteredItems } from './filtering.js';
import { EmptyState } from './EmptyState.jsx';

const Wrap = styled.div`
  display: flex; flex-direction: column; height: 100%;
  font-family: ${pickToken('font.sans')};
`;
const Top = styled.div`
  padding: 12px;
  border-bottom: 1px solid ${pickToken('color.border')};
  background: ${pickToken('color.bg')};
  display: flex; align-items: center; gap: 8px;
`;
const Body = styled.div`
  flex: 1; overflow-y: auto;
`;

const Sort = styled.select`
  font-family: inherit;
  font-size: ${pickToken('font.size.xs')};
  background: ${pickToken('color.surfaceMuted')};
  color: ${pickToken('color.text')};
  border: 1px solid ${pickToken('color.border')};
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  &:focus { outline: none; border-color: ${pickToken('color.accent')}; }
`;

const PRIORITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };
const STATUS_RANK   = { new: 0, open: 1, in_progress: 2, resolved: 3, closed: 4 };

function applySort(items, sort) {
  const arr = [...items];
  switch (sort) {
    case 'date-desc':
      return arr.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    case 'date-asc':
      return arr.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
    case 'priority':
      return arr.sort((a, b) =>
        (PRIORITY_RANK[a.severity] ?? 99) - (PRIORITY_RANK[b.severity] ?? 99) ||
        new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    case 'status':
      return arr.sort((a, b) =>
        (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99) ||
        new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    default:
      return arr;
  }
}

function useDebouncedValue(value, delay = 200) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

export function TriageList({ items = [] }) {
  const { filters, dispatch } = useCommandCenter();
  const { selectedId, select } = useSelection();
  const [search, setSearch] = useState(filters.search);
  const [sort, setSort] = useState('date-desc');
  const debounced = useDebouncedValue(search, 200);

  useEffect(() => { dispatch({ type: 'SET_SEARCH', value: debounced }); }, [debounced, dispatch]);

  const filtered = useMemo(
    () => applySort(getFilteredItems(items, { ...filters, search: debounced }), sort),
    [items, filters, debounced, sort]
  );

  const SortControl = (
    <Sort value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort feedback list">
      <option value="date-desc">Newest</option>
      <option value="date-asc">Oldest</option>
      <option value="priority">Priority</option>
      <option value="status">Status</option>
    </Sort>
  );

  if (!items.length) {
    return (
      <Wrap>
        <Top>
          <Field placeholder="Search feedback…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {SortControl}
        </Top>
        <EmptyState variant="no-data" />
      </Wrap>
    );
  }

  if (!filtered.length) {
    return (
      <Wrap>
        <Top>
          <Field placeholder="Search feedback…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {SortControl}
        </Top>
        <EmptyState variant="filtered-empty" onClearFilters={() => { setSearch(''); dispatch({ type: 'CLEAR_FILTERS' }); }} />
      </Wrap>
    );
  }

  return (
    <Wrap>
      <Top>
        <Field placeholder="Search feedback…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {SortControl}
      </Top>
      <Body>
        <Stack direction="column" gap="0">
          {filtered.map((item) => (
            <TriageListRow key={item.id} item={item} selected={item.id === selectedId} onSelect={select} />
          ))}
        </Stack>
      </Body>
    </Wrap>
  );
}
export default TriageList;
