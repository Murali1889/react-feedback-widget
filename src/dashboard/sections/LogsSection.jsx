import React from 'react';
import styled from 'styled-components';
import { pickToken } from '../../ui/ThemeContext.jsx';
import { getFeedbackEvidenceSummary } from '../../lib/feedbackEvidence.js';

const Wrap = styled.div`font-family: ${pickToken('font.mono')}; font-size: ${pickToken('font.size.xs')};`;
const Row = styled.div`
  padding: 6px 8px;
  border-radius: 4px;
  color: ${pickToken('color.text')};
  &[data-level="error"] { background: ${pickToken('color.dangerBg')}; color: ${pickToken('color.danger')}; }
  &[data-level="warn"] { color: ${pickToken('color.warning')}; }
`;
const More = styled.div`
  font-family: ${pickToken('font.sans')};
  font-size: ${pickToken('font.size.xs')};
  color: ${pickToken('color.textFaint')};
  padding: 6px 8px;
`;

export function LogsSection({ item }) {
  const events = Array.isArray(item.eventLogs) ? item.eventLogs : [];
  const visible = events.slice(0, 20);
  const more = events.length - visible.length;
  return (
    <Wrap>
      {visible.map((e, i) => (
        <Row key={i} data-level={e.type === 'console' ? (e.level || 'log') : (e.status >= 400 ? 'error' : 'info')}>
          {e.type === 'console' && `[${(e.level || 'log').toUpperCase()}] ${e.message || ''}`}
          {e.type === 'network' && `${e.method || 'GET'} ${e.url || ''} — ${e.status || 'pending'}`}
          {e.type === 'storage' && `[STORAGE.${(e.storageType || '').toUpperCase()}] ${e.action || ''} ${e.key || ''}`}
          {e.type === 'indexedDB' && `[IDB] ${e.action || ''} ${e.dbName || ''}`}
        </Row>
      ))}
      {more > 0 && <More>+ {more} more events</More>}
    </Wrap>
  );
}
LogsSection.summary = (item) => {
  const s = getFeedbackEvidenceSummary(item);
  if (s.logCount === 0) return 'no logs';
  const parts = [];
  if (s.errorCount) parts.push(`${s.errorCount} error${s.errorCount === 1 ? '' : 's'}`);
  if (s.failedNetworkCount) parts.push(`${s.failedNetworkCount} failed req${s.failedNetworkCount === 1 ? '' : 's'}`);
  parts.push(`${s.logCount} events`);
  return parts.join(' · ');
};
LogsSection.title = 'Logs';
LogsSection.id = 'logs';
LogsSection.shouldRender = (item) => Array.isArray(item.eventLogs) && item.eventLogs.length > 0;
export default LogsSection;
