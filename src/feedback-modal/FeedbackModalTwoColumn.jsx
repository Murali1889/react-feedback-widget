import React from 'react';
import { createPortal } from 'react-dom';
import styled, { ThemeProvider, keyframes, css } from 'styled-components';
import { X, Send, Trash2, Image as ImageIcon, FileCode, Sparkles, MessageSquare } from 'lucide-react';
import { getTheme } from '../theme.js';
import {
  useFeedbackModalState, FEEDBACK_TYPES, PRIORITY_OPTIONS, DEFAULT_SUGGESTED_LABELS,
} from './useFeedbackModalState.js';
import {
  fadeIn, FieldLabel, FieldRow, TextArea, PillRow, Pill,
  SubmitButton, CloseX, ZoomedBackdrop,
} from './shared.js';

/* ----- animations ----- */

const popIn = keyframes`
  from { opacity: 0; transform: translate(-50%, -45%) scale(0.97); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
`;

/* ----- shell ----- */

const Backdrop = styled.div`
  position: fixed; inset: 0;
  background:
    radial-gradient(at 30% 20%, rgba(99, 102, 241, 0.15), transparent 50%),
    radial-gradient(at 80% 80%, rgba(59, 130, 246, 0.12), transparent 50%),
    rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(8px);
  z-index: 99998;
  animation: ${fadeIn} 0.22s ease-out;
`;

const Modal = styled.div`
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 880px; max-width: 96vw; max-height: 92vh;
  background: ${p => p.theme.colors.modalBg};
  border-radius: 22px;
  box-shadow:
    0 40px 80px -20px rgba(15, 23, 42, 0.5),
    0 0 0 1px rgba(15, 23, 42, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  z-index: 99999;
  animation: ${popIn} 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;

  /* Subtle animated gradient halo around the modal */
  &::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 22px;
    padding: 1px;
    background: linear-gradient(135deg,
      rgba(99, 102, 241, 0.5),
      rgba(59, 130, 246, 0.5),
      rgba(168, 85, 247, 0.4),
      rgba(99, 102, 241, 0.5));
    background-size: 300% 300%;
    animation: ${shimmer} 8s ease-in-out infinite;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    -webkit-mask-composite: xor;
    pointer-events: none;
    opacity: 0.4;
  }

  @media (max-width: 720px) {
    width: 100vw;
    max-width: 100vw;
    height: 100dvh;
    max-height: 100dvh;
    top: 0; left: 0;
    transform: none;
    border-radius: 0;
    &::before { display: none; }
  }
`;

/* ----- header ----- */

const Header = styled.div`
  position: relative;
  padding: 20px 26px;
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(180deg,
    ${p => p.theme.mode === 'dark' ? 'rgba(96, 165, 250, 0.06)' : 'rgba(99, 102, 241, 0.04)'},
    transparent);
  border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const Title = styled.div`
  display: flex; align-items: center; gap: 12px;
  font-size: 15px; font-weight: 700;
  color: ${p => p.theme.colors.textPrimary};
  letter-spacing: -0.01em;
`;

const TitleIcon = styled.div`
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  color: ${p => p.theme.mode === 'dark' ? '#a5b4fc' : '#4f46e5'};
  flex-shrink: 0;
`;

const Subtitle = styled.div`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: ${p => p.theme.colors.textTertiary};
  margin-top: 2px;
`;

/* ----- responsive grid ----- */

const Body = styled.div`
  display: grid;
  grid-template-columns: 1fr 340px;
  flex: 1;
  overflow: hidden;
  min-height: 0;

  /* Mobile: evidence on TOP, form below — user just clicked something
     and wants to confirm what they're reporting before they type. */
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    overflow-y: auto;
  }
`;

const FormCol = styled.div`
  padding: 22px 26px;
  display: flex; flex-direction: column; gap: 18px;
  overflow-y: auto;
  min-height: 0;

  @media (max-width: 720px) {
    order: 2;
    overflow: visible;
  }
