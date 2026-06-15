# Capture performance budgets

Phase C documents these hard budgets. CI enforces the bundle ones via `npm run build:check-size`; the others are documented test assertions.

| Budget | Limit | Where enforced |
|---|---|---|
| Main bundle (all phases) | ≤ 140KB gz | `npm run build:check-size` |
| UI primitives (lazy `react-visual-feedback/ui`) | ≤ 25KB gz | `npm run build:check-size` |
| Command Center (lazy `react-visual-feedback/dashboard`) | ≤ 60KB gz | `npm run build:check-size` |
| Capture client (lazy `react-visual-feedback/capture`) | ≤ 12KB gz | `npm run build:check-size` |
| Capture worker (lazy `dist/capture/worker.js`) | ≤ 35KB gz | `npm run build:check-size` |
| Main-thread fiber walk (depth 6) | < 2ms p99 | `snapshot/__tests__/fiberWalk.test.js` |
| Per observer event | < 1ms p99 | Run an example app and profile in DevTools |
| Modal open path | < 8ms p99 | Manual, DevTools Performance tab |

## How to measure locally

```bash
npm run build
npm run build:check-size
```

For interactive perf:
1. `cd example-nextjs && PORT=3005 npm run dev`
2. Open Chrome DevTools → Performance tab.
3. Record a 10-second session of interacting with the host app while observers are mounted.
4. Verify total scripting time added by observers < 5ms in the recording.
