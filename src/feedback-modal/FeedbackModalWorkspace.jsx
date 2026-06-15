import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { ThemeProvider, keyframes } from 'styled-components';
import {
  X, Send, ChevronLeft, ChevronRight, Check, Trash2, Image as ImageIcon,
  FileCode, GitBranch, FlaskConical, Sparkles, Copy, MessageSquarePlus, Pin,
} from 'lucide-react';
import { getTheme } from '../theme.js';
import {
  useFeedbackModalState, FEEDBACK_TYPES, PRIORITY_OPTIONS, DEFAULT_SUGGESTED_LABELS,
} from './useFeedbackModalState.js';
import {
  fadeIn, FieldLabel, FieldRow, TextArea, PillRow, Pill,
  SubmitButton, SecondaryButton, CloseX, ZoomedBackdrop,
} from './shared.js';
import { buildDraftDescription } from './helpers/draftDescription.js';
import { buildImpactMap } from './helpers/impactMap.js';
import { generateTestScaffold } from './helpers/testScaffold.js';

// --------- styled --------

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
  width: 880px; max-width: 96vw; height: min(680px, 92vh);
  background: ${p => p.theme.colors.modalBg};
  border-radius: 20px;
  box-shadow: 0 36px 70px -18px rgba(15,23,42,0.45), 0 0 0 1px rgba(15,23,42,0.04);
  z-index: 99999;
  animation: ${popIn} 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
  display: grid;
  grid-template-columns: 200px 1fr 340px;
  grid-template-rows: auto 1fr auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr auto;
    height: 92vh;
    width: 96vw;
  }
`;

const Header = styled.div`
  grid-column: 1 / -1;
  padding: 16px 22px;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid ${p => p.theme.colors.border};
`;

const Title = styled.div`
  font-size: 14px; font-weight: 700; color: ${p => p.theme.colors.textPrimary};
  display: flex; align-items: center; gap: 8px;
`;

const Rail = styled.aside`
  padding: 18px 12px;
  border-right: 1px solid ${p => p.theme.colors.border};
  background: ${p => p.theme.colors.headerBg};
  display: flex; flex-direction: column; gap: 4px;
  overflow-y: auto;

  @media (max-width: 900px) {
    grid-row: 2;
    border-right: none;
    border-bottom: 1px solid ${p => p.theme.colors.border};
    flex-direction: row;
    overflow-x: auto;
    padding: 10px;
  }
`;

const RailItem = styled.button`
  width: 100%;
  text-align: left;
  border: none;
  background: ${p => p.$active
    ? (p.theme.mode === 'dark' ? 'rgba(96, 165, 250, 0.16)' : '#eff6ff')
    : 'transparent'};
  color: ${p => p.$active
    ? (p.theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8')
    : (p.$done ? p.theme.colors.textPrimary : p.theme.colors.textSecondary)};
  padding: 10px 12px;
  border-radius: 10px;
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; font-weight: 600;
  cursor: pointer;
  transition: background 0.18s, color 0.18s, transform 0.15s;
  position: relative;

  &:hover { background: ${p => p.$active
    ? (p.theme.mode === 'dark' ? 'rgba(96, 165, 250, 0.22)' : '#dbeafe')
    : p.theme.colors.hoverBg}; }

  @media (max-width: 900px) {
    flex: 1 0 auto;
    min-width: 140px;
  }
`;

const StepNum = styled.span`
  display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px;
  border-radius: 50%;
  font-size: 11px; font-weight: 700;
  background: ${p => p.$active
    ? (p.theme.mode === 'dark' ? '#60a5fa' : '#2563eb')
    : (p.$done
      ? (p.theme.mode === 'dark' ? '#1e40af' : '#bfdbfe')
      : p.theme.colors.border)};
  color: ${p => p.$active ? 'white' : (p.$done ? (p.theme.mode === 'dark' ? '#dbeafe' : '#1e40af') : p.theme.colors.textTertiary)};
  transition: all 0.2s;
`;

const Main = styled.section`
  padding: 22px 26px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 18px;
`;

const Aside = styled.aside`
  border-left: 1px solid ${p => p.theme.colors.border};
  background: ${p => p.theme.colors.headerBg};
  padding: 18px 18px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 16px;

  @media (max-width: 900px) {
    border-left: none;
    border-top: 1px solid ${p => p.theme.colors.border};
  }
`;

const AsideHeading = styled.div`
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: ${p => p.theme.colors.textTertiary};
  display: flex; align-items: center; gap: 6px;
`;

const Footer = styled.div`
  grid-column: 1 / -1;
  padding: 14px 22px;
  border-top: 1px solid ${p => p.theme.colors.border};
  background: ${p => p.theme.colors.headerBg};
  display: flex; align-items: center; justify-content: space-between;
`;

const EvidenceShell = styled.div`
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: ${p => p.theme.colors.cardBg};
  border: 1px solid ${p => p.theme.colors.border};
  cursor: crosshair;
  user-select: none;

  img, video { display: block; width: 100%; max-height: 220px; object-fit: contain; }
`;

const PinDot = styled.button`
  position: absolute;
  width: 24px; height: 24px;
  border-radius: 50%;
  background: ${p => p.theme.mode === 'dark' ? '#3b82f6' : '#2563eb'};
  color: white;
  border: 2px solid white;
  font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transform: translate(-50%, -50%);
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.5);
  z-index: 2;
  padding: 0;

  &:hover { transform: translate(-50%, -50%) scale(1.1); }