`;

const EvidenceCol = styled.div`
  position: relative;
  padding: 22px 22px;
  background:
    linear-gradient(180deg,
      ${p => p.theme.mode === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#fafbff'},
      ${p => p.theme.mode === 'dark' ? 'rgba(15, 23, 42, 0.3)' : '#f4f6ff'});
  border-left: 1px solid ${p => p.theme.colors.border};
  display: flex; flex-direction: column; gap: 16px;
  overflow-y: auto;
  min-height: 0;

  @media (max-width: 720px) {
    order: 1;
    border-left: none;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    overflow: visible;
  }
`;

const SectionHeading = styled.div`
  display: flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: ${p => p.theme.colors.textTertiary};
`;

/* ----- royal evidence frame ----- */

const EvidenceCard = styled.div`
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: ${p => p.theme.mode === 'dark' ? '#0f172a' : '#ffffff'};
  cursor: zoom-in;
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1),
              box-shadow 0.25s ease;

  /* Layered shadows — depth from multiple light sources */
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.08),
    0 8px 24px -10px rgba(15, 23, 42, 0.2),
    0 24px 48px -20px rgba(99, 102, 241, 0.15);

  /* Gradient ring */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    padding: 1px;
    background: linear-gradient(135deg,
      rgba(99, 102, 241, 0.35),
      rgba(59, 130, 246, 0.2) 35%,
      rgba(15, 23, 42, 0.08) 70%,
      rgba(99, 102, 241, 0.3));
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    -webkit-mask-composite: xor;
    pointer-events: none;
  }

  /* Inner highlight stripe */
  &::after {
    content: '';
    position: absolute;
    inset: 1px;
    border-radius: 15px;
    background: linear-gradient(180deg, rgba(255,255,255,0.06), transparent 30%);
    pointer-events: none;
    z-index: 1;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow:
      0 2px 4px rgba(15, 23, 42, 0.1),
      0 14px 30px -10px rgba(15, 23, 42, 0.25),
      0 30px 60px -20px rgba(99, 102, 241, 0.25);
  }

  img, video {
    display: block;
    width: 100%;
    max-height: 280px;
    object-fit: contain;
    position: relative;
    z-index: 0;
  }
`;

const ComponentBadge = styled.div`
  position: absolute;
  top: 10px; left: 10px;
  z-index: 3;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.78);
  backdrop-filter: blur(6px);
  color: #e0e7ff;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
  box-shadow:
    0 4px 10px rgba(15, 23, 42, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);

  .tag {
    color: #a5b4fc;
  }
`;

const RemoveBtn = styled.button`
  position: absolute;
  top: 10px; right: 10px;
  z-index: 3;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(6px);
  border: none;
  border-radius: 8px;
  padding: 6px;
  color: white;
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  transition: background 0.18s, transform 0.18s;
  &:hover { background: rgba(239, 68, 68, 0.9); transform: scale(1.05); }
