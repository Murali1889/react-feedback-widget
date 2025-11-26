// src/recorder.js

/**
 * A class to handle screen, audio, and browser event recording.
 * Captures: console, network (fetch/XHR), localStorage, sessionStorage, IndexedDB
 */
export class SessionRecorder {
  constructor() {
    this.stream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.events = [];
    this.status = 'idle'; // idle, recording, paused, stopped
    this.startTime = null;

    // Keep track of original methods
    this.originalConsole = {};
    this.originalFetch = null;
    this.originalXHROpen = null;
    this.originalXHRSend = null;
    this.originalXHRSetRequestHeader = null;
    this.originalStorageSetItem = null;
    this.originalStorageRemoveItem = null;
    this.originalStorageClear = null;
    this.originalIDBOpen = null;
  }

  /**
   * Returns a timestamp relative to the start of the recording.
   */
  _getTimestamp() {
    return Date.now() - this.startTime;
  }

  _safeStringify(obj, maxLength = 500) {
    try {
      const str = JSON.stringify(obj);
      return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    } catch {
      return String(obj);
    }
  }

  // ===================================================================
  // Console Interception
  // ===================================================================

  _patchConsole() {
    const levels = ['log', 'warn', 'error', 'info', 'debug'];
    levels.forEach(level => {
      this.originalConsole[level] = console[level];
      console[level] = (...args) => {
        this.events.push({
          type: 'console',
          level,
          message: args.map(arg => this._safeStringify(arg)).join(' '),
          timestamp: this._getTimestamp(),
        });
        this.originalConsole[level].apply(console, args);
      };
    });
  }

  _unpatchConsole() {
    for (const level in this.originalConsole) {
      console[level] = this.originalConsole[level];
    }
    this.originalConsole = {};
  }

  // ===================================================================
  // Network Interception (Fetch + XHR)
  // ===================================================================

  _patchFetch() {
    if (this.originalFetch) return; // Already patched
    this.originalFetch = window.fetch;
    const self = this;
    console.log('[Recorder] Patching fetch');

    window.fetch = async function(...args) {
      const [input, options] = args;
      const url = input instanceof Request ? input.url : input.toString();
      const method = options?.method || (input instanceof Request ? input.method : 'GET');
      console.log('[Recorder] Captured fetch:', method, url);

      let requestBody;
      let requestHeaders = options?.headers || {};

      if (input instanceof Request) {
        requestHeaders = Object.fromEntries(input.headers);
        try {
          requestBody = await input.clone().text();
        } catch (e) {
          // Body might be already read, a stream, or not cloneable.
          requestBody = '[Could not read or clone request body]';
        }
      } else if (options?.body) {
        requestBody = options.body;
      }

      const requestEvent = {
        type: 'network',
        source: 'fetch',
        method,
        url,
        timestamp: self._getTimestamp(),
        request: {
          headers: self._safeStringify(requestHeaders),
          body: self._safeStringify(requestBody),
        }
      };
      self.events.push(requestEvent);

      try {
        const startTime = self._getTimestamp();
        const response = await self.originalFetch.apply(window, args);
        const endTime = self._getTimestamp();

        requestEvent.status = response.status;
        requestEvent.statusText = response.statusText;
        requestEvent.duration = endTime - startTime;

        const responseClone = response.clone();
        let responseBody;
        try {
            responseBody = await responseClone.text();
        } catch (e) {
            responseBody = '[Could not read response body]';
        }

        requestEvent.response = {
          headers: self._safeStringify(Object.fromEntries(response.headers)),
          body: self._safeStringify(responseBody),
        };
        
        console.log('[Recorder] Fetch completed:', method, url, response.status);
        return response;
      } catch (error) {
        requestEvent.status = 'error';
        requestEvent.error = error.message;
        requestEvent.duration = self._getTimestamp() - requestEvent.timestamp;
        console.log('[Recorder] Fetch error:', method, url, error.message);
        throw error;
      }
    };
  }

