/**
 * Build a smart pre-filled description from everything we already
 * know about the user's click. The reporter starts with content —
 * they edit, refine, or wipe it.
 *
 * Returns a short paragraph like:
 *   "On /checkout — clicked <CheckoutButton>. Last network call:
 *    POST /api/orders → 500 at 03:14:22. (Edit this to describe
 *    what went wrong.)"
 */
export function buildDraftDescription({ elementInfo, page, networkLog, errorLog }) {
  const parts = [];
  const pageBit = page ? page.replace(/^https?:\/\/[^/]+/, '') : null;
  if (pageBit) parts.push(`On \`${pageBit}\``);

  const component = elementInfo?.reactComponent;
  const tag = elementInfo?.tagName;
  if (component) parts.push(`clicked \`<${component}>\``);
  else if (tag) parts.push(`clicked \`<${tag}>\``);

  let opening = parts.length ? parts.join(' — ') + '.' : '';

  const failing = (networkLog || [])
    .filter((n) => n && (n.ok === false || (n.status && n.status >= 400)))
    .slice(-1)[0];

  const network = failing
    ? `Last failing network call: ${failing.method} ${failing.url} → ${failing.status || 'failed'}.`
    : '';

  const recentError = (errorLog || []).slice(-1)[0];
  const error = recentError?.message
    ? `Recent error: ${recentError.message.slice(0, 120)}.`
    : '';

  const hint = '(Edit this to describe what went wrong — what you expected vs what happened.)';
  return [opening, network, error, hint].filter(Boolean).join(' ');
}
