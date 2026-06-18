import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { Stack } from '../ui/primitives/Stack.jsx';
import { Chip } from '../ui/primitives/Chip.jsx';
import { Avatar } from '../ui/primitives/Avatar.jsx';
import { pickToken } from '../ui/ThemeContext.jsx';
import { getFeedbackPriority } from '../lib/feedbackEvidence.js';

const Row = styled.button`
  appearance: none;
  display: flex;
  width: 100%;
  gap: 12px;
  padding: 12px 14px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: ${pickToken('color.text')};
  font-family: ${pickToken('font.sans')};
  border-left: 3px solid transparent;
  border-bottom: 1px solid ${pickToken('color.border')};
  &:hover { background: ${pickToken('color.canvas')}; }
  &[aria-selected="true"] {
    background: ${pickToken('color.canvas')};
    border-left-color: ${pickToken('color.accent')};
  }
  &:focus-visible {
    outline: 3px solid ${pickToken('color.focusRing')};
    outline-offset: -3px;
  }
`;
const Thumb = styled.div`
  width: 64px; height: 44px;
  flex-shrink: 0;
  border-radius: 8px;
  background: ${pickToken('color.canvas')};
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
  color: ${pickToken('color.textFaint')};
  font-size: 18px;
  position: relative;
`;
const ThumbImg = styled.img`width: 100%; height: 100%; object-fit: cover;`;
const Title = styled.div`
  font-size: ${pickToken('font.size.base')};
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const Preview = styled.div`
  font-size: ${pickToken('font.size.sm')};
  color: ${pickToken('color.textMuted')};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;
const Sub = styled.div`
  display: flex; align-items: center; gap: 6px;
  font-size: ${pickToken('font.size.xs')};
  color: ${pickToken('color.textFaint')};
  flex-wrap: wrap;
`;

const PRIORITY_VARIANT = { urgent: 'danger', high: 'warning', normal: 'neutral', low: 'neutral' };

function ago(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86400_000) return `${Math.floor(ms / 3600_000)}h`;
  return `${Math.floor(ms / 86400_000)}d`;
}

export function TriageListRow({ item, selected, onSelect }) {
  const [imgFailed, setImgFailed] = useState(false);
  const priority = getFeedbackPriority(item);
  const fire = useCallback(() => onSelect?.(item.id), [item.id, onSelect]);
  const onKey = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); }
  }, [fire]);
  const fullText = (item.feedback || '').trim();
  const titleText = fullText.slice(0, 70);
  // Only show the preview if it has content the title doesn't already
  // cover (avoid the same string rendered twice on every row).
  const previewText = fullText.length > titleText.length ? fullText.slice(titleText.length).trim() : '';
  const hasImg = item.screenshot && !imgFailed;

  return (
    <Row role="button" tabIndex={0} aria-current={selected ? 'true' : undefined} onClick={fire} onKeyDown={onKey} data-id={item.id}>
      <Thumb>
        {hasImg
          ? <ThumbImg src={item.screenshot} alt="" onError={() => setImgFailed(true)} />
          : (item.video ? '▶' : (item.type === 'idea' ? '💡' : item.type === 'praise' ? '⭐' : '🐞'))}
      </Thumb>
      <Stack direction="column" gap="2" style={{ flex: 1, minWidth: 0 }}>
        <Title>{titleText || 'Untitled'}</Title>
        {previewText && <Preview>{previewText}</Preview>}
        <Sub>
          <Chip variant={PRIORITY_VARIANT[priority.band] || 'neutral'} dot size="sm">{priority.band}</Chip>
          {item.type && <Chip size="sm">{item.type}</Chip>}
          <span>· {ago(item.timestamp)} ·</span>
          {item.userName && <><Avatar name={item.userName} size="xs" /><span>{item.userName}</span></>}
        </Sub>
      </Stack>
    </Row>
  );
}
export default TriageListRow;
