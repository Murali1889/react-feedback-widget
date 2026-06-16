import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import terser from '@rollup/plugin-terser';
import fs from 'node:fs';

const onwarn = (warning, warn) => {
  // Suppress circular dependency warnings from node_modules
  if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.ids?.some(id => id.includes('node_modules'))) {
    return;
  }
  warn(warning);
};

const clientPlugins = [
  peerDepsExternal(),
  resolve({
    extensions: ['.js', '.jsx']
  }),
  commonjs(),
  babel({
    exclude: 'node_modules/**',
    presets: ['@babel/preset-env', '@babel/preset-react'],
    babelHelpers: 'bundled',
    extensions: ['.js', '.jsx']
  }),
  terser(),
];

const serverPlugins = [
  resolve({
    extensions: ['.js']
  }),
  commonjs(),
  babel({
    exclude: 'node_modules/**',
    presets: ['@babel/preset-env'],
    babelHelpers: 'bundled',
    extensions: ['.js']
  }),
];

export default [
  // Main client bundle
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
        inlineDynamicImports: true,
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true,
        inlineDynamicImports: true,
      },
    ],
    onwarn,
    plugins: clientPlugins,
    external: ['react', 'react-dom', 'styled-components'],
  },
  // Server integrations bundle
  {
    input: 'src/integrations/server/index.js',
    output: {
      file: 'dist/server/index.js',
      format: 'esm',
      sourcemap: true,
      inlineDynamicImports: true,
    },
    onwarn,
    plugins: serverPlugins,
    external: ['crypto'],
  },
  // Jira server handler
  {
    input: 'src/integrations/jira.js',
    output: {
      file: 'dist/server/jira.js',
      format: 'esm',
      sourcemap: true,
    },
    onwarn,
    plugins: serverPlugins,
    external: ['crypto'],
  },
  // Sheets server handler
  {
    input: 'src/integrations/sheets.js',
    output: {
      file: 'dist/server/sheets.js',
      format: 'esm',
      sourcemap: true,
    },
    onwarn,
    plugins: serverPlugins,
    external: ['crypto'],
  },
  // Phase E destination server handlers
  ...['github', 'linear', 'notion', 'supabase', 'webhook'].map((name) => ({
    input: `src/integrations/server/${name}.js`,
    output: {
      file: `dist/server/${name}.js`,
      format: 'esm',
      sourcemap: true,
    },
    onwarn,
    plugins: serverPlugins,
    external: ['crypto', 'node:crypto'],
  })),
  // Client integrations
  {
    input: 'src/integrations/index.js',
    output: {
      file: 'dist/integrations/index.js',
      format: 'esm',
      sourcemap: true,
    },
    onwarn,
    plugins: clientPlugins,
    external: ['react', 'react-dom', 'styled-components'],
  },
  // Destinations adapter system (Phase E)
  {
    input: 'src/destinations/index.js',
    output: [
      { file: 'dist/destinations/index.js',     format: 'cjs', sourcemap: true },
      { file: 'dist/destinations/index.esm.js', format: 'esm', sourcemap: true },
    ],
    onwarn,
    plugins: clientPlugins,
    external: ['react', 'react-dom', 'styled-components'],
  },
  // Shared config helper (Phase F) — tiny passthrough for defineConfig
  {
    input: 'src/config.js',
    output: [
      { file: 'dist/config.js',     format: 'cjs', sourcemap: true },
      { file: 'dist/config.esm.js', format: 'esm', sourcemap: true },
    ],
    onwarn,
    plugins: serverPlugins,
  },
  // Config (shared)
  {
    input: 'src/integrations/config.js',
    output: {
      file: 'dist/integrations/config.js',
      format: 'esm',
      sourcemap: true,
    },
    onwarn,
    plugins: serverPlugins,
  },
  // Pure helpers (isomorphic lib)
  {
    input: 'src/lib/index.js',
    output: [
      { file: 'dist/lib/index.js', format: 'cjs', sourcemap: true },
      { file: 'dist/lib/index.esm.js', format: 'esm', sourcemap: true },
    ],
    onwarn,
    plugins: [
      ...serverPlugins,
      {
        name: 'copy-types',
        writeBundle() {
          fs.mkdirSync('dist', { recursive: true });
          fs.copyFileSync('src/types.d.ts', 'dist/types.d.ts');
        },
      },
    ],
  },
  // UI primitives bundle
  {
    input: 'src/ui/primitives/index.js',
    output: [
      { file: 'dist/ui/index.js',     format: 'cjs', sourcemap: true },
      { file: 'dist/ui/index.esm.js', format: 'esm', sourcemap: true },
    ],
    onwarn,
    plugins: clientPlugins,
    external: ['react', 'react-dom', 'styled-components'],
  },
  // Dashboard / Command Center bundle
  {
    input: 'src/dashboard/index.js',
    output: [
      { file: 'dist/dashboard/index.js',     format: 'cjs', sourcemap: true },
      { file: 'dist/dashboard/index.esm.js', format: 'esm', sourcemap: true },
    ],
    onwarn,
    plugins: clientPlugins,
    external: ['react', 'react-dom', 'styled-components'],
  },
  // Capture client (main thread)
  {
    input: 'src/capture/index.js',
    output: [
      { file: 'dist/capture/index.js',     format: 'cjs', sourcemap: true },
      { file: 'dist/capture/index.esm.js', format: 'esm', sourcemap: true },
    ],
    onwarn,
    plugins: clientPlugins,
    external: ['react', 'react-dom', 'styled-components'],
  },
  // Capture core (framework-agnostic — no React)
  {
    input: 'src/capture/core.js',
    output: [
      { file: 'dist/capture/core.js',     format: 'cjs', sourcemap: true, inlineDynamicImports: true },
      { file: 'dist/capture/core.esm.js', format: 'esm', sourcemap: true, inlineDynamicImports: true },
    ],
    onwarn,
    plugins: clientPlugins,
    external: ['react', 'react-dom', 'styled-components'],
  },
  // Capture worker (self-contained chunk)
  {
    input: 'src/capture/worker/feedback-capture-worker.js',
    output: { file: 'dist/capture/worker.js', format: 'esm', sourcemap: true },
    onwarn,
    plugins: [
      ...clientPlugins,
      {
        name: 'copy-viewer-html',
        writeBundle() {
          fs.mkdirSync('dist', { recursive: true });
          fs.copyFileSync('src/capture/viewer.html', 'dist/viewer.html');
        },
      },
    ],
    external: [],
  },
];
