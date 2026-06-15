import { useCallback, useEffect, useRef, useState } from 'react';

export const LS_KEY = 'react-feedback-data';

function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) localStorage.setItem(LS_KEY + '.bak', raw);
    localStorage.removeItem(LS_KEY);
    return [];
  }
}
function writeLocal(items) { localStorage.setItem(LS_KEY, JSON.stringify(items)); }

export function useFeedbackStore(opts) {
  const mode = opts?.mode || 'localStorage';
  const [items, setItems] = useState(() => mode === 'prop' ? (opts?.data || []) : (mode === 'localStorage' ? loadLocal() : []));
  const [isLoading, setLoading] = useState(mode === 'source');
  const [error, setError] = useState(null);
  const tickRef = useRef(0);

  useEffect(() => {
    if (mode === 'prop') setItems(opts?.data || []);
  }, [mode, opts?.data]);

  const load = useCallback(async () => {
    if (mode !== 'source' || !opts?.source?.load) return;
    const myTick = ++tickRef.current;
    setLoading(true); setError(null);
    try {
      const next = await opts.source.load();
      if (myTick !== tickRef.current) return;
      setItems(Array.isArray(next) ? next : []);
    } catch (e) {
      if (myTick === tickRef.current) setError(e);
    } finally {
      if (myTick === tickRef.current) setLoading(false);
    }
  }, [mode, opts?.source]);

  useEffect(() => {
    if (mode !== 'source') return;
    load();
    if (opts?.source?.subscribe) {
      return opts.source.subscribe((next) => {
        if (Array.isArray(next)) setItems(next);
      });
    }
  }, [mode, opts?.source, load]);

  const save = useCallback(async (item) => {
    if (mode === 'localStorage') {
      setItems((cur) => {
        const idx = cur.findIndex((x) => x.id === item.id);
        const next = idx >= 0 ? cur.map((x, i) => (i === idx ? item : x)) : [...cur, item];
        writeLocal(next);
        return next;
      });
      return;
    }
    if (mode === 'source' && opts?.source?.save) await opts.source.save(item);
  }, [mode, opts?.source]);

  const remove = useCallback(async (id) => {
    if (mode === 'localStorage') {
      setItems((cur) => {
        const next = cur.filter((x) => x.id !== id);
        writeLocal(next);
        return next;
      });
      return;
    }
    if (mode === 'source' && opts?.source?.remove) await opts.source.remove(id);
  }, [mode, opts?.source]);

  const refresh = useCallback(() => load(), [load]);

  return { items, isLoading, error, save, remove, refresh };
}
