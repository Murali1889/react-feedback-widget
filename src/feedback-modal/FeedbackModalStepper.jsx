import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { ThemeProvider, keyframes } from 'styled-components';
import { X, Send, ChevronLeft, ChevronRight, Check, Trash2, Image } from 'lucide-react';
import { getTheme } from '../theme.js';
import {
  useFeedbackModalState, FEEDBACK_TYPES, PRIORITY_OPTIONS, DEFAULT_SUGGESTED_LABELS,
} from './useFeedbackModalState.js';
import {
  fadeIn, slideUpFade, FieldLabel, FieldRow, TextArea, PillRow, Pill,
  SubmitButton, SecondaryButton, CloseX, MediaThumb, ZoomedBackdrop,
} from './shared.js';

const Backdrop = styled.div`
  position: fixed; inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  z-index: 99998;
  animation: ${fadeIn} 0.2s ease-out;
`;

const popIn = keyframes`
  from { opacity: 0; transform: translate(-50%, -45%) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
`;

const Modal = styled.div`
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 480px; max-width: 95vw; max-height: 90vh;
  background: ${p => p.theme.colors.modalBg};
  border-radius: 18px;
  box-shadow: 0 30px 60px -15px rgba(15,23,42,0.4), 0 0 0 1px rgba(15,23,42,0.04);
  z-index: 99999;
  animation: ${popIn} 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
`;

const Header = styled.div`
  padding: 18px 24px 6px;
  display: flex; align-items: center; justify-content: space-between;
`;

const Title = styled.div`
  font-size: 15px; font-weight: 700; color: ${p => p.theme.colors.textPrimary};
  display: flex; align-items: center; gap: 8px;
`;

const StepIndicator = styled.div`
  padding: 8px 24px 18px;
  display: flex; align-items: center; gap: 10px;
`;

const Dots = styled.div`display: flex; gap: 6px;`;

const Dot = styled.div`
  width: 9px; height: 9px; border-radius: 50%;
  background: ${p => p.$active
    ? (p.theme.mode === 'dark' ? '#60a5fa' : '#2563eb')
    : (p.$done ? (p.theme.mode === 'dark' ? '#1e40af' : '#bfdbfe') : p.theme.colors.border)};
  transition: background 0.25s;
  position: relative;
  ${p => p.$active && `box-shadow: 0 0 0 4px ${p.theme.mode === 'dark' ? 'rgba(96,165,250,0.18)' : 'rgba(59,130,246,0.18)'};`}
`;

const StepLabel = styled.div`
  font-size: 12px; font-weight: 600;
  color: ${p => p.theme.colors.textSecondary};
  letter-spacing: 0.02em;
`;

const Body = styled.div`
  padding: 0 24px 18px;
  display: flex; flex-direction: column; gap: 16px;
  flex: 1; overflow-y: auto;
  min-height: 280px;
  animation: ${slideUpFade} 0.25s ease-out;
`;

const Footer = styled.div`
  padding: 14px 24px;
  border-top: 1px solid ${p => p.theme.colors.border};
  background: ${p => p.theme.colors.headerBg};
  display: flex; align-items: center; justify-content: space-between;
`;

const Summary = styled.div`
  display: flex; flex-direction: column; gap: 10px;
  padding: 14px;
  border-radius: 12px;
  background: ${p => p.theme.colors.cardBg};
  border: 1px solid ${p => p.theme.colors.border};
`;

const SummaryRow = styled.div`
  display: flex; align-items: baseline; gap: 8px;
  font-size: 13px;
  span:first-child {
    text-transform: uppercase; font-size: 10px; font-weight: 600;
    color: ${p => p.theme.colors.textTertiary}; letter-spacing: 0.05em;
    min-width: 70px;
  }
  span:last-child { color: ${p => p.theme.colors.textPrimary}; flex: 1; }
`;

const STEP_LABELS = ['Describe', 'Tag', 'Review & send'];

export const FeedbackModalStepper = (props) => {
  const { isOpen, onClose, screenshot, videoBlob, mode = 'light' } = props;
  const theme = getTheme(mode);
  const s = useFeedbackModalState(props);
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const canAdvance = step !== 0 || s.description.trim().length > 0;

  return createPortal(
    <ThemeProvider theme={theme}>
      <Backdrop onClick={onClose} />
      <Modal role="dialog" aria-modal="true" aria-label="Send feedback">
        <Header>
          <Title>💬 Send Feedback</Title>
          <CloseX onClick={onClose} aria-label="Close"><X size={18} /></CloseX>
        </Header>

        <StepIndicator>
          <Dots>
            {STEP_LABELS.map((_, i) => (
              <Dot key={i} $active={i === step} $done={i < step} />
            ))}
          </Dots>
          <StepLabel>Step {step + 1} of 3 · {STEP_LABELS[step]}</StepLabel>
        </StepIndicator>

        <Body key={step}>
          {step === 0 && (
            <FieldRow>
              <FieldLabel htmlFor="st-desc">What happened?</FieldLabel>
              <TextArea id="st-desc" ref={s.descriptionRef}
                placeholder="Describe what you saw, what you expected, how to reproduce…"
                value={s.description} onChange={(e) => s.setDescription(e.target.value)}
                disabled={s.isSubmitting} style={{ minHeight: 140 }} />

              {s.activeMedia && (
                <div style={{ marginTop: 12 }}>
                  <FieldLabel>Evidence</FieldLabel>
                  <MediaThumb $size="medium" onClick={() => s.activeImage && s.setZoomedImage(s.activeImage)}>
                    {s.activeImage ? <img src={s.activeImage} alt="Captured" /> : <video src={s.videoUrl} controls onClick={(e) => e.stopPropagation()} />}
                  </MediaThumb>
                </div>
              )}
            </FieldRow>
          )}

          {step === 1 && (
            <>
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
            </>
          )}

          {step === 2 && (
            <Summary>
              <SummaryRow><span>Summary</span><span>{s.description.slice(0, 120) || '—'}{s.description.length > 120 ? '…' : ''}</span></SummaryRow>
              <SummaryRow><span>Category</span><span>{s.feedbackType}</span></SummaryRow>
              <SummaryRow><span>Priority</span><span>{s.priority} · {PRIORITY_OPTIONS.find(o => o.id === s.priority)?.hint}</span></SummaryRow>
              <SummaryRow><span>Labels</span><span>{s.labels.length ? s.labels.join(', ') : '—'}</span></SummaryRow>
              <SummaryRow><span>Evidence</span><span>{s.activeMedia ? 'Attached' : 'None'}</span></SummaryRow>
            </Summary>
          )}
        </Body>

        <Footer>
          {step === 0 ? <div /> : <SecondaryButton onClick={() => setStep((s) => s - 1)}><ChevronLeft size={14} /> Back</SecondaryButton>}
          {step < 2 ? (
            <SubmitButton onClick={() => canAdvance && setStep((s) => s + 1)} disabled={!canAdvance}>
              Continue <ChevronRight size={14} />
            </SubmitButton>
          ) : (
            <SubmitButton onClick={s.handleSubmit} disabled={!s.description.trim()}>
              Send <Send size={14} />
            </SubmitButton>
          )}
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

export default FeedbackModalStepper;
