/**
 * Build a single-line "Evidence captured" note for destinations that
 * can't natively attach binaries (everything that isn't Discord). Lets
 * the reader see that capture happened even when we can't surface the
 * bytes themselves.
 *
 * Returns '' when no binaries were captured, so callers can append
 * unconditionally without inflating empty bodies.
 */
export function buildEvidenceNote(feedbackData = {}) {
  const items = [];
  const hasScreenshot = isBlobLike(feedbackData.screenshot) ||
    (typeof feedbackData.screenshot === 'string' && feedbackData.screenshot.startsWith('data:'));
  if (hasScreenshot) items.push('screenshot');
  if (isBlobLike(feedbackData.videoBlob)) items.push(`video (${kb(feedbackData.videoBlob.size)})`);
  if (isBlobLike(feedbackData.audioBlob)) items.push(`voice memo (${kb(feedbackData.audioBlob.size)})`);
  if (isBlobLike(feedbackData.attachment)) {
    const name = feedbackData.attachment.name || 'attachment';
    items.push(`${name} (${kb(feedbackData.attachment.size)})`);
  }
  if (!items.length) return '';
  return `\n\n📎 Evidence captured: ${items.join(', ')}`;
}

function isBlobLike(v) {
  return v && typeof v === 'object' && typeof v.size === 'number' &&
         typeof v.type === 'string' && typeof v.arrayBuffer === 'function';
}

function kb(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Shared helper: warn when handler is created without withSecureDefaults
 * in production. Each handler factory imports its own labelled variant
 * so the warning identifies which handler is unwrapped.
 */
export function warnIfInsecureFactory(handlerName) {
  return function warnIfInsecure(_config) {
    // We only know the handler was wrapped at call time (the wrapper
    // passes `res.authContext`). Warn proactively in production NODE_ENV
    // unless the host opts out via _config.bypassSecurityWarning.
    if (
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV === 'production' &&
      !_config?.bypassSecurityWarning
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `[react-visual-feedback] ${handlerName}() created. Make sure it's wrapped with ` +
        `withSecureDefaults({ authorize }) for origin / CSRF / rate-limit / authorize / ` +
        `redaction. Pass { bypassSecurityWarning: true } to silence this if you have ` +
        `your own security layer.`
      );
    }
  };
}
