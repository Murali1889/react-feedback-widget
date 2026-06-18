/**
 * safeJsonForScript — the helper that lets us inline OAuth tokens into
 * an HTML <script> without giving an attacker (or a weird token value)
 * a way to break out of the script tag.
 */
import { describe, it, expect } from 'vitest';
import { safeJsonForScript } from '../script-safe-json';

describe('safeJsonForScript', () => {
  it('escapes </script> so the tag can\'t be broken out of', () => {
    const out = safeJsonForScript({ token: 'evil</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(out).toContain('<\\/script>');
  });

  it('handles uppercase </SCRIPT and mixed case', () => {
    const out = safeJsonForScript({ token: '</SCRIPT> ok </Script>' });
    expect(out).not.toMatch(/<\/script/i);
  });

  it('escapes U+2028 / U+2029 line terminators', () => {
    const LS = String.fromCharCode(0x2028);
    const PS = String.fromCharCode(0x2029);
    const out = safeJsonForScript({ token: `a${LS}b${PS}c` });
    expect(out).not.toContain(LS);
    expect(out).not.toContain(PS);
    expect(out).toContain('\\u2028');
    expect(out).toContain('\\u2029');
  });

  it('escapes <!-- to neutralize HTML comment confusion', () => {
    const out = safeJsonForScript({ note: 'starts <!-- ends -->' });
    expect(out).not.toContain('<!--');
    expect(out).toContain('<\\!--');
  });

  it('still produces valid JSON for normal values', () => {
    const value = { a: 1, b: 'hello', c: [true, null] };
    const round = JSON.parse(safeJsonForScript(value));
    expect(round).toEqual(value);
  });

  it('survives quote escaping correctly', () => {
    const value = { quoted: 'he said "hi"', single: "it's" };
    const round = JSON.parse(safeJsonForScript(value));
    expect(round.quoted).toBe('he said "hi"');
    expect(round.single).toBe("it's");
  });
});
