import React, { useEffect, useMemo, useRef } from 'react';
import { CaptureContext } from './CaptureContext.jsx';
import { createRingBuffer } from './ringBuffer.js';
import { mountInteractionObserver } from './observers/interaction.js';
import { mountRouteObserver } from './observers/route.js';
import { mountErrorObserver } from './observers/error.js';
import { snapshotFlags } from './observers/flags.js';
import { resolveBuildInfo } from './buildInfo.js';
import { snapshotFiberTree } from './snapshot/fiberWalk.js';

export function CaptureProvider({ children, config = {} }) {
  const interactionRef = useRef(null);
  const errorRef = useRef(null);
  const routeRef = useRef(null);
  const unmountRef = useRef([]);

  if (!interactionRef.current) interactionRef.current = createRingBuffer(config.interactionBufferSize || 128);
  if (!errorRef.current) errorRef.current = createRingBuffer(20);
  if (!routeRef.current) routeRef.current = createRingBuffer(20);

  useEffect(() => {
    const u1 = mountInteractionObserver(interactionRef.current, { sensitiveSelectors: config.sensitiveSelectors });
    const u2 = mountRouteObserver(routeRef.current);
    const u3 = mountErrorObserver(errorRef.current);
    unmountRef.current = [u1, u2, u3];
    return () => { unmountRef.current.forEach((u) => u && u()); };
  }, [config.sensitiveSelectors]);

  const value = useMemo(() => ({
    getInteractions: () => interactionRef.current.snapshot(),
    getErrors: () => errorRef.current.snapshot(),
    getRoutes: () => routeRef.current.snapshot(),
    getBuildInfo: () => resolveBuildInfo(config.buildInfo),
    getFlags: () => snapshotFlags(config.flagsSnapshot),
    snapshotFiber: (rootFiber, opts) => snapshotFiberTree(rootFiber, opts),
    errorBuffer: errorRef.current,
  }), [config.buildInfo, config.flagsSnapshot]);

  return <CaptureContext.Provider value={value}>{children}</CaptureContext.Provider>;
}

export default CaptureProvider;
