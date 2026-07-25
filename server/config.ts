// server/config.ts
import type { AppConfig } from "./types.ts";

export const SCHOOL_YEAR_LABEL_PREFIX = "Ano Letivo — ";
export const DEFAULT_LOCALE = "pt-BR";
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export const MAX_ERRORS_SHOWN = 15;

export const MAX_RUNTIME_MS = 5 * 60 * 1000; // 5 minutos
export const SCRIPT_LOCK_TIMEOUT_MS = 5 * 1000; // 5 segundos

export const CONFIG_START_ROW = 3;

export const ENROLLMENT_SHEET_NAMES = {
  STUDENTS: "Alunos",
  GUARDIANS: "Responsáveis",
  SUMMARY: "Resumo",
} as const;

const SYSTEM_CONFIG_SHEET_NAME = "Configuração";

export const CONFIG_KEY_MAP: Record<string, keyof AppConfig> = {
  PASTA_ANOS_LETIVOS_ID: "schoolYearsFolderId",
  PASTA_PDFS_ID: "pdfsFolderId",
  PASTA_TEMP_ID: "tempFolderId",
  //
  MODELO_BOLETIM_NOTA_ID: "gradeReportId",
  MODELO_BOLETIM_CONCEITO_ID: "conceptReportId",
  //
  MODELO_LANCAMENTO_NOTA_ID: "gradeSpreadsheetId",
  MODELO_LANCAMENTO_CONCEITO_ID: "conceptSpreadsheetId",
  //
  CADASTRO_ESCOLAR_ID: "enrollmentSpreadsheetId",
} as const;

// Cache assume que a aba "Configuração" não muda durante a execução do script.
let cachedConfig: AppConfig | null = null;

/**
 * Lê e valida as configurações da aba "Configuração".
 *
 * @throws { Error } se a aba "Configuração" não for encontrada ou se ela tiver poucas linhas.
 */
export function loadConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SYSTEM_CONFIG_SHEET_NAME);

  if (!sheet) {
    throw new Error(
      `Aba "${SYSTEM_CONFIG_SHEET_NAME}" não encontrada na planilha "${ss.getName()}". ` +
        `Verifique se a aba existe e se o nome está escrito exatamente igual.`,
    );
  }

  const configKeysCount = Object.keys(CONFIG_KEY_MAP).length;
  const lastRow = sheet.getLastRow();
  const availableRows = lastRow - CONFIG_START_ROW + 1;

  if (availableRows < configKeysCount) {
    throw new Error(
      `Aba "${SYSTEM_CONFIG_SHEET_NAME}" tem poucas linhas: esperava ao menos ` +
        `${configKeysCount} linhas a partir da linha ${CONFIG_START_ROW}, ` +
        `mas a aba termina na linha ${lastRow}.`,
    );
  }

  const rows = sheet
    .getRange(CONFIG_START_ROW, 1, configKeysCount, 2)
    .getValues();

  const rawConfig = new Map<string, unknown>();
  for (const [key, value] of rows) {
    const trimmedKey = String(key ?? "").trim();
    if (trimmedKey) rawConfig.set(trimmedKey, value);
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
      `Configuração inválida na aba "${SYSTEM_CONFIG_SHEET_NAME}": ` +
        `${problems.join("; ")}. Verifique as linhas a partir de ` +
        `${CONFIG_START_ROW} (coluna A = chave, coluna B = valor). Chaves ` +
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
