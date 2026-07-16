import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

// Globais expostos pelo runtime do Google Apps Script (V8).
const gasGlobals = {
  SpreadsheetApp: "readonly",
  DriveApp: "readonly",
  DocumentApp: "readonly",
  FormApp: "readonly",
  GmailApp: "readonly",
  CalendarApp: "readonly",
  HtmlService: "readonly",
  ContentService: "readonly",
  PropertiesService: "readonly",
  CacheService: "readonly",
  LockService: "readonly",
  ScriptApp: "readonly",
  UrlFetchApp: "readonly",
  Session: "readonly",
  Utilities: "readonly",
  Logger: "readonly",
  console: "readonly",
} as const;

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
  },
  tseslint.configs.recommended,

  // Client: código que roda no navegador (dentro dos dialogs do GAS).
  {
    files: ["client/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
  },

  // Scripts de build: rodam via Bun/Node no seu terminal, não no runtime do GAS.
  {
    files: ["scripts/**/*.ts"],
    languageOptions: { globals: globals.bunBuiltin },
  },

  // Server: roda no runtime V8 do Apps Script, com seus próprios globais.
  {
    files: ["server/**/*.ts"],
    languageOptions: { globals: gasGlobals },
  },

  prettier,
]);
