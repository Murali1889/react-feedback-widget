import { getFeedbackEvidenceSummary } from '../lib/feedbackEvidence.js';

export function initialFilters() {
  return { search: '', statuses: new Set(), severities: new Set(), flags: new Set() };
}

function matchesSearch(item, q) {
  if (!q) return true;
  const low = q.toLowerCase();
  const haystack = [
    item.feedback, item.userName, item.userEmail, item.url,
    item.elementInfo?.selector, item.elementInfo?.sourceFile,
  ].filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(low);
}

function matchesFlags(item, flags) {
  if (!flags || flags.size === 0) return true;
  const summary = getFeedbackEvidenceSummary(item);
  for (const flag of flags) {
    if (flag === 'withMedia' && !(summary.hasVideo || summary.hasScreenshot || summary.hasAudio || summary.hasAttachment)) return false;
    if (flag === 'hasErrors' && !(summary.errorCount > 0 || summary.failedNetworkCount > 0)) return false;
    if (flag === 'needsOwner' && item.owner) return false;
  }
  return true;
}

export function getFilteredItems(items, filters) {
  if (!Array.isArray(items)) return [];
  const f = filters || initialFilters();
  return items.filter((it) => {
    if (f.statuses?.size > 0 && !f.statuses.has(it.status)) return false;
    if (f.severities?.size > 0 && !f.severities.has(it.severity)) return false;
    if (!matchesSearch(it, f.search)) return false;
    if (!matchesFlags(it, f.flags)) return false;
    return true;
  });
}

export function getStatusCounts(items) {
  const out = {};
  for (const it of items || []) {
    const k = it.status || 'new';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

export function getAttentionCounts(items) {
  let withMedia = 0, hasErrors = 0, needsOwner = 0;
  for (const it of items || []) {
    const s = getFeedbackEvidenceSummary(it);
    if (s.hasVideo || s.hasScreenshot || s.hasAudio || s.hasAttachment) withMedia += 1;
    if (s.errorCount > 0 || s.failedNetworkCount > 0) hasErrors += 1;
    if (!it.owner) needsOwner += 1;
  }
  return { withMedia, hasErrors, needsOwner };
}
