/**
 * Pure redaction helpers and config resolution.
 * Isomorphic: usable in browser and Node.
 * Auth helpers (getFeedbackAuthHeaders, etc.) are added in Task 5.
 */

export const DEFAULT_REDACTION = Object.freeze({
  preset: 'default',
  redactHeaders: [
    'authorization', 'cookie', 'set-cookie', 'proxy-authorization',
    'x-api-key', 'x-auth-token', 'api-key', 'token', 'secret',
  ],
  redactHeaderPrefixes: ['x-amz-security-', 'x-goog-', 'x-firebase-'],
  redactQueryParams: [
    'password', 'passcode', 'pin', 'token', 'secret', 'apikey',
    'api_key', 'authorization', 'refresh_token', 'access_token', 'id_token',
    'session', 'cookie', 'otp', 'ssn', 'credit_card', 'cvv', 'card_number',
  ],
  redactBodyKeys: [
    'password', 'passcode', 'pin', 'token', 'secret', 'apikey', 'apiKey',
    'api_key', 'authorization', 'refresh_token', 'access_token', 'id_token',
    'session', 'cookie', 'otp', 'ssn', 'credit_card', 'cvv', 'card_number',
  ],
  maxBodyLength: 0,
  maxLogMessageLength: 2000,
  allowRequestBodies: false,
  allowResponseBodies: false,
  stripUrlQuery: false,
  dropStorageValues: false,
  dropIndexedDbEvents: false,
});

const STRICT_OVERRIDES = Object.freeze({
  preset: 'strict',
  stripUrlQuery: true,
  dropStorageValues: true,
  dropIndexedDbEvents: true,
});

const OFF_PROFILE = Object.freeze({
  preset: 'off',
  redactHeaders: [],
  redactHeaderPrefixes: [],
  redactQueryParams: [],
  redactBodyKeys: [],
  maxBodyLength: Infinity,
  maxLogMessageLength: Infinity,
  allowRequestBodies: true,
  allowResponseBodies: true,
  stripUrlQuery: false,
  dropStorageValues: false,
  dropIndexedDbEvents: false,
});

export function resolveRedactionConfig(input) {
  if (input === 'off') return { ...OFF_PROFILE };
  if (input === 'strict') {
    return { ...DEFAULT_REDACTION, ...STRICT_OVERRIDES };
  }
  if (input === 'default' || input === undefined || input === null) {
    return { ...DEFAULT_REDACTION };
  }
  if (typeof input === 'object') {
    const base = input.preset === 'strict'
      ? { ...DEFAULT_REDACTION, ...STRICT_OVERRIDES }
      : { ...DEFAULT_REDACTION };
    return {
      ...base,
      ...input,
      redactHeaders: [...new Set([...(base.redactHeaders || []), ...(input.redactHeaders || [])])],
      redactHeaderPrefixes: [...new Set([...(base.redactHeaderPrefixes || []), ...(input.redactHeaderPrefixes || [])])],
      redactQueryParams: [...new Set([...(base.redactQueryParams || []), ...(input.redactQueryParams || [])])],
      redactBodyKeys: [...new Set([...(base.redactBodyKeys || []), ...(input.redactBodyKeys || [])])],
    };
  }
  return { ...DEFAULT_REDACTION };
}

function matchHeader(name, cfg) {
  const low = name.toLowerCase();
  if (cfg.redactHeaders.some((h) => h.toLowerCase() === low)) return true;
  if (cfg.redactHeaderPrefixes.some((p) => low.startsWith(p))) return true;
  return false;
}

function redactHeaders(headers, cfg) {
  if (!headers || typeof headers !== 'object') return headers;
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = matchHeader(k, cfg) ? '<redacted>' : v;
  }
  return out;
}

function redactObjectByKeys(value, sensitiveKeys, depth = 0) {
  if (depth > 12) return value;
  if (Array.isArray(value)) return value.map((v) => redactObjectByKeys(v, sensitiveKeys, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (sensitiveKeys.some((s) => s.toLowerCase() === k.toLowerCase())) {
        out[k] = '<redacted>';
      } else {
        out[k] = redactObjectByKeys(v, sensitiveKeys, depth + 1);
      }
    }
    return out;
  }
  return value;
}