`;

const PinList = styled.ol`
  list-style: none;
  padding: 0; margin: 0;
  display: flex; flex-direction: column; gap: 8px;
`;

const PinRow = styled.li`
  display: flex; gap: 8px; align-items: flex-start;
  padding: 8px 10px;
  background: ${p => p.theme.colors.cardBg};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 8px;
  font-size: 12px;
`;

const PinNum = styled.span`
  flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 50%;
  background: ${p => p.theme.mode === 'dark' ? '#3b82f6' : '#2563eb'};
  color: white;
  font-size: 10px; font-weight: 700;
`;

const PinInput = styled.input`
  border: none;
  background: transparent;
  flex: 1;
  font-size: 12px;
  color: ${p => p.theme.colors.textPrimary};
  outline: none;
  font-family: inherit;
  &::placeholder { color: ${p => p.theme.colors.textTertiary}; }
`;

const PinRemove = styled.button`
  border: none; background: transparent;
  color: ${p => p.theme.colors.textTertiary};
  cursor: pointer;
  padding: 0;
  &:hover { color: ${p => p.theme.mode === 'dark' ? '#fca5a5' : '#dc2626'}; }
`;

const SourceChip = styled.div`
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11px;
  color: ${p => p.theme.colors.textSecondary};
  display: flex; align-items: center; gap: 6px;
  padding: 8px 10px;
  background: ${p => p.theme.colors.cardBg};
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 8px;
`;

const ImpactGroup = styled.div`
  display: flex; flex-direction: column; gap: 6px;
`;

const ImpactKind = styled.div`
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${p => p.theme.colors.textTertiary};
  margin-top: 4px;
`;

const ImpactRow = styled.label`
  display: flex; align-items: flex-start; gap: 8px;
  padding: 6px 8px;
  background: ${p => p.theme.colors.cardBg};
  border: 1px solid ${p => p.$checked
    ? (p.theme.mode === 'dark' ? '#60a5fa' : '#3b82f6')
    : p.theme.colors.border};
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.18s, background 0.18s;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11px;

  &:hover { background: ${p => p.theme.colors.hoverBg}; }

  input { margin-top: 2px; cursor: pointer; }

  .label { color: ${p => p.theme.colors.textPrimary}; word-break: break-all; }
  .reason { color: ${p => p.theme.colors.textTertiary}; font-size: 10px; font-family: -apple-system, sans-serif; margin-top: 2px; }
`;

const SuggestionBanner = styled.button`
  display: flex; gap: 8px; align-items: flex-start;
  text-align: left;
  background: ${p => p.theme.mode === 'dark' ? 'rgba(96, 165, 250, 0.12)' : '#eff6ff'};
  border: 1px dashed ${p => p.theme.mode === 'dark' ? '#3b82f6' : '#93c5fd'};
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12px;
  color: ${p => p.theme.mode === 'dark' ? '#93c5fd' : '#1d4ed8'};
  cursor: pointer;
  transition: background 0.18s, border-color 0.18s;
  width: 100%;
  font-family: inherit;
  &:hover { background: ${p => p.theme.mode === 'dark' ? 'rgba(96, 165, 250, 0.2)' : '#dbeafe'}; }
