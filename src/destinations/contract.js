/**
 * Destination adapter contract
 * ============================
 *
 * Every adapter is a factory returning an object with this shape:
 *
 *   {
 *     name:     string,                          // 'local' | 'jira' | 'supabasePublic' | ...
 *     mode:     'server-proxied' | 'public-token' | 'local',
 *     send:     (feedback, ctx) => Promise<DestinationResult>,
 *     describe: () => string,                    // one-line human description for the modal footer
 *   }
 *
 * DestinationResult — what `send` resolves with:
 *
 *   { ok: true,  id?: string, url?: string, durationMs: number }
 *   { ok: false, error: string, code?: string, durationMs: number }
 *
 * The widget dispatches the same feedback to all destinations in parallel
 * and surfaces per-destination status in the modal footer.
 *
 * SECURITY INVARIANT
 * ------------------
 * No adapter ever holds a production private credential in the browser
 * bundle. Routes:
 *
 *   1. mode: 'server-proxied' — adapter POSTs to a host-owned route;
 *      the host server holds the key. Ship a copy-paste handler.
 *
 *   2. mode: 'public-token' — adapter sends directly to the destination
 *      using a write-only public credential (e.g. Supabase anon key
 *      with RLS allowing INSERT only). Adapter MUST be named *Public.
 *
 *   3. mode: 'local' — never leaves the browser (localStorage).
 *
 * Adapter constructors MUST refuse known-private-key shapes via
 * `assertNoPrivateCredentials(value, fieldName)` (in safety.js).
 */

/**
 * Build a DestinationResult for a successful send.
 */
export function ok({ id, url, durationMs }) {
  return { ok: true, id: id || null, url: url || null, durationMs };
}

/**
 * Build a DestinationResult for a failed send.
 */
export function fail({ error, code, durationMs }) {
  return { ok: false, error: String(error || 'unknown'), code: code || 'destination_failed', durationMs };
}

/**
 * Wraps a `send` body with timing + uniform error catching.
 * Adapters call `await timed(async () => { ... })`.
 */
export async function timed(impl) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  try {
    const result = await impl();
    const durationMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
    return ok({ ...result, durationMs });
  } catch (e) {
    const durationMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
    return fail({ error: e?.message || String(e), code: e?.code || 'destination_failed', durationMs });
  }
}
