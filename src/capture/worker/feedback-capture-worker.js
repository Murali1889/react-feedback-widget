import { assembleTicket } from './ticketAssembler.js';
import { resolveStack } from './sourcemaps.js';
import {
  redactInteractionTrail,
  redactFiberSnapshot,
  redactBuildInfo,
  redactNetworkEntries,
  resolveRedactionConfig,
} from '../../lib/feedbackSecurity.js';

self.addEventListener('message', async (e) => {
  const msg = e.data;
  if (!msg || msg.type !== 'assemble') return;
  try {
    const cfg = resolveRedactionConfig(msg.redactConfig || 'default');
    const resolvedFrames = msg.framesToResolve?.length
      ? await resolveStack(msg.framesToResolve)
      : [];
    const ticket = assembleTicket({
      item: msg.item,
      interactions: redactInteractionTrail(msg.interactions || [], cfg),
      errors: msg.errors || [],
      routes: msg.routes || [],
      network: redactNetworkEntries(msg.network || [], cfg),
      fiberSnapshot: redactFiberSnapshot(msg.fiberSnapshot || {}, cfg),
      buildInfo: redactBuildInfo(msg.buildInfo || {}, cfg),
      flags: msg.flags || {},
      resolvedFrames,
    });
    self.postMessage({ type: 'assembled', id: msg.id, ticket });
  } catch (err) {
    self.postMessage({ type: 'error', id: msg.id, error: err?.message || String(err) });
  }
});