`;

const CodeBlock = styled.pre`
  background: ${p => p.theme.mode === 'dark' ? '#0f172a' : '#0f172a'};
  color: ${p => p.theme.mode === 'dark' ? '#cbd5e1' : '#e2e8f0'};
  padding: 14px 16px;
  border-radius: 10px;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11px;
  line-height: 1.55;
  margin: 0;
  overflow-x: auto;
  position: relative;
`;

const CopyButton = styled.button`
  position: absolute; top: 8px; right: 8px;
  background: rgba(255,255,255,0.08);
  color: white;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 10px; font-weight: 600;
  cursor: pointer;
  display: inline-flex; align-items: center; gap: 4px;
  &:hover { background: rgba(255,255,255,0.15); }
`;

const ReviewGrid = styled.div`
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 12px;
  background: ${p => p.theme.colors.cardBg};
  border: 1px solid ${p => p.theme.colors.border};
  font-size: 13px;
`;

const ReviewRow = styled.div`
  display: flex; align-items: baseline; gap: 12px;
  span:first-child {
    text-transform: uppercase; font-size: 10px; font-weight: 700;
    color: ${p => p.theme.colors.textTertiary}; letter-spacing: 0.06em;
    min-width: 80px;
  }
  span:last-child { color: ${p => p.theme.colors.textPrimary}; flex: 1; word-break: break-word; }
`;

const EmptyMedia = styled.button`
  border: 1px dashed ${p => p.theme.colors.border};
  border-radius: 10px;
  padding: 14px;
  background: transparent;
  color: ${p => p.theme.colors.textSecondary};
  font-size: 12px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  cursor: pointer; transition: all 0.2s;
  width: 100%;
  &:hover { color: ${p => p.theme.colors.textPrimary}; border-color: ${p => p.theme.colors.textTertiary}; }
