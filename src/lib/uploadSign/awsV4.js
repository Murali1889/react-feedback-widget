/**
 * AWS Signature V4 helper — produces a presigned PUT URL for S3 or
 * any S3-compatible store (Cloudflare R2, MinIO, Backblaze B2, Wasabi,
 * DigitalOcean Spaces, …).
 *
 * Server-side only — needs the host's access/secret key, which lives
 * in env. The widget itself never touches these.
 *
 *   const { url, headers, finalUrl, expiresAt } = await presignS3Put({
 *     accessKeyId, secretAccessKey,
 *     bucket, key, region, endpoint,  // endpoint: S3 region URL or R2 custom URL
 *     contentType, contentLength,
 *     expiresSeconds: 300,
 *     publicBaseUrl,                   // optional — for CDN-fronted reads
 *   })
 *
 *   // browser then: fetch(url, { method: 'PUT', headers, body: blob })
 *   // public read URL: finalUrl
 *
 * No external dependencies; uses Node's native crypto.
 */

import { createHash, createHmac } from 'node:crypto';

const ALG = 'AWS4-HMAC-SHA256';

function hex(buf) {
  return Buffer.from(buf).toString('hex');
}

function sha256Hex(input) {
  return createHash('sha256').update(input).digest('hex');
}

function hmac(key, msg) {
  return createHmac('sha256', key).update(msg).digest();
}

/**
 * Build the date and credential strings.
 */
function buildDate(now = new Date()) {
  const amz = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  // e.g. 20260616T143501Z
  const day = amz.slice(0, 8);  // 20260616
  return { amz, day };
}

function uriEncode(s, encodeSlash = true) {
  return encodeURIComponent(s)
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%2F/g, encodeSlash ? '%2F' : '/');
}

function canonicalQueryString(params) {
  const keys = Object.keys(params).sort();
  return keys.map((k) => `${uriEncode(k)}=${uriEncode(params[k])}`).join('&');
}

function signingKey(secret, day, region, service) {
  const k1 = hmac('AWS4' + secret, day);
  const k2 = hmac(k1, region);
  const k3 = hmac(k2, service);
  return hmac(k3, 'aws4_request');
}

/**
 * Produce a presigned PUT URL.
 *
 *   bucket   — bucket / R2 bucket name
 *   key      — object path inside the bucket (no leading slash)
 *   region   — AWS region or 'auto' for R2
 *   endpoint — base URL of the store:
 *                  S3:  https://s3.<region>.amazonaws.com
 *                  R2:  https://<accountId>.r2.cloudflarestorage.com
 *                  custom: anything S3-API compatible
 *   contentType   — what the browser will set
 *   contentLength — what the browser will upload (bytes); enforced server-side
 *   expiresSeconds — short (300 = 5 min recommended)
 *   publicBaseUrl  — if you serve reads via a CDN / public bucket URL,
 *                    finalUrl = `${publicBaseUrl}/${key}`. Default: same host.
 */
export function presignS3Put({
  accessKeyId,
  secretAccessKey,
  bucket,
  key,
  region = 'auto',
  endpoint,
  contentType = 'application/octet-stream',
  contentLength = null,
  expiresSeconds = 300,
  publicBaseUrl = null,
  now = new Date(),
}) {
  if (!accessKeyId || !secretAccessKey) throw new Error('presignS3Put: missing credentials');
  if (!bucket || !key)                   throw new Error('presignS3Put: missing bucket or key');
  if (!endpoint)                          throw new Error('presignS3Put: missing endpoint');

  const { amz, day } = buildDate(now);
  const host = new URL(endpoint).host;
  const service = 's3';
  const credentialScope = `${day}/${region}/${service}/aws4_request`;

  // For R2, the canonical path is /bucket/key. For path-style S3 too.
  const canonicalUri = `/${encodeURIComponent(bucket)}/${key.split('/').map((p) => uriEncode(p, false)).join('/')}`;

  // Required signed headers — for browser PUT, we sign host only (UNSIGNED-PAYLOAD).
  const signedHeaders = 'host';
  const canonicalHeaders = `host:${host}\n`;

  const queryParams = {
    'X-Amz-Algorithm': ALG,
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amz,
    'X-Amz-Expires': String(expiresSeconds),
    'X-Amz-SignedHeaders': signedHeaders,
  };

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQueryString(queryParams),
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    ALG,
    amz,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const sigKey = signingKey(secretAccessKey, day, region, service);
  const signature = hex(hmac(sigKey, stringToSign));

  const finalQuery = canonicalQueryString(queryParams) + `&X-Amz-Signature=${signature}`;
  const url = `${endpoint.replace(/\/$/, '')}${canonicalUri}?${finalQuery}`;

  // The browser must echo content-type if we want the stored object to have it.
  const headers = { 'content-type': contentType };
  if (contentLength != null) headers['content-length'] = String(contentLength);

  // Public access URL — for CDN-fronted reads or public buckets.
  const finalUrl = publicBaseUrl
    ? `${publicBaseUrl.replace(/\/$/, '')}/${key}`
    : `${endpoint.replace(/\/$/, '')}${canonicalUri}`;

  const expiresAt = new Date(now.getTime() + expiresSeconds * 1000).toISOString();

  return { url, headers, finalUrl, expiresAt };
}