function redactBodyString(body, cfg) {
  if (typeof body !== 'string') return body;
  try {
    const parsed = JSON.parse(body);
    return JSON.stringify(redactObjectByKeys(parsed, cfg.redactBodyKeys));
  } catch {
    return redactInlineSecrets(body, cfg);
  }
}

const INLINE_SECRET_RE = /((?:password|token|secret|api[-_]?key|authorization)\s*[:=]\s*)("?[^"\s,;]+"?)/gi;

function redactInlineSecrets(text /*, cfg */) {
  if (typeof text !== 'string') return text;
  return text.replace(INLINE_SECRET_RE, (_m, prefix) => `${prefix}<redacted>`);
}

function redactUrl(url, cfg) {
  if (typeof url !== 'string') return url;
  try {
    const u = new URL(url);
    if (cfg.stripUrlQuery) {
      u.search = '';
      return u.toString();
    }
    if (u.searchParams) {
      const replacements = [];
      for (const [k] of u.searchParams) {
        if (cfg.redactQueryParams.some((p) => p.toLowerCase() === k.toLowerCase())) {
          replacements.push(k);
        }
      }
      for (const k of replacements) u.searchParams.set(k, '<redacted>');
    }
    return u.toString();
  } catch {
    return url;
  }
}

export function redactNetworkEvent(event, cfg) {
  if (!event || event.type !== 'network') return event;
  const out = { ...event };
  if (out.url) out.url = redactUrl(out.url, cfg);
  if (out.headers) out.headers = redactHeaders(out.headers, cfg);
  if (out.request) {
    out.request = { ...out.request };
    if (out.request.headers) out.request.headers = redactHeaders(out.request.headers, cfg);
    if (!cfg.allowRequestBodies) {
      delete out.request.body;
      out.bodyRedacted = 'dropped-by-default';
    } else if (out.request.body !== undefined) {
      out.request.body = redactBodyString(out.request.body, cfg);
      if (typeof out.request.body === 'string' && cfg.maxBodyLength && cfg.maxBodyLength !== Infinity && out.request.body.length > cfg.maxBodyLength) {
        out.request.body = out.request.body.slice(0, cfg.maxBodyLength) + '...<truncated>';
      }
    }
  }
  if (out.response) {
    out.response = { ...out.response };
    if (out.response.headers) out.response.headers = redactHeaders(out.response.headers, cfg);
    if (!cfg.allowResponseBodies) {
      delete out.response.body;
      out.bodyRedacted = 'dropped-by-default';
    } else if (out.response.body !== undefined) {
      out.response.body = redactBodyString(out.response.body, cfg);
      if (typeof out.response.body === 'string' && cfg.maxBodyLength && cfg.maxBodyLength !== Infinity && out.response.body.length > cfg.maxBodyLength) {
        out.response.body = out.response.body.slice(0, cfg.maxBodyLength) + '...<truncated>';
      }
    }
  }
  return out;
}

export function redactConsoleEvent(event, cfg) {
  if (!event || event.type !== 'console') return event;
  const out = { ...event };
  if (typeof out.message === 'string') {
    let msg = out.message;
    if (cfg.maxLogMessageLength && cfg.maxLogMessageLength !== Infinity && msg.length > cfg.maxLogMessageLength) {
      msg = msg.slice(0, cfg.maxLogMessageLength) + ' ...<truncated>';
    }
    msg = redactInlineSecrets(msg, cfg);
    out.message = msg;
  }
  return out;
}

export function redactStorageEvent(event, cfg) {
  if (!event || (event.type !== 'storage' && event.type !== 'indexedDB')) return event;
  if (event.type === 'indexedDB' && cfg.dropIndexedDbEvents) {
    return { type: 'indexedDB-summary', action: event.action, dbName: event.dbName };
  }
  const out = { ...event };
  if (event.type === 'storage') {
    if (typeof out.value === 'string') {
      if (cfg.dropStorageValues) {
        out.value = '<dropped: storage value>';
      } else if (cfg.redactBodyKeys.some((k) => k.toLowerCase() === String(out.key || '').toLowerCase())) {
        out.value = '<redacted>';
      } else if (out.value.length > 200) {
        out.value = out.value.slice(0, 200) + '...<truncated>';
      }
    }
  } else if (event.type === 'indexedDB') {
    if (out.data) out.data = '<dropped: indexeddb value>';
  }
  return out;
}

