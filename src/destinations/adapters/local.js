import { timed, ok, fail } from '../contract.js';

/**
 * local() — stash feedback in localStorage (never leaves the browser).
 *
 * Default destination. Always safe. Picks up the existing
 * saveFeedbackToLocalStorage path.
 */
export function local({ namespace = 'feedback-store' } = {}) {
  return {
    name: 'local',
    mode: 'local',
    describe: () => 'browser storage',
    send: (feedback) => timed(async () => {
      if (typeof localStorage === 'undefined') {
        throw new Error('localStorage is not available in this environment');
      }
      const raw = localStorage.getItem(namespace);
      const list = raw ? JSON.parse(raw) : [];
      const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      list.unshift({ ...feedback, id, savedAt: new Date().toISOString() });
      localStorage.setItem(namespace, JSON.stringify(list.slice(0, 500)));
      return { id, url: null };
    }),
  };
}
