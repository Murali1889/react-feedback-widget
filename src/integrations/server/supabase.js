/**
 * createSupabaseHandler — server-side handler for the supabaseProxied()
 * client adapter.
 *
 * Inserts the feedback into a Supabase table using the SERVICE-ROLE key
 * (set as env). This is the safe-by-default Supabase route — the
 * service-role key never leaves your server.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_FEEDBACK_TABLE
 *      (defaults to "feedback")
 *
 * Required table:
 *
 *   create table feedback (
 *     id uuid primary key default gen_random_uuid(),
 *     payload jsonb not null,
 *     created_at timestamptz not null default now(),
 *     origin text
 *   );
 *
 * Uses Supabase's PostgREST endpoint directly (no SDK) so the bundle
 * stays small and isomorphic.
 */

import { warnIfInsecureFactory } from './_shared.js';

const warnIfInsecure = warnIfInsecureFactory('createSupabaseHandler');

async function insertRow({ url, serviceKey, table, feedbackData, origin }) {
  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(table)}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      prefer: 'return=representation',
    },
    body: JSON.stringify([{ payload: feedbackData, origin: origin || null }]),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`supabase ${res.status}: ${text.slice(0, 300)}`);
  }
  const body = await res.json().catch(() => null);
  return Array.isArray(body) ? body[0] : body;
}

export function createSupabaseHandler(config = {}) {
  warnIfInsecure(config);

  return async (req, res) => {
    const url = config.url || process.env.SUPABASE_URL;
    const serviceKey = config.serviceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
    const table = config.table || process.env.SUPABASE_FEEDBACK_TABLE || 'feedback';
    if (!url || !serviceKey) {
      throw new Error('createSupabaseHandler: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    if (res && typeof res === 'object' && res.authContext) {
      const feedbackData = req;
      const origin = res.authContext?.origin || null;
      const row = await insertRow({ url, serviceKey, table, feedbackData, origin });
      return { data: { id: row?.id || null, url: null } };
    }

    let feedbackData;
    if (typeof req?.json === 'function') feedbackData = await req.json();
    else if (req?.body) feedbackData = req.body;
    else feedbackData = {};
    const origin = (typeof req?.headers?.get === 'function' && req.headers.get('origin'))
      || (req?.headers && req.headers.origin)
      || null;

    const row = await insertRow({ url, serviceKey, table, feedbackData, origin });
    const result = { id: row?.id || null, url: null };

    if (res?.json) { res.status(200).json(result); return; }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
}