export function redactHandoffText(text, cfg) {
  return redactInlineSecrets(String(text || ''), cfg);
}

export function redactFeedbackEvidence(item, cfg) {
  const appliedRules = new Set();
  const out = { ...item };

  if (Array.isArray(out.eventLogs)) {
    out.eventLogs = out.eventLogs.map((e) => {
      if (!e || typeof e !== 'object') return e;
      switch (e.type) {
        case 'network': {
          appliedRules.add('headers');
          if (!cfg.allowRequestBodies || !cfg.allowResponseBodies) appliedRules.add('bodies');
          if (cfg.stripUrlQuery || (cfg.redactQueryParams && cfg.redactQueryParams.length)) appliedRules.add('urls');
          return redactNetworkEvent(e, cfg);
        }
        case 'console':
          appliedRules.add('console');
          return redactConsoleEvent(e, cfg);
        case 'storage':
          appliedRules.add('storage');
          return redactStorageEvent(e, cfg);
        case 'indexedDB':
          appliedRules.add('idb');
          return redactStorageEvent(e, cfg);
        default:
          return e;
      }
    }).filter(Boolean);
  }

  if (out.url) out.url = redactUrl(out.url, cfg);

  return { data: out, appliedRules: [...appliedRules] };
}

// =============================================================
// Auth helpers
// =============================================================

export async function resolveCsrfToken(authConfig) {
  if (!authConfig) return null;
  const t = authConfig.csrfToken;
  if (typeof t === 'function') {
    const v = await t();
    return typeof v === 'string' && v ? v : null;
  }
  if (typeof t === 'string' && t) return t;
  // Browser-only discovery: cookie + meta tag
  if (typeof document !== 'undefined') {
    const cookie = document.cookie || '';
    const m = cookie.match(/(?:^|;\s*)(?:csrf-token|XSRF-TOKEN)=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
    const meta = document.querySelector?.('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute('content');
  }
  return null;
}

export async function getFeedbackAuthHeaders(authConfig) {
  if (!authConfig || authConfig.mode === 'none') return {};

  const headers = {};

  if (authConfig.mode === 'bearer' || authConfig.mode === 'signed') {
    if (typeof authConfig.getToken === 'function') {
      const tok = await authConfig.getToken();
      if (typeof tok === 'string' && tok) {
        headers.Authorization = `Bearer ${tok}`;
      }
    }
  }

  if (authConfig.mode === 'session') {
    const csrf = await resolveCsrfToken(authConfig);
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  if (typeof authConfig.getHeaders === 'function') {
    const extra = await authConfig.getHeaders();
    if (extra && typeof extra === 'object') {
      Object.assign(headers, extra);
    }
  }

  return headers;
}

const INSECURE_MODES = new Set([
  'jira-automation', 'jiraAutomation',
  'appsScript', 'apps-script',
  'zapier',
]);

export function isInsecureWebhookMode(type) {
  if (typeof type !== 'string') return false;
  return INSECURE_MODES.has(type);
}

export function getDestinationPolicy(authContext, destination) {
  // Hook point. By default, allow all destinations. Hosts override via authorize.
  return { allowed: true, destination, reason: null };
}

export function getSubmissionState(item) {
  if (!item) return 'idle';
  const local = item.integrationState?.local?.status;
  const jira = item.integrationState?.jira?.status;
  const sheets = item.integrationState?.sheets?.status;
  if ([jira, sheets].includes('pending') || local === 'pending') return 'submitting';
  if ([jira, sheets, local].includes('error')) {
    if ([jira, sheets].some((s) => s === 'created' || s === 'synced' || s === 'appended')) {
      return 'partial';
    }
    return 'failed';
  }
  if (jira === 'created' || jira === 'synced' || sheets === 'appended' || sheets === 'synced' || local === 'saved') {
    return 'submitted';
  }
  return 'idle';
}

export function getAuthState({ auth, lastError } = {}) {
  if (!auth || auth.mode === 'none') return 'anonymous';
  if (lastError?.code === 'unauthorized') return 'token_expired';
  if (lastError?.code === 'forbidden') return 'unauthenticated';
  if (!auth.mode) return 'misconfigured';
  return 'authenticated';
}
