export function mountRouteObserver(buffer) {
  if (typeof window === 'undefined') return () => {};
  const origPush = window.history.pushState;
  const origReplace = window.history.replaceState;
  let prev = window.location.pathname + window.location.search + window.location.hash;

  function record(to) {
    buffer.push({ type: 'route', from: prev, to, ts: Date.now() });
    prev = to;
  }

  window.history.pushState = function pushState(...args) {
    const r = origPush.apply(this, args);
    record(window.location.pathname + window.location.search + window.location.hash);
    return r;
  };
  window.history.replaceState = function replaceState(...args) {
    const r = origReplace.apply(this, args);
    record(window.location.pathname + window.location.search + window.location.hash);
    return r;
  };
  const onPop = () => record(window.location.pathname + window.location.search + window.location.hash);
  const onHash = () => record(window.location.pathname + window.location.search + window.location.hash);
  window.addEventListener('popstate', onPop);
  window.addEventListener('hashchange', onHash);

  return () => {
    window.history.pushState = origPush;
    window.history.replaceState = origReplace;
    window.removeEventListener('popstate', onPop);
    window.removeEventListener('hashchange', onHash);
  };
}
