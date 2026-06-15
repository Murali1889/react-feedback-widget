import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['src/ui/**', 'jsdom'],
      ['src/__tests__/**', 'jsdom'],
    ],
    setupFiles: ['src/ui/__tests__/setup.js'],
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
    exclude: ['node_modules', 'dist', 'example', 'example-nextjs', 'example-express'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/integrations/server/**', 'src/ui/primitives/**'],
      thresholds: {
        'src/lib/**': { lines: 100, branches: 95, functions: 100, statements: 100 },
        'src/integrations/server/**': { lines: 90, branches: 85, functions: 90, statements: 90 },
        'src/ui/primitives/**': { lines: 95, branches: 90, functions: 95, statements: 95 },
      },
    },
  },
});