  _patchXHR() {
    if (this.originalXHROpen) return; // Already patched
    const self = this;
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;
    this.originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    console.log('[Recorder] Patching XHR');

    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this._recorderMethod = method;
      this._recorderUrl = url;
      this._recorderRequestHeaders = {}; // Init headers object
      return self.originalXHROpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
      if (this._recorderRequestHeaders) {
        this._recorderRequestHeaders[header] = value;
      }
      return self.originalXHRSetRequestHeader.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(body) {
      const xhr = this;
      console.log('[Recorder] Captured XHR:', xhr._recorderMethod, xhr._recorderUrl);

      const requestEvent = {
        type: 'network',
        source: 'xhr',
        method: xhr._recorderMethod || 'GET',
        url: xhr._recorderUrl,
        timestamp: self._getTimestamp(),
        request: {
          headers: self._safeStringify(xhr._recorderRequestHeaders),
          body: self._safeStringify(body),
        }
      };
      self.events.push(requestEvent);

      const startTime = self._getTimestamp();

      xhr.addEventListener('load', () => {
        const endTime = self._getTimestamp();
        requestEvent.status = xhr.status;
        requestEvent.statusText = xhr.statusText;
        requestEvent.duration = endTime - startTime;

        let responseBody;
        try {
          responseBody = xhr.responseText;
        } catch (e) {
          responseBody = '[Could not read response body]';
        }

        let responseHeaders = {};
        const headersStr = xhr.getAllResponseHeaders();
        if (headersStr) {
          const headerPairs = headersStr.trim().split(/\r\n+/);
          headerPairs.forEach(line => {
            const parts = line.split(': ');
            if (parts.length > 1) {
              const header = parts.shift();
              const value = parts.join(': ');
              if(header) responseHeaders[header.toLowerCase()] = value;
            }
          });
        }

        requestEvent.response = {
          headers: self._safeStringify(responseHeaders),
          body: self._safeStringify(responseBody),
        };
        
        console.log('[Recorder] XHR completed:', xhr._recorderMethod, xhr._recorderUrl, xhr.status);
      });

      xhr.addEventListener('error', () => {
        requestEvent.status = 'error';
        requestEvent.error = 'Network error';
        requestEvent.duration = self._getTimestamp() - startTime;
      });

      return self.originalXHRSend.apply(this, [body]);
    };
  }

