/**
 * Environment + Web Vitals snapshot.
 *
 * Two parts:
 *
 * 1. `mountWebVitalsObserver(buffer)` — installed on CaptureProvider
 *    mount. Subscribes to PerformanceObserver for LCP, CLS, INP, FCP
 *    and pushes the LATEST value of each into the ring buffer.
 *    Also pushes recent long-tasks (>50ms) which often explain
 *    "the page froze when I clicked".
 *
 * 2. `snapshotEnvironment()` — synchronous point-in-time read of
 *    everything we can know at submit time without async work:
 *    color scheme, reduced motion, locale, timezone, network
 *    connection, memory, storage quota, service worker state,
 *    document visibility. Returns a flat object the AI ticket
 *    assembler embeds under environment.runtime.
 *
 * This is the "what was the browser doing right then" data the
 * competitor's payload doesn't carry.
 */

/* ─────────────── 1. PerformanceObserver-driven vitals ─────────────── */

const VITAL_KEYS = ['LCP', 'CLS', 'INP', 'FCP'];

function tryObserve(type, cb) {
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) cb(entry);
    });
    po.observe({ type, buffered: true });
    return () => { try { po.disconnect(); } catch {} };
  } catch {
    return () => {};
  }
}

export function mountWebVitalsObserver(buffer) {
  if (typeof PerformanceObserver === 'undefined' || typeof window === 'undefined') {
    return () => {};
  }

  const latest = {};
  const pushVital = (key, value, extra = {}) => {
    latest[key] = value;
    buffer.push({ type: 'vital', key, value, ...extra, ts: Date.now() });
  };

  const uLCP = tryObserve('largest-contentful-paint', (e) => {
    pushVital('LCP', Math.round(e.renderTime || e.loadTime || e.startTime), {
      element: e.element?.tagName?.toLowerCase?.() || null,
    });
  });

  let clsSum = 0;
  const uCLS = tryObserve('layout-shift', (e) => {
    if (!e.hadRecentInput) {
      clsSum += e.value;
      pushVital('CLS', Math.round(clsSum * 1000) / 1000);
    }
  });

  const uINP = tryObserve('event', (e) => {
    if (e.interactionId && e.duration > 16) {
      const cur = latest.INP || 0;
      if (e.duration > cur) pushVital('INP', Math.round(e.duration), { name: e.name });
    }
  });

  const uFCP = tryObserve('paint', (e) => {
    if (e.name === 'first-contentful-paint') pushVital('FCP', Math.round(e.startTime));
  });

  const uLong = tryObserve('longtask', (e) => {
    if (e.duration > 50) {
      buffer.push({ type: 'longtask', duration: Math.round(e.duration), ts: Date.now() });
    }
  });

  return () => { uLCP(); uCLS(); uINP(); uFCP(); uLong(); };
}

/* ─────────────── 2. Point-in-time environment snapshot ─────────────── */

function safeGet(fn, fallback = null) {
  try { return fn(); } catch { return fallback; }
}

export function snapshotEnvironment() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return {};

  const mq = (q) => safeGet(() => window.matchMedia(q).matches, null);
  const conn = safeGet(() => navigator.connection || navigator.mozConnection || navigator.webkitConnection, null);
  const mem = safeGet(() => performance.memory, null);

  return {
    a11y: {
      colorScheme:      mq('(prefers-color-scheme: dark)') ? 'dark' : 'light',
      reducedMotion:    mq('(prefers-reduced-motion: reduce)'),
      reducedData:      mq('(prefers-reduced-data: reduce)'),
      forcedColors:     mq('(forced-colors: active)'),
      contrast:         mq('(prefers-contrast: more)') ? 'more'
                       : mq('(prefers-contrast: less)') ? 'less' : 'normal',
      pointerCoarse:    mq('(pointer: coarse)'),
      hoverCapable:     mq('(hover: hover)'),
    },
    locale: {
      language:  safeGet(() => navigator.language, null),
      languages: safeGet(() => Array.from(navigator.languages || []), null),
      timezone:  safeGet(() => Intl.DateTimeFormat().resolvedOptions().timeZone, null),
    },
    network: conn ? {
      effectiveType: conn.effectiveType || null,
      downlinkMbps:  conn.downlink || null,
      rttMs:         conn.rtt || null,
      saveData:      !!conn.saveData,
    } : null,
    memory: mem ? {
      usedHeapMb:  Math.round(mem.usedJSHeapSize / 1024 / 1024),
      totalHeapMb: Math.round(mem.totalJSHeapSize / 1024 / 1024),
      limitHeapMb: Math.round(mem.jsHeapSizeLimit / 1024 / 1024),
    } : null,
    document: {
      visibility:    safeGet(() => document.visibilityState, null),
      hasFocus:      safeGet(() => document.hasFocus(), null),
      referrer:      safeGet(() => document.referrer || null, null),
      readyState:    safeGet(() => document.readyState, null),
    },
    sw: safeGet(() => navigator.serviceWorker ? {
      controllerActive: !!navigator.serviceWorker.controller,
    } : null, null),
    online: safeGet(() => navigator.onLine, null),
    devicePixelRatio: safeGet(() => window.devicePixelRatio, null),
    platform: safeGet(() => navigator.platform || navigator.userAgentData?.platform || null, null),
    cookieEnabled: safeGet(() => navigator.cookieEnabled, null),
  };
}

/* ─────────────── 3. Recent DOM mutations buffer ─────────────── */

/**
 * mountDomMutationObserver(buffer, { cap }) — pushes a compact record of
 * recent DOM additions/removals/attribute changes. Helps explain
 * "the button suddenly disappeared" reports.
 *
 * Skips Text nodes, our own .feedback-* overlays, and noise-y
 * patterns (style, class attribute on body).
 */
export function mountDomMutationObserver(buffer, opts = {}) {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return () => {};
  const sampleSel = (el) => {
    if (!el || el.nodeType !== 1) return null;
    if (el.classList?.contains?.('feedback-overlay')) return null;
    if (el.classList?.contains?.('feedback-highlight')) return null;
    if (el.classList?.contains?.('feedback-tooltip')) return null;
    if (el.id) return `#${el.id}`;
    const cls = (el.className && typeof el.className === 'string')
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
      : '';
    return `${el.tagName.toLowerCase()}${cls}`.slice(0, 80);
  };

  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      const target = sampleSel(m.target);
      if (!target) continue;
      if (m.type === 'childList') {
        if (m.addedNodes.length) {
          buffer.push({ type: 'dom-mutation', kind: 'added', target, count: m.addedNodes.length, ts: Date.now() });
        }
        if (m.removedNodes.length) {
          buffer.push({ type: 'dom-mutation', kind: 'removed', target, count: m.removedNodes.length, ts: Date.now() });
        }
      } else if (m.type === 'attributes') {
        if (m.attributeName === 'style' || m.attributeName === 'class') continue;
        buffer.push({
          type: 'dom-mutation', kind: 'attr',
          target, attr: m.attributeName, ts: Date.now(),
        });
      }
    }
  });
  obs.observe(document.documentElement, {
    childList: true, subtree: true, attributes: true,
    attributeOldValue: false, attributeFilter: undefined,
  });

  return () => { try { obs.disconnect(); } catch {} };
}

/* ─────────────── 4. Async snapshot for storage quota ─────────────── */

export async function snapshotStorageQuota() {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
    const est = await navigator.storage.estimate();
    return {
      usageMb: est.usage ? Math.round(est.usage / 1024 / 1024) : null,
      quotaMb: est.quota ? Math.round(est.quota / 1024 / 1024) : null,
    };
  } catch {
    return null;
  }
}
