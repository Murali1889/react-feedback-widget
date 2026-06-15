import React from 'react';
import styled from 'styled-components';
import { pickToken } from '../../ui/ThemeContext.jsx';
import { Stack } from '../../ui/primitives/Stack.jsx';

const Row = styled.div`
  display: flex; gap: 12px; align-items: baseline;
  font-size: ${pickToken('font.size.sm')};
  color: ${pickToken('color.textMuted')};
`;
const Label = styled.span`width: 96px; flex-shrink: 0;`;
const Value = styled.span`color: ${pickToken('color.text')};`;
const Mono = styled.code`
  font-family: ${pickToken('font.mono')};
  background: ${pickToken('color.canvas')};
  padding: 2px 6px;
  border-radius: 4px;
  font-size: ${pickToken('font.size.sm')};
`;

export function SourceSection({ item }) {
  const ei = item.elementInfo || {};
  return (
    <Stack direction="column" gap="2">
      {ei.componentStack?.length > 0 && <Row><Label>Component</Label><Value>{ei.componentStack.join(' › ')}</Value></Row>}
      {ei.sourceFile && <Row><Label>File</Label><Mono>{ei.sourceFile}</Mono></Row>}
      {ei.selector && <Row><Label>Selector</Label><Mono>{ei.selector}</Mono></Row>}
      {item.viewport && <Row><Label>Viewport</Label><Value>{`${item.viewport.width}×${item.viewport.height}`}</Value></Row>}
      {item.aiTicket?.json?.where?.codeSnippet?.length > 0 && (
        <pre style={{
          fontFamily: 'ui-monospace, Menlo, monospace',
          fontSize: 12,
          background: 'var(--cs-canvas, #f7f7f3)',
          padding: '10px 12px',
          borderRadius: 8,
          overflowX: 'auto',
          marginTop: 8,
        }}>
          {item.aiTicket.json.where.codeSnippet.map((l) => {
            const num = String(l.line).padStart(4, ' ');
            return `${l.highlight ? '>>>' : '   '} ${num}  ${l.text}\n`;
          }).join('')}
        </pre>
      )}
    </Stack>
  );
}
SourceSection.summary = (item) => {
  const ei = item.elementInfo || {};
  return ei.sourceFile || ei.selector || '—';
};
SourceSection.title = 'Source';
SourceSection.id = 'source';
SourceSection.shouldRender = (item) => {
  const ei = item.elementInfo || {};
  return !!(ei.componentStack?.length || ei.sourceFile || ei.selector || item.viewport);
};
export default SourceSection;
