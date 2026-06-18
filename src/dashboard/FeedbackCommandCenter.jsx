import React, { useEffect, useMemo } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { Chip } from '../ui/primitives/Chip.jsx';
import { IconButton } from '../ui/primitives/IconButton.jsx';
import { pickToken } from '../ui/ThemeContext.jsx';
import { tokens } from '../ui/tokens.js';
import { lightTheme, darkTheme } from '../theme.js';
import { CommandCenterProvider, useCommandCenter, useSelection } from './CommandCenterContext.jsx';
import { useFeedbackStore } from './useFeedbackStore.js';
import { useKeyboardShortcuts } from './useKeyboardShortcuts.js';
import { getFilteredItems } from './filtering.js';
import { SummaryBar } from './SummaryBar.jsx';
import { TriageList } from './TriageList.jsx';
import { EvidenceStack } from './EvidenceStack.jsx';
import { ErrorState } from './ErrorState.jsx';

const Root = styled.div`position: fixed; inset: 0; z-index: 10000; font-family: ${pickToken('font.sans')};`;
const Backdrop = styled.div`
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.35);
`;
const Panel = styled.div`
  position: absolute; top: 0; right: 0; bottom: 0;
  width: min(1280px, 96vw);
  background: ${pickToken('color.bg')};
  border-left: 1px solid ${pickToken('color.border')};
  border-radius: 14px 0 0 14px;
  box-shadow: -20px 0 50px rgba(28,25,23,0.18);
  display: grid;
  grid-template-rows: 56px auto 1fr 36px;
  grid-template-columns: 340px minmax(420px, 1fr);

  @media (max-width: 1024px) {
    width: 100vw;
    border-radius: 0;
    grid-template-columns: 300px 1fr;
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;
const Header = styled.header`
  grid-column: 1 / -1;
  display: flex; align-items: center; gap: 12px;
  padding: 0 18px;
  border-bottom: 1px solid ${pickToken('color.border')};
  background: ${pickToken('color.bg')};
`;
const Title = styled.div`font-size: ${pickToken('font.size.md')}; font-weight: 600;`;
const Spacer = styled.div`flex: 1;`;
const SummarySlot = styled.div`grid-column: 1 / -1;`;
const Body = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 340px minmax(420px, 1fr);
  min-height: 0;

  @media (max-width: 1024px) {
    grid-template-columns: 300px 1fr;
  }
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
`;
const Col = styled.div`
  min-height: 0;
  border-right: 1px solid ${pickToken('color.border')};
  &:last-child { border-right: 0; }
`;
const Footer = styled.footer`
  grid-column: 1 / -1;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 18px;
  border-top: 1px solid ${pickToken('color.border')};
  font-size: ${pickToken('font.size.xs')};
  color: ${pickToken('color.textFaint')};
  background: ${pickToken('color.bg')};
`;

function pickDefaultSelected(items) {
  if (!items?.length) return null;
  const sorted = [...items].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  const unresolved = sorted.find((i) => !['resolved', 'closed'].includes(i.status));
  return (unresolved || sorted[0]).id;
}

function Inner({
  isOpen, onClose, items, isLoading, error, refresh,
  statuses, customStatuses, isDeveloper,
  onStatusChange, onSeverityChange, onOwnerChange, onCustomerValueChange, onIntegrationRetry, onDelete,
}) {
  const { filters } = useCommandCenter();
  const { selectedId, select } = useSelection();
  const filteredItems = useMemo(() => getFilteredItems(items, filters), [items, filters]);
  const selectedItem = useMemo(() => items.find((i) => i.id === selectedId) || null, [items, selectedId]);

  useEffect(() => {
    if (!selectedId && items.length > 0) {
      const id = pickDefaultSelected(items);
      if (id) select(id);
    }
  }, [selectedId, items, select]);

  useEffect(() => {
    if (selectedId && !items.find((i) => i.id === selectedId)) {
      const id = pickDefaultSelected(items);
      select(id);
    }
  }, [selectedId, items, select]);

  useKeyboardShortcuts({
    enabled: isOpen,
    shortcuts: {
      Escape: () => onClose?.(),
      '/': () => document.querySelector('input[placeholder*="Search feedback"]')?.focus(),
      'j': () => {
        const idx = filteredItems.findIndex((i) => i.id === selectedId);
        const next = filteredItems[Math.min(filteredItems.length - 1, idx + 1)];
        if (next) select(next.id);
      },
      'k': () => {
        const idx = filteredItems.findIndex((i) => i.id === selectedId);
        const next = filteredItems[Math.max(0, idx - 1)];
        if (next) select(next.id);
      },
    },
  });

  const statusMap = customStatuses || statuses || {};

  return (
    <Root>
      <Backdrop data-role="backdrop" onClick={onClose} />
      <Panel role="dialog" aria-modal="true" aria-label="Feedback Command Center">
        <Header>
          <Title>Feedback</Title>
          <Chip>{items.length} items</Chip>
          <Spacer />
          {refresh && <IconButton aria-label="Refresh" icon={<span>↻</span>} onClick={refresh} />}
          <IconButton aria-label="Close" icon={<span>×</span>} onClick={onClose} />
        </Header>
        <SummarySlot><SummaryBar items={items} /></SummarySlot>
        <Body>
          <Col data-col="list">
            {error
              ? <ErrorState message={String(error?.message || error)} onRetry={refresh} />
              : <TriageList items={filteredItems} />}
          </Col>
          <Col data-col="detail">
            <EvidenceStack
              item={selectedItem}
              statuses={statusMap}
              isDeveloper={isDeveloper}
              onStatusChange={onStatusChange}
              onSeverityChange={onSeverityChange}
              onOwnerChange={onOwnerChange}
              onCustomerValueChange={onCustomerValueChange}
              onDelete={onDelete}
            />
          </Col>
        </Body>
        <Footer>
          <span>
            {isLoading
              ? 'Loading…'
              : filteredItems.length === items.length
                ? `${items.length} items`
                : `${filteredItems.length} of ${items.length} items`}
          </span>
          <span>/ search · j/k next-prev · Esc close</span>
        </Footer>
      </Panel>
    </Root>
  );
}

export function FeedbackCommandCenter(props) {
  if (!props.isOpen) return null;
  const mode = props.mode === 'dark' ? 'dark' : 'light';
  const themeBase = mode === 'dark' ? darkTheme : lightTheme;
  const themeWithTokens = { ...themeBase, tokens: mode === 'dark' ? tokens.dark : tokens.light };
  const storeOpts = props.data
    ? { mode: 'prop', data: props.data }
    : (props.dataSource ? { mode: 'source', source: props.dataSource } : { mode: 'localStorage' });
  const { items, isLoading, error, save, remove, refresh } = useFeedbackStore(storeOpts);

  const handleStatusChange = (id, next) => {
    props.onStatusChange?.(id, next);
    const cur = items.find((i) => i.id === id);
    if (cur && storeOpts.mode === 'localStorage') save({ ...cur, status: next });
  };
  const handleDelete = (id) => {
    props.onDelete?.(id);
    if (storeOpts.mode === 'localStorage') remove(id);
  };

  return (
    <ThemeProvider theme={themeWithTokens}>
      <CommandCenterProvider>
        <Inner
          {...props}
          items={items}
          isLoading={isLoading}
          error={error}
          refresh={props.dataSource ? refresh : null}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      </CommandCenterProvider>
    </ThemeProvider>
  );
}
export default FeedbackCommandCenter;
