import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
    exclude: ['node_modules', 'dist', 'example', 'example-nextjs', 'example-express'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/integrations/server/**'],
      thresholds: {
        'src/lib/**': { lines: 100, branches: 95, functions: 100, statements: 100 },
        'src/integrations/server/**': { lines: 90, branches: 85, functions: 90, statements: 90 },
      },
    },
  },
});