`;

/* Source chip — code-block aesthetic */

const SourceChip = styled.div`
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: ${p => p.theme.mode === 'dark' ? '#0f172a' : '#1e293b'};
  color: #cbd5e1;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11px;
  position: relative;
  overflow: hidden;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 4px 10px -4px rgba(15, 23, 42, 0.3);

  /* Stripe accent on the left edge */
  &::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, #6366f1, #3b82f6, #a855f7);
  }

  svg { flex-shrink: 0; color: #818cf8; margin-left: 4px; }
  .label { word-break: break-all; }
  .tag-name { color: #93c5fd; }
`;

/* ----- empty state ----- */

const EmptyMedia = styled.button`
  position: relative;
  border: 1.5px dashed ${p => p.theme.colors.border};
  border-radius: 14px;
  padding: 32px 18px;
  background: transparent;
  color: ${p => p.theme.colors.textSecondary};
  font-size: 13px; font-weight: 500;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  cursor: pointer; transition: all 0.22s ease;
  width: 100%;

  .empty-icon {
    color: ${p => p.theme.colors.textTertiary};
    animation: ${float} 4s ease-in-out infinite;
    transition: color 0.22s ease;
  }

  &:hover {
    color: ${p => p.theme.colors.textPrimary};
    border-color: ${p => p.theme.mode === 'dark' ? '#6366f1' : '#a5b4fc'};
    transform: translateY(-1px);
    .empty-icon { color: ${p => p.theme.mode === 'dark' ? '#a5b4fc' : '#6366f1'}; }
  }
`;

/* ----- footer ----- */

const Footer = styled.div`
  padding: 16px 26px;
  border-top: 1px solid ${p => p.theme.colors.border};
  background: linear-gradient(0deg,
    ${p => p.theme.mode === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#fafbff'},
    transparent);
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px;
`;

const FooterMeta = styled.div`
  font-size: 11px;
  color: ${p => p.theme.colors.textTertiary};
  display: flex; align-items: center; gap: 6px;
  flex-wrap: wrap;
`;

const MetaDot = styled.span`
  width: 4px; height: 4px;
  border-radius: 50%;
  background: ${p => p.theme.colors.textTertiary};
  opacity: 0.5;
`;

const RoyalSubmit = styled(SubmitButton)`
  background: linear-gradient(135deg, #6366f1, #3b82f6 60%, #6366f1);
  background-size: 200% 100%;
  background-position: 0% 50%;
  transition: background-position 0.5s ease, transform 0.15s ease, box-shadow 0.18s ease;
  box-shadow:
    0 4px 14px -4px rgba(99, 102, 241, 0.6),
    0 2px 4px -2px rgba(59, 130, 246, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  &:hover:not(:disabled) {
    background-position: 100% 50%;
    box-shadow:
      0 8px 22px -6px rgba(99, 102, 241, 0.7),
      0 4px 8px -2px rgba(59, 130, 246, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }
`;

/* ============ component ============ */

export const FeedbackModalTwoColumn = (props) => {
  const { isOpen, onClose, elementInfo, screenshot, videoBlob, mode = 'light' } = props;
  const theme = getTheme(mode);
  const s = useFeedbackModalState(props);

  if (!isOpen) return null;

  const source = elementInfo?.sourceFile
    ? `${elementInfo.sourceFile.replace(/^.*\/src\//, 'src/')}${elementInfo.sourceLine ? ':' + elementInfo.sourceLine : ''}`
    : null;
  const component = elementInfo?.reactComponent;
  const tag = elementInfo?.tagName;
  const componentLabel = component || tag;

  return createPortal(
    <ThemeProvider theme={theme}>
      <Backdrop onClick={onClose} />
      <Modal role="dialog" aria-modal="true" aria-label="Send feedback">
        <Header>
          <Title>
            <TitleIcon><MessageSquare size={20} strokeWidth={2} /></TitleIcon>
            <div>
              <div>Send Feedback</div>
              <Subtitle>Tell us what happened — we'll handle the rest</Subtitle>
            </div>
          </Title>
          <CloseX onClick={onClose} aria-label="Close"><X size={18} /></CloseX>
        </Header>

        <Body>
          <FormCol>
            <FieldRow>
              <FieldLabel htmlFor="tc-desc">What's on your mind?</FieldLabel>
              <TextArea id="tc-desc" ref={s.descriptionRef}
                placeholder="Describe what you saw, what you expected, how to reproduce…"
                value={s.description} onChange={(e) => s.setDescription(e.target.value)}
                disabled={s.isSubmitting} style={{ minHeight: 130 }} />
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
                  <Pill key={o.id} $active={s.priority === o.id} onClick={() => s.setPriority(o.id)}>{o.label} · {o.hint}</Pill>
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
          </FormCol>

          <EvidenceCol>
            <SectionHeading><Sparkles size={11} /> Evidence</SectionHeading>

            {s.activeMedia ? (
              <EvidenceCard onClick={() => s.activeImage && s.setZoomedImage(s.activeImage)}>
                {componentLabel && (
                  <ComponentBadge title="The element the reporter selected">
                    <span className="tag">&lt;</span>{componentLabel}<span className="tag">&gt;</span>
                  </ComponentBadge>
                )}
                {!screenshot && !videoBlob && (
                  <RemoveBtn onClick={(e) => { e.stopPropagation(); s.handleFile(null); }} title="Remove">
                    <Trash2 size={14} />
                  </RemoveBtn>
                )}
                {s.activeImage
                  ? <img src={s.activeImage} alt="Captured screenshot" />
                  : <video src={s.videoUrl} controls onClick={(e) => e.stopPropagation()} />}
              </EvidenceCard>
            ) : (
              <EmptyMedia onClick={() => s.screenshotInputRef.current?.click()}>
                <ImageIcon className="empty-icon" size={28} strokeWidth={1.5} />
                Attach a screenshot or video
                <span style={{ fontSize: 11, opacity: 0.7 }}>
                  PNG · JPG · MP4 · WebM
                </span>
                <input type="file" ref={s.screenshotInputRef} accept="image/*,video/*"
                  style={{ display: 'none' }}
                  onChange={(e) => s.handleFile(e.target.files[0])} />
              </EmptyMedia>
            )}

            {source && (
              <>
                <SectionHeading><FileCode size={11} /> Source</SectionHeading>
                <SourceChip>
                  <FileCode size={12} />
                  <span className="label">
                    {component && <><span className="tag-name">&lt;{component}&gt;</span>{' · '}</>}
                    {source}
                  </span>
                </SourceChip>
              </>
            )}
          </EvidenceCol>
        </Body>

        <Footer>
          <FooterMeta>
            <span>{s.description.trim().length} chars</span>
            <MetaDot />
            <span>{s.priority} · {PRIORITY_OPTIONS.find(o => o.id === s.priority)?.hint}</span>
            <MetaDot />
            <span>{s.labels.length} label{s.labels.length === 1 ? '' : 's'}</span>
          </FooterMeta>
          <RoyalSubmit onClick={s.handleSubmit} disabled={!s.description.trim()}>
            Send Feedback <Send size={14} />
          </RoyalSubmit>
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
