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
    if (this.originalFetch) return;
    this.originalFetch = window.fetch;
    const self = this;

    window.fetch = async function(...args) {
      const [input, options] = args;
      const url = input instanceof Request ? input.url : input.toString();
      const method = options?.method || (input instanceof Request ? input.method : 'GET');

      let requestBody;
      let requestHeaders = options?.headers || {};

      if (input instanceof Request) {
        requestHeaders = Object.fromEntries(input.headers);
        try {
          requestBody = await input.clone().text();
        } catch (e) {
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

        return response;
      } catch (error) {
        requestEvent.status = 'error';
        requestEvent.error = error.message;
        requestEvent.duration = self._getTimestamp() - requestEvent.timestamp;
        throw error;
      }
    };
  }

  _patchXHR() {
    if (this.originalXHROpen) return;
    const self = this;
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;
    this.originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      this._recorderMethod = method;
      this._recorderUrl = url;
      this._recorderRequestHeaders = {};
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
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'browser'
        },
        audio: true,
        preferCurrentTab: true,
        selfBrowserSurface: 'include'
      });

      this.stream = screenStream;

      try {
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true }
        });
        micStream.getAudioTracks().forEach(track => {
          this.stream.addTrack(track);
        });
      } catch (micError) {
        // Microphone not available, continue without it
      }

      const videoTrack = this.stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          this.stop();
        });
      }

      return this.stream;
    } catch (error) {
      this.status = 'idle';
      throw error;
    }
  }

  async start() {
    if (this.status !== 'idle') {
      this._cleanup();
    }

    this.status = 'starting';
    this.events = [];
    this.recordedChunks = [];

    await this._getStream();

    if (!this.stream) {
      this.status = 'idle';
      throw new Error('Failed to acquire a stream to record.');
    }

    const supportedMimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(
      type => MediaRecorder.isTypeSupported(type)
    );

    if (!supportedMimeType) {
      throw new Error('No suitable MIME type found for MediaRecorder.');
    }

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: supportedMimeType });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstart = () => {
      this.status = 'recording';
    };

    this.mediaRecorder.onpause = () => { this.status = 'paused'; };
    this.mediaRecorder.onresume = () => { this.status = 'recording'; };
    this.mediaRecorder.onerror = () => {
      this.status = 'idle';
    };

    this.mediaRecorder.start(1000);
    this.status = 'recording';

    this.startTime = Date.now();
    this._patchConsole();
    this._patchFetch();
    this._patchXHR();
    this._patchStorage();
    this._patchIndexedDB();

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
    this._unpatchConsole();
    this._unpatchFetch();
    this._unpatchXHR();
    this._unpatchStorage();
    this._unpatchIndexedDB();

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        this._cleanup();
        return resolve({ videoBlob: null, events: this.events });
      }

      const mimeType = this.mediaRecorder.mimeType;
      const currentChunks = this.recordedChunks;
      const currentEvents = [...this.events];

      this.mediaRecorder.onstop = () => {
        const videoBlob = new Blob(currentChunks, { type: mimeType });
        this._cleanup();
        resolve({ videoBlob, events: currentEvents });
      };

      if (this.mediaRecorder.state === 'recording' || this.mediaRecorder.state === 'paused') {
        this.mediaRecorder.requestData();
        this.mediaRecorder.stop();
      } else {
        const videoBlob = new Blob(currentChunks, { type: mimeType });
        this._cleanup();
        resolve({ videoBlob, events: currentEvents });
      }
    });
  }

  _cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.status = 'idle';
    this.startTime = null;
  }
}

export default new SessionRecorder();
