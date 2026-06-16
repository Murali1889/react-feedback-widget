import React, { useEffect, useMemo, useRef } from 'react';
import { CaptureContext } from './CaptureContext.jsx';
import { createRingBuffer } from './ringBuffer.js';
import { mountInteractionObserver } from './observers/interaction.js';
import { mountRouteObserver } from './observers/route.js';
import { mountErrorObserver } from './observers/error.js';
import { mountNetworkObserver } from './observers/network.js';
import {
  mountWebVitalsObserver,
  mountDomMutationObserver,
  snapshotEnvironment,
  snapshotStorageQuota,
} from './observers/environment.js';
import { snapshotFlags } from './observers/flags.js';
import { resolveBuildInfo } from './buildInfo.js';
import { snapshotFiberTree } from './snapshot/fiberWalk.js';

export function CaptureProvider({ children, config = {} }) {
  const interactionRef = useRef(null);
  const errorRef = useRef(null);
  const routeRef = useRef(null);
  const networkRef = useRef(null);
  const vitalsRef = useRef(null);
  const mutationsRef = useRef(null);
  const unmountRef = useRef([]);

  if (!interactionRef.current) interactionRef.current = createRingBuffer(config.interactionBufferSize || 128);
  if (!errorRef.current) errorRef.current = createRingBuffer(20);
  if (!routeRef.current) routeRef.current = createRingBuffer(20);
  if (!networkRef.current) networkRef.current = createRingBuffer(config.networkBufferSize || 50);
  if (!vitalsRef.current) vitalsRef.current = createRingBuffer(config.vitalsBufferSize || 32);
  if (!mutationsRef.current) mutationsRef.current = createRingBuffer(config.mutationsBufferSize || 48);

  useEffect(() => {
    const u1 = mountInteractionObserver(interactionRef.current, { sensitiveSelectors: config.sensitiveSelectors });
    const u2 = mountRouteObserver(routeRef.current);
    const u3 = mountErrorObserver(errorRef.current);
    const u4 = config.disableNetworkCapture
      ? () => {}
      : mountNetworkObserver(networkRef.current, { excludePatterns: config.networkExcludePatterns });
    const u5 = config.disableVitals ? () => {} : mountWebVitalsObserver(vitalsRef.current);
    const u6 = config.disableMutations ? () => {} : mountDomMutationObserver(mutationsRef.current);
    unmountRef.current = [u1, u2, u3, u4, u5, u6];
    return () => { unmountRef.current.forEach((u) => u && u()); };
  }, [config.sensitiveSelectors, config.disableNetworkCapture, config.networkExcludePatterns, config.disableVitals, config.disableMutations]);

  const value = useMemo(() => ({
    getInteractions: () => interactionRef.current.snapshot(),
    getErrors: () => errorRef.current.snapshot(),
    getRoutes: () => routeRef.current.snapshot(),
    getNetwork: () => networkRef.current.snapshot(),
    getVitals: () => vitalsRef.current.snapshot(),
    getMutations: () => mutationsRef.current.snapshot(),
    getEnvironment: () => snapshotEnvironment(),
    getStorageQuota: () => snapshotStorageQuota(),
    getBuildInfo: () => resolveBuildInfo(config.buildInfo),
    getFlags: () => snapshotFlags(config.flagsSnapshot),
    snapshotFiber: (rootFiber, opts) => snapshotFiberTree(rootFiber, opts),
    errorBuffer: errorRef.current,
  }), [config.buildInfo, config.flagsSnapshot]);

  return <CaptureContext.Provider value={value}>{children}</CaptureContext.Provider>;
}

export default CaptureProvider;
