import { selectorPath, labelFor } from '../snapshot/selectorPath.js';

const SENSITIVE_NAME_RE = /ssn|cvv|cvc|card|secret|otp|password/i;

function isSensitiveField(el, hostSelectors = []) {
  if (!el || el.nodeType !== 1) return null;
  if (el.tagName === 'INPUT' && el.type === 'password') return 'password-field';
  const autocomplete = el.getAttribute?.('autocomplete') || '';
  if (autocomplete.startsWith('cc-')) return 'cc-autocomplete';
  const name = el.getAttribute?.('name') || '';
  const inputmode = el.getAttribute?.('inputmode') || '';
  if (inputmode === 'numeric' && SENSITIVE_NAME_RE.test(name)) return 'numeric-sensitive';
  if (el.closest?.('[data-feedback-redact="true"]')) return 'host-marker';
  for (const sel of hostSelectors) {
    try { if (el.matches?.(sel)) return 'host-selector'; } catch {}
  }
  return null;
}

function targetOf(el) {
  if (!el || el.nodeType !== 1) return null;
  return {
    selector: selectorPath(el),
    label: labelFor(el),
    role: el.getAttribute?.('role') || null,
    name: el.getAttribute?.('name') || null,
  };
}

export function mountInteractionObserver(buffer, opts = {}) {
  if (typeof document === 'undefined') return () => {};
  const hostSelectors = Array.isArray(opts.sensitiveSelectors) ? opts.sensitiveSelectors : [];

  const onClick = (e) => buffer.push({ type: 'click', target: targetOf(e.target), ts: Date.now() });
  const onPointer = (e) => {
    if (e.pointerType !== 'mouse') buffer.push({ type: 'pointerdown', target: targetOf(e.target), ts: Date.now() });
  };
  const onFocusIn = (e) => buffer.push({ type: 'focus', target: targetOf(e.target), ts: Date.now() });
  const onInput = (e) => {
    const reason = isSensitiveField(e.target, hostSelectors);
    const base = { type: 'input', target: targetOf(e.target), ts: Date.now() };
    if (reason) buffer.push({ ...base, redacted: reason });
    else buffer.push({ ...base, value: e.target.value });
  };
  const onSubmit = (e) => buffer.push({ type: 'submit', target: targetOf(e.target), ts: Date.now() });
  const onKey = (e) => {
    if (['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      buffer.push({ type: 'keydown', key: e.key, target: targetOf(e.target), ts: Date.now() });
    } else {
      buffer.push({ type: 'keydown', target: targetOf(e.target), ts: Date.now() });
    }
  };
  let scrollT = 0;
  const onScroll = () => {
    const now = Date.now();
    if (now - scrollT < 200) return;
    scrollT = now;
    buffer.push({ type: 'scroll', target: { selector: 'window' }, ts: now });
  };

  const cfg = { capture: true, passive: true };
  document.addEventListener('click', onClick, cfg);
  document.addEventListener('pointerdown', onPointer, cfg);
  document.addEventListener('focusin', onFocusIn, cfg);
  document.addEventListener('input', onInput, cfg);
  document.addEventListener('change', onInput, cfg);
  document.addEventListener('submit', onSubmit, cfg);
  document.addEventListener('keydown', onKey, cfg);
  window.addEventListener('scroll', onScroll, cfg);

  return () => {
    document.removeEventListener('click', onClick, cfg);
    document.removeEventListener('pointerdown', onPointer, cfg);
    document.removeEventListener('focusin', onFocusIn, cfg);
    document.removeEventListener('input', onInput, cfg);
    document.removeEventListener('change', onInput, cfg);
    document.removeEventListener('submit', onSubmit, cfg);
    document.removeEventListener('keydown', onKey, cfg);
    window.removeEventListener('scroll', onScroll, cfg);
  };
}
