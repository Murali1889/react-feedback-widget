import { describe, it, expect } from 'vitest';
import { assembleTicket } from '../worker/ticketAssembler.js';
import { redactInteractionTrail, redactFiberSnapshot, redactBuildInfo, resolveRedactionConfig } from '../../lib/feedbackSecurity.js';

const cfg = resolveRedactionConfig('default');

describe('Phase C adversarial security', () => {
  it('redacts secret-shaped values in interaction trail', () => {
    const t = redactInteractionTrail([
      { type: 'input', target: { selector: 'x' }, value: 'token=sk_live_ABC' },
    ], cfg);
    expect(t[0].value).not.toContain('sk_live_ABC');
  });

  it('redacts secret-shaped keys in fiber snapshot at depth', () => {
    const tree = { Form: { props: { nested: { apiKey: 'leak' } }, state: null } };
    const out = redactFiberSnapshot(tree, cfg);
    expect(out.Form.props.nested.apiKey).toBe('<redacted>');
  });

  it('does not allow prototype pollution via crafted interaction value', () => {
    const before = ({}).polluted;
    redactInteractionTrail([
      { type: 'input', target: { selector: 'x' }, value: '{"__proto__":{"polluted":true}}' },
    ], cfg);
    expect(({}).polluted).toBe(before);
  });

  it('redactBuildInfo strips token-shaped fields', () => {
    const info = { deployToken: 'super', branch: 'main' };
    const out = redactBuildInfo(info, cfg);
    expect(out.deployToken).toBe('<redacted>');
    expect(out.branch).toBe('main');
  });

  it('ticket markdown never echoes a password-typed value', () => {
    const t = assembleTicket({
      item: { feedback: 'x', timestamp: '2026-01-01T00:00Z' },
      interactions: [{ type: 'input', target: { selector: 'input[type=password]' }, redacted: 'password-field', ts: 1 }],
      errors: [], routes: [],
    });
    expect(t.markdown).not.toContain('hunter2');
    expect(t.markdown).toMatch(/<password-field>/);
  });

  it('ticket schemaVersion is stable so consumers can pin', () => {
    const t = assembleTicket({ item: { feedback: 'x' }, interactions: [], errors: [], routes: [] });
    expect(t.json.schemaVersion).toBe('1.0');
  });
});
