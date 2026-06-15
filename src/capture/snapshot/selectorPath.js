/**
 * Build a short CSS-ish selector path for an element. Optimised for
 * readability in tickets, not for re-querying. data-testid wins.
 */
export function selectorPath(el, { maxDepth = 5 } = {}) {
  if (!el || el.nodeType !== 1) return '';
  if (el.id) return `#${el.id}`;
  const parts = [];
  let cur = el;
  let depth = 0;
  while (cur && cur.nodeType === 1 && depth < maxDepth) {
    let segment = cur.tagName.toLowerCase();
    const testId = cur.getAttribute?.('data-testid');
    if (testId) segment = `[data-testid="${testId}"]`;
    else if (cur.className && typeof cur.className === 'string') {
      const cls = cur.className.trim().split(/\s+/).slice(0, 2).filter(Boolean);
      if (cls.length) segment += '.' + cls.join('.');
    }
    parts.unshift(segment);
    if (testId) break;
    cur = cur.parentElement;
    depth += 1;
  }
  return parts.join(' > ');
}

export function labelFor(el) {
  if (!el || el.nodeType !== 1) return null;
  const aria = el.getAttribute?.('aria-label');
  if (aria) return aria.trim();
  if (el.id && typeof document !== 'undefined') {
    const lab = document.querySelector(`label[for="${el.id}"]`);
    if (lab) return (lab.textContent || '').trim();
  }
  if (el.tagName === 'BUTTON' || el.tagName === 'A') {
    return (el.textContent || '').trim().slice(0, 80);
  }
  if (el.tagName === 'IMG') return el.getAttribute('alt') || null;
  if (el.tagName === 'INPUT') {
    return el.getAttribute('placeholder') || el.getAttribute('name') || null;
  }
  return null;
}
