#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { gzipSizeSync } from 'gzip-size';

const BUDGETS = {
  // Main bundle accumulates Phase A security + B1 primitives + B2 dashboard +
  // C capture context wiring. Hosts that care about size import the per-feature
  // subpath bundles below directly.
  'dist/index.esm.js': { maxGzipKB: 140, note: 'main bundle (all phases)' },
  'dist/capture/index.esm.js': { maxGzipKB: 12, note: 'capture client (main thread)' },
  'dist/capture/worker.js': { maxGzipKB: 35, note: 'capture worker (lazy chunk)' },
  'dist/dashboard/index.esm.js': { maxGzipKB: 60, note: 'Command Center (lazy)' },
  'dist/ui/index.esm.js': { maxGzipKB: 25, note: 'UI primitives (lazy)' },
};

let failures = 0;
for (const [file, budget] of Object.entries(BUDGETS)) {
  const abs = path.resolve(process.cwd(), file);
  if (!fs.existsSync(abs)) {
    console.log(`SKIP ${file} (not built yet)`);
    continue;
  }
  const gz = gzipSizeSync(fs.readFileSync(abs));
  const kb = (gz / 1024).toFixed(1);
  const status = gz <= budget.maxGzipKB * 1024 ? 'OK' : 'FAIL';
  console.log(`${status}  ${file}  ${kb}KB gz / ${budget.maxGzipKB}KB max  ${budget.note}`);
  if (status === 'FAIL') failures += 1;
}
process.exit(failures > 0 ? 1 : 0);
