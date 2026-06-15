import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { ThemeProvider } from 'styled-components';
import { X, Send, ChevronDown, ChevronUp, Trash2, Image } from 'lucide-react';
import { getTheme } from '../theme.js';
import {
  useFeedbackModalState, FEEDBACK_TYPES, PRIORITY_OPTIONS, DEFAULT_SUGGESTED_LABELS,
} from './useFeedbackModalState.js';
import {
  fadeIn, popIn, FieldLabel, FieldRow, TextArea, PillRow, Pill,
  SubmitButton, CloseX, MediaThumb, ZoomedBackdrop,
} from './shared.js';

const Card = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 340px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 48px);
  background: ${p => p.theme.colors.modalBg};
  border-radius: 16px;
  box-shadow: 0 20px 50px -12px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(15, 23, 42, 0.04);
  z-index: 99999;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  animation: ${popIn} 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
  overflow: hidden;
`;

const Header = styled.div`
  padding: 12px 14px 6px;
  display: flex; align-items: center; justify-content: space-between;
`;

const Title = styled.div`
  font-size: 13px; font-weight: 700; color: ${p => p.theme.colors.textPrimary};
  display: flex; align-items: center; gap: 6px;
`;

const Body = styled.div`
  padding: 6px 14px 14px;
  display: flex; flex-direction: column; gap: 10px;
  overflow-y: auto;
`;

const ExpandToggle = styled.button`
  background: none; border: none;
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; font-weight: 600;
  color: ${p => p.theme.colors.textSecondary};
  cursor: pointer; padding: 6px 0;
  transition: color 0.18s;
  &:hover { color: ${p => p.theme.colors.textPrimary}; }
`;

const InlineMeta = styled.div`
  display: flex; flex-wrap: wrap; gap: 6px;
  align-items: center;
  font-size: 11px; color: ${p => p.theme.colors.textTertiary};
`;

const MetaPill = styled.span`
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 600;
  color: ${p => p.theme.colors.textSecondary};
  background: ${p => p.theme.colors.cardBg};
`;

const Footer = styled.div`
  padding: 10px 14px 14px;
  border-top: 1px solid ${p => p.theme.colors.border};
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
`;

const RemoveBtn = styled.button`
  position: absolute; top: 6px; right: 6px;
  background: rgba(0,0,0,0.6); border: none; border-radius: 6px;
  padding: 3px; color: white; cursor: pointer;
  &:hover { background: rgba(239, 68, 68, 0.85); }
`;

const EmptyMedia = styled.button`
  border: 1px dashed ${p => p.theme.colors.border};
  border-radius: 8px;
  padding: 8px;
  background: transparent;
  color: ${p => p.theme.colors.textSecondary};
  font-size: 12px;
  display: flex; align-items: center; justify-content: center; gap: 6px;
  cursor: pointer; transition: all 0.2s;
  width: 100%;
  &:hover { color: ${p => p.theme.colors.textPrimary}; border-color: ${p => p.theme.colors.textTertiary}; }
`;

export const FeedbackModalCompact = (props) => {
  const { isOpen, onClose, screenshot, videoBlob, mode = 'light' } = props;
  const theme = getTheme(mode);
  const s = useFeedbackModalState(props);
  const [expanded, setExpanded] = useState(false);

  if (!isOpen) return null;

  return createPortal(
    <ThemeProvider theme={theme}>
      <Card role="dialog" aria-modal="true" aria-label="Send feedback">
        <Header>
          <Title>💬 Feedback</Title>
          <CloseX onClick={onClose} aria-label="Close"><X size={14} /></CloseX>
        </Header>

        <Body>
          <FieldRow>
            <FieldLabel htmlFor="cmp-desc">What happened?</FieldLabel>
            <TextArea id="cmp-desc" ref={s.descriptionRef}
              placeholder="Describe it briefly…"
              value={s.description} onChange={(e) => s.setDescription(e.target.value)}
              disabled={s.isSubmitting}
              style={{ minHeight: 72 }} />
          </FieldRow>

          <InlineMeta>
            <MetaPill>{s.feedbackType}</MetaPill>
            <MetaPill>{s.priority}</MetaPill>
            {s.labels.length > 0 && s.labels.slice(0, 2).map((l) => <MetaPill key={l}>{l}</MetaPill>)}
            {s.labels.length > 2 && <span>+{s.labels.length - 2}</span>}
          </InlineMeta>

          <ExpandToggle onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? 'Less' : 'More options'}
          </ExpandToggle>

          {expanded && (
            <>
              {s.activeMedia ? (
                <MediaThumb $size="small" onClick={() => s.activeImage && s.setZoomedImage(s.activeImage)}>
                  {s.activeImage ? <img src={s.activeImage} alt="Captured" /> : <video src={s.videoUrl} controls onClick={(e) => e.stopPropagation()} />}
                  {!screenshot && !videoBlob && (
                    <RemoveBtn onClick={(e) => { e.stopPropagation(); s.handleFile(null); }}><Trash2 size={12} /></RemoveBtn>
                  )}
                </MediaThumb>
              ) : (
                <EmptyMedia onClick={() => s.screenshotInputRef.current?.click()}>
                  <Image size={12} /> Attach
                  <input type="file" ref={s.screenshotInputRef} accept="image/*,video/*" style={{display:'none'}} onChange={(e) => s.handleFile(e.target.files[0])} />
                </EmptyMedia>
              )}

              <FieldRow>
                <FieldLabel>Category</FieldLabel>
                <PillRow>{FEEDBACK_TYPES.map(t => (
                  <Pill key={t.id} $active={s.feedbackType === t.id} onClick={() => s.setFeedbackType(t.id)}>{t.label}</Pill>
                ))}</PillRow>
              </FieldRow>

              <FieldRow>
                <FieldLabel>Priority</FieldLabel>
                <PillRow>{PRIORITY_OPTIONS.map(o => (
                  <Pill key={o.id} $active={s.priority === o.id} onClick={() => s.setPriority(o.id)}>{o.label}</Pill>
                ))}</PillRow>
              </FieldRow>

              <FieldRow>
                <FieldLabel>Labels</FieldLabel>
                <PillRow>{DEFAULT_SUGGESTED_LABELS.map(l => (
                  <Pill key={l} $active={s.labels.includes(l)} onClick={() => s.toggleLabel(l)}>{l}</Pill>
                ))}</PillRow>
              </FieldRow>
            </>
          )}
        </Body>

        <Footer>
          <SubmitButton onClick={s.handleSubmit} disabled={!s.description.trim()} style={{ width: '100%', justifyContent: 'center' }}>
            Send <Send size={13} />
          </SubmitButton>
        </Footer>
      </Card>

      {s.zoomedImage && (
        <ZoomedBackdrop onClick={() => s.setZoomedImage(null)}>
          <img src={s.zoomedImage} alt="Zoomed screenshot" />
        </ZoomedBackdrop>
      )}
    </ThemeProvider>,
    document.body
  );
};

export default FeedbackModalCompact;
