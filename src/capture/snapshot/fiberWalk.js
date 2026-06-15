/**
 * Walk a React fiber up the parent chain, producing a depth-capped,
 * cycle-safe, serializable snapshot of each level's props and state.
 * Designed to take < 2ms p99 for trees up to 6 deep / 64 keys.
 */
const DEFAULT_OPTS = { depth: 6, maxKeys: 64, maxStr: 2000 };

function placeholder(v) {
  if (typeof v === 'function') return `[Function: ${v.name || 'anonymous'}]`;
  if (typeof window !== 'undefined' && v instanceof Element) {
    return `[DOMNode: ${v.tagName.toLowerCase()}${v.id ? '#' + v.id : ''}]`;
  }
  if (v && typeof v === 'object' && v.$$typeof) {
    const typeName = v.type?.displayName || v.type?.name || (typeof v.type === 'string' ? v.type : 'Element');
    return `[ReactElement: ${typeName}]`;
  }
  return undefined;
}

function serializable(value, opts, seen = new WeakSet(), depth = 0) {
  if (value === null || value === undefined) return value;
  const t = typeof value;
  if (t === 'number' || t === 'boolean') return value;
  if (t === 'string') {
    return value.length > opts.maxStr
      ? value.slice(0, opts.maxStr) + `... (${value.length - opts.maxStr} more chars)`
      : value;
  }
  const ph = placeholder(value);
  if (ph !== undefined) return ph;
  if (t !== 'object') return String(value);
  if (depth > 6) return '[MaxDepth]';
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) {
    const limit = Math.min(value.length, opts.maxKeys);
    const out = [];
    for (let i = 0; i < limit; i += 1) out.push(serializable(value[i], opts, seen, depth + 1));
    if (value.length > limit) out.push(`... (${value.length - limit} more items)`);
    return out;
  }
  const out = {};
  const keys = Object.keys(value);
  const limit = Math.min(keys.length, opts.maxKeys);
  for (let i = 0; i < limit; i += 1) {
    const k = keys[i];
    out[k] = serializable(value[k], opts, seen, depth + 1);
  }
  if (keys.length > limit) out[`... (${keys.length - limit} more keys)`] = true;
  return out;
}

function nameOf(fiber) {
  const t = fiber?.type;
  if (!t) return 'Unknown';
  if (typeof t === 'string') return t;
  return t.displayName || t.name || (t.render?.displayName || t.render?.name) || 'Anonymous';
}

export function snapshotFiberTree(rootFiber, opts = {}) {
  const o = { ...DEFAULT_OPTS, ...opts };
  if (!rootFiber) return {};
  const out = {};
  let cur = rootFiber;
  let i = 0;
  while (cur && i < o.depth) {
    const name = nameOf(cur);
    out[name] = {
      props: cur.memoizedProps ? serializable(cur.memoizedProps, o) : {},
      state: cur.memoizedState ? serializable(cur.memoizedState, o) : null,
    };
    cur = cur.return;
    i += 1;
  }
  return out;
}
