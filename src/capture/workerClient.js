import { assembleTicket } from './worker/ticketAssembler.js';
import {
  redactInteractionTrail,
  redactFiberSnapshot,
  redactBuildInfo,
  resolveRedactionConfig,
} from '../lib/feedbackSecurity.js';

let worker = null;
let workerIdleTimer = null;
let nextId = 1;
const pending = new Map();

function getWorkerUrl() {
  if (typeof globalThis !== 'undefined' && typeof globalThis.__feedbackWorkerUrl === 'string') {
    return globalThis.__feedbackWorkerUrl;
  }
  return null;
}

function spawn() {
  if (worker) return worker;
  const url = getWorkerUrl();
  if (!url || typeof Worker === 'undefined') return null;
  try {
    worker = new Worker(url, { type: 'module' });
  } catch {
    worker = null;
    return null;
  }
  worker.addEventListener('message', (e) => {
    const { id, type, ticket, error } = e.data || {};
    const cb = pending.get(id);
    if (!cb) return;
    pending.delete(id);
    if (type === 'assembled') cb.resolve({ ...ticket, assembledOn: 'worker' });
    else cb.reject(new Error(error || 'worker error'));
    scheduleIdleKill();
  });
  return worker;
}

function scheduleIdleKill() {
  if (workerIdleTimer) clearTimeout(workerIdleTimer);
  workerIdleTimer = setTimeout(() => {
    if (worker) { try { worker.terminate(); } catch {} worker = null; }
  }, 30_000);
}

export function runViaWorker(input) {
  const w = spawn();
  if (!w) return runOnMainThread(input);
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    w.postMessage({
      type: 'assemble', id,
      item: input.item,
      interactions: input.interactions || [],
      errors: input.errors || [],
      routes: input.routes || [],
      fiberSnapshot: input.fiberSnapshot || {},
      buildInfo: input.buildInfo || {},
      flags: input.flags || {},
      framesToResolve: input.framesToResolve || [],
      redactConfig: input.redactConfig || 'default',
    });
  }).catch(() => runOnMainThread(input));
}

export async function runOnMainThread(input) {
  const cfg = resolveRedactionConfig(input.redactConfig || 'default');
  const ticket = assembleTicket({
    item: input.item,
    interactions: redactInteractionTrail(input.interactions || [], cfg),
    errors: input.errors || [],
    routes: input.routes || [],
    fiberSnapshot: redactFiberSnapshot(input.fiberSnapshot || {}, cfg),
    buildInfo: redactBuildInfo(input.buildInfo || {}, cfg),
    flags: input.flags || {},
    resolvedFrames: [],
  });
  return { ...ticket, assembledOn: 'main' };
}
