// server/constants.ts

export const SCHOOL_YEAR_LABEL_PREFIX = "Ano Letivo - ";
export const DEFAULT_LOCALE = "pt-BR";
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export const MAX_ERRORS_SHOWN = 15;

export const MAX_RUNTIME_MS = 5 * 60 * 1000; // 5 minutos
export const SCRIPT_LOCK_TIMEOUT_MS = 5 * 1000; // 5 segundos

export const ENROLLMENT_SHEET_NAMES = {
  STUDENTS: "Alunos",
  GUARDIANS: "Responsáveis",
  SUMMARY: "Resumo",
  LOG: "Log",
} as const;
