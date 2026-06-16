import { timed } from '../contract.js';
import { proxyPost } from '../proxyPost.js';
import { assertNoPrivateCredentials } from '../safety.js';

/**
 * webhook({ url, headers? }) — POST the feedback JSON to any URL.
 *
 * No credentials accepted client-side. If the destination requires
 * auth, the host's server should sit between the widget and the
 * destination (see webhookProxied below).
 *
 * Refuses known private-key shapes in the headers object — if the host
 * tries to set Authorization: 'ghp_...' or similar, construction
 * throws.
 */
export function webhook({ url, headers = {}, name = 'webhook' } = {}) {
  if (typeof url !== 'string' || !/^https?:\/\//.test(url)) {
    throw new Error('webhook(): { url } must be a full http(s) URL');
  }
  // Scan headers for leaked private credentials
  for (const k of Object.keys(headers || {})) {
    assertNoPrivateCredentials(headers[k], `header.${k}`);
  }

  return {
    name,
    mode: 'public-token',
    describe: () => new URL(url).host,
    send: (feedback) => timed(async () => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(feedback),
        // Origin handling left to the destination — most webhook endpoints accept any origin.
        mode: 'cors',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`webhook returned ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
      }
      const body = await res.json().catch(() => null);
      return { id: body?.id || null, url: body?.url || null };
    }),
  };
}

/**
 * webhookProxied({ endpoint }) — POST to a host-owned route which
 * forwards to the real destination with the server-side credential
 * attached. Default safe pattern.
 */
export function webhookProxied({ endpoint = '/api/feedback/webhook', name = 'webhook-proxied' } = {}) {
  return {
    name,
    mode: 'server-proxied',
    describe: () => endpoint,
    send: (feedback) => timed(() => proxyPost(endpoint, feedback)),
  };
}
