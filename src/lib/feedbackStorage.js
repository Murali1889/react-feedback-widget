/**
 * localStorage + IndexedDB helpers for feedback persistence.
 *
 * Extracted from the (deleted) legacy dashboard. saveFeedbackToLocalStorage
 * round-trips feedback through localStorage, persisting videos larger
 * than the localStorage size limit into IndexedDB and storing only a
 * reference in localStorage.
 */

export const FEEDBACK_STORAGE_KEY = 'react-feedback-data';
const VIDEO_DB_NAME = 'FeedbackVideoDB';
const VIDEO_STORE_NAME = 'videos';
const MAX_VIDEO_SIZE_MB = 500;
const MAX_HISTORY = 50;

function openVideoDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB not available')); return; }
    const request = indexedDB.open(VIDEO_DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(VIDEO_STORE_NAME)) {
        db.createObjectStore(VIDEO_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function saveVideoToIndexedDB(id, videoBlob) {
  try {
    const db = await openVideoDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([VIDEO_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(VIDEO_STORE_NAME);
      const request = store.put({ id, blob: videoBlob, timestamp: Date.now() });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => db.close();
    });
  } catch {
    return false;
  }
}

export async function saveFeedbackToLocalStorage(feedbackData) {
  try {
    const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    const existing = stored ? JSON.parse(stored) : [];
    const feedbackId = Date.now().toString();
    const processedData = { ...feedbackData };

    if (feedbackData.videoBlob && feedbackData.videoBlob instanceof Blob) {
      const sizeMB = feedbackData.videoBlob.size / (1024 * 1024);
      if (sizeMB <= MAX_VIDEO_SIZE_MB) {
        const saved = await saveVideoToIndexedDB(feedbackId, feedbackData.videoBlob);
        if (saved) {
          processedData.videoRef = feedbackId;
          processedData.videoSize = feedbackData.videoBlob.size;
          processedData.videoType = feedbackData.videoBlob.type;
        }
      }
      delete processedData.videoBlob;
      delete processedData.video;
    }

    const newFeedback = {
      id: feedbackId,
      ...processedData,
      status: 'new',
      timestamp: new Date().toISOString(),
    };

    localStorage.setItem(
      FEEDBACK_STORAGE_KEY,
      JSON.stringify([newFeedback, ...existing].slice(0, MAX_HISTORY))
    );
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('feedback-data-updated'));
    }
    return { success: true, data: newFeedback };
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
}

export const DEFAULT_STATUSES = {
  new:         { key: 'new',         label: 'New',          color: '#8b5cf6', bgColor: '#ede9fe', textColor: '#6d28d9', icon: 'Inbox' },
  open:        { key: 'open',        label: 'Open',         color: '#f59e0b', bgColor: '#fef3c7', textColor: '#92400e', icon: 'AlertCircle' },
  inProgress:  { key: 'inProgress',  label: 'In Progress',  color: '#3b82f6', bgColor: '#dbeafe', textColor: '#1e40af', icon: 'Play' },
  underReview: { key: 'underReview', label: 'Under Review', color: '#06b6d4', bgColor: '#cffafe', textColor: '#0e7490', icon: 'Eye' },
  resolved:    { key: 'resolved',    label: 'Resolved',     color: '#10b981', bgColor: '#d1fae5', textColor: '#065f46', icon: 'CheckCircle' },
  closed:      { key: 'closed',      label: 'Closed',       color: '#64748b', bgColor: '#e2e8f0', textColor: '#334155', icon: 'Archive' },
};
