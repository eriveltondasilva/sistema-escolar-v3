// server/config.ts
import type { AppConfig } from "./types.ts";

/** Aba "Configuração": onde o script lê as chaves/valores de configuração. */
export const SYSTEM_CONFIG_SHEET = {
  name: "Configuração",
  startRow: 3,
} as const;

export const CONFIG_KEY_MAP = {
  PASTA_ANOS_LETIVOS_ID: "schoolYearsFolderId",
  PASTA_PDFS_ID: "pdfsFolderId",
  PASTA_TEMP_ID: "tempFolderId",
  //
  MODELO_BOLETIM_CONCEITO_ID: "conceptReportId",
  MODELO_BOLETIM_NOTA_ID: "gradeReportId",
  //
  MODELO_LANCAMENTO_CONCEITO_ID: "conceptSpreadsheetId",
  MODELO_LANCAMENTO_NOTA_ID: "gradeSpreadsheetId",
  //
  CADASTRO_ESCOLAR_ID: "enrollmentSpreadsheetId",
} as const satisfies Record<string, keyof AppConfig>;

// Cache assume que a aba "Configuração" não muda durante a execução do script.
let cachedConfig: AppConfig | null = null;

/**
 * Lê e valida as configurações da aba "Configuração".
 */
export function loadConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SYSTEM_CONFIG_SHEET.name);

  if (!sheet) {
    throw new Error(
      `Aba "${SYSTEM_CONFIG_SHEET.name}" não encontrada na planilha "${ss.getName()}". ` +
        `Verifique se a aba existe e se o nome está escrito exatamente igual.`,
    );
  }

  const configKeysCount = Object.keys(CONFIG_KEY_MAP).length;
  const lastRow = sheet.getLastRow();
  const availableRows = lastRow - SYSTEM_CONFIG_SHEET.startRow + 1;

  if (availableRows < configKeysCount) {
    throw new Error(
      `Aba "${SYSTEM_CONFIG_SHEET.name}" tem poucas linhas: ` +
        ` esperava ao menos ${configKeysCount} linhas a partir da linha ` +
        `${SYSTEM_CONFIG_SHEET.startRow}, mas a aba termina na linha ${lastRow}.`,
    );
  }

  const rows = sheet
    .getRange(SYSTEM_CONFIG_SHEET.startRow, 1, configKeysCount, 2)
    .getValues();

  const rawConfig = new Map<string, string>();
  for (const [key, value] of rows) {
    const trimmedKey = String(key ?? "").trim();
    const trimmedValue = String(value ?? "").trim();

    if (trimmedKey) rawConfig.set(trimmedKey, trimmedValue);
  }

  const unknownKeys = [...rawConfig.keys()].filter(
    (key) => !(key in CONFIG_KEY_MAP),
  );

  const missingKeys = Object.keys(CONFIG_KEY_MAP).filter((key) => {
    const value = rawConfig.get(key);
    return typeof value !== "string" || value.trim() === "";
  });

  if (unknownKeys.length > 0 || missingKeys.length > 0) {
    const problems: string[] = [];

    if (unknownKeys.length > 0) {
      problems.push(`chave(s) não reconhecida(s): ${unknownKeys.join(", ")}`);
    }

    if (missingKeys.length > 0) {
      problems.push(`valor(es) faltando para: ${missingKeys.join(", ")}`);
    }

    throw new Error(
      `Configuração inválida na aba "${SYSTEM_CONFIG_SHEET.name}": ` +
        `${problems.join("; ")}. Verifique as linhas a partir de ` +
        `${SYSTEM_CONFIG_SHEET.startRow} (coluna A = chave, coluna B = valor). Chaves ` +
        `esperadas: ${Object.keys(CONFIG_KEY_MAP).join(", ")}.`,
    );
  }

  const config = Object.fromEntries(
    Object.entries(CONFIG_KEY_MAP).map(([sheetKey, appConfigKey]) => [
      appConfigKey,
      rawConfig.get(sheetKey),
    ]),
  ) as unknown as AppConfig;

  cachedConfig = config;

  return cachedConfig;
}
