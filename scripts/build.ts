// scripts/build.ts
import { Glob, build as bunBuild } from "bun";
import { copyFile, exists, mkdir, rm } from "node:fs/promises";
import { join, relative } from "node:path";
import { cwd, exit } from "node:process";

import tailwind from "bun-plugin-tailwind";

import { posthtmlPlugin } from "./posthtml-plugin";

import type { BuildArtifact, BuildOutput } from "bun";

const ROOT = cwd();
const DIALOGS_DIR = join(ROOT, "client", "dialogs");
const SERVER_DIR = join(ROOT, "server");
const DIST_DIR = join(ROOT, "dist");
const SERVER_ENTRY = join(SERVER_DIR, "main.ts");

const isMinified = process.argv.includes("--minify");

// -------------------------------------

function rel(absPath: string): string {
  return relative(ROOT, absPath);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatMs(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function logOutput(artifact: BuildArtifact): void {
  console.log(`   ✔ ${rel(artifact.path)}  (${formatBytes(artifact.size)})`);
}

function assertBuildSuccess(result: BuildOutput, label: string): void {
  if (result.success) return;

  const details = result.logs
    .map((log) => {
      const level = log.level.toUpperCase();
      const position =
        log.position ?
          ` (${rel(log.position.file)}:${log.position.line}:${log.position.column})`
        : "";
      return `   [${level}]${position} ${log.message}`;
    })
    .join("\n");

  throw new Error(
    `${label} build failed with ${result.logs.length} error(s):\n${details}`,
  );
}

async function assertFileExists(absPath: string): Promise<void> {
  if (!(await exists(absPath))) {
    throw new Error(`Required file not found: ${rel(absPath)}`);
  }
}

// -------------------------------------

async function buildClient(): Promise<void> {
  const glob = new Glob("*.html");
  const entrypoints = await Array.fromAsync(
    glob.scan({ cwd: DIALOGS_DIR, onlyFiles: true, absolute: true }),
  );

  if (entrypoints.length === 0) {
    throw new Error(
      `No dialog entrypoints found in: ${rel(DIALOGS_DIR)}\n` +
        "   Expected at least one *.html file.",
    );
  }

  const entrypointNames = entrypoints.map((p) => rel(p)).join(", ");
  console.log(
    `\n📦 Client - ${entrypoints.length} dialog(s):\n${entrypointNames}\n`,
  );

  const start = Date.now();

  const result = await bunBuild({
    entrypoints,
    outdir: DIST_DIR,
    naming: "[name].[ext]",
    target: "browser",
    compile: true,
    plugins: [tailwind, posthtmlPlugin()],
    minify: isMinified,
  });

  assertBuildSuccess(result, "Client");

  result.outputs.forEach(logOutput);
  console.log(`\n✅ Done in ${formatMs(Date.now() - start)}`);
}

async function buildServer(): Promise<void> {
  const entryName = "entry.js";
  const serverEntryJs = join(SERVER_DIR, entryName);

  await assertFileExists(SERVER_ENTRY);
  await assertFileExists(serverEntryJs);

  console.log(`\n📦 Server - ${rel(SERVER_ENTRY)}`);

  const start = Date.now();
  const codeName = "bundle.js";

  const result = await bunBuild({
    entrypoints: [SERVER_ENTRY],
    outdir: DIST_DIR,
    naming: codeName,
    target: "browser",
    format: "iife",
    minify: isMinified,
  });

  assertBuildSuccess(result, "Server");

  result.outputs.forEach(logOutput);

  const destEntry = join(DIST_DIR, entryName);
  await copyFile(serverEntryJs, destEntry);
  console.log(`   ✔ ${rel(destEntry)}  (copied)`);
  console.log(`\n✅ Done in ${formatMs(Date.now() - start)}`);
}

// -------------------------------------

async function main(): Promise<void> {
  console.log("\n🔨 Build started\n");

  if (isMinified) console.log("⚙️  Minify: enabled\n");

  // Clean & recreate dist
  await rm(DIST_DIR, { recursive: true, force: true });
  await mkdir(DIST_DIR, { recursive: true });

  if (!(await exists(DIST_DIR))) {
    throw new Error(`Failed to create output directory: ${rel(DIST_DIR)}`);
  }

  console.log(`🧹 ${rel(DIST_DIR)}/ cleaned`);

  // Copy appsscript.json
  const appsScript = "appsscript.json";
  const appsScriptSrc = join(ROOT, appsScript);
  const appsScriptDest = join(DIST_DIR, appsScript);

  await assertFileExists(appsScriptSrc);
  await copyFile(appsScriptSrc, appsScriptDest);
  console.log(`📄 ${appsScript} copied → ${rel(appsScriptDest)}`);

  await buildClient();
  await buildServer();

  console.log("\n🎉 Build finished successfully!");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n❌ Build failed:\n${message}`);
  exit(1);
});
