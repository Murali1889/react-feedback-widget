import React from 'react';
import styled from 'styled-components';
import { Chip } from '../ui/primitives/Chip.jsx';
import { Stack } from '../ui/primitives/Stack.jsx';
import { pickToken } from '../ui/ThemeContext.jsx';
import { getFeedbackPriority, getFeedbackEvidenceSummary } from '../lib/feedbackEvidence.js';
import { useSectionState } from './useSectionState.js';
import { UserSignalSection } from './sections/UserSignalSection.jsx';
import { VisualSection } from './sections/VisualSection.jsx';
import { LogsSection } from './sections/LogsSection.jsx';
import { SourceSection } from './sections/SourceSection.jsx';
import { WorkflowStatusControl } from './workflow/WorkflowStatusControl.jsx';
import { SeverityRow } from './workflow/SeverityRow.jsx';
import { OwnerRow } from './workflow/OwnerRow.jsx';
import { HandoffRow } from './workflow/HandoffRow.jsx';
import { DangerRow } from './workflow/DangerRow.jsx';

const SECTIONS = [UserSignalSection, VisualSection, LogsSection, SourceSection];

const Outer = styled.div`
  background: ${pickToken('color.canvas')};
  display: flex; flex-direction: column; height: 100%;
  font-family: ${pickToken('font.sans')};
  color: ${pickToken('color.text')};
`;
const Header = styled.div`
  position: sticky; top: 0; z-index: 1;
  padding: 14px 18px 10px;
  background: ${pickToken('color.bg')};
  border-bottom: 1px solid ${pickToken('color.border')};
`;
const Title = styled.div`font-size: ${pickToken('font.size.md')}; font-weight: 600; line-height: 1.35;`;
const SubLine = styled.div`
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: ${pickToken('font.size.xs')};
  color: ${pickToken('color.textMuted')};
  margin-top: 4px;
`;
const InlineChipRow = styled.div`
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  margin-top: 10px;
`;
const InlineDivider = styled.span`
  width: 1px; height: 18px; background: ${pickToken('color.border')};
  margin: 0 2px;
`;
const Body = styled.div`flex: 1; overflow-y: auto;`;
const Section = styled.div`border-bottom: 1px solid ${pickToken('color.border')};`;
const SectionHead = styled.button`
  appearance: none; width: 100%; padding: 12px 18px;
  background: transparent; border: 0; text-align: left;
  display: flex; justify-content: space-between; align-items: center;
  cursor: pointer; color: ${pickToken('color.text')};
  font-size: ${pickToken('font.size.sm')};
  font-weight: 500;
  font-family: inherit;
  &:focus-visible { outline: 3px solid ${pickToken('color.focusRing')}; outline-offset: -3px; }
`;
const Caret = styled.span`
  font-size: 11px;
  color: ${pickToken('color.textFaint')};
  margin-right: 10px;
  transition: transform 0.15s ease;
  &[data-open="true"] { transform: rotate(90deg); color: ${pickToken('color.accent')}; }
`;
const Summary = styled.span`font-size: ${pickToken('font.size.xs')}; color: ${pickToken('color.textFaint')}; font-weight: 400;`;
const SectionBody = styled.div`padding: 0 18px 14px;`;

const AttachmentChip = styled.span`
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px;
  background: ${pickToken('color.surfaceMuted')};
  border: 1px solid ${pickToken('color.border')};
  border-radius: 6px;
  font-size: ${pickToken('font.size.xs')};
  color: ${pickToken('color.text')};
`;
const Footer = styled.div`
  position: sticky; bottom: 0; z-index: 1;
  padding: 10px 18px;
  background: ${pickToken('color.bg')};
  border-top: 1px solid ${pickToken('color.border')};
  display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
`;

const PRIORITY_VARIANT = { urgent: 'danger', high: 'warning', normal: 'neutral', low: 'neutral' };

