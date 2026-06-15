import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { initialFilters } from './filtering.js';

const Ctx = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'SELECT': return { ...state, selectedId: action.id };
    case 'SET_SEARCH': return { ...state, filters: { ...state.filters, search: action.value } };
    case 'TOGGLE_STATUS_FILTER': {
      const next = new Set(state.filters.statuses);
      next.has(action.value) ? next.delete(action.value) : next.add(action.value);
      return { ...state, filters: { ...state.filters, statuses: next } };
    }
    case 'TOGGLE_SEVERITY_FILTER': {
      const next = new Set(state.filters.severities);
      next.has(action.value) ? next.delete(action.value) : next.add(action.value);
      return { ...state, filters: { ...state.filters, severities: next } };
    }
    case 'TOGGLE_FLAG_FILTER': {
      const next = new Set(state.filters.flags);
      next.has(action.value) ? next.delete(action.value) : next.add(action.value);
      return { ...state, filters: { ...state.filters, flags: next } };
    }
    case 'CLEAR_FILTERS': return { ...state, filters: initialFilters() };
    default: return state;
  }
}

export function CommandCenterProvider({ children, defaultSelectedId = null }) {
  const [state, dispatch] = useReducer(reducer, { selectedId: defaultSelectedId, filters: initialFilters() });
  const value = useMemo(() => ({ ...state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCommandCenter() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCommandCenter must be used inside <CommandCenterProvider>');
  return ctx;
}

export function useSelection() {
  const { selectedId, dispatch } = useCommandCenter();
  const select = useCallback((id) => dispatch({ type: 'SELECT', id }), [dispatch]);
  return { selectedId, select };
}
