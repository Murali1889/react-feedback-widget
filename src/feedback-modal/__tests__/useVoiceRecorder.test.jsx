/**
 * @vitest-environment jsdom
 *
 * Voice recorder tests — mocks navigator.mediaDevices.getUserMedia +
 * MediaRecorder so we can run them in vitest/jsdom (neither is built-in).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceRecorder } from '../useVoiceRecorder.js';

class FakeMediaRecorder {
  constructor(stream, options) {
    this.stream = stream;
    this.mimeType = options?.mimeType || 'audio/webm;codecs=opus';
    this.state = 'inactive';
    this.ondataavailable = null;
    this.onstop = null;
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(['x'], { type: this.mimeType }) });
    }
    if (this.onstop) this.onstop();
  }
}
FakeMediaRecorder.isTypeSupported = (m) => m === 'audio/webm;codecs=opus';

function fakeStream() {
  const tracks = [{ stop: vi.fn() }];
  return { getTracks: () => tracks };
}

beforeEach(() => {
  global.MediaRecorder = FakeMediaRecorder;
  if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:mock';
  navigator.mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue(fakeStream()),
  };
});

afterEach(() => {
  delete global.MediaRecorder;
  delete navigator.mediaDevices;
});

describe('useVoiceRecorder', () => {
  it('start() flips isRecording and calls getUserMedia with audio: true', async () => {
    const { result } = renderHook(() => useVoiceRecorder());
    await act(async () => { await result.current.start(); });
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(result.current.isRecording).toBe(true);
  });

  it('stop() returns the recorded blob with audio/webm MIME and a generated name', async () => {
    const { result } = renderHook(() => useVoiceRecorder());
    await act(async () => { await result.current.start(); });
    let blob;
    await act(async () => { blob = await result.current.stop(); });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('audio/webm;codecs=opus');
    expect(blob.name).toMatch(/^voice-memo-.+\.webm$/);
    expect(result.current.isRecording).toBe(false);
  });

  it('stop() resolves with null if not recording', async () => {
    const { result } = renderHook(() => useVoiceRecorder());
    let blob;
    await act(async () => { blob = await result.current.stop(); });
    expect(blob).toBeNull();
  });

  it('start() surfaces a permission-denied error and leaves isRecording false', async () => {
    const err = new Error('NotAllowedError');
    navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(err);
    const { result } = renderHook(() => useVoiceRecorder());
    await act(async () => {
      await expect(result.current.start()).rejects.toThrow(/NotAllowedError/);
    });
    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toBe(err);
  });

  it('stops the underlying audio track on stop() to release the mic indicator', async () => {
    const stream = fakeStream();
    navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(stream);
    const { result } = renderHook(() => useVoiceRecorder());
    await act(async () => { await result.current.start(); });
    await act(async () => { await result.current.stop(); });
    expect(stream.getTracks()[0].stop).toHaveBeenCalled();
  });

  it('throws cleanly when MediaRecorder is missing (older browsers)', async () => {
    delete global.MediaRecorder;
    const { result } = renderHook(() => useVoiceRecorder());
    await act(async () => {
      await expect(result.current.start()).rejects.toBeTruthy();
    });
    expect(result.current.isRecording).toBe(false);
  });
});
