/**
 * Pure helpers for derived feedback metadata.
 * Never mutate input. All outputs deterministic.
 */

import { redactHandoffText, resolveRedactionConfig } from './feedbackSecurity.js';

const SEVERITY_WEIGHT = { low: 10, medium: 30, high: 60, critical: 85 };
const NON_BUG_PENALTY = { idea: -10, praise: -20, question: -5, other: -5 };

function isErrorLog(e) {
  return !!e && e.type === 'console' && (e.level === 'error' || (e.level === 'warn' && e.isError));
}

function isFailedNetwork(e) {
  if (!e || e.type !== 'network') return false;
  if (typeof e.status === 'number') return e.status >= 400;
  if (e.status === 'failed' || e.status === 'error') return true;
  return false;
}

export function getFeedbackEvidenceSummary(item = {}) {
  const logs = Array.isArray(item.eventLogs) ? item.eventLogs : [];
  return {
    hasScreenshot: !!item.screenshot,
    hasVideo: !!item.video,
    logCount: logs.length,
    errorCount: logs.filter(isErrorLog).length,
    failedNetworkCount: logs.filter(isFailedNetwork).length,
    storageEventCount: logs.filter((e) => e?.type === 'storage' || e?.type === 'indexedDB').length,
    hasComponent: !!(item.elementInfo?.componentStack && item.elementInfo.componentStack.length),
    hasSource: !!item.elementInfo?.sourceFile,
    integrationStates: {
      jira: item.integrationState?.jira?.status || 'not_sent',
      sheets: item.integrationState?.sheets?.status || 'not_sent',
      local: item.integrationState?.local?.status || 'saved',
    },
  };
}

function normaliseCustomerValue(v) {
  if (typeof v === 'number' && Number.isFinite(v)) {
    if (v <= 0) return 0;
    return Math.min(15, Math.round(Math.log10(v + 1) * 2.5));
  }
  if (typeof v === 'string' && v) return 5;
  return 0;
}

export function getFeedbackPriority(item = {}) {
  const summary = getFeedbackEvidenceSummary(item);
  const reasons = [];
  let score = SEVERITY_WEIGHT[item.severity] ?? SEVERITY_WEIGHT.medium;
  reasons.push(`${item.severity || 'medium'} severity`);

  if (summary.errorCount > 0) {
    score += 10;
    reasons.push(`${summary.errorCount} console error${summary.errorCount === 1 ? '' : 's'}`);
  }
  if (summary.failedNetworkCount > 0) {
    score += 5;
    reasons.push(`${summary.failedNetworkCount} failed request${summary.failedNetworkCount === 1 ? '' : 's'}`);
  }
  const cv = normaliseCustomerValue(item.customerValue);
  if (cv > 0) {
    score += cv;
    reasons.push('customer value');
  }
  const penalty = NON_BUG_PENALTY[item.type] || 0;
  if (penalty !== 0) {
    score += penalty;
    reasons.push(`${item.type} (deprioritized)`);
  }

  score = Math.max(0, Math.min(100, score));
  let band = 'low';
  if (score >= 80) band = 'urgent';
  else if (score >= 55) band = 'high';
  else if (score >= 25) band = 'normal';

  return { score, band, reasons };
}

function shortText(item) {
  const who = item.userName || 'Anonymous';
  const fb = (item.feedback || '').replace(/\s+/g, ' ').trim();
  const fbShort = fb.length > 140 ? fb.slice(0, 137) + '...' : fb;
  return `${who}: ${fbShort}`;
}

function fullText(item) {
  const s = getFeedbackEvidenceSummary(item);
  const p = getFeedbackPriority(item);
  const lines = [
    `Feedback (${item.type || 'bug'}, ${item.severity || 'medium'}): ${item.feedback || ''}`,
    `From: ${item.userName || 'Anonymous'}${item.userEmail ? ` <${item.userEmail}>` : ''}`,
    item.url ? `URL: ${item.url}` : null,
    `Priority: ${p.band} (${p.score}) — ${p.reasons.join(', ')}`,
    `Evidence: ${[
      s.hasScreenshot && 'screenshot',
      s.hasVideo && 'video',
      s.logCount && `${s.logCount} log${s.logCount === 1 ? '' : 's'}`,
      s.errorCount && `${s.errorCount} error${s.errorCount === 1 ? '' : 's'}`,
      s.failedNetworkCount && `${s.failedNetworkCount} failed request${s.failedNetworkCount === 1 ? '' : 's'}`,
    ].filter(Boolean).join(', ') || 'text only'}`,
    item.elementInfo?.componentStack?.length
      ? `Component: ${item.elementInfo.componentStack.join(' > ')}`
      : null,
    item.elementInfo?.sourceFile ? `Source: ${item.elementInfo.sourceFile}` : null,
    item.elementInfo?.selector ? `Selector: ${item.elementInfo.selector}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

export function createFeedbackHandoffText(item, opts = {}) {
  const format = opts.format || 'full';
  const redact = opts.redact !== false;
  const cfg = resolveRedactionConfig(opts.redactConfig || 'default');

  let text;
  switch (format) {
    case 'short':
      text = shortText(item);
      break;
    case 'jira':
    case 'slack':
    case 'full':
    default:
      text = fullText(item);
  }
  return redact ? redactHandoffText(text, cfg) : text;
}

export function getDerivedFeedbackMeta(item = {}) {
  const summary = getFeedbackEvidenceSummary(item);
  const priority = getFeedbackPriority(item);
  const primaryEvidence = item.video ? 'video'
    : item.screenshot ? 'screenshot'
    : summary.logCount > 0 ? 'logs'
    : 'text';
  const ageMs = item.timestamp ? Date.now() - new Date(item.timestamp).getTime() : 0;
  return Object.freeze({
    summary,
    priority,
    primaryEvidence,
    ageMs,
  });
}
