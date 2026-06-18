import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Microphone-only voice memo hook.
 *
 * Requests mic permission once, records via MediaRecorder, returns the
 * audio blob on stop. Times out at 90s by default so the user can't
 * accidentally upload a multi-minute clip.
 *
 *   const r = useVoiceRecorder({ maxMs: 90_000 });
 *   r.start();   // returns Promise<void>; rejects if permission denied
 *   r.stop();    // returns Promise<Blob | null>
 *   r.isRecording, r.elapsedMs, r.error
 *
 * Picks `audio/webm;codecs=opus` when supported (universal on Chrome,
 * Firefox; iOS Safari falls back to `audio/mp4`). MIME is reported on
 * the returned blob.
 */
export function useVoiceRecorder({ maxMs = 90_000 } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState(null);

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const tickerRef = useRef(null);
  const autoStopRef = useRef(null);
  const stopResolveRef = useRef(null);

  const cleanup = useCallback(() => {
    if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null; }
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const pickMime = useCallback(() => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
    for (const m of candidates) {
      try { if (MediaRecorder.isTypeSupported(m)) return m; } catch { /* nope */ }
    }
    return '';
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (isRecording) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const e = new Error('mediaDevices.getUserMedia is not available in this environment');
      setError(e); throw e;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setError(e); throw e;
    }
    const mimeType = pickMime();
    let recorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch (e) {
      stream.getTracks().forEach((t) => t.stop());
      setError(e); throw e;
    }

    streamRef.current = stream;
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      blob.name = `voice-memo-${stamp}.${extFromMime(type)}`;
      cleanup();
      setIsRecording(false);
      const resolver = stopResolveRef.current;
      stopResolveRef.current = null;
      if (resolver) resolver(blob);
    };

    startedAtRef.current = Date.now();
    setElapsedMs(0);
    tickerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 100);
    autoStopRef.current = setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
    }, maxMs);

    recorder.start();
    setIsRecording(true);
  }, [isRecording, pickMime, maxMs, cleanup]);

  const stop = useCallback(() => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state !== 'recording') {
        resolve(null);
        return;
      }
      stopResolveRef.current = resolve;
      recorder.stop();
    });
  }, []);

  return { isRecording, elapsedMs, error, start, stop };
}

function extFromMime(mime) {
  if (!mime) return 'webm';
  if (mime.includes('mp4'))  return 'mp4';
  if (mime.includes('ogg'))  return 'ogg';
  if (mime.includes('wav'))  return 'wav';
  return 'webm';
}
