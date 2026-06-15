import { describe, it, expect } from 'vitest';
import { redactInteractionTrail, redactFiberSnapshot, redactBuildInfo, resolveRedactionConfig } from '../feedbackSecurity.js';

const cfg = resolveRedactionConfig('default');

describe('redactInteractionTrail', () => {
  it('redacts inline secrets in input values', () => {
    const trail = [
      { type: 'input', target: { selector: 'input[name="x"]' }, value: 'password=hunter2' },
      { type: 'click', target: { selector: 'button' } },
    ];
    const out = redactInteractionTrail(trail, cfg);
    expect(out[0].value).not.toContain('hunter2');
    expect(out[0].value).toContain('<redacted>');
  });
  it('leaves values that are already redacted alone', () => {
    const trail = [{ type: 'input', target: { selector: 'x' }, redacted: 'password-field' }];
    expect(redactInteractionTrail(trail, cfg)).toEqual(trail);
  });
});

describe('redactFiberSnapshot', () => {
  it('redacts sensitive props/state keys', () => {
    const tree = { Form: { props: { apiKey: 'leaked', label: 'fine' }, state: null } };
    const out = redactFiberSnapshot(tree, cfg);
    expect(out.Form.props.apiKey).toBe('<redacted>');
    expect(out.Form.props.label).toBe('fine');
  });
});

describe('redactBuildInfo', () => {
  it('strips token-shaped fields', () => {
    const info = { commit: 'abc', deployToken: 'super-secret', branch: 'main' };
    const out = redactBuildInfo(info, cfg);
    expect(out.deployToken).toBe('<redacted>');
    expect(out.commit).toBe('abc');
  });
});
