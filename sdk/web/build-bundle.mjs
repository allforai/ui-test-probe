/**
 * Bundles the Web SDK into a single IIFE script for browser injection.
 * Output: dist/probe-bundle.js
 */
import { build } from 'esbuild';

await build({
  entryPoints: ['src/browser-entry.ts'],
  bundle: true,
  format: 'iife',
  outfile: 'dist/probe-bundle.js',
  platform: 'browser',
  target: 'es2020',
  minify: false,
  sourcemap: false,
});

console.log('Built dist/probe-bundle.js');
