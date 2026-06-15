import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guardrails for the framework-agnostic capture/core entry point.
 *
 * The whole point of `react-visual-feedback/capture/core` is that it
 * imports zero React. If anyone accidentally adds a React import
 * to a file reachable from `src/capture/core.js`, the built bundle
 * will pull React in and this test will catch it.
 */
describe('capture/core framework-agnostic guardrail', () => {
  it('source entry imports nothing from react', () => {
    const src = readFileSync(join(process.cwd(), 'src/capture/core.js'), 'utf8');
    expect(src).not.toMatch(/from ['"]react['"]/);
    expect(src).not.toMatch(/from ['"]react-dom['"]/);
  });

  it('exports the pure-logic surface', async () => {
    const mod = await import('../core.js');
    expect(typeof mod.createRingBuffer).toBe('function');
    expect(typeof mod.mountInteractionObserver).toBe('function');
    expect(typeof mod.mountNetworkObserver).toBe('function');
    expect(typeof mod.mountErrorObserver).toBe('function');
    expect(typeof mod.mountRouteObserver).toBe('function');
    expect(typeof mod.snapshotFiberTree).toBe('function');
    expect(typeof mod.resolveBuildInfo).toBe('function');
    expect(typeof mod.runViaWorker).toBe('function');
    expect(typeof mod.runOnMainThread).toBe('function');
  });
});
