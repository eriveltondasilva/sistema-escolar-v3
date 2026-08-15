// scripts/build.ts
import { Glob, build as bunBuild } from "bun";
import { copyFile, exists, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { cwd, exit } from "node:process";

import tailwind from "bun-plugin-tailwind";

import { posthtmlPlugin } from "./posthtml-plugin";

import type { BuildOutput } from "bun";

const DIALOGS_DIR = join(cwd(), "client", "dialogs");
const SERVER_DIR = join(cwd(), "server");
const DIST_DIR = join(cwd(), "dist");
const SERVER_ENTRY = join(SERVER_DIR, "main.ts");

function assertBuildSuccess(result: BuildOutput, label: string): void {
  if (result.success) return;

  throw new Error(
    `${label} build failed:\n${result.logs.map(String).join("\n")}`,
  );
}

// -------------------------------------

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
  });

  assertBuildSuccess(result, "Client");
  console.log("✨ Client build completed! → dist/*.html\n");
}

async function buildServer() {
  console.log("🚀 Building server bundle...");

  const codeName = "bundle.js";
  const entryName = "entry.js";

  const result = await bunBuild({
    entrypoints: [SERVER_ENTRY],
    outdir: DIST_DIR,
    naming: codeName,
    target: "browser",
    format: "iife",
    minify: true,
  });

  assertBuildSuccess(result, "Server");
  await copyFile(join(SERVER_DIR, entryName), join(DIST_DIR, entryName));

  console.log(
    `✨ Server build completed! → dist/${codeName} + dist/${entryName}\n`,
  );
}

// -------------------------------------

async function main() {
  await rm(DIST_DIR, { recursive: true, force: true });
  console.log("\n🧹 Cleaned dist directory");

  await mkdir(DIST_DIR, { recursive: true });
  console.log("✨ Created dist directory\n");

  if (!(await exists(DIST_DIR))) {
    throw new Error("Failed to create dist directory");
  }

  const appsScript = "appsscript.json";
  await copyFile(join(cwd(), appsScript), join(DIST_DIR, appsScript));
  console.log("✨ Copied appsscript.json\n");

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
