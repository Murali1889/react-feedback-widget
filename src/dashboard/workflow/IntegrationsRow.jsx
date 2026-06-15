import React from 'react';
import styled from 'styled-components';
import { Chip } from '../../ui/primitives/Chip.jsx';
import { IconButton } from '../../ui/primitives/IconButton.jsx';
import { Stack } from '../../ui/primitives/Stack.jsx';
import { pickToken } from '../../ui/ThemeContext.jsx';

const Row = styled.div`
  display: flex; align-items: center; gap: 8px;
  font-size: ${pickToken('font.size.sm')};
`;
const Provider = styled.span`font-weight: 500; color: ${pickToken('color.text')};`;
const Key = styled.code`
  font-family: ${pickToken('font.mono')};
  background: ${pickToken('color.canvas')};
  padding: 2px 6px;
  border-radius: 4px;
  font-size: ${pickToken('font.size.xs')};
`;
const STATE_VARIANT = {
  created: 'success', synced: 'success', appended: 'success',
  pending: 'neutral', not_sent: 'neutral',
  error: 'danger',
};

function Item({ name, state, onRetry }) {
  if (!state) return null;
  return (
    <Row>
      <Provider>{name}</Provider>
      <Chip variant={STATE_VARIANT[state.status] || 'neutral'} dot size="sm">{state.status}</Chip>
      {(state.issueKey || state.rowId) && <Key>{state.issueKey || state.rowId}</Key>}
      {state.status === 'error' && onRetry && (
        <IconButton aria-label="Retry sync" icon={<span>↻</span>} onClick={onRetry} />
      )}
    </Row>
  );
}

export function IntegrationsRow({ item, isDeveloper, onRetry }) {
  if (!isDeveloper) return null;
  const state = item.integrationState || {};
  if (!state.jira && !state.sheets) return null;
  return (
    <Stack direction="column" gap="3">
      <Item name="Jira" state={state.jira} onRetry={onRetry ? () => onRetry(item.id, 'jira') : null} />
      <Item name="Sheets" state={state.sheets} onRetry={onRetry ? () => onRetry(item.id, 'sheets') : null} />
    </Stack>
  );
}
export default IntegrationsRow;
