import React from 'react';
import { createPortal } from 'react-dom';
import styled, { ThemeProvider } from 'styled-components';
import { X, Send, Image, Trash2 } from 'lucide-react';
import { getTheme } from '../theme.js';
import {
  useFeedbackModalState, FEEDBACK_TYPES, PRIORITY_OPTIONS, DEFAULT_SUGGESTED_LABELS,
} from './useFeedbackModalState.js';
import {
  fadeIn, slideInRight, FieldLabel, FieldRow, TextArea, PillRow, Pill,
  SubmitButton, CloseX, MediaThumb, ZoomedBackdrop,
} from './shared.js';

const Backdrop = styled.div`
  position: fixed; inset: 0;
  background: rgba(15, 23, 42, 0.25);
  backdrop-filter: blur(2px);
  z-index: 99998;
  animation: ${fadeIn} 0.2s ease-out;
`;

const Drawer = styled.aside`
  position: fixed;
  top: 0; right: 0; bottom: 0;
  width: 440px;
  max-width: 100vw;
  background: ${p => p.theme.colors.modalBg};
  z-index: 99999;
  box-shadow: -20px 0 50px -20px rgba(0,0,0,0.25);
  animation: ${slideInRight} 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  @media (max-width: 640px) { width: 100vw; }
`;

const Header = styled.div`
  padding: 18px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const Title = styled.div`
  display: flex; align-items: center; gap: 8px;
  font-size: 15px; font-weight: 700; color: ${p => p.theme.colors.textPrimary};
`;

const EvidenceBand = styled.div`
  padding: 16px 22px;
  background: ${p => p.theme.colors.headerBg};
  border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const SourceLine = styled.div`
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11px;
  color: ${p => p.theme.colors.textSecondary};
  margin-top: 10px;
  opacity: 0.75;
`;

const Body = styled.div`
  padding: 18px 22px;
  display: flex; flex-direction: column; gap: 16px;
  overflow-y: auto;
  flex: 1;
`;

const Footer = styled.div`
  padding: 14px 22px;
  border-top: 1px solid ${p => p.theme.colors.border};
  background: ${p => p.theme.colors.headerBg};
  display: flex;
  justify-content: flex-end;
`;

const RemoveBtn = styled.button`
  position: absolute; top: 8px; right: 8px;
  background: rgba(0,0,0,0.6); border: none; border-radius: 6px;
  padding: 4px; color: white; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  &:hover { background: rgba(239, 68, 68, 0.85); }
`;

const EmptyMedia = styled.button`
  border: 1px dashed ${p => p.theme.colors.border};
  border-radius: 10px;
  padding: 14px;
  background: transparent;
  color: ${p => p.theme.colors.textSecondary};
  font-size: 13px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  cursor: pointer; transition: all 0.2s;
  width: 100%;
  &:hover { color: ${p => p.theme.colors.textPrimary}; border-color: ${p => p.theme.colors.textTertiary}; }
`;

export const FeedbackModalDrawer = (props) => {
  const { isOpen, onClose, elementInfo, screenshot, videoBlob, mode = 'light' } = props;
  const theme = getTheme(mode);
  const s = useFeedbackModalState(props);

  if (!isOpen) return null;

  const source = elementInfo?.sourceFile
    ? `${elementInfo.sourceFile.replace(/^.*\/src\//, 'src/')}${elementInfo.sourceLine ? ':' + elementInfo.sourceLine : ''}`
    : null;
  const component = elementInfo?.reactComponent || elementInfo?.tagName;

  return createPortal(
    <ThemeProvider theme={theme}>
      <Backdrop onClick={onClose} />
      <Drawer role="dialog" aria-modal="true" aria-label="Send feedback">
        <Header>
          <Title>💬 Send Feedback</Title>
          <CloseX onClick={onClose} aria-label="Close"><X size={18} /></CloseX>
        </Header>

        {s.activeMedia ? (
          <EvidenceBand>
            <MediaThumb $size="medium" onClick={() => s.activeImage && s.setZoomedImage(s.activeImage)}>
              {s.activeImage ? <img src={s.activeImage} alt="Captured" /> : <video src={s.videoUrl} controls onClick={(e) => e.stopPropagation()} />}
              {!screenshot && !videoBlob && (
                <RemoveBtn onClick={(e) => { e.stopPropagation(); s.handleFile(null); }}><Trash2 size={14} /></RemoveBtn>
              )}
            </MediaThumb>
            {(source || component) && (
              <SourceLine>
                {component && <span>&lt;{component}&gt;</span>}
                {component && source && ' · '}
                {source && <span>{source}</span>}
              </SourceLine>
            )}
          </EvidenceBand>
        ) : (
          <EvidenceBand>
            <EmptyMedia onClick={() => s.screenshotInputRef.current?.click()}>
              <Image size={14} /> Attach screenshot or video
              <input type="file" ref={s.screenshotInputRef} accept="image/*,video/*" style={{display:'none'}} onChange={(e) => s.handleFile(e.target.files[0])} />
            </EmptyMedia>
          </EvidenceBand>
        )}

        <Body>
          <FieldRow>
            <FieldLabel htmlFor="dr-desc">What happened?</FieldLabel>
            <TextArea id="dr-desc" ref={s.descriptionRef}
              placeholder="Describe what you saw, what you expected, how to reproduce…"
              value={s.description} onChange={(e) => s.setDescription(e.target.value)}
              disabled={s.isSubmitting} />
          </FieldRow>

          <FieldRow>
            <FieldLabel>Category</FieldLabel>
            <PillRow>
              {FEEDBACK_TYPES.map(t => (
                <Pill key={t.id} $active={s.feedbackType === t.id} onClick={() => s.setFeedbackType(t.id)}>{t.label}</Pill>
              ))}
            </PillRow>
          </FieldRow>

          <FieldRow>
            <FieldLabel>Priority</FieldLabel>
            <PillRow>
              {PRIORITY_OPTIONS.map(o => (
                <Pill key={o.id} $active={s.priority === o.id} onClick={() => s.setPriority(o.id)} title={o.hint}>{o.label} · {o.hint}</Pill>
              ))}
            </PillRow>
          </FieldRow>

          <FieldRow>
            <FieldLabel>Labels</FieldLabel>
            <PillRow>
              {DEFAULT_SUGGESTED_LABELS.map(l => (
                <Pill key={l} $active={s.labels.includes(l)} onClick={() => s.toggleLabel(l)}>{l}</Pill>
              ))}
            </PillRow>
          </FieldRow>
        </Body>

        <Footer>
          <SubmitButton onClick={s.handleSubmit} disabled={!s.description.trim()}>
            Send Feedback <Send size={14} />
          </SubmitButton>
        </Footer>
      </Drawer>

      {s.zoomedImage && (
        <ZoomedBackdrop onClick={() => s.setZoomedImage(null)}>
          <img src={s.zoomedImage} alt="Zoomed screenshot" />
        </ZoomedBackdrop>
      )}
    </ThemeProvider>,
    document.body
  );
};

export default FeedbackModalDrawer;
