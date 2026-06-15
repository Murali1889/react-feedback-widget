function fromErrorEvent(e) {
  return {
    type: 'error',
    source: 'window',
    message: e?.message || String(e?.error || ''),
    name: e?.error?.name || 'Error',
    stack: e?.error?.stack || null,
    fileName: e?.filename || null,
    lineNumber: e?.lineno || null,
    columnNumber: e?.colno || null,
    ts: Date.now(),
  };
}

function fromRejection(e) {
  const reason = e?.reason;
  return {
    type: 'error',
    source: 'unhandledrejection',
    message: reason?.message || String(reason),
    name: reason?.name || 'UnhandledRejection',
    stack: reason?.stack || null,
    ts: Date.now(),
  };
}

export function mountErrorObserver(buffer) {
  if (typeof window === 'undefined') return () => {};
  const onErr = (e) => { try { buffer.push(fromErrorEvent(e)); } catch {} };
  const onRej = (e) => { try { buffer.push(fromRejection(e)); } catch {} };
  window.addEventListener('error', onErr, true);
  window.addEventListener('unhandledrejection', onRej, true);
  return () => {
    window.removeEventListener('error', onErr, true);
    window.removeEventListener('unhandledrejection', onRej, true);
  };
}
