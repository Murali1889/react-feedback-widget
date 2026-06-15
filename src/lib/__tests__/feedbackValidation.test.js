import { describe, it, expect } from 'vitest';
import { validateFeedbackSubmission } from '../feedbackValidation.js';

const ctx = { authContext: { userId: 'u1' } };

describe('validateFeedbackSubmission', () => {
  it('accepts a minimal valid submission', () => {
    const r = validateFeedbackSubmission({ feedback: 'Looks broken' }, ctx);
    expect(r.ok).toBe(true);
    expect(r.data.feedback).toBe('Looks broken');
    expect(r.data.severity).toBe('medium');
  });

  it('rejects empty feedback', () => {
    const r = validateFeedbackSubmission({ feedback: '   ' }, ctx);
    expect(r.ok).toBe(false);
    expect(r.errors.feedback).toMatch(/required/i);
  });

  it('rejects feedback over 5000 chars', () => {
    const r = validateFeedbackSubmission({ feedback: 'x'.repeat(5001) }, ctx);
    expect(r.ok).toBe(false);
    expect(r.errors.feedback).toMatch(/length/i);
  });

  it('coerces unknown type to "other"', () => {
    const r = validateFeedbackSubmission({ feedback: 'hi', type: 'weird' }, ctx);
    expect(r.ok).toBe(true);
    expect(r.data.type).toBe('other');
  });

  it('rejects invalid severity', () => {
    const r = validateFeedbackSubmission({ feedback: 'hi', severity: 'urgent' }, ctx);
    expect(r.ok).toBe(false);
    expect(r.errors.severity).toBeTruthy();
  });

  it('validates owner shape', () => {
    const r1 = validateFeedbackSubmission(
      { feedback: 'hi', owner: { name: 'A', email: 'not-an-email' } }, ctx);
    expect(r1.ok).toBe(false);
    expect(r1.errors['owner.email']).toBeTruthy();

    const r2 = validateFeedbackSubmission(
      { feedback: 'hi', owner: { name: 'A', avatar: 'http://x' } }, ctx);
    expect(r2.ok).toBe(false);
    expect(r2.errors['owner.avatar']).toMatch(/https/i);
  });

  it('clamps customerValue numerically and length-limits strings', () => {
    const r = validateFeedbackSubmission(
      { feedback: 'hi', customerValue: 1e12 }, ctx);
    expect(r.ok).toBe(true);
    expect(r.data.customerValue).toBe(1e9);

    const r2 = validateFeedbackSubmission(
      { feedback: 'hi', customerValue: 'x'.repeat(100) }, ctx);
    expect(r2.ok).toBe(false);
    expect(r2.errors.customerValue).toBeTruthy();
  });

  it('silently strips statusHistory and securityContext from input', () => {
    const r = validateFeedbackSubmission({
      feedback: 'hi',
      statusHistory: [{ to: 'resolved', changedAt: 'now' }],
      securityContext: { tenantId: 'evil' },
    }, ctx);
    expect(r.ok).toBe(true);
    expect(r.data.statusHistory).toBeUndefined();
    expect(r.data.securityContext).toBeUndefined();
  });

  it('silently strips integrationState provider-write fields', () => {
    const r = validateFeedbackSubmission({
      feedback: 'hi',
      integrationState: {
        jira: { status: 'created', issueKey: 'FAKE-1', issueUrl: 'evil' },
        sheets: { status: 'appended', rowId: '999' },
      },
    }, ctx);
    expect(r.ok).toBe(true);
    // 'created' / 'appended' are server-only status values; stripped.
    expect(r.data.integrationState?.jira?.issueKey).toBeUndefined();
    expect(r.data.integrationState?.jira?.issueUrl).toBeUndefined();
    expect(r.data.integrationState?.sheets?.rowId).toBeUndefined();
  });

  it('error messages do not echo submitted values', () => {
    const r = validateFeedbackSubmission(
      { feedback: 'hi', owner: { name: 'A', email: 'malicious<script>' } }, ctx);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r.errors)).not.toContain('malicious');
    expect(JSON.stringify(r.errors)).not.toContain('script');
  });

  it('caps eventLogs to 5000 entries by dropping the overflow', () => {
    const events = Array.from({ length: 6000 }, (_, i) => ({ type: 'console', message: String(i) }));
    const r = validateFeedbackSubmission({ feedback: 'hi', eventLogs: events }, ctx);
    expect(r.ok).toBe(true);
    expect(r.data.eventLogs.length).toBe(5000);
  });
});
