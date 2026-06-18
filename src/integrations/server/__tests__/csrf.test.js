/**
 * CSRF — required when a cookie session is in play, skipped for bearer-
 * only or unauthenticated requests (browsers can't implicitly attach
 * non-cookie credentials, so there's no confused-deputy to exploit).
 */
import { describe, it, expect } from 'vitest';
import { csrfRequired, checkCsrf, isStateChanging } from '../csrf.js';

function req({ method = 'POST', headers = {}, cookies = {} } = {}) {
  return { method, headers, cookies };
}

describe('isStateChanging', () => {
  it('flags POST/PUT/PATCH/DELETE', () => {
    expect(isStateChanging('POST')).toBe(true);
    expect(isStateChanging('put')).toBe(true);
    expect(isStateChanging('PATCH')).toBe(true);
    expect(isStateChanging('DELETE')).toBe(true);
  });
  it('skips GET/HEAD/OPTIONS', () => {
    expect(isStateChanging('GET')).toBe(false);
    expect(isStateChanging('HEAD')).toBe(false);
    expect(isStateChanging('OPTIONS')).toBe(false);
  });
});

describe('csrfRequired', () => {
  it('not required for safe methods even with a cookie', () => {
    expect(csrfRequired(req({ method: 'GET',  headers: { cookie: 'x=1' } }))).toBe(false);
    expect(csrfRequired(req({ method: 'HEAD', headers: { cookie: 'x=1' } }))).toBe(false);
  });

  it('not required for bearer-only (no implicit credential = no confused-deputy)', () => {
    expect(csrfRequired(req({ headers: { authorization: 'Bearer xyz' } }))).toBe(false);
  });

  it('not required for unauthenticated requests (authorize will reject)', () => {
    expect(csrfRequired(req({ headers: {} }))).toBe(false);
  });

  it('REQUIRED whenever a cookie is present (the implicit-credential case)', () => {
    expect(csrfRequired(req({ headers: { cookie: 'sid=abc' } }))).toBe(true);
  });

  it('REQUIRED with cookie + bearer combo (cookie still implicit)', () => {
    expect(csrfRequired(req({ headers: { cookie: 'sid=abc', authorization: 'Bearer xyz' } }))).toBe(true);
  });
});

describe('checkCsrf', () => {
  it('passes when cookie and header tokens match', () => {
    const r = req({
      headers: { 'x-csrf-token': 'abc123' },
      cookies: { 'csrf-token':  'abc123' },
    });
    expect(checkCsrf(r)).toBe(true);
  });

  it('passes with the XSRF-TOKEN alias', () => {
    const r = req({
      headers: { 'x-xsrf-token': 'abc123' },
      cookies: { 'XSRF-TOKEN':   'abc123' },
    });
    expect(checkCsrf(r)).toBe(true);
  });

  it('fails on token mismatch', () => {
    const r = req({
      headers: { 'x-csrf-token': 'abc' },
      cookies: { 'csrf-token':  'xyz' },
    });
    expect(checkCsrf(r)).toBe(false);
  });

  it('fails when either side is missing', () => {
    expect(checkCsrf(req({ cookies: { 'csrf-token': 'abc' } }))).toBe(false);
    expect(checkCsrf(req({ headers: { 'x-csrf-token': 'abc' } }))).toBe(false);
    expect(checkCsrf(req())).toBe(false);
  });
});
