// scripts\build.ts
import { Glob, build as bunBuild, type BuildOutput } from 'bun';
import tailwind from 'bun-plugin-tailwind';

import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { argv, cwd, exit } from 'node:process';

import { posthtmlPlugin } from './posthtml-plugin';

const DIALOGS_DIR = join(cwd(), 'client', 'dialogs');
const SERVER_ENTRY = join(cwd(), 'server', 'main.ts');
const DIST_DIR = join(cwd(), 'dist');

const isMinified = argv.includes('--minify');

function assertBuildSuccess(result: BuildOutput, label: string): void {
  if (result.success) return;

  const logs = result.logs.map(String).join('\n');
  throw new Error(`${label} build failed:\n${logs}`);
}

async function buildClient() {
  const glob = new Glob('*.html');
  const entrypoints = await Array.fromAsync(
    glob.scan({ cwd: DIALOGS_DIR, onlyFiles: true, absolute: true }),
  );

  if (entrypoints.length === 0) {
    throw new Error('No dialogs found in client/dialogs');
  }

  console.log(`🚀 Building ${entrypoints.length} dialog(s)...`);

  const result = await bunBuild({
    entrypoints,
    outdir: DIST_DIR,
    target: 'browser',
    compile: true,
    plugins: [tailwind, posthtmlPlugin()],
    minify: isMinified,
  });

  assertBuildSuccess(result, 'Client');
  console.log('✨ Client build completed! → dist/*.html\n');
}

async function buildServer() {
  console.log('🚀 Building server bundle...');

  const result = await bunBuild({
    entrypoints: [SERVER_ENTRY],
    outdir: DIST_DIR,
    target: 'browser',
    format: 'iife',
    naming: 'code.js',
    minify: isMinified,
  });

  assertBuildSuccess(result, 'Server');
  console.log('✨ Server build completed! → dist/Code.js\n');
}

// -------------------------------------

async function main() {
  await rm(DIST_DIR, { recursive: true, force: true });
  console.log('🧹 Cleaned dist directory\n');

  await buildClient();
  await buildServer();

  console.log('🎉 Build finished successfully!');
}

main().catch((error) => {
  const errorMessage = Error.isError(error) ? error.message : error;
  console.error('❌ Build execution failed:', errorMessage);
  exit(1);
});
