import { useCallback, useEffect, useRef, useState } from 'react';

export const SECTION_LS_KEY = 'react-feedback-dashboard-section-state';

function loadState() {
  try {
    const raw = localStorage.getItem(SECTION_LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function useSectionState() {
  const [state, setState] = useState(loadState);
  const timer = useRef(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const persist = useCallback((next) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try { localStorage.setItem(SECTION_LS_KEY, JSON.stringify(next)); } catch {}
    }, 200);
  }, []);

  const isOpen = useCallback((id) => state[id] !== 'closed', [state]);
  const setOpen = useCallback((id, open) => setState((cur) => {
    const next = { ...cur, [id]: open ? 'open' : 'closed' };
    persist(next);
    return next;
  }), [persist]);
  const toggle = useCallback((id) => setOpen(id, !(isOpen(id))), [isOpen, setOpen]);

  return { isOpen, toggle, setOpen };
}
