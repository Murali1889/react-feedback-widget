/**
 * buildEvidenceNote — surfaces captured binaries to destinations that
 * can't natively attach them, so the user sees that capture happened.
 */
import { describe, it, expect } from 'vitest';
import { buildEvidenceNote } from '../_shared.js';

describe('buildEvidenceNote', () => {
  it('returns "" when no binaries are present', () => {
    expect(buildEvidenceNote({})).toBe('');
    expect(buildEvidenceNote({ feedback: 'plain text' })).toBe('');
  });

  it('flags a Blob screenshot', () => {
    const ss = new Blob(['x'], { type: 'image/png' });
    expect(buildEvidenceNote({ screenshot: ss })).toContain('screenshot');
  });

  it('flags a data-URL screenshot', () => {
    expect(buildEvidenceNote({ screenshot: 'data:image/png;base64,xxx' })).toContain('screenshot');
  });

  it('does NOT flag a plain http URL screenshot (it could be a placeholder)', () => {
    expect(buildEvidenceNote({ screenshot: 'https://example.com/x.png' })).toBe('');
  });

  it('includes byte-size for video / audio / file', () => {
    const note = buildEvidenceNote({
      videoBlob:  new Blob([new Uint8Array(2048)],     { type: 'video/webm' }),
      audioBlob:  new Blob([new Uint8Array(512)],      { type: 'audio/webm' }),
      attachment: Object.assign(new Blob([new Uint8Array(1024 * 1024)], { type: 'application/pdf' }), { name: 'report.pdf' }),
    });
    expect(note).toContain('video (2KB)');
    expect(note).toContain('voice memo (512B)');
    expect(note).toContain('report.pdf (1.0MB)');
  });

  it('joins multiple items into one line', () => {
    const note = buildEvidenceNote({
      screenshot: new Blob(['x'], { type: 'image/png' }),
      audioBlob:  new Blob([new Uint8Array(1024)], { type: 'audio/webm' }),
    });
    expect(note).toContain('screenshot, voice memo');
    expect(note.split('\n').filter(Boolean).length).toBe(1);
  });

  it('leads with two newlines so it sits cleanly after a markdown body', () => {
    const note = buildEvidenceNote({
      screenshot: new Blob(['x'], { type: 'image/png' }),
    });
    expect(note.startsWith('\n\n')).toBe(true);
    expect(note).toContain('📎');
  });
});
