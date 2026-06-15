import { describe, it, expect } from 'vitest';
import {
  getFeedbackEvidenceSummary,
  getFeedbackPriority,
  createFeedbackHandoffText,
  getDerivedFeedbackMeta,
} from '../feedbackEvidence.js';

const baseItem = {
  id: 'fb-1',
  feedback: 'The submit button is broken',
  type: 'bug',
  severity: 'high',
  userName: 'Murali',
  userEmail: 'm@example.com',
  url: 'https://app.example.com/checkout',
  screenshot: 'data:image/png;base64,abc',
  video: null,
  eventLogs: [
    { type: 'console', level: 'error', message: 'TypeError: x is undefined' },
    { type: 'console', level: 'log', message: 'click' },
    { type: 'network', method: 'POST', url: 'https://api.example.com/x', status: 500 },
    { type: 'network', method: 'GET', url: 'https://api.example.com/y', status: 200 },
    { type: 'storage', action: 'setItem' },
  ],
  elementInfo: { selector: 'button.submit', componentStack: ['Checkout', 'App'], sourceFile: 'src/Checkout.jsx:42' },
};

describe('getFeedbackEvidenceSummary', () => {
  it('counts everything correctly', () => {
    const s = getFeedbackEvidenceSummary(baseItem);
    expect(s.hasScreenshot).toBe(true);
    expect(s.hasVideo).toBe(false);
    expect(s.logCount).toBe(5);
    expect(s.errorCount).toBe(1);
    expect(s.failedNetworkCount).toBe(1);
    expect(s.storageEventCount).toBe(1);
    expect(s.hasComponent).toBe(true);
    expect(s.hasSource).toBe(true);
  });

  it('handles empty input', () => {
    const s = getFeedbackEvidenceSummary({});
    expect(s.hasScreenshot).toBe(false);
    expect(s.logCount).toBe(0);
    expect(s.errorCount).toBe(0);
  });
});

describe('getFeedbackPriority', () => {
  it('assigns urgent band for critical severity with error', () => {
    const p = getFeedbackPriority({ ...baseItem, severity: 'critical' });
    expect(p.band).toBe('urgent');
    expect(p.score).toBeGreaterThanOrEqual(80);
    expect(p.reasons.length).toBeGreaterThan(0);
  });

  it('lowers score for non-bug types', () => {
    const bug = getFeedbackPriority({ ...baseItem, severity: 'medium', type: 'bug' });
    const idea = getFeedbackPriority({ ...baseItem, severity: 'medium', type: 'idea' });
    expect(idea.score).toBeLessThan(bug.score);
  });

  it('reasons explain the score', () => {
    const p = getFeedbackPriority({ ...baseItem, severity: 'critical' });
    expect(p.reasons.join(' ').toLowerCase()).toContain('critical');
  });

  it('clamps to 0..100', () => {
    const p = getFeedbackPriority({ ...baseItem, severity: 'critical', customerValue: 999999 });
    expect(p.score).toBeLessThanOrEqual(100);
  });
});

describe('createFeedbackHandoffText', () => {
  it('short format includes one-liner', () => {
    const t = createFeedbackHandoffText(baseItem, { format: 'short' });
    expect(t).toContain('submit button');
    expect(t).toContain('Murali');
  });

  it('full format includes evidence summary', () => {
    const t = createFeedbackHandoffText(baseItem, { format: 'full' });
    expect(t).toMatch(/screenshot/i);
    expect(t).toMatch(/component/i);
  });

  it('redacts inline secrets when redact:true (default)', () => {
    const item = { ...baseItem, feedback: 'token=secret123 not working' };
    const t = createFeedbackHandoffText(item);
    expect(t).not.toContain('secret123');
  });
});

describe('getDerivedFeedbackMeta', () => {
  it('returns a frozen object', () => {
    const m = getDerivedFeedbackMeta(baseItem);
    expect(Object.isFrozen(m)).toBe(true);
  });

  it('selects primaryEvidence based on what exists', () => {
    expect(getDerivedFeedbackMeta({ ...baseItem, video: 'x' }).primaryEvidence).toBe('video');
    expect(getDerivedFeedbackMeta({ ...baseItem, video: null }).primaryEvidence).toBe('screenshot');
    expect(getDerivedFeedbackMeta({
      ...baseItem, video: null, screenshot: null,
    }).primaryEvidence).toBe('logs');
    expect(getDerivedFeedbackMeta({ feedback: 'hi' }).primaryEvidence).toBe('text');
  });

  it('never mutates input', () => {
    const before = JSON.stringify(baseItem);
    getDerivedFeedbackMeta(baseItem);
    expect(JSON.stringify(baseItem)).toBe(before);
  });
});
