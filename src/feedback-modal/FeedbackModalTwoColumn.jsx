import React from 'react';
import { createPortal } from 'react-dom';
import styled, { ThemeProvider, keyframes } from 'styled-components';
import { X, Send, Trash2, Image, FileCode } from 'lucide-react';
import { getTheme } from '../theme.js';
import {
  useFeedbackModalState, FEEDBACK_TYPES, PRIORITY_OPTIONS, DEFAULT_SUGGESTED_LABELS,
} from './useFeedbackModalState.js';
import {
  fadeIn, FieldLabel, FieldRow, TextArea, PillRow, Pill,
  SubmitButton, CloseX, MediaThumb, ZoomedBackdrop,
} from './shared.js';

const Backdrop = styled.div`
  position: fixed; inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  z-index: 99998;
  animation: ${fadeIn} 0.2s ease-out;
`;

const popIn = keyframes`
  from { opacity: 0; transform: translate(-50%, -45%) scale(0.97); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;

const Modal = styled.div`
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 760px; max-width: 96vw; max-height: 90vh;
  background: ${p => p.theme.colors.modalBg};
  border-radius: 18px;
  box-shadow: 0 30px 60px -15px rgba(15,23,42,0.4), 0 0 0 1px rgba(15,23,42,0.04);
  z-index: 99999;
  animation: ${popIn} 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;

  @media (max-width: 720px) { width: 95vw; }
`;

const Header = styled.div`
  padding: 18px 24px;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const Title = styled.div`
  font-size: 15px; font-weight: 700; color: ${p => p.theme.colors.textPrimary};
  display: flex; align-items: center; gap: 8px;
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: 1fr 320px;
  flex: 1;
  overflow: hidden;

  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;

const LeftCol = styled.div`
  padding: 18px 24px;
  display: flex; flex-direction: column; gap: 16px;
  overflow-y: auto;
`;

const RightCol = styled.div`
  padding: 18px 22px;
  background: ${p => p.theme.colors.headerBg};
  border-left: 1px solid ${p => p.theme.colors.border};
  display: flex; flex-direction: column; gap: 14px;
  overflow-y: auto;

  @media (max-width: 720px) { border-left: none; border-top: 1px solid ${p => p.theme.colors.border}; }
`;

const RightHeading = styled.div`
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.05em; color: ${p => p.theme.colors.textTertiary};
`;

const SourceLine = styled.div`
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11px;
  color: ${p => p.theme.colors.textSecondary};
  display: flex; align-items: center; gap: 6px;
  padding: 8px 10px;
  background: ${p => p.theme.colors.cardBg};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 8px;
`;

const Footer = styled.div`
  padding: 14px 24px;
  border-top: 1px solid ${p => p.theme.colors.border};
  display: flex; align-items: center; justify-content: flex-end;
`;

const EmptyMedia = styled.button`
  border: 1px dashed ${p => p.theme.colors.border};
  border-radius: 10px;
  padding: 18px;
  background: transparent;
  color: ${p => p.theme.colors.textSecondary};
  font-size: 13px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  cursor: pointer; transition: all 0.2s;
  width: 100%;
  &:hover { color: ${p => p.theme.colors.textPrimary}; border-color: ${p => p.theme.colors.textTertiary}; }
`;

const RemoveBtn = styled.button`
  position: absolute; top: 8px; right: 8px;
  background: rgba(0,0,0,0.6); border: none; border-radius: 6px;
  padding: 4px; color: white; cursor: pointer;
  &:hover { background: rgba(239, 68, 68, 0.85); }
`;

export const FeedbackModalTwoColumn = (props) => {
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
      <Modal role="dialog" aria-modal="true" aria-label="Send feedback">
        <Header>
          <Title>💬 Send Feedback</Title>
          <CloseX onClick={onClose} aria-label="Close"><X size={18} /></CloseX>
        </Header>

        <Columns>
          <LeftCol>
            <FieldRow>
              <FieldLabel htmlFor="tc-desc">What's on your mind?</FieldLabel>
              <TextArea id="tc-desc" ref={s.descriptionRef}
                placeholder="Describe what you saw, what you expected, how to reproduce…"
                value={s.description} onChange={(e) => s.setDescription(e.target.value)}
                disabled={s.isSubmitting} style={{ minHeight: 140 }} />
            </FieldRow>

            <FieldRow>
              <FieldLabel>Category</FieldLabel>
              <PillRow>{FEEDBACK_TYPES.map(t => (
                <Pill key={t.id} $active={s.feedbackType === t.id} onClick={() => s.setFeedbackType(t.id)}>{t.label}</Pill>
              ))}</PillRow>
            </FieldRow>

            <FieldRow>
              <FieldLabel>Priority</FieldLabel>
              <PillRow>{PRIORITY_OPTIONS.map(o => (
                <Pill key={o.id} $active={s.priority === o.id} onClick={() => s.setPriority(o.id)}>{o.label} · {o.hint}</Pill>
              ))}</PillRow>
            </FieldRow>

            <FieldRow>
              <FieldLabel>Labels</FieldLabel>
              <PillRow>{DEFAULT_SUGGESTED_LABELS.map(l => (
                <Pill key={l} $active={s.labels.includes(l)} onClick={() => s.toggleLabel(l)}>{l}</Pill>
              ))}</PillRow>
            </FieldRow>
          </LeftCol>

          <RightCol>
            <RightHeading>Evidence</RightHeading>
            {s.activeMedia ? (
              <MediaThumb $size="large" onClick={() => s.activeImage && s.setZoomedImage(s.activeImage)}>
                {s.activeImage ? <img src={s.activeImage} alt="Captured" /> : <video src={s.videoUrl} controls onClick={(e) => e.stopPropagation()} />}
                {!screenshot && !videoBlob && (
                  <RemoveBtn onClick={(e) => { e.stopPropagation(); s.handleFile(null); }}><Trash2 size={14} /></RemoveBtn>
                )}
              </MediaThumb>
            ) : (
              <EmptyMedia onClick={() => s.screenshotInputRef.current?.click()}>
                <Image size={14} /> Attach screenshot or video
                <input type="file" ref={s.screenshotInputRef} accept="image/*,video/*" style={{display:'none'}} onChange={(e) => s.handleFile(e.target.files[0])} />
              </EmptyMedia>
            )}

            {(source || component) && (
              <>
                <RightHeading style={{ marginTop: 4 }}>Source</RightHeading>
                <SourceLine>
                  <FileCode size={12} />
                  <span>{component && `<${component}>`}{component && source && ' · '}{source}</span>
                </SourceLine>
              </>
            )}
          </RightCol>
        </Columns>

        <Footer>
          <SubmitButton onClick={s.handleSubmit} disabled={!s.description.trim()}>
            Send Feedback <Send size={14} />
          </SubmitButton>
        </Footer>
      </Modal>

      {s.zoomedImage && (
        <ZoomedBackdrop onClick={() => s.setZoomedImage(null)}>
          <img src={s.zoomedImage} alt="Zoomed screenshot" />
        </ZoomedBackdrop>
      )}
    </ThemeProvider>,
    document.body
  );
};

export default FeedbackModalTwoColumn;
