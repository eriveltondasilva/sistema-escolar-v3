// server/system-check/environment-checks.ts
import { loadConfig } from "#config/app-config.ts";
import {
  getClassTemplateFile,
  getReportTemplateFile,
} from "#drive/drive-lookup.ts";
import { VALID_CLASSES } from "#report/constants.ts";
import { toIssue } from "./issue-helper.ts";

import type { AppConfig, Issue } from "../types.ts";

const ASSESSMENT_TYPES = new Set(
  VALID_CLASSES.map((validClass) => validClass.assessmentType),
);

interface ConfigCheckResult {
  config: AppConfig | null;
  issues: Issue[];
}

/** Carrega a configuração da aba "Configuração". */
export function checkConfig(): ConfigCheckResult {
  try {
    return { config: loadConfig(), issues: [] };
  } catch (error) {
    return {
      config: null,
      issues: [
        toIssue({
          label: "Configuração",
          error,
          url: SpreadsheetApp.getActiveSpreadsheet().getUrl(),
        }),
      ],
    };
  }
}

/**
 * Um template por assessmentType único usado nas turmas (evita validar
 * "numeric" duas vezes se todas as turmas forem do mesmo tipo).
 */
export function checkReportTemplates(config: AppConfig): Issue[] {
  const { conceptReportId, gradeReportId } = config;
  const issues: Issue[] = [];

  for (const assessmentType of ASSESSMENT_TYPES) {
    const label =
      assessmentType === "numeric" ?
        "Modelo de boletim (nota)"
      : "Modelo de boletim (conceito)";

    try {
      getReportTemplateFile({ conceptReportId, gradeReportId, assessmentType });
    } catch (error) {
      issues.push(toIssue({ label, error }));
    }
  }

  return issues;
}

/**
 * Um template por assessmentType único usado nas turmas (mesmo motivo de
 * checkReportTemplates: evita validar "numeric" duas vezes se todas as
 * turmas forem do mesmo tipo).
 */
export function checkClassTemplates(config: AppConfig): Issue[] {
  const { conceptSpreadsheetId, gradeSpreadsheetId } = config;
  const issues: Issue[] = [];

  for (const assessmentType of ASSESSMENT_TYPES) {
    const label =
      assessmentType === "numeric" ?
        "Modelo de planilha de turma (nota)"
      : "Modelo de planilha de turma (conceito)";

    try {
      getClassTemplateFile({
        conceptSpreadsheetId,
        gradeSpreadsheetId,
        assessmentType,
      });
    } catch (error) {
      issues.push(toIssue({ label, error }));
    }
  }

  return issues;
}

/** Só valida que a pasta existe e é acessível; não precisa do resultado. */
export function checkPdfsFolder(config: AppConfig): Issue[] {
  try {
    DriveApp.getFolderById(config.pdfsFolderId);
    return [];
  } catch (error) {
    return [toIssue({ label: "PDFs", error })];
  }
}

/** Só valida que a pasta existe e é acessível; não precisa do resultado. */
export function checkTempFolder(config: AppConfig): Issue[] {
  try {
    DriveApp.getFolderById(config.tempFolderId);
    return [];
  } catch (error) {
    return [toIssue({ label: "Pasta temporária", error })];
  }
}
