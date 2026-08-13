import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import importX from "eslint-plugin-import-x";
import { defineConfig, globalIgnores } from "eslint/config";
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
  globalIgnores(["node_modules", "dist"]),
  // Eslint configs recomendadas para JavaScript.
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
  },

  // Eslint configs recomendadas para TypeScript.
  tseslint.configs.recommended,

  //
  {
    files: ["**/*.ts"],
    plugins: { "import-x": importX },
    rules: {
      "import-x/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            ["internal", "parent", "sibling"],
            "index",
            "type",
          ],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "import-x/consistent-type-specifier-style": ["error", "prefer-top-level"],
    },
  },

  // Client: código que roda no navegador (dentro dos dialogs do GAS).
  {
    files: ["client/**/*.ts"],
    languageOptions: { globals: globals.browser },
  },

  // Server: roda no runtime V8 do Apps Script, com seus próprios globais.
  {
    files: ["server/**/*.ts"],
    languageOptions: { globals: gasGlobals },
  },

  // Scripts de build: rodam via Bun/Node no seu terminal, não no runtime do GAS.
  {
    files: ["scripts/**/*.ts"],
    languageOptions: { globals: globals.bunBuiltin },
  },

  prettier,
]);
