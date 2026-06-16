/**
 * createUploadUrlHandler — server factory that returns SHORT-LIVED
 * signed upload URLs for binary parts of a feedback submission.
 *
 * Wraps with withSecureDefaults({ authorize }) just like every other
 * handler — same origin / CSRF / rate-limit / auth path. The
 * authContext is used to namespace the storage path so an attacker
 * with a valid session can ONLY upload into their own scope.
 *
 *   const handler = createUploadUrlHandler({
 *     provider: 's3' | 'r2' | 'supabase' | customSigner,
 *     bucket, accessKeyId, secretAccessKey, region, endpoint,
 *     supabaseUrl, serviceKey,
 *     publicBaseUrl,
 *     maxBytesPerFile: 50 * 1024 * 1024,   // 50 MB cap
 *     allowedMimes: ['image/*', 'video/*', 'application/pdf'],
 *     pathPrefix: (ctx) => `${ctx.projectId || 'p'}/${ctx.userId || 'u'}`,
 *     expiresSeconds: 300,
 *   })
 *
 * Request body the browser sends:
 *
 *   {
 *     files: [
 *       { name: 'screenshot', mimeType: 'image/webp', size: 19064 },
 *       { name: 'video',      mimeType: 'video/webm', size: 1340000 },
 *     ]
 *   }
 *
 * Response shape:
 *
 *   {
 *     uploads: [
 *       { name: 'screenshot', url, headers, finalUrl, expiresAt },
 *       { name: 'video',      url, headers, finalUrl, expiresAt },
 *     ]
 *   }
 *
 * SECURITY:
 *  - File mime + size enforced server-side BEFORE signing.
 *  - URLs have a short expiry (5 min default).
 *  - The path is server-chosen via pathPrefix(ctx) — clients can't write
 *    outside their scope.
 *  - The handler refuses unknown providers and missing credentials.
 *  - Storage credentials NEVER leave the server.
 */

import { presignS3Put, presignSupabaseUpload } from '../../lib/uploadSign/index.js';
import { warnIfInsecureFactory } from './_shared.js';

const warnIfInsecure = warnIfInsecureFactory('createUploadUrlHandler');

const DEFAULTS = {
  maxBytesPerFile: 50 * 1024 * 1024,       // 50 MB
  maxFilesPerRequest: 5,
  allowedMimes: ['image/png', 'image/jpeg', 'image/webp', 'video/webm', 'video/mp4', 'application/pdf'],
  expiresSeconds: 300,
};

function mimeMatches(mime, allowed) {
  for (const a of allowed) {
    if (a === mime) return true;
    if (a.endsWith('/*') && mime?.startsWith?.(a.slice(0, -1))) return true;
  }
  return false;
}

function makeRandomId() {
  // Crypto-safe random 12-char id for the storage path.
  const bytes = new Uint8Array(9);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return Buffer.from(bytes).toString('base64url');
}

function defaultPathPrefix(ctx) {
  const p = ctx?.projectId || 'p';
  const u = ctx?.userId || 'anon';
  return `${p}/${u}`;
}

function extForMime(mime) {
  return ({
    'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png',
    'video/webm': 'webm', 'video/mp4': 'mp4', 'application/pdf': 'pdf',
  })[mime] || 'bin';
}

async function signOne({ provider, config, name, mimeType, size, key }) {
  if (typeof provider === 'function') {
    // Custom signer — host supplies whatever upload strategy they want.
    return provider({ name, mimeType, size, key, config });
  }
  if (provider === 's3' || provider === 'r2') {
    return presignS3Put({
      accessKeyId:     config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      bucket:          config.bucket,
      key,
      region:          config.region || (provider === 'r2' ? 'auto' : 'us-east-1'),
      endpoint:        config.endpoint,
      contentType:     mimeType,
      contentLength:   size,
      expiresSeconds:  config.expiresSeconds || DEFAULTS.expiresSeconds,
      publicBaseUrl:   config.publicBaseUrl,
    });
  }
  if (provider === 'supabase') {
    return presignSupabaseUpload({
      supabaseUrl:    config.supabaseUrl,
      serviceKey:     config.serviceKey,
      bucket:         config.bucket,
      key,
      publicBaseUrl:  config.publicBaseUrl,
    });
  }
  throw new Error(`createUploadUrlHandler: unknown provider "${provider}"`);
}

export function createUploadUrlHandler(config = {}) {
  warnIfInsecure(config);

  const provider = config.provider || 's3';
  const maxBytesPerFile    = config.maxBytesPerFile    ?? DEFAULTS.maxBytesPerFile;
  const maxFilesPerRequest = config.maxFilesPerRequest ?? DEFAULTS.maxFilesPerRequest;
  const allowedMimes       = config.allowedMimes       ?? DEFAULTS.allowedMimes;
  const pathPrefix         = config.pathPrefix         ?? defaultPathPrefix;
  const folderId           = makeRandomId();

  return async (req, res) => {
    // Wrapped path: withSecureDefaults passed (parsedBody, { authContext }).
    let request, authContext;
    if (res && typeof res === 'object' && res.authContext) {
      request = req;
      authContext = res.authContext;
    } else {
      // Raw path — tolerant body parse.
      if (typeof req?.json === 'function') request = await req.json();
      else if (req?.body) request = req.body;
      else request = {};
      authContext = {};
    }

    const files = Array.isArray(request.files) ? request.files : [];
    if (files.length === 0) {
      throw new Error('createUploadUrlHandler: no files in request');
    }
    if (files.length > maxFilesPerRequest) {
      throw new Error(`createUploadUrlHandler: too many files (>${maxFilesPerRequest})`);
    }

    // Per-call random folder under the per-user prefix so two requests
    // never collide.
    const prefix = `${pathPrefix(authContext).replace(/\/+$/, '')}/${folderId}`;

    const out = [];
    for (const f of files) {
      if (!f?.name || typeof f.name !== 'string') {
        throw new Error('createUploadUrlHandler: file missing name');
      }
      if (!mimeMatches(f.mimeType, allowedMimes)) {
        throw new Error(`createUploadUrlHandler: mime "${f.mimeType}" not allowed`);
      }
      if (typeof f.size !== 'number' || f.size <= 0 || f.size > maxBytesPerFile) {
        throw new Error(`createUploadUrlHandler: size out of range for "${f.name}"`);
      }
      const ext = extForMime(f.mimeType);
      const key = `${prefix}/${f.name}.${ext}`;
      const signed = await signOne({ provider, config, name: f.name, mimeType: f.mimeType, size: f.size, key });
      out.push({ name: f.name, ...signed });
    }

    const result = { uploads: out };
    if (res && typeof res === 'object' && res.authContext) {
      return { data: result };
    }
    if (res?.json) { res.status(200).json(result); return; }
    return new Response(JSON.stringify(result), { status: 200, headers: { 'content-type': 'application/json' } });
  };
}
