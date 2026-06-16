import { describe, it, expect } from 'vitest';
import {
  assertNoPrivateCredentials,
  detectPrivateCredential,
  FeedbackCredentialLeakError,
} from '../safety.js';

describe('credential safety', () => {
  it('refuses GitHub PAT (classic)', () => {
    expect(() => assertNoPrivateCredentials('ghp_abcdefghijklmnopqrstuv', 'token'))
      .toThrow(FeedbackCredentialLeakError);
  });

  it('refuses GitHub fine-grained PAT', () => {
    expect(() => assertNoPrivateCredentials('github_pat_aaaaaaaaaaaaaaaaaaaaaaa', 'token'))
      .toThrow(FeedbackCredentialLeakError);
  });

  it('refuses Linear API key', () => {
    expect(() => assertNoPrivateCredentials('lin_api_aaaaaaaaaaaaaaaaaaaa', 'apiKey'))
      .toThrow(FeedbackCredentialLeakError);
  });

  it('refuses Notion integration token', () => {
    expect(() => assertNoPrivateCredentials('secret_abcdefghijklmnopqrstuvwxyz0123456789', 'token'))
      .toThrow(FeedbackCredentialLeakError);
  });

  it('refuses Atlassian token', () => {
    expect(() => assertNoPrivateCredentials('ATATT3xxxxxxxxxxxxxxxxxxxx', 'token'))
      .toThrow(FeedbackCredentialLeakError);
  });

  it('refuses Stripe live secret', () => {
    expect(() => assertNoPrivateCredentials('sk_live_abcdefghijklmnopqrstu', 'key'))
      .toThrow(FeedbackCredentialLeakError);
  });

  it('refuses Slack bot token', () => {
    expect(() => assertNoPrivateCredentials('xoxb-1234567890-1234567890-abcd', 'token'))
      .toThrow(FeedbackCredentialLeakError);
  });

  it('refuses AWS access key', () => {
    expect(() => assertNoPrivateCredentials('AKIAIOSFODNN7EXAMPLE', 'awsKey'))
      .toThrow(FeedbackCredentialLeakError);
  });

  it('refuses Supabase service-role JWT', () => {
    // header.payload.signature — payload base64 is {"role":"service_role"}
    // {"alg":"HS256"} = eyJhbGciOiJIUzI1NiJ9
    // {"role":"service_role","iss":"supabase"} = eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UifQ
    const serviceRoleJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UifQ.sig';
    expect(() => assertNoPrivateCredentials(serviceRoleJwt, 'anonKey'))
      .toThrow(FeedbackCredentialLeakError);
  });

  it('allows Supabase anon JWT (role=anon)', () => {
    // {"role":"anon","iss":"supabase"} = eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIn0
    const anonJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIn0.sig';
    expect(() => assertNoPrivateCredentials(anonJwt, 'anonKey')).not.toThrow();
  });

  it('error message points to the safe alternative', () => {
    try {
      assertNoPrivateCredentials('ghp_abcdefghijklmnopqrstuv', 'token');
    } catch (e) {
      expect(e.message).toMatch(/githubIssue/);
      expect(e.message).toMatch(/server env/);
    }
  });

  it('error includes structured fields for telemetry', () => {
    try {
      assertNoPrivateCredentials('lin_api_aaaaaaaaaaaaaaaaaaaa', 'apiKey');
    } catch (e) {
      expect(e.code).toBe('private_credential_in_bundle');
      expect(e.detectedAs).toMatch(/Linear/);
      expect(e.fieldName).toBe('apiKey');
    }
  });

  it('allows null / empty / unknown strings', () => {
    expect(() => assertNoPrivateCredentials(null, 'k')).not.toThrow();
    expect(() => assertNoPrivateCredentials('', 'k')).not.toThrow();
    expect(() => assertNoPrivateCredentials('https://api.example.com', 'url')).not.toThrow();
    expect(() => assertNoPrivateCredentials('my-project-id', 'projectId')).not.toThrow();
  });

  it('detectPrivateCredential returns pattern name without throwing', () => {
    expect(detectPrivateCredential('ghp_abcdefghijklmnopqrstuv')).toMatch(/GitHub/);
    expect(detectPrivateCredential('regular-string')).toBeNull();
  });
});
