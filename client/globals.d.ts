// client/globals.d.ts
import type { Alpine as AlpineType } from "alpinejs";

declare global {
  const Alpine: AlpineType;
  const google: GoogleAppsScript.Host;
}

export {};
