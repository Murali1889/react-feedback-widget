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
];
