const DB_NAME = 'feedback-capture';
const STORE = 'sourcemap-cache';
const VERSION = 1;

// Module-level memory fallback for environments without IndexedDB.
const mem = new Map();

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('no-idb'));
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet(key) {
  try {
    const db = await openDb();
    return new Promise((res) => {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(key);
      r.onsuccess = () => res(r.result === undefined ? null : r.result);
      r.onerror = () => res(null);
    });
  } catch {
    return mem.has(key) ? mem.get(key) : null;
  }
}

export async function idbSet(key, value) {
  try {
    const db = await openDb();
    return new Promise((res) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch {
    mem.set(key, value);
  }
}

export async function idbClear() {
  mem.clear();
  try {
    const db = await openDb();
    return new Promise((res) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch {}
}
