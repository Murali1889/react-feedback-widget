/**
 * @vitest-environment jsdom
 *
 * Evidence-intake tests for useFeedbackModalState — paste, drop, drag
 * counter, audio routing.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFeedbackModalState } from '../useFeedbackModalState.js';

function mkFile(name, type, size = 100) {
  const f = new File(['x'.repeat(size)], name, { type });
  return f;
}

const baseProps = {
  isOpen: true,
  onClose: () => {},
  onSubmit: () => {},
  screenshot: null,
  videoBlob: null,
  eventLogs: [],
  userName: 'alice',
};

describe('useFeedbackModalState — evidence intake', () => {
  beforeEach(() => {
    // jsdom doesn't ship URL.createObjectURL / revokeObjectURL.
    if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:mock';
    if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
    // FileReader in jsdom doesn't always fire onloadend for File blobs
    // with the right MIME prefix we need.
    if (!global.FileReader.prototype._patched) {
      global.FileReader = function FakeFR() {
        this.readAsDataURL = (file) => {
          this.result = `data:${file.type};base64,fake`;
          if (this.onloadend) this.onloadend();
        };
        this.onloadend = null;
      };
      global.FileReader.prototype._patched = true;
    }
  });

  it('handleFile routes images → manualScreenshot, video → manualVideo, audio → manualAudio, else → manualFile', async () => {
    const { result } = renderHook(() => useFeedbackModalState(baseProps));

    act(() => result.current.handleFile(mkFile('a.png', 'image/png')));
    expect(result.current.manualScreenshot).toMatch(/^data:image\//);

    act(() => result.current.handleFile(mkFile('a.mp4', 'video/mp4')));
    expect(result.current.manualVideo?.name).toBe('a.mp4');

    act(() => result.current.handleFile(mkFile('a.webm', 'audio/webm')));
    expect(result.current.manualAudio?.name).toBe('a.webm');

    act(() => result.current.handleFile(mkFile('logs.txt', 'text/plain')));
    expect(result.current.manualFile?.name).toBe('logs.txt');
  });

  it('handleFile(null) clears all media slots', () => {
    const { result } = renderHook(() => useFeedbackModalState(baseProps));
    act(() => result.current.handleFile(mkFile('a.png', 'image/png')));
    expect(result.current.manualScreenshot).toBeTruthy();
    act(() => result.current.handleFile(null));
    expect(result.current.manualScreenshot).toBeNull();
    expect(result.current.manualVideo).toBeNull();
    expect(result.current.manualAudio).toBeNull();
    expect(result.current.manualFile).toBeNull();
  });

  it('handlePaste extracts image clipboard items and preventDefault', async () => {
    const { result } = renderHook(() => useFeedbackModalState(baseProps));
    const png = mkFile('paste.png', 'image/png');
    const event = {
      clipboardData: {
        items: [{
          kind: 'file', type: 'image/png',
          getAsFile: () => png,
        }],
      },
      preventDefault: vi.fn(),
    };
    let intercepted;
    act(() => { intercepted = result.current.handlePaste(event); });
    expect(intercepted).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(result.current.manualScreenshot).toMatch(/^data:image\//);
  });

  it('handlePaste ignores string clipboard items (lets text paste through)', () => {
    const { result } = renderHook(() => useFeedbackModalState(baseProps));
    const event = {
      clipboardData: {
        items: [{ kind: 'string', type: 'text/plain', getAsFile: () => null }],
      },
      preventDefault: vi.fn(),
    };
    let intercepted;
    act(() => { intercepted = result.current.handlePaste(event); });
    expect(intercepted).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('handleDrop ingests dropped files and clears the drag state', () => {
    const { result } = renderHook(() => useFeedbackModalState(baseProps));
    const event = {
      dataTransfer: {
        files: [mkFile('drop.pdf', 'application/pdf')],
      },
      preventDefault: vi.fn(),
    };
    let consumed;
    act(() => { consumed = result.current.handleDrop(event); });
    expect(consumed).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(result.current.manualFile?.name).toBe('drop.pdf');
    expect(result.current.isDraggingOver).toBe(false);
  });

  it('drag enter/leave counter prevents flicker across child elements', () => {
    const { result } = renderHook(() => useFeedbackModalState(baseProps));
    const ev = (kind) => ({ dataTransfer: { types: ['Files'] }, preventDefault: () => {} });
    act(() => result.current.handleDragEnter(ev('enter')));
    expect(result.current.isDraggingOver).toBe(true);
    act(() => result.current.handleDragEnter(ev('enter')));   // bubbled to child
    act(() => result.current.handleDragLeave(ev('leave')));   // left child but still inside parent
    expect(result.current.isDraggingOver).toBe(true);
    act(() => result.current.handleDragLeave(ev('leave')));   // truly left the parent
    expect(result.current.isDraggingOver).toBe(false);
  });

  it('drag ignores non-file drags (text selection between fields)', () => {
    const { result } = renderHook(() => useFeedbackModalState(baseProps));
    const ev = { dataTransfer: { types: ['text/plain'] }, preventDefault: vi.fn() };
    act(() => result.current.handleDragEnter(ev));
    expect(result.current.isDraggingOver).toBe(false);
    expect(ev.preventDefault).not.toHaveBeenCalled();
  });

  it('submit payload includes audioBlob when a voice memo was recorded', () => {
    const onSubmit = vi.fn();
    const { result } = renderHook(() => useFeedbackModalState({ ...baseProps, onSubmit }));
    const audio = mkFile('memo.webm', 'audio/webm');
    act(() => result.current.handleFile(audio));
    act(() => result.current.setDescription('Audio attached'));
    act(() => result.current.handleSubmit());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.audioBlob).toBe(audio);
    expect(payload.feedback).toBe('Audio attached');
  });
});