function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return '';
  if (ms < 60_000)      return Math.floor(ms / 1000) + 's';
  if (ms < 3600_000)    return Math.floor(ms / 60_000) + 'm';
  if (ms < 86400_000)   return Math.floor(ms / 3600_000) + 'h';
  return Math.floor(ms / 86400_000) + 'd';
}

function formatBytes(n) {
  if (!n) return '0B';
  if (n < 1024) return n + 'B';
  if (n < 1024 * 1024) return Math.round(n / 1024) + 'KB';
  return (n / (1024 * 1024)).toFixed(1) + 'MB';
}

export function EvidenceStack({
  item,
  statuses = {},
  isDeveloper = false,
  onStatusChange, onSeverityChange, onOwnerChange,
  onCustomerValueChange, onDelete,
}) {
  const { isOpen, toggle } = useSectionState();
  if (!item) {
    return <Outer><Header><Title>Select a feedback to inspect</Title></Header></Outer>;
  }
  const priority = getFeedbackPriority(item);
  const summary = getFeedbackEvidenceSummary(item);

  return (
    <Outer>
      <Header>
        <Title>{item.feedback}</Title>
        <SubLine>
          <span>{item.userName || 'Anonymous'}</span>
          {item.url && <><span>·</span><span>{item.url.replace(/^https?:\/\//, '').slice(0, 50)}</span></>}
          {item.timestamp && <><span>·</span><span>{timeAgo(item.timestamp)} ago</span></>}
        </SubLine>
        <InlineChipRow>
          {onStatusChange
            ? <WorkflowStatusControl status={item.status} statuses={statuses} onChange={(next) => onStatusChange?.(item.id, next)} />
            : <Chip variant="neutral" dot size="sm">{item.status || 'new'}</Chip>}
          <SeverityRow item={item} onChange={onSeverityChange} />
          <InlineDivider />
          <Chip variant={PRIORITY_VARIANT[priority.band] || 'neutral'} dot size="sm">{priority.band}</Chip>
          {item.type && <Chip size="sm">{item.type}</Chip>}
          {summary.hasScreenshot && <Chip size="sm" variant="accent">screenshot</Chip>}
          {summary.hasVideo && <Chip size="sm" variant="accent">video</Chip>}
          {item.audioBlob && <Chip size="sm" variant="accent">voice memo</Chip>}
          {item.attachment?.name && (
            <AttachmentChip title={`${item.attachment.name} · ${formatBytes(item.attachment.size)}`}>
              📎 {item.attachment.name}
              <span style={{ opacity: 0.6 }}>{formatBytes(item.attachment.size)}</span>
            </AttachmentChip>
          )}
          {summary.errorCount > 0 && <Chip size="sm" variant="danger">{summary.errorCount} error{summary.errorCount === 1 ? '' : 's'}</Chip>}
          {summary.failedNetworkCount > 0 && <Chip size="sm" variant="warning">{summary.failedNetworkCount} failed req</Chip>}
        </InlineChipRow>
        {isDeveloper && (
          <InlineChipRow style={{ marginTop: 8 }}>
            <OwnerRow item={item} isDeveloper={true} onChange={onOwnerChange} />
          </InlineChipRow>
        )}
      </Header>
      <Body>
        {SECTIONS.filter((S) => !S.shouldRender || S.shouldRender(item)).map((S) => {
          const open = isOpen(S.id);
          return (
            <Section key={S.id}>
              <SectionHead onClick={() => toggle(S.id)} aria-expanded={open}>
                <span><Caret data-open={open}>▸</Caret>{S.title}</span>
                <Summary>{S.summary(item)}</Summary>
              </SectionHead>
              {open && <SectionBody><S item={item} /></SectionBody>}
            </Section>
          );
        })}
      </Body>
      {(onStatusChange || onDelete) && (
        <Footer>
          <HandoffRow item={item} />
          <span style={{ flex: 1 }} />
          {isDeveloper && onDelete && <DangerRow item={item} isDeveloper={true} onDelete={onDelete} />}
        </Footer>
      )}
    </Outer>
  );
}
export default EvidenceStack;