  _unpatchFetch() {
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
      this.originalFetch = null;
    }
  }

  _unpatchXHR() {
    if (this.originalXHROpen) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
      this.originalXHROpen = null;
    }
    if (this.originalXHRSend) {
      XMLHttpRequest.prototype.send = this.originalXHRSend;
      this.originalXHRSend = null;
    }
    if (this.originalXHRSetRequestHeader) {
      XMLHttpRequest.prototype.setRequestHeader = this.originalXHRSetRequestHeader;
      this.originalXHRSetRequestHeader = null;
    }
  }

  // ===================================================================
  // Storage Interception (localStorage + sessionStorage)
  // ===================================================================

  _patchStorage() {
    const self = this;

    // Patch setItem
    this.originalStorageSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      const storageType = this === window.localStorage ? 'localStorage' :
                          this === window.sessionStorage ? 'sessionStorage' : 'unknown';

      self.events.push({
        type: 'storage',
        storageType,
        action: 'setItem',
        key,
        value: self._safeStringify(value, 500),
        timestamp: self._getTimestamp(),
      });

      return self.originalStorageSetItem.apply(this, [key, value]);
    };

    // Patch removeItem
    this.originalStorageRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function(key) {
      const storageType = this === window.localStorage ? 'localStorage' :
                          this === window.sessionStorage ? 'sessionStorage' : 'unknown';

      self.events.push({
        type: 'storage',
        storageType,
        action: 'removeItem',
        key,
        timestamp: self._getTimestamp(),
      });

      return self.originalStorageRemoveItem.apply(this, [key]);
    };

    // Patch clear
    this.originalStorageClear = Storage.prototype.clear;
    Storage.prototype.clear = function() {
      const storageType = this === window.localStorage ? 'localStorage' :
                          this === window.sessionStorage ? 'sessionStorage' : 'unknown';

      self.events.push({
        type: 'storage',
        storageType,
        action: 'clear',
        timestamp: self._getTimestamp(),
      });

      return self.originalStorageClear.apply(this);
    };
  }

  _unpatchStorage() {
    if (this.originalStorageSetItem) {
      Storage.prototype.setItem = this.originalStorageSetItem;
      this.originalStorageSetItem = null;
    }
    if (this.originalStorageRemoveItem) {
      Storage.prototype.removeItem = this.originalStorageRemoveItem;
      this.originalStorageRemoveItem = null;
    }
    if (this.originalStorageClear) {
      Storage.prototype.clear = this.originalStorageClear;
      this.originalStorageClear = null;
    }
  }

  // ===================================================================
  // IndexedDB Interception
  // ===================================================================

  _patchIndexedDB() {
    const self = this;
    this.originalIDBOpen = indexedDB.open.bind(indexedDB);

    indexedDB.open = function(name, version) {
      self.events.push({
        type: 'indexedDB',
        action: 'open',
        dbName: name,
        version: version,
        timestamp: self._getTimestamp(),
      });

      const request = self.originalIDBOpen(name, version);

      request.addEventListener('success', () => {
        const db = request.result;
        self._wrapIDBDatabase(db);
      });

      return request;
    };
  }

  _wrapIDBDatabase(db) {
    const self = this;
    const originalTransaction = db.transaction.bind(db);

    db.transaction = function(storeNames, mode) {
      self.events.push({
        type: 'indexedDB',
        action: 'transaction',
        dbName: db.name,
        storeNames: Array.isArray(storeNames) ? storeNames : [storeNames],
        mode: mode || 'readonly',
        timestamp: self._getTimestamp(),
      });

      const transaction = originalTransaction(storeNames, mode);
      self._wrapIDBTransaction(transaction, db.name);
      return transaction;
    };
  }

  _wrapIDBTransaction(transaction, dbName) {
    const self = this;
    const originalObjectStore = transaction.objectStore.bind(transaction);

    transaction.objectStore = function(name) {
      const store = originalObjectStore(name);
      self._wrapIDBObjectStore(store, dbName);
      return store;
    };
  }

  _wrapIDBObjectStore(store, dbName) {
    const self = this;
    const methods = ['add', 'put', 'delete', 'clear'];

    methods.forEach(method => {
      const original = store[method]?.bind(store);
      if (original) {
        store[method] = function(...args) {
          self.events.push({
            type: 'indexedDB',
            action: method,
            dbName,
            storeName: store.name,
            data: method !== 'clear' ? self._safeStringify(args[0], 500) : null,
            timestamp: self._getTimestamp(),
          });
          return original(...args);
        };
      }
    });
  }

  _unpatchIndexedDB() {
    if (this.originalIDBOpen) {
      indexedDB.open = this.originalIDBOpen;
      this.originalIDBOpen = null;
    }
  }


  // ===================================================================
  // Media Recording
  // ===================================================================

  async _getStream() {
    try {
      // Get screen share - prefer current tab
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'browser' // Prefer browser tab
        },
        audio: true, // Try to get system audio
        preferCurrentTab: true, // Default to current tab in the picker
        selfBrowserSurface: 'include' // Include current tab as option
      });

      console.log('[Recorder] Got screen stream');
      console.log('[Recorder] Video tracks:', screenStream.getVideoTracks().length);
      console.log('[Recorder] Audio tracks:', screenStream.getAudioTracks().length);

      // Use the screen stream directly
      this.stream = screenStream;

      // Try to add microphone audio (optional)
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true }
        });
        micStream.getAudioTracks().forEach(track => {
          this.stream.addTrack(track);
        });
        console.log('[Recorder] Added microphone audio');
      } catch (micError) {
        console.warn('[Recorder] Could not get microphone:', micError.message);
      }

      // Monitor video track state
      const videoTrack = this.stream.getVideoTracks()[0];
      if (videoTrack) {
        console.log('[Recorder] Video track state:', videoTrack.readyState, 'enabled:', videoTrack.enabled);
        videoTrack.addEventListener('ended', () => {
          console.log('[Recorder] Video track ended');
          this.stop();
        });
        videoTrack.addEventListener('mute', () => {
          console.log('[Recorder] Video track muted');
        });
      }

      return this.stream;
    } catch (error) {
      console.error('[Recorder] Failed to get media stream:', error);
      this.status = 'idle';
      throw error;
    }
  }

  async start() {
    // If not idle, force cleanup first
    if (this.status !== 'idle') {
      console.warn('[Recorder] Not idle, forcing cleanup. Status was:', this.status);
      this._cleanup();
    }

    this.status = 'starting';
    this.events = [];
    this.recordedChunks = [];

    // Get stream FIRST (before patching anything)
    await this._getStream();

    if (!this.stream) {
      this.status = 'idle';
      throw new Error('Failed to acquire a stream to record.');
    }

    // Check if stream tracks are active
    const videoTrack = this.stream.getVideoTracks()[0];
    console.log('[Recorder] Video track:', videoTrack?.label, 'enabled:', videoTrack?.enabled, 'readyState:', videoTrack?.readyState);

    const supportedMimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(
      type => MediaRecorder.isTypeSupported(type)
    );

    if (!supportedMimeType) {
      throw new Error('No suitable MIME type found for MediaRecorder.');
    }

    console.log('[Recorder] Using mimeType:', supportedMimeType);

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: supportedMimeType });

    this.mediaRecorder.ondataavailable = (event) => {
      console.log('[Recorder] ondataavailable:', event.data.size, 'bytes');
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
        console.log('[Recorder] Chunk added, total chunks:', this.recordedChunks.length);
      }
    };

    this.mediaRecorder.onstart = () => {
      console.log('[Recorder] MediaRecorder started');
      this.status = 'recording';
    };

    this.mediaRecorder.onpause = () => { this.status = 'paused'; };
    this.mediaRecorder.onresume = () => { this.status = 'recording'; };
    this.mediaRecorder.onerror = (e) => {
      console.error('[Recorder] MediaRecorder error:', e.error);
      this.status = 'idle';
    };

    // Start recording - use timeslice to get data periodically
    this.mediaRecorder.start(1000); // Get data every 1 second
    console.log('[Recorder] Called mediaRecorder.start(1000)');

    // Set status immediately (don't wait for onstart)
    this.status = 'recording';

    // NOW start capturing events (after video recording has started)
    // This ensures we only capture events that happen during the recording
    this.startTime = Date.now();
    this._patchConsole();
    this._patchFetch();
    this._patchXHR();
    this._patchStorage();
    this._patchIndexedDB();
    console.log('[Recorder] Started capturing events');

    return this.stream;
  }

  pause() {
    if (this.mediaRecorder && this.status === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  resume() {
    if (this.mediaRecorder && this.status === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  stop() {
    console.log('[Recorder] stop() called, current status:', this.status);
    console.log('[Recorder] mediaRecorder state:', this.mediaRecorder?.state);
    console.log('[Recorder] recordedChunks:', this.recordedChunks.length, 'chunks');
    console.log('[Recorder] Total events captured:', this.events.length);

    // Log event summary
    const eventSummary = this.events.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {});
    console.log('[Recorder] Events by type:', eventSummary);

    // Unpatch all methods immediately
    this._unpatchConsole();
    this._unpatchFetch();
    this._unpatchXHR();
    this._unpatchStorage();
    this._unpatchIndexedDB();

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        console.log('[Recorder] No mediaRecorder, returning null');
        this._cleanup();
        return resolve({ videoBlob: null, events: this.events });
      }

      const mimeType = this.mediaRecorder.mimeType;
      const currentChunks = this.recordedChunks;
      const currentEvents = [...this.events];

      // Handle the onstop event
      this.mediaRecorder.onstop = () => {
        console.log('[Recorder] onstop fired');
        console.log('[Recorder] Final chunks count:', currentChunks.length);

        // Calculate total size
        const totalSize = currentChunks.reduce((acc, chunk) => acc + chunk.size, 0);
        console.log('[Recorder] Total data size:', totalSize, 'bytes');

        const videoBlob = new Blob(currentChunks, { type: mimeType });
        console.log('[Recorder] Created blob:', videoBlob.size, 'bytes, type:', videoBlob.type);

        this._cleanup();
        resolve({ videoBlob, events: currentEvents });
      };

      // Request any pending data and stop
      if (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused') {
        console.log('[Recorder] Requesting final data and stopping...');
        this.mediaRecorder.requestData(); // Get any buffered data
        this.mediaRecorder.stop();
      } else {
        console.log('[Recorder] MediaRecorder state is:', this.mediaRecorder.state);
        // Already inactive, just create blob from existing chunks
        const totalSize = currentChunks.reduce((acc, chunk) => acc + chunk.size, 0);
        console.log('[Recorder] Already inactive, total data:', totalSize, 'bytes');
        const videoBlob = new Blob(currentChunks, { type: mimeType });
        this._cleanup();
        resolve({ videoBlob, events: currentEvents });
      }
    });
  }

  _cleanup() {
    // Stop all tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    // Reset all state for next recording
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.status = 'idle'; // Reset to idle so we can start again
    this.startTime = null;
  }
}

export default new SessionRecorder();