/**
 * Resolve build metadata for the current host app.
 * Order: explicit prop > globalThis.__feedbackBuildInfo > <meta name="feedback-build">.
 */
function parseMetaContent(content) {
  const out = {};
  if (typeof content !== 'string') return out;
  for (const pair of content.split('&')) {
    const [k, ...rest] = pair.split('=');
    if (!k) continue;
    out[k.trim()] = decodeURIComponent(rest.join('=') || '');
  }
  return out;
}

function readGlobal() {
  const g = globalThis.__feedbackBuildInfo;
  return g && typeof g === 'object' ? { ...g } : null;
}

function readMeta() {
  if (typeof document === 'undefined') return null;
  const tag = document.querySelector('meta[name="feedback-build"]');
  if (!tag) return null;
  return parseMetaContent(tag.getAttribute('content') || '');
}

export function resolveBuildInfo(propValue) {
  const fallbackEnv = (typeof process !== 'undefined' && process.env?.NODE_ENV) || 'production';
  const result = {
    environment: fallbackEnv,
    ...(readMeta() || {}),
    ...(readGlobal() || {}),
    ...(propValue && typeof propValue === 'object' ? propValue : {}),
  };
  return result;
}
