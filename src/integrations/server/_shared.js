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
