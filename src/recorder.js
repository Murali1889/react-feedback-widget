// src/recorder.js

/**
 * A class to handle screen, audio, and browser event recording.
 * Captures: console, network (fetch/XHR), localStorage, sessionStorage,
 * IndexedDB, interactions (click/pointerdown/focus/input/change/submit/
 * keydown), and route changes (pushState/replaceState/popstate/hashchange).
 *
 * Every event lands in `this.events` with a `timestamp` in milliseconds
 * relative to the recording start, so a downstream player or AI ticket
 * can scrub the video and align each row to its frame.
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
    this.originalPushState = null;
    this.originalReplaceState = null;
    this._interactionHandlers = null;
    this._routeHandlers = null;
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
  // Interaction Interception (clicks + form events + keydown)
  // ===================================================================

  _targetOf(el) {
    if (!el || el.nodeType !== 1) return null;
    let selector = '';
    try {
      if (el.id) selector = `#${el.id}`;
      else {
        const tag = el.tagName.toLowerCase();
        const cls = (el.className && typeof el.className === 'string')
          ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
          : '';
        selector = `${tag}${cls}`;
      }
    } catch { selector = el.tagName?.toLowerCase?.() || 'element'; }
    let label = (el.getAttribute?.('aria-label')
      || el.innerText?.trim?.()
      || el.textContent?.trim?.()
      || el.value
      || '').slice(0, 60);
    return { selector, label, role: el.getAttribute?.('role') || null };
  }

  _isSensitiveInput(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName === 'INPUT' && el.type === 'password') return 'password';
    const ac = el.getAttribute?.('autocomplete') || '';
    if (ac.startsWith('cc-')) return 'cc';
    if (el.closest?.('[data-feedback-redact="true"]')) return 'host-marker';
    return false;
  }

  _patchInteractions() {
    const self = this;

    const onClick = (e) => {
      self.events.push({
        type: 'interaction', kind: 'click',
        target: self._targetOf(e.target),
        timestamp: self._getTimestamp(),
      });
    };
    const onPointer = (e) => {
      if (e.pointerType === 'mouse') return; // mouse already covered by click
      self.events.push({
        type: 'interaction', kind: 'pointerdown',
        target: self._targetOf(e.target),
        timestamp: self._getTimestamp(),
      });
    };
    const onFocusIn = (e) => {
      self.events.push({
        type: 'interaction', kind: 'focus',
        target: self._targetOf(e.target),
        timestamp: self._getTimestamp(),
      });
    };
    const onInput = (e) => {
      const reason = self._isSensitiveInput(e.target);
      const base = {
        type: 'interaction', kind: 'input',
        target: self._targetOf(e.target),
        timestamp: self._getTimestamp(),
      };
      if (reason) self.events.push({ ...base, redacted: reason });
      else self.events.push({ ...base, value: String(e.target.value || '').slice(0, 200) });
    };
    const onSubmit = (e) => {
      self.events.push({
        type: 'interaction', kind: 'submit',
        target: self._targetOf(e.target),
        timestamp: self._getTimestamp(),
      });
    };
    const onKey = (e) => {
      const NOTABLE = ['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!NOTABLE.includes(e.key)) return;
      self.events.push({
        type: 'interaction', kind: 'keydown', key: e.key,
        target: self._targetOf(e.target),
        timestamp: self._getTimestamp(),
      });
    };

    const opts = { capture: true, passive: true };
    document.addEventListener('click', onClick, opts);
    document.addEventListener('pointerdown', onPointer, opts);
    document.addEventListener('focusin', onFocusIn, opts);
    document.addEventListener('input', onInput, opts);
    document.addEventListener('change', onInput, opts);
    document.addEventListener('submit', onSubmit, opts);
    document.addEventListener('keydown', onKey, opts);

    this._interactionHandlers = { onClick, onPointer, onFocusIn, onInput, onSubmit, onKey, opts };
  }

  _unpatchInteractions() {
    if (!this._interactionHandlers) return;
    const { onClick, onPointer, onFocusIn, onInput, onSubmit, onKey, opts } = this._interactionHandlers;
    document.removeEventListener('click', onClick, opts);
    document.removeEventListener('pointerdown', onPointer, opts);
    document.removeEventListener('focusin', onFocusIn, opts);
    document.removeEventListener('input', onInput, opts);
    document.removeEventListener('change', onInput, opts);
    document.removeEventListener('submit', onSubmit, opts);
    document.removeEventListener('keydown', onKey, opts);
    this._interactionHandlers = null;
  }

  // ===================================================================
  // Route Interception (history + hashchange)
  // ===================================================================

  _patchRoutes() {
    const self = this;
    const pushRoute = (kind, to, from) => self.events.push({
      type: 'route', kind, from, to, timestamp: self._getTimestamp(),
    });

    this.originalPushState = history.pushState;
    history.pushState = function(...args) {
      const from = location.href;
      const ret = self.originalPushState.apply(this, args);
      pushRoute('pushState', location.href, from);
      return ret;
    };

    this.originalReplaceState = history.replaceState;
    history.replaceState = function(...args) {
      const from = location.href;
      const ret = self.originalReplaceState.apply(this, args);
      pushRoute('replaceState', location.href, from);
      return ret;
    };

    const onPop = () => pushRoute('popstate', location.href, null);
    const onHash = () => pushRoute('hashchange', location.href, null);
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onHash);
    this._routeHandlers = { onPop, onHash };
  }

  _unpatchRoutes() {
    if (this.originalPushState) { history.pushState = this.originalPushState; this.originalPushState = null; }
    if (this.originalReplaceState) { history.replaceState = this.originalReplaceState; this.originalReplaceState = null; }
    if (this._routeHandlers) {
      window.removeEventListener('popstate', this._routeHandlers.onPop);
      window.removeEventListener('hashchange', this._routeHandlers.onHash);
      this._routeHandlers = null;
    }
  }

  // ===================================================================
  // Media Recording
  // ===================================================================

  async _getStream() {
    try {
      // Request screen capture with system audio - this is the main permission
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'browser',
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 30 }
        },
        audio: true, // Simplified - let browser handle audio config
        preferCurrentTab: true,
        selfBrowserSurface: 'include'
      });

      // Build stream with video immediately
      const finalStream = new MediaStream();
      screenStream.getVideoTracks().forEach(track => finalStream.addTrack(track));

      // Add system audio if available (no extra permission needed)
      const systemAudioTracks = screenStream.getAudioTracks();
      if (systemAudioTracks.length > 0) {
        finalStream.addTrack(systemAudioTracks[0]);
      }

      this.stream = finalStream;
      this.screenStream = screenStream;

      // Handle video track ended
      const videoTrack = finalStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => this.stop());
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

    // Use simple WebM format - most compatible
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';

    const recorderOptions = {
      mimeType,
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000
    };

    this.mediaRecorder = new MediaRecorder(this.stream, recorderOptions);

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
    this._patchInteractions();
    this._patchRoutes();

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
    this._unpatchInteractions();
    this._unpatchRoutes();

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
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach(track => track.stop());
      this.micStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.status = 'idle';
    this.startTime = null;
  }
}

export default new SessionRecorder();
