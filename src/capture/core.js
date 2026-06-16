/**
 * Framework-agnostic capture entry point.
 *
 * Exports ONLY the pure-logic side of the capture pipeline — observers,
 * ring buffer, fiber serializer, build-info resolver, worker client.
 * Nothing here imports React, so this module is consumable from
 * vanilla JS, Vue, Svelte, Web Components, or a Node script.
 *
 * If you need the React provider, import from 'react-visual-feedback/capture'
 * (which re-exports this plus the React bindings).
 */

export { createRingBuffer } from './ringBuffer.js';
export { mountInteractionObserver } from './observers/interaction.js';
export { mountRouteObserver } from './observers/route.js';
export { mountErrorObserver } from './observers/error.js';
export { mountNetworkObserver } from './observers/network.js';
export {
  mountWebVitalsObserver,
  mountDomMutationObserver,
  snapshotEnvironment,
  snapshotStorageQuota,
} from './observers/environment.js';
export { snapshotFlags } from './observers/flags.js';
export { resolveBuildInfo } from './buildInfo.js';
export { snapshotFiberTree } from './snapshot/fiberWalk.js';
export { selectorPath, labelFor } from './snapshot/selectorPath.js';
export { runViaWorker, runOnMainThread } from './workerClient.js';
