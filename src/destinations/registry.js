/**
 * Destination registry — parallel fanout of one submission to N destinations.
 *
 * Hosts pass `destinations={[ ... ]}` to FeedbackProvider. Each entry is
 * an adapter (factory return). The registry calls `send(feedback, ctx)`
 * on every adapter in parallel, collects per-destination results, and
 * surfaces them in the modal footer.
 *
 * One adapter failing never blocks the others. Local-only adapters
 * (mode: 'local') resolve first so reporter sees their feedback saved
 * before remote roundtrips complete.
 */

export async function dispatchToDestinations(destinations, feedback, ctx = {}) {
  if (!Array.isArray(destinations) || destinations.length === 0) {
    return { results: [], anySucceeded: false, anyFailed: false };
  }

  const settled = await Promise.allSettled(
    destinations.map((dest) =>
      Promise.resolve()
        .then(() => dest.send(feedback, ctx))
        .then((result) => ({ name: dest.name, mode: dest.mode || 'unknown', describe: dest.describe?.() || dest.name, ...result }))
    )
  );

  const results = settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value;
    return {
      name: destinations[i]?.name || `dest-${i}`,
      mode: destinations[i]?.mode || 'unknown',
      describe: destinations[i]?.describe?.() || destinations[i]?.name || `dest-${i}`,
      ok: false,
      error: s.reason?.message || String(s.reason || 'send rejected'),
      code: 'destination_threw',
      durationMs: 0,
    };
  });

  return {
    results,
    anySucceeded: results.some((r) => r.ok),
    anyFailed: results.some((r) => !r.ok),
  };
}

/**
 * Coerce legacy `integrations={jira:..., sheets:...}` config into the new
 * destinations[] array. Keeps existing hosts working without code change.
 */
export function destinationsFromLegacyIntegrations(integrations, selectedIntegrations, integrationClient) {
  if (!integrations) return [];
  const out = [];
  if (integrations.jira?.enabled && selectedIntegrations?.jira !== false) {
    out.push(legacyAdapter('jira', integrationClient));
  }
  if (integrations.sheets?.enabled && selectedIntegrations?.sheets !== false) {
    out.push(legacyAdapter('sheets', integrationClient));
  }
  return out;
}

function legacyAdapter(kind, client) {
  return {
    name: kind,
    mode: 'server-proxied',
    describe: () => kind,
    send: async (feedback) => {
      const t0 = Date.now();
      try {
        const result = await client.sendFeedback(feedback, { [kind]: true });
        return { ok: true, id: result?.[kind]?.id || null, url: result?.[kind]?.url || null, durationMs: Date.now() - t0 };
      } catch (e) {
        return { ok: false, error: e?.message || 'send failed', code: 'destination_failed', durationMs: Date.now() - t0 };
      }
    },
  };
}
