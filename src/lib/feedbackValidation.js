/**
 * Pure validation for client-submitted feedback.
 * Returns { ok:true, data } or { ok:false, errors }.
 * Server-write-only fields are silently stripped, not rejected.
 * Error messages never echo submitted values (avoid reflective leakage).
 */

const TYPES = ['bug', 'feature', 'improvement', 'idea', 'praise', 'question', 'ui-change', 'other'];
const SEVERITIES = ['low', 'medium', 'high', 'critical', 'P0', 'P1', 'P2', 'P3'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;

const CAPS = {
  feedback: 5000,
  userName: 120,
  userEmail: 320,
  url: 2048,
  ownerName: 120,
  customerValueString: 40,
  selector: 1024,
  sourceFile: 1024,
  componentStack: 50,
  eventLogs: 5000,
};

function strOrNull(v) {
  return typeof v === 'string' ? v : null;
}

function clampNumber(n, lo, hi) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return Math.max(lo, Math.min(hi, n));
}

export function validateFeedbackSubmission(input, { authContext } = {}) {
  const errors = {};
  const data = {};

  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { _: 'invalid_payload' } };
  }

  // feedback (required)
  const feedback = typeof input.feedback === 'string' ? input.feedback.trim() : '';
  if (!feedback) {
    errors.feedback = 'required';
  } else if (feedback.length > CAPS.feedback) {
    errors.feedback = 'length_exceeded';
  } else {
    data.feedback = feedback;
  }

  // type (default 'bug' if missing; coerce unknown to 'other')
  if (input.type === undefined) {
    data.type = 'bug';
  } else if (typeof input.type !== 'string') {
    errors.type = 'invalid';
  } else {
    data.type = TYPES.includes(input.type) ? input.type : 'other';
  }

  // severity (default 'medium')
  if (input.severity === undefined) {
    data.severity = 'medium';
  } else if (typeof input.severity !== 'string' || !SEVERITIES.includes(input.severity)) {
    errors.severity = 'invalid';
  } else {
    data.severity = input.severity;
  }

  // owner
  if (input.owner !== undefined) {
    if (!input.owner || typeof input.owner !== 'object') {
      errors.owner = 'invalid';
    } else {
      const o = {};
      if (typeof input.owner.name !== 'string' || !input.owner.name.trim()) {
        errors['owner.name'] = 'required';
      } else if (input.owner.name.length > CAPS.ownerName) {
        errors['owner.name'] = 'length_exceeded';
      } else {
        o.name = input.owner.name.trim();
      }
      if (input.owner.id !== undefined) {
        if (typeof input.owner.id !== 'string' || !SAFE_ID_RE.test(input.owner.id)) {
          errors['owner.id'] = 'invalid';
        } else {
          o.id = input.owner.id;
        }
      }
      if (input.owner.email !== undefined) {
        if (typeof input.owner.email !== 'string' || !EMAIL_RE.test(input.owner.email)) {
          errors['owner.email'] = 'invalid';
        } else {
          o.email = input.owner.email;
        }
      }
      if (input.owner.avatar !== undefined) {
        if (typeof input.owner.avatar !== 'string' || !input.owner.avatar.startsWith('https://')) {
          errors['owner.avatar'] = 'must_be_https';
        } else {
          o.avatar = input.owner.avatar;
        }
      }
      if (Object.keys(o).length > 0 && !errors['owner.name']) data.owner = o;
    }
  }

  // customerValue
  if (input.customerValue !== undefined) {
    if (typeof input.customerValue === 'number') {
      data.customerValue = clampNumber(input.customerValue, 0, 1e9);
    } else if (typeof input.customerValue === 'string') {
      if (input.customerValue.length > CAPS.customerValueString) {
        errors.customerValue = 'length_exceeded';
      } else {
        data.customerValue = input.customerValue;
      }
    } else {
      errors.customerValue = 'invalid';
    }
  }

  for (const [key, cap] of [
    ['userName', CAPS.userName],
    ['userEmail', CAPS.userEmail],
    ['url', CAPS.url],
  ]) {
    const v = strOrNull(input[key]);
    if (v === null) continue;
    if (v.length > cap) errors[key] = 'length_exceeded';
    else data[key] = v;
  }

  if (input.elementInfo && typeof input.elementInfo === 'object') {
    const ei = {};
    const selector = strOrNull(input.elementInfo.selector);
    if (selector !== null) {
      if (selector.length > CAPS.selector) errors['elementInfo.selector'] = 'length_exceeded';
      else ei.selector = selector;
    }
    const sourceFile = strOrNull(input.elementInfo.sourceFile);
    if (sourceFile !== null) {
      if (sourceFile.length > CAPS.sourceFile) errors['elementInfo.sourceFile'] = 'length_exceeded';
      else ei.sourceFile = sourceFile;
    }
    if (Array.isArray(input.elementInfo.componentStack)) {
      ei.componentStack = input.elementInfo.componentStack
        .filter((x) => typeof x === 'string')
        .slice(0, CAPS.componentStack);
    }
    if (Object.keys(ei).length > 0) data.elementInfo = ei;
  }

  if (Array.isArray(input.eventLogs)) {
    data.eventLogs = input.eventLogs
      .filter((e) => e && typeof e === 'object' && typeof e.type === 'string')
      .slice(0, CAPS.eventLogs);
  }

  if (input.integrationState && typeof input.integrationState === 'object') {
    const allowedClientStatus = new Set(['not_sent']);
    const is = {};
    for (const provider of ['local', 'jira', 'sheets']) {
      const p = input.integrationState[provider];
      if (!p || typeof p !== 'object') continue;
      const out = {};
      if (allowedClientStatus.has(p.status)) out.status = p.status;
      if (Object.keys(out).length > 0) is[provider] = out;
    }
    if (Object.keys(is).length > 0) data.integrationState = is;
  }

  // statusHistory and securityContext silently stripped (server-write-only).

  for (const key of ['screenshot', 'video', 'videoBlob', 'timestamp', 'id', 'status', 'viewport']) {
    if (input[key] !== undefined) data[key] = input[key];
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data };
}
