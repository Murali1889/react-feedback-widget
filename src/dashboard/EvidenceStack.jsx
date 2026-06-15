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

const SECTIONS = [UserSignalSection, VisualSection, LogsSection, SourceSection];

const Outer = styled.div`
  background: ${pickToken('color.canvas')};
  display: flex; flex-direction: column; height: 100%;
  font-family: ${pickToken('font.sans')};
  color: ${pickToken('color.text')};
`;
const Header = styled.div`
  position: sticky; top: 0; z-index: 1;
  padding: 14px 18px;
  background: ${pickToken('color.bg')};
  border-bottom: 1px solid ${pickToken('color.border')};
`;
const Title = styled.div`font-size: ${pickToken('font.size.md')}; font-weight: 600;`;
const SubLine = styled.div`font-size: ${pickToken('font.size.sm')}; color: ${pickToken('color.textMuted')}; margin-top: 4px;`;
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

const PRIORITY_VARIANT = { urgent: 'danger', high: 'warning', normal: 'neutral', low: 'neutral' };

export function EvidenceStack({ item }) {
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
          {item.userName || 'Anonymous'} · {item.url || ''}
        </SubLine>
        <Stack direction="row" gap="2" wrap style={{ marginTop: 6 }}>
          <Chip variant={PRIORITY_VARIANT[priority.band] || 'neutral'} dot size="sm">{priority.band}</Chip>
          {item.type && <Chip size="sm">{item.type}</Chip>}
          {summary.hasScreenshot && <Chip size="sm" variant="accent">screenshot</Chip>}
          {summary.hasVideo && <Chip size="sm" variant="accent">video</Chip>}
          {summary.errorCount > 0 && <Chip size="sm" variant="danger">{summary.errorCount} error{summary.errorCount === 1 ? '' : 's'}</Chip>}
          {summary.failedNetworkCount > 0 && <Chip size="sm" variant="warning">{summary.failedNetworkCount} failed req</Chip>}
        </Stack>
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
    </Outer>
  );
}
export default EvidenceStack;
