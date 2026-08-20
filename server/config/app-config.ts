// server/config.ts
import { formatStr } from "#server/utils/formatters.ts";

import type { AppConfig } from "../types.ts";

interface ConfigSheet {
  name: string;
  startRow: number;
  keys: Record<string, keyof AppConfig>;
}

/**
 * Aba "Configuração" da planilha "Painel de Controle":
 * onde o script lê as chaves/valores de configuração.
 */
const CONFIG_SHEET = {
  name: "Configuração",
  startRow: 3,
  keys: {
    PASTA_ANOS_LETIVOS_ID: "schoolYearsFolderId",
    PASTA_PDFS_ID: "pdfsFolderId",
    PASTA_TEMP_ID: "tempFolderId",
    MODELO_BOLETIM_CONCEITO_ID: "conceptReportId",
    MODELO_BOLETIM_NOTA_ID: "gradeReportId",
    MODELO_DIARIO_CONCEITO_ID: "conceptSpreadsheetId",
    MODELO_DIARIO_NOTA_ID: "gradeSpreadsheetId",
    CADASTRO_ESCOLAR_ID: "enrollmentSpreadsheetId",
  },
} as const satisfies ConfigSheet;

type SheetKey = keyof typeof CONFIG_SHEET.keys;
const SHEET_KEYS = Object.keys(CONFIG_SHEET.keys) as SheetKey[];

let cachedConfig: AppConfig | undefined;

/**
 * Lê e valida as configurações da aba "Configuração".
 */
export function loadConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG_SHEET.name);

  if (!sheet) {
    throw new Error(
      `Aba "${CONFIG_SHEET.name}" não encontrada na planilha "${ss.getName()}". ` +
        `Verifique se a aba existe e se o nome está escrito exatamente igual.`,
    );
  }

  const keyCount = SHEET_KEYS.length;
  const lastRow = sheet.getLastRow();
  const availableRows = lastRow - CONFIG_SHEET.startRow + 1;

  if (availableRows < keyCount) {
    throw new Error(
      `Aba "${CONFIG_SHEET.name}" tem poucas linhas: esperava ao menos ${keyCount} ` +
        `a partir da linha ${CONFIG_SHEET.startRow}, mas a aba termina na linha ${lastRow}.`,
    );
  }

  const rows = sheet
    .getRange(CONFIG_SHEET.startRow, 1, keyCount, 2)
    .getValues();

  const rawConfig = new Map(
    rows
      .map(([key, value]) => [formatStr(key), formatStr(value)] as const)
      .filter(([key]) => key !== ""),
  );

  const missingKeys = SHEET_KEYS.filter((key) => !rawConfig.get(key));

  if (missingKeys.length > 0) {
    throw new Error(
      `Configuração inválida na aba "${CONFIG_SHEET.name}": ` +
        `valor(es) faltando para: ${missingKeys.join(", ")}. ` +
        `Verifique as linhas a partir de ${CONFIG_SHEET.startRow} ` +
        `(coluna A = chave, coluna B = valor).`,
    );
  }

  cachedConfig = SHEET_KEYS.reduce(
    (config, sheetKey) => {
      const appKey = CONFIG_SHEET.keys[sheetKey];
      config[appKey] = rawConfig.get(sheetKey)!;
      return config;
    },
    {} as Record<keyof AppConfig, string>,
  );

  return cachedConfig;
}
