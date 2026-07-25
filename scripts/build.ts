// scripts/build.ts
import { Glob, build as bunBuild } from "bun";
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { argv, cwd, exit } from "node:process";

import tailwind from "bun-plugin-tailwind";

import { posthtmlPlugin } from "./posthtml-plugin";

import type { BuildOutput } from "bun";

const DIALOGS_DIR = join(cwd(), "client", "dialogs");
const SERVER_ENTRY = join(cwd(), "server", "main.ts");
const DIST_DIR = join(cwd(), "dist");

const isMinified = argv.includes("--minify");

function assertBuildSuccess(result: BuildOutput, label: string): void {
  if (result.success) return;

  const logs = result.logs.map(String).join("\n");
  throw new Error(`${label} build failed:\n${logs}`);
}

async function buildClient() {
  const glob = new Glob("*.html");
  const entrypoints = await Array.fromAsync(
    glob.scan({ cwd: DIALOGS_DIR, onlyFiles: true, absolute: true }),
  );

  if (entrypoints.length === 0) {
    throw new Error("No dialogs found in client/dialogs");
  }

  console.log(`🚀 Building ${entrypoints.length} dialog(s)...`);

  const result = await bunBuild({
    entrypoints,
    outdir: DIST_DIR,
    target: "browser",
    compile: true,
    plugins: [tailwind, posthtmlPlugin()],
    naming: "[name].[ext]",
    minify: isMinified,
  });

  assertBuildSuccess(result, "Client");
  console.log("✨ Client build completed! → dist/*.html\n");
}

async function buildServer() {
  console.log("🚀 Building server bundle...");

  const codeName = "code.js";
  const result = await bunBuild({
    entrypoints: [SERVER_ENTRY],
    outdir: DIST_DIR,
    target: "browser",
    format: "iife",
    naming: codeName,
    minify: isMinified,
  });

  assertBuildSuccess(result, "Server");
  console.log(`✨ Server build completed! → dist/${codeName}\n`);
}

// -------------------------------------

async function main() {
  rmSync(DIST_DIR, { recursive: true, force: true });
  console.log("\n🧹 Cleaned dist directory");

  mkdirSync(DIST_DIR, { recursive: true });
  console.log("✨ Created dist directory\n");

  if (!existsSync(DIST_DIR)) {
    throw new Error("Failed to create dist directory");
  }

  const appsScript = "appsscript.json";
  copyFileSync(join(cwd(), appsScript), join(DIST_DIR, appsScript));
  console.log("✨ Copied appsscript.json\n");

  if (isMinified) {
    console.log("🚀 Minifying...\n");
  }

  await buildClient();
  await buildServer();

  console.log("🎉 Build finished successfully!");
}

main().catch((error) => {
  console.error(
    "❌ Build execution failed:",
    Error.isError(error) ? error.message : error,
  );
  exit(1);
});
