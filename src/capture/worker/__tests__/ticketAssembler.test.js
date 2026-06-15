import { describe, it, expect } from 'vitest';
import { assembleTicket } from '../ticketAssembler.js';

const baseInput = {
  item: {
    feedback: 'Submit broken',
    type: 'bug',
    severity: 'high',
    userName: 'Murali',
    userEmail: 'm@x.com',
    url: 'https://app.example.com/checkout',
    timestamp: '2026-06-15T17:03:21Z',
    eventLogs: [],
  },
  interactions: [
    { type: 'click', target: { selector: 'button.submit', label: 'Place order' }, ts: 1000 },
    { type: 'input', target: { selector: 'input[name=city]', label: 'City' }, value: 'Bangalore', ts: 900 },
  ],
  errors: [
    { type: 'error', message: 'TypeError: x', stack: 'at handleSubmit (src/Checkout.jsx:42:18)', ts: 1100 },
  ],
  routes: [{ type: 'route', from: '/', to: '/checkout', ts: 800 }],
  fiberSnapshot: { Checkout: { props: { userId: 'u1' }, state: null } },
  buildInfo: { commit: 'abc', branch: 'main', environment: 'production' },
  flags: { 'checkout-redesign': 'b' },
  resolvedFrames: [{ source: 'src/Checkout.jsx', line: 42, column: 18, name: 'handleSubmit',
                    sourcesContent: 'L1\nL2\nL3\nL4\nL5\nL6\nL7\nL8\nL9\nL10\nL11\nL12\nL13\nL14\nL15\nL16\nL17\nL18\nL19\nL20\nL21\nL22\nL23\nL24\nL25\nL26\nL27\nL28\nL29\nL30\nL31\nL32\nL33\nL34\nL35\nL36\nL37\nL38\nL39\nL40\nL41\nL42\nL43\nL44\nL45' }],
};

describe('assembleTicket', () => {
  it('produces both markdown and json with stable schemaVersion', () => {
    const t = assembleTicket(baseInput);
    expect(typeof t.markdown).toBe('string');
    expect(t.json.schemaVersion).toBe('1.0');
    expect(t.generatedAt).toMatch(/T/);
  });
  it('markdown contains key sections', () => {
    const md = assembleTicket(baseInput).markdown;
    expect(md).toMatch(/^# Feedback/);
    expect(md).toMatch(/## Summary/);
    expect(md).toMatch(/## Where/);
    expect(md).toMatch(/## Repro/);
    expect(md).toMatch(/## Logs/);
    expect(md).toMatch(/## Environment/);
  });
  it('inlines the code snippet around the resolved line', () => {
    const md = assembleTicket(baseInput).markdown;
    expect(md).toContain('L42');
  });
  it('json.where references the resolved file', () => {
    const t = assembleTicket(baseInput);
    expect(t.json.where.file).toBe('src/Checkout.jsx');
    expect(t.json.where.line).toBe(42);
  });
  it('coalesces consecutive inputs on the same target', () => {
    const t = assembleTicket({
      ...baseInput,
      interactions: [
        { type: 'input', target: { selector: 'input[name=city]', label: 'City' }, value: 'B', ts: 100 },
        { type: 'input', target: { selector: 'input[name=city]', label: 'City' }, value: 'Ba', ts: 110 },
        { type: 'input', target: { selector: 'input[name=city]', label: 'City' }, value: 'Bangalore', ts: 200 },
      ],
    });
    const inputs = t.json.repro.steps.filter((s) => s.kind === 'input');
    expect(inputs.length).toBe(1);
    expect(inputs[0].value).toBe('Bangalore');
  });
  it('places errors inline at their timestamp position', () => {
    const md = assembleTicket(baseInput).markdown;
    expect(md).toMatch(/ERROR.*TypeError/);
  });
});
