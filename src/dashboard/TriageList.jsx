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
`;
const Body = styled.div`
  flex: 1; overflow-y: auto;
`;

function useDebouncedValue(value, delay = 200) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

export function TriageList({ items = [] }) {
  const { filters, dispatch } = useCommandCenter();
  const { selectedId, select } = useSelection();
  const [search, setSearch] = useState(filters.search);
  const debounced = useDebouncedValue(search, 200);

  useEffect(() => { dispatch({ type: 'SET_SEARCH', value: debounced }); }, [debounced, dispatch]);

  const filtered = useMemo(() => getFilteredItems(items, { ...filters, search: debounced }), [items, filters, debounced]);

  if (!items.length) {
    return <Wrap><Top><Field placeholder="Search feedback…" value={search} onChange={(e) => setSearch(e.target.value)} /></Top><EmptyState variant="no-data" /></Wrap>;
  }

  if (!filtered.length) {
    return (
      <Wrap>
        <Top><Field placeholder="Search feedback…" value={search} onChange={(e) => setSearch(e.target.value)} /></Top>
        <EmptyState variant="filtered-empty" onClearFilters={() => { setSearch(''); dispatch({ type: 'CLEAR_FILTERS' }); }} />
      </Wrap>
    );
  }

  return (
    <Wrap>
      <Top>
        <Field placeholder="Search feedback…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
