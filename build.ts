#!/usr/bin/env bun

import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { $ } from 'bun';

async function cleanBuild(outdir = 'dist') {
  if (existsSync(outdir)) {
    await rm(outdir, { recursive: true, force: true });
    console.log(`✓ Cleaned ${outdir} directory`);
  }
}

async function build() {
  const start = performance.now();
  console.log('🚀 Building project...');

  try {
    await cleanBuild('dist');
    console.log('Starting build tasks...');

    const [buildResult] = await Promise.all([
      (async () => {
        console.log('📦 Bundling with Bun...');
        const result = await Bun.build({
          entrypoints: ['./src/index.ts', './src/scheduler.ts'],
          outdir: './dist',
          target: 'node',
          format: 'esm',
          sourcemap: true,
          minify: false,
          external: [
            'dotenv', 'fs', 'path', 'https', 'node:*',
            '@elizaos/core', '@elizaos/plugin-bootstrap', '@elizaos/plugin-sql',
            '@elizaos/plugin-telegram', '@elizaos/cli', 'zod',
            'node-cron', 'uuid', 'node-fetch',
          ],
          naming: { entry: '[dir]/[name].[ext]' },
        });

        if (!result.success) {
          console.error('✗ Build failed:', result.logs);
          return { success: false };
        }

        console.log(`✓ Built ${result.outputs.length} file(s)`);
        return result;
      })(),
    ]);

    if (!buildResult.success) return false;

    const elapsed = ((performance.now() - start) / 1000).toFixed(2);
    console.log(`✅ Build complete! (${elapsed}s)`);
    return true;
  } catch (error) {
    console.error('Build error:', error);
    return false;
  }
}

build()
  .then((success) => { if (!success) process.exit(1); })
  .catch((error) => { console.error('Build script error:', error); process.exit(1); });