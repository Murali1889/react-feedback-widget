/**
 * Screenshot PII redaction — runs inside html2canvas's `onclone` hook
 * so we mutate the *cloned* DOM (not the live page) before render.
 *
 * Catches the bug-report-leaks-a-credit-card class of incident:
 * password fields, payment-form fields, OTP codes, anything the host
 * tags with `data-feedback-redact`, etc. Visual placeholder preserves
 * the bounding box so the screenshot layout still looks correct — only
 * the sensitive value disappears.
 */

const PII_SELECTORS = [
  // Browsers/password managers all rely on these markers, so they're
  // a reliable signal for "this is sensitive even if the dev didn't
  // mark it as such".
  'input[type="password"]',
  'input[autocomplete*="cc-number"]',
  'input[autocomplete*="cc-csc"]',
  'input[autocomplete*="cc-name"]',
  'input[autocomplete*="cc-exp"]',
  'input[autocomplete*="one-time-code"]',
  // Common but lower-confidence patterns — name matches are easy to
  // false-positive on but the failure mode (extra redaction) is safe.
  'input[name*="card" i]',
  'input[name*="cvv" i]',
  'input[name*="cvc" i]',
  // Explicit host opt-in.
  '[data-feedback-redact]',
];

const REDACTED_STYLE = {
  background: '#1f2937',
  color: 'transparent',
  textShadow: '0 0 8px rgba(0,0,0,0.9)',
  borderRadius: '4px',
};

/**
 * Walk a cloned document and replace every PII-bearing element with a
 * visual placeholder. Returns { masked } for telemetry/tests.
 *
 * NOT idempotent across multiple calls — each call mutates the clone.
 * Safe to call once per onclone invocation.
 */
export function maskPiiInClonedDoc(clonedDoc) {
  if (!clonedDoc || typeof clonedDoc.querySelectorAll !== 'function') {
    return { masked: 0 };
  }
  let masked = 0;
  const seen = new Set();
  for (const sel of PII_SELECTORS) {
    let els;
    try { els = clonedDoc.querySelectorAll(sel); }
    catch { continue; }
    els.forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      try {
        applyRedaction(el);
        masked++;
      } catch { /* swallow — never let a bad selector break screenshot */ }
    });
  }
  return { masked };
}

function applyRedaction(el) {
  const tag = (el.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    // Wipe the value and overlay the redaction style — preserves shape.
    el.value = '••••••';
    if (el.setAttribute) el.setAttribute('value', '••••••');
    Object.assign(el.style || {}, REDACTED_STYLE);
    return;
  }
  // Containers / spans: replace with a same-sized div. Falls back to a
  // visual block if getBoundingClientRect isn't available (jsdom).
  const placeholder = el.ownerDocument?.createElement?.('div');
  if (!placeholder) return;
  if (typeof el.getBoundingClientRect === 'function') {
    const rect = el.getBoundingClientRect();
    placeholder.style.width = `${Math.max(rect.width || 0, 0)}px`;
    placeholder.style.height = `${Math.max(rect.height || 0, 0)}px`;
  }
  placeholder.style.display = el.style?.display || 'inline-block';
  Object.assign(placeholder.style, REDACTED_STYLE);
  placeholder.setAttribute('data-feedback-redacted', 'true');
  if (el.parentNode) el.parentNode.replaceChild(placeholder, el);
}

export const __testing__ = { PII_SELECTORS, REDACTED_STYLE };
