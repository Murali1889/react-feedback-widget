/**
 * Network observer
 *
 * Wraps window.fetch and XMLHttpRequest so the ring buffer holds a
 * trailing trace of recent network calls. Captures method, URL,
 * status, duration, and an error message if the request failed —
 * NOT request/response bodies by default (high PII risk).
 *
 * Exclusion patterns let hosts filter out analytics noise. URLs are
 * normalized to strip query-string secrets via the same redaction
 * pipeline used elsewhere (auth tokens / API keys in URL params get
 * masked at submission time, not at capture).
 */

const DEFAULT_EXCLUDES = [
  'amplitude',
  'segment.io',
  'segment.com',
  'google-analytics',
  'googletagmanager',
  'mixpanel',
  'sentry.io',
  'datadoghq',
  'newrelic',
  '/__nextjs_',
  '/_next/static/',
  '/_next/webpack-hmr',
  'sockjs-node',
];

function isExcluded(url, patterns) {
  if (!url) return true;
  const all = patterns.length ? patterns : DEFAULT_EXCLUDES;
  for (let i = 0; i < all.length; i += 1) {
    if (url.indexOf(all[i]) !== -1) return true;
  }
  return false;
}

function originOf(url) {
  try {
    return new URL(url, typeof location !== 'undefined' ? location.origin : 'http://localhost').origin;
  } catch {
    return null;
  }
}

function safeStringifyUrl(input) {
  if (typeof input === 'string') return input;
  if (input && typeof input === 'object') {
    if (typeof input.url === 'string') return input.url;
    try { return String(input); } catch { return null; }
  }
  return null;
}

function mountFetchWrap(buffer, excludes) {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return () => {};
  const orig = window.fetch;
  const patched = async function patchedFetch(input, init) {
    const url = safeStringifyUrl(input) || '';
    const method = (init && init.method) || (input && input.method) || 'GET';
    const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());

    if (isExcluded(url, excludes)) {
      return orig.call(window, input, init);
    }

    try {
      const res = await orig.call(window, input, init);
      const duration = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start);
      buffer.push({
        type: 'fetch',
        method: String(method).toUpperCase(),
        url,
        origin: originOf(url),
        status: res?.status ?? null,
        ok: res?.ok ?? null,
        duration,
        ts: Date.now(),
      });
      return res;
    } catch (err) {
      const duration = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start);
      buffer.push({
        type: 'fetch',
        method: String(method).toUpperCase(),
        url,
        origin: originOf(url),
        status: null,
        ok: false,
        duration,
        error: err && err.message ? String(err.message) : 'network-error',
        ts: Date.now(),
      });
      throw err;
    }
  };
  patched.__feedbackOriginalFetch = orig;
  window.fetch = patched;
  return () => {
    if (window.fetch === patched) window.fetch = orig;
  };
}

function mountXhrWrap(buffer, excludes) {
  if (typeof XMLHttpRequest === 'undefined') return () => {};
  const proto = XMLHttpRequest.prototype;
  const origOpen = proto.open;
  const origSend = proto.send;

  proto.open = function patchedOpen(method, url) {
    this.__fb_method = method;
    this.__fb_url = url;
    this.__fb_excluded = isExcluded(url, excludes);
    return origOpen.apply(this, arguments);
  };

  proto.send = function patchedSend() {
    if (this.__fb_excluded) return origSend.apply(this, arguments);
    const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const finish = () => {
      const duration = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start);
      buffer.push({
        type: 'xhr',
        method: String(this.__fb_method || 'GET').toUpperCase(),
        url: this.__fb_url || '',
        origin: originOf(this.__fb_url || ''),
        status: this.status || null,
        ok: this.status >= 200 && this.status < 300,
        duration,
        ts: Date.now(),
      });
    };
    this.addEventListener('loadend', finish);
    this.addEventListener('error', () => {
      const duration = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start);
      buffer.push({
        type: 'xhr',
        method: String(this.__fb_method || 'GET').toUpperCase(),
        url: this.__fb_url || '',
        origin: originOf(this.__fb_url || ''),
        status: null,
        ok: false,
        duration,
        error: 'network-error',
        ts: Date.now(),
      });
    });
    return origSend.apply(this, arguments);
  };

  return () => {
    if (proto.open === proto.open) proto.open = origOpen;
    if (proto.send === proto.send) proto.send = origSend;
  };
}

export function mountNetworkObserver(buffer, opts = {}) {
  const excludes = Array.isArray(opts.excludePatterns) ? opts.excludePatterns : [];
  const unfetch = mountFetchWrap(buffer, excludes);
  const unxhr = mountXhrWrap(buffer, excludes);
  return () => { unfetch(); unxhr(); };
}