`;

// --------- component --------

const STEPS = [
  { key: 'describe', label: 'Describe',  Icon: MessageSquarePlus },
  { key: 'tag',      label: 'Tag',       Icon: Pin },
  { key: 'impact',   label: 'Impact',    Icon: GitBranch },
  { key: 'review',   label: 'Review',    Icon: Check },
];

export const FeedbackModalWorkspace = (props) => {
  const { isOpen, onClose, elementInfo, screenshot, videoBlob, mode = 'light' } = props;
  const theme = getTheme(mode);
  const s = useFeedbackModalState(props);

  const [step, setStep] = useState(0);
  const [pins, setPins] = useState([]); // { id, xPct, yPct, note }
  const [impact, setImpact] = useState({ primary: null, related: [], source: 'none' });
  const [pickedRelated, setPickedRelated] = useState(new Set());
  const [draftedOnce, setDraftedOnce] = useState(false);
  const [copied, setCopied] = useState(false);

  const evidenceRef = useRef(null);

  // Smart pre-fill draft on first open
  useEffect(() => {
    if (!isOpen) { setDraftedOnce(false); return; }
    if (draftedOnce) return;
    if (s.description) { setDraftedOnce(true); return; }
    const draft = buildDraftDescription({
      elementInfo,
      page: typeof window !== 'undefined' ? window.location.href : null,
      networkLog: props.eventLogs || [],
      errorLog: props.eventLogs?.filter?.((e) => e.type === 'error') || [],
    });
    if (draft) s.setDescription(draft);
    setDraftedOnce(true);
  }, [isOpen, draftedOnce, elementInfo]); // eslint-disable-line

  // Reset transient state on close
  useEffect(() => {
    if (!isOpen) {
      setStep(0);
      setPins([]);
      setImpact({ primary: null, related: [], source: 'none' });
      setPickedRelated(new Set());
    }
  }, [isOpen]);

  // Load impact map when elementInfo is known
  useEffect(() => {
    if (!isOpen || !elementInfo) return;
    let cancelled = false;
    buildImpactMap(elementInfo).then((result) => {
      if (!cancelled) {
        setImpact(result);
        setPickedRelated(new Set((result.related || []).filter((r) => r.kind === 'importer' || r.kind === 'test').map((r) => r.label)));
      }
    });
    return () => { cancelled = true; };
  }, [isOpen, elementInfo]);

  // Memoize the test scaffold. Must run on every render — keep it
  // ABOVE the `if (!isOpen) return null` early return so React's
  // hook-count invariant holds when the modal opens/closes.
  const testScaffold = useMemo(() =>
    generateTestScaffold({
      elementInfo,
      description: s.description,
      networkLog: props.eventLogs || [],
    }),
    [elementInfo, s.description, props.eventLogs]
  );

  if (!isOpen) return null;

  const sourceLabel = elementInfo?.sourceFile
    ? `${elementInfo.sourceFile.replace(/^.*\/src\//, 'src/')}${elementInfo.sourceLine ? ':' + elementInfo.sourceLine : ''}`
    : null;
  const componentLabel = elementInfo?.reactComponent || elementInfo?.tagName;

  const handleEvidenceClick = (e) => {
    if (!s.activeImage) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    const id = Date.now() + Math.random();
    setPins((prev) => [...prev, { id, xPct, yPct, note: '' }]);
  };

  const setPinNote = (id, note) => {
    setPins((prev) => prev.map((p) => p.id === id ? { ...p, note } : p));
  };
  const removePin = (id) => {
    setPins((prev) => prev.filter((p) => p.id !== id));
  };

  const togglePicked = (label) => {
    setPickedRelated((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard?.writeText?.(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };

  const handleSubmit = () => {
    // Extend the submission payload with the new artefacts
    const extended = {
      annotations: pins.filter((p) => p.note?.trim()).map((p, i) => ({
        index: i + 1, xPct: p.xPct, yPct: p.yPct, note: p.note.trim(),
      })),
      impact: {
        primary: impact.primary,
        related: (impact.related || []).filter((r) => pickedRelated.has(r.label)),
        source: impact.source,
      },
      suggestedTest: testScaffold,
    };
    // monkey-patch the captured state right before submit
    const originalSubmit = s.handleSubmit;
    // We can't intercept inside the hook; instead we route through onAsyncSubmit/onSubmit ourselves.
    const data = {
      ...buildFeedbackPayload(s, props, elementInfo, extended),
    };
    props.onClose?.();
    if (props.onAsyncSubmit) props.onAsyncSubmit(data);
    else if (props.onSubmit) props.onSubmit(data);
  };

  const canAdvance = step !== 0 || s.description.trim().length > 0;

  return createPortal(
    <ThemeProvider theme={theme}>
      <Backdrop onClick={onClose} />
      <Modal role="dialog" aria-modal="true" aria-label="Send feedback">
        <Header>
          <Title>💬 Send Feedback <span style={{ color: theme.colors.textTertiary, fontWeight: 500, fontSize: 12 }}>· Workspace</span></Title>
          <CloseX onClick={onClose} aria-label="Close"><X size={18} /></CloseX>
        </Header>

        <Rail>
          {STEPS.map((stp, i) => (
            <RailItem key={stp.key} $active={step === i} $done={step > i} onClick={() => setStep(i)}>
              <StepNum $active={step === i} $done={step > i}>
                {step > i ? <Check size={12} /> : i + 1}
              </StepNum>
              {stp.label}
            </RailItem>
          ))}
        </Rail>

        <Main key={step}>
          {step === 0 && (
            <>
              <FieldRow>
                <FieldLabel htmlFor="ws-desc">What happened?</FieldLabel>
                <TextArea id="ws-desc" ref={s.descriptionRef}
                  placeholder="Describe what you saw, what you expected, how to reproduce…"
                  value={s.description} onChange={(e) => s.setDescription(e.target.value)}
                  disabled={s.isSubmitting} style={{ minHeight: 180 }} />
              </FieldRow>
              <SuggestionBanner type="button" onClick={() => {
                const draft = buildDraftDescription({
                  elementInfo,
                  page: typeof window !== 'undefined' ? window.location.href : null,
                  networkLog: props.eventLogs || [],
                  errorLog: props.eventLogs?.filter?.((e) => e.type === 'error') || [],
                });
                s.setDescription(draft);
              }}>
                <Sparkles size={14} />
                <div>
                  <strong>Reset to smart draft</strong> — we'll pre-fill what we already know
                  (page, clicked component, last failing network call) so you only describe what
                  went wrong.
                </div>
              </SuggestionBanner>
            </>
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
            <>
              <FieldLabel>Likely related files</FieldLabel>
              <div style={{ fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 }}>
                Pick files the dev / AI might also need to touch.
                {impact.source === 'codemap' && <> Sourced from <code style={{ background: theme.colors.cardBg, padding: '1px 5px', borderRadius: 4 }}>feedback-codemap.json</code>.</>}
                {impact.source === 'heuristic' && <> Heuristic suggestions — run <code style={{ background: theme.colors.cardBg, padding: '1px 5px', borderRadius: 4 }}>npm run feedback:codemap</code> for real import graph.</>}
                {impact.source === 'none' && <> No source file resolved for the clicked element.</>}
              </div>

              {['importer', 'imports', 'test', 'sibling', 'parent'].map((kind) => {
                const group = (impact.related || []).filter((r) => r.kind === kind);
                if (!group.length) return null;
                const kindLabel = {
                  importer: 'Files that import this',
                  imports: 'Files this imports',
                  test: 'Test files',
                  sibling: 'Sibling files',
                  parent: 'Parent / barrel',
                }[kind];
                return (
                  <ImpactGroup key={kind}>
                    <ImpactKind>{kindLabel}</ImpactKind>
                    {group.map((r) => (
                      <ImpactRow key={r.label} $checked={pickedRelated.has(r.label)}>
                        <input type="checkbox"
                          checked={pickedRelated.has(r.label)}
                          onChange={() => togglePicked(r.label)} />
                        <div>
                          <div className="label">{r.label}</div>
                          <div className="reason">{r.reason}</div>
                        </div>
                      </ImpactRow>
                    ))}
                  </ImpactGroup>
                );
              })}
            </>
          )}

          {step === 3 && (
            <>
              <ReviewGrid>
                <ReviewRow><span>Summary</span><span>{s.description.slice(0, 200) || '—'}{s.description.length > 200 ? '…' : ''}</span></ReviewRow>
                <ReviewRow><span>Category</span><span>{s.feedbackType}</span></ReviewRow>
                <ReviewRow><span>Priority</span><span>{s.priority} · {PRIORITY_OPTIONS.find(o => o.id === s.priority)?.hint}</span></ReviewRow>
                <ReviewRow><span>Labels</span><span>{s.labels.length ? s.labels.join(', ') : '—'}</span></ReviewRow>
                <ReviewRow><span>Annotations</span><span>{pins.filter((p) => p.note?.trim()).length} pin{pins.filter((p) => p.note?.trim()).length === 1 ? '' : 's'}</span></ReviewRow>
                <ReviewRow><span>Related files</span><span>{pickedRelated.size}{impact.source === 'heuristic' ? ' (heuristic)' : ''}</span></ReviewRow>
              </ReviewGrid>

              <FieldLabel style={{ marginTop: 12 }}>
                <FlaskConical size={12} style={{ display: 'inline', marginRight: 4, marginBottom: -2 }} />
                Suggested failing test
              </FieldLabel>
              <div style={{ fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 }}>
                Paste this into the dev's project as a starting point. The widget knows the
                component, the user's action, and the failing network call (if any).
              </div>
              <CodeBlock>
                <CopyButton onClick={() => handleCopy(testScaffold)}>
                  <Copy size={11} />
                  {copied ? 'Copied' : 'Copy'}
                </CopyButton>
                {testScaffold}
              </CodeBlock>
            </>
          )}
        </Main>

        <Aside>
          <div>
            <AsideHeading><Pin size={10} /> Evidence{s.activeImage && <span style={{ marginLeft: 'auto', color: theme.colors.textTertiary, textTransform: 'none', letterSpacing: 0, fontSize: 10, fontWeight: 500 }}>Click image to drop a pin</span>}</AsideHeading>
            {s.activeMedia ? (
              <>
                <EvidenceShell ref={evidenceRef} onClick={handleEvidenceClick}>
                  {s.activeImage
                    ? <img src={s.activeImage} alt="Captured" />
                    : <video src={s.videoUrl} controls onClick={(e) => e.stopPropagation()} />}
                  {pins.map((p, i) => (
                    <PinDot key={p.id}
                      style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
                      onClick={(e) => { e.stopPropagation(); removePin(p.id); }}
                      title="Click to remove">
                      {i + 1}
                    </PinDot>
                  ))}
                </EvidenceShell>
                {pins.length > 0 && (
                  <PinList style={{ marginTop: 10 }}>
                    {pins.map((p, i) => (
                      <PinRow key={p.id}>
                        <PinNum>{i + 1}</PinNum>
                        <PinInput placeholder="What about this spot?"
                          value={p.note}
                          onChange={(e) => setPinNote(p.id, e.target.value)} />
                        <PinRemove onClick={() => removePin(p.id)} title="Remove pin">
                          <Trash2 size={12} />
                        </PinRemove>
                      </PinRow>
                    ))}
                  </PinList>
                )}
              </>
            ) : (
              <EmptyMedia onClick={() => s.screenshotInputRef.current?.click()}>
                <ImageIcon size={14} /> Attach screenshot or video
                <input type="file" ref={s.screenshotInputRef} accept="image/*,video/*" style={{display:'none'}} onChange={(e) => s.handleFile(e.target.files[0])} />
              </EmptyMedia>
            )}
          </div>

          {(sourceLabel || componentLabel) && (
            <div>
              <AsideHeading><FileCode size={10} /> Source</AsideHeading>
              <SourceChip>
                <FileCode size={12} />
                <span>{componentLabel && `<${componentLabel}>`}{componentLabel && sourceLabel && ' · '}{sourceLabel}</span>
              </SourceChip>
            </div>
          )}

          {impact.primary && step !== 2 && (
            <div>
              <AsideHeading>
                <GitBranch size={10} /> Impact map
                <span style={{ marginLeft: 'auto', textTransform: 'none', letterSpacing: 0, fontSize: 10, fontWeight: 500, color: theme.colors.textTertiary }}>
                  {pickedRelated.size}/{impact.related?.length || 0} picked
                </span>
              </AsideHeading>
              <div style={{ fontSize: 11, color: theme.colors.textSecondary, lineHeight: 1.5 }}>
                {impact.related?.length || 0} related file{impact.related?.length === 1 ? '' : 's'} suggested.
                Open step 3 to review.
              </div>
            </div>
          )}
        </Aside>

        <Footer>
          {step === 0
            ? <div />
            : <SecondaryButton onClick={() => setStep((x) => x - 1)}><ChevronLeft size={14} /> Back</SecondaryButton>}
          {step < STEPS.length - 1 ? (
            <SubmitButton onClick={() => canAdvance && setStep((x) => x + 1)} disabled={!canAdvance}>
              Continue <ChevronRight size={14} />
            </SubmitButton>
          ) : (
            <SubmitButton onClick={handleSubmit} disabled={!s.description.trim()}>
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

function buildFeedbackPayload(s, props, elementInfo, extended) {
  return {
    feedback: s.description.trim(),
    type: s.feedbackType,
    severity: s.priority,
    labels: s.labels,
    screenshot: props.screenshot || s.manualScreenshot,
    videoBlob: props.videoBlob || s.manualVideo,
    attachment: s.manualFile,
    eventLogs: props.eventLogs || [],
    timestamp: new Date().toISOString(),
    url: window.location.href,
    component: elementInfo?.reactComponent || elementInfo?.tagName,
    elementInfo,
    userAgent: navigator.userAgent,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    userName: props.userName,
    userEmail: props.userEmail,
    userAvatar: props.userAvatar || null,
    selectedIntegrations: s.selectedIntegrations,
    dotPosition: props.clickPosition || null,
    annotations: extended.annotations,
    impact: extended.impact,
    suggestedTest: extended.suggestedTest,
  };
}

export default FeedbackModalWorkspace;
