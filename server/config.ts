import type { AppConfig, Subject, ValidClass } from "./types.ts";
import type { Result } from "./utils/result.ts";

import { err, fromTry, isErr, ok } from "./utils/result.ts";

export const SCHOOL_YEAR_LABEL_PREFIX = "Ano Letivo — ";
export const DEFAULT_LOCALE = "pt-BR";
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export const MAX_ERRORS_SHOWN = 15;

export const MAX_RUNTIME_MS = 5 * 60 * 1_000; // 5 minutos
export const SCRIPT_LOCK_TIMEOUT_MS = 5 * 1_000; // 5 segundos

export const CONFIG_START_ROW = 3;

/** Turmas únicas, não insira duas vezes o mesmo className. */
export const VALID_CLASSES: ValidClass[] = [
  {
    className: "6º Ano",
    stage: "Ensino Fundamental II",
    shift: "Vespertino",
    assessmentType: "grade",
  },
  {
    className: "7º Ano",
    stage: "Ensino Fundamental II",
    shift: "Vespertino",
    assessmentType: "grade",
  },
  {
    className: "8º Ano",
    stage: "Ensino Fundamental II",
    shift: "Vespertino",
    assessmentType: "grade",
  },
  {
    className: "9º Ano",
    stage: "Ensino Fundamental II",
    shift: "Vespertino",
    assessmentType: "grade",
  },
];

/** Disciplinas únicas, não insira duas vezes o mesmo code. */
export const VALID_SUBJECTS: Subject[] = [
  { name: "Arte", code: "ART" },
  { name: "Ciências", code: "CIE" },
  { name: "Educação Física", code: "EDF" },
  { name: "Ensino Religioso", code: "REL" },
  { name: "Geografia", code: "GEO" },
  { name: "História", code: "HIS" },
  { name: "Língua Inglesa", code: "ING" },
  { name: "Língua Portuguesa", code: "LPO" },
  { name: "Matemática", code: "MAT" },
] as const;

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
  MODELO_BOLETIM_NOTA_ID: "gradeReportId",
  MODELO_BOLETIM_CONCEITO_ID: "conceptReportId",
  MODELO_LANCAMENTO_NOTA_ID: "gradeSpreadsheetId",
  MODELO_LANCAMENTO_CONCEITO_ID: "conceptSpreadsheetId",
  CADASTRO_ESCOLAR_ID: "enrollmentSpreadsheetId",
} as const;

/** Lê e valida as configurações da aba "Configuração". */
export function loadConfig(): Result<AppConfig> {
  const sheetResult = fromTry(() => {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SYSTEM_CONFIG_SHEET_NAME);
    return { ss, sheet };
  });
  if (isErr(sheetResult)) return sheetResult;

  const { ss, sheet } = sheetResult.value;

  // Regra de negócio conhecida: aba ausente é um caso esperado, não uma
  // falha nativa do GAS.
  if (!sheet) {
    return err(
      `Aba "${SYSTEM_CONFIG_SHEET_NAME}" não encontrada na planilha "${ss.getName()}". ` +
        `Verifique se a aba existe e se o nome está escrito exatamente igual.`,
    );
  }

  const configKeysCount = Object.keys(CONFIG_KEY_MAP).length;
  const lastRow = sheet.getLastRow();
  const availableRows = lastRow - CONFIG_START_ROW + 1;

  if (availableRows < configKeysCount) {
    return err(
      `Aba "${SYSTEM_CONFIG_SHEET_NAME}" tem poucas linhas: esperava ao menos ` +
        `${configKeysCount} linhas a partir da linha ${CONFIG_START_ROW}, ` +
        `mas a aba termina na linha ${lastRow}.`,
    );
  }

  // getRange/getValues podem lançar nativamente.
  const rowsResult = fromTry(() =>
    sheet.getRange(CONFIG_START_ROW, 1, configKeysCount, 2).getValues(),
  );
  if (isErr(rowsResult)) return rowsResult;

  const rawConfig: Record<string, unknown> = Object.fromEntries(
    rowsResult.value
      .map(([key, value]) => [String(key ?? "").trim(), value])
      .filter(([key]) => (key as string).length > 0),
  );

  const unknownKeys = Object.keys(rawConfig).filter(
    (key) => !(key in CONFIG_KEY_MAP),
  );

  if (unknownKeys.length > 0) {
    return err(
      `Aba "${SYSTEM_CONFIG_SHEET_NAME}" contém chave(s) não reconhecida(s): ` +
        `${unknownKeys.join(", ")}. Chaves esperadas: ` +
        `${Object.keys(CONFIG_KEY_MAP).join(", ")}.`,
    );
  }

  const missingKeys = Object.keys(CONFIG_KEY_MAP).filter(
    (key) => !rawConfig[key],
  );

  if (missingKeys.length > 0) {
    return err(
      `Configuração incompleta na aba "${SYSTEM_CONFIG_SHEET_NAME}": faltam ` +
        `valores para ${missingKeys.join(", ")}. Verifique as linhas a ` +
        `partir de ${CONFIG_START_ROW} (coluna A = chave, coluna B = valor).`,
    );
  }

  const config = Object.fromEntries(
    Object.entries(CONFIG_KEY_MAP).map(([sheetKey, codeKey]) => [
      codeKey,
      rawConfig[sheetKey],
    ]),
  ) as unknown as AppConfig;

  return ok(config);
}
