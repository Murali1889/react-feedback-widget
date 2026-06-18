import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['src/ui/**', 'jsdom'],
      ['src/dashboard/**', 'jsdom'],
      ['src/capture/**', 'jsdom'],
      ['src/__tests__/**', 'jsdom'],
      ['src/feedback-modal/**', 'jsdom'],
    ],
    setupFiles: ['src/ui/__tests__/setup.js'],
    include: ['src/**/*.test.js', 'src/**/*.test.jsx', 'bin/**/*.test.mjs', 'website/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'example', 'example-nextjs', 'example-express', 'website/.next', 'website/node_modules'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/integrations/server/**', 'src/ui/primitives/**', 'src/dashboard/**', 'src/capture/**'],
      thresholds: {
        'src/lib/**': { lines: 100, branches: 95, functions: 100, statements: 100 },
        'src/integrations/server/**': { lines: 90, branches: 85, functions: 90, statements: 90 },
        'src/ui/primitives/**': { lines: 95, branches: 90, functions: 95, statements: 95 },
        'src/dashboard/**': { lines: 90, branches: 85, functions: 90, statements: 90 },
        'src/capture/**': { lines: 88, branches: 80, functions: 88, statements: 88 },
      },
    },
  },
});
