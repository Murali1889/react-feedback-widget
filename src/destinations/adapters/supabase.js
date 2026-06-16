import { timed } from '../contract.js';
import { proxyPost } from '../proxyPost.js';
import { assertNoPrivateCredentials } from '../safety.js';

/**
 * supabasePublic({ url, anonKey, table }) — direct-to-Supabase using the
 * ANON key + a write-only RLS policy on the feedback table.
 *
 * SECURITY MODEL — read this before deploying:
 *
 * The anon key is intended to be public. It is NOT a password. Security
 * comes from your row-level-security policy. For feedback intake the
 * minimum RLS policy is INSERT-ONLY for anon; no SELECT, no UPDATE,
 * no DELETE.
 *
 * Required SQL on your Supabase project:
 *
 *   create table feedback (
 *     id uuid primary key default gen_random_uuid(),
 *     payload jsonb not null,
 *     created_at timestamptz not null default now(),
 *     origin text
 *   );
 *
 *   alter table feedback enable row level security;
 *
 *   create policy "anon can insert feedback only" on feedback
 *     for insert
 *     to anon
 *     with check (
 *       jsonb_typeof(payload) = 'object'
 *       and pg_column_size(payload) < 100000      -- 100KB cap per row
 *     );
 *   -- intentionally NO select / update / delete policies for anon
 *
 *   create policy "service role full access" on feedback
 *     for all
 *     to service_role
 *     using (true) with check (true);
 *
 * If you skip the RLS step, ANYONE can read all feedback. The adapter
 * refuses service-role keys at construction time, but it cannot
 * inspect your RLS policy from the browser — that's on you.
 *
 * For a fully server-proxied alternative (no client-side credential
 * at all), use supabaseProxied(). Default to that unless you have a
 * reason not to.
 */
export function supabasePublic({ url, anonKey, table = 'feedback' } = {}) {
  if (typeof url !== 'string' || !/^https?:\/\/.+supabase\.co/.test(url)) {
    throw new Error('supabasePublic(): { url } must be a https://*.supabase.co URL');
  }
  if (typeof anonKey !== 'string' || anonKey.length < 50) {
    throw new Error('supabasePublic(): { anonKey } looks invalid');
  }
  assertNoPrivateCredentials(anonKey, 'anonKey');

  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/${encodeURIComponent(table)}`;
  return {
    name: 'supabasePublic',
    mode: 'public-token',
    describe: () => `supabase ${table}`,
    send: (feedback) => timed(async () => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'apikey': anonKey,
          'authorization': `Bearer ${anonKey}`,
          'prefer': 'return=representation',
        },
        body: JSON.stringify([{
          payload: feedback,
          origin: typeof location !== 'undefined' ? location.origin : null,
        }]),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`supabase returned ${res.status}: ${text.slice(0, 200)}`);
      }
      const body = await res.json().catch(() => null);
      const row = Array.isArray(body) ? body[0] : body;
      return { id: row?.id || null, url: null };
    }),
  };
}

/**
 * supabaseProxied({ endpoint }) — host-owned route, server holds the
 * service-role key (or a scoped insert-only key). Default safe pattern.
 *
 * Server handler template (Next.js app router):
 *
 *   // app/api/feedback/supabase/route.ts
 *   import { createClient } from '@supabase/supabase-js';
 *   const supabase = createClient(
 *     process.env.SUPABASE_URL!,
 *     process.env.SUPABASE_SERVICE_ROLE_KEY!,
 *   );
 *   export async function POST(req: Request) {
 *     const body = await req.json();
 *     const { data, error } = await supabase
 *       .from('feedback').insert({ payload: body, origin: req.headers.get('origin') })
 *       .select('id').single();
 *     if (error) return Response.json({ error: error.message }, { status: 500 });
 *     return Response.json({ id: data.id });
 *   }
 */
export function supabaseProxied({ endpoint = '/api/feedback/supabase' } = {}) {
  return {
    name: 'supabase',
    mode: 'server-proxied',
    describe: () => endpoint,
    send: (feedback) => timed(() => proxyPost(endpoint, feedback)),
  };
}
