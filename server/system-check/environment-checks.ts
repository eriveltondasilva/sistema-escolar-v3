// server/system-check/environment-checks.ts
import { loadConfig } from "../config.ts";
import { toIssue } from "./issue-helper.ts";
import {
  getClassTemplateFile,
  getReportTemplateFile,
} from "../drive/drive-lookup.ts";
import { VALID_CLASSES } from "../report/constants.ts";
import { getScriptProp } from "../utils/script-properties.ts";

import type { AppConfig, Issue } from "../types.ts";

export interface ConfigCheckResult {
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
        toIssue(
          "Configuração",
          error,
          SpreadsheetApp.getActiveSpreadsheet().getUrl(),
        ),
      ],
    };
  }
}

/**
 * Um template por assessmentType único usado nas turmas (evita validar
 * "grade" duas vezes se todas as turmas forem do mesmo tipo).
 */
export function checkReportTemplates(config: AppConfig): Issue[] {
  const issues: Issue[] = [];
  const assessmentTypes = new Set(
    VALID_CLASSES.map((validClass) => validClass.assessmentType),
  );

  for (const assessmentType of assessmentTypes) {
    const label =
      assessmentType === "grade" ?
        "Modelo de boletim (nota)"
      : "Modelo de boletim (conceito)";

    try {
      getReportTemplateFile(config, assessmentType);
    } catch (e) {
      issues.push(toIssue(label, e));
    }
  }

  return issues;
}

/**
 * Um template por assessmentType único usado nas turmas (mesmo motivo de
 * checkReportTemplates: evita validar "grade" duas vezes se todas as
 * turmas forem do mesmo tipo).
 */
export function checkClassTemplates(config: AppConfig): Issue[] {
  const issues: Issue[] = [];
  const assessmentTypes = new Set(
    VALID_CLASSES.map((validClass) => validClass.assessmentType),
  );

  for (const assessmentType of assessmentTypes) {
    const label =
      assessmentType === "grade" ?
        "Modelo de planilha de turma (nota)"
      : "Modelo de planilha de turma (conceito)";

    try {
      getClassTemplateFile(config, assessmentType);
    } catch (e) {
      issues.push(toIssue(label, e));
    }
  }

  return issues;
}

/** Só valida que a pasta existe e é acessível; não precisa do resultado. */
export function checkPdfsFolder(config: AppConfig): Issue[] {
  try {
    DriveApp.getFolderById(config.pdfsFolderId);
    return [];
  } catch (e) {
    return [toIssue("PDFs", e)];
  }
}

/** Só valida que a pasta existe e é acessível; não precisa do resultado. */
export function checkTempFolder(config: AppConfig): Issue[] {
  try {
    DriveApp.getFolderById(config.tempFolderId);
    return [];
  } catch (e) {
    return [toIssue("Pasta temporária", e)];
  }
}

/**
 * Confere as Script Properties usadas fora da aba "Configuração"
 * (Extensões > Apps Script > Configurações do Projeto > Propriedades do
 * script). Ausência delas não quebra o cadastro nem a geração de boletim
 * em si, mas afeta o QR code do boletim (WEB_APP_ID) e a validação do
 * link público do boletim (REPORT_LINK_SECRET) — falhas que, sem essa
 * checagem, só aparecem de forma silenciosa ou genérica em produção.
 */
export function checkScriptProperties(): Issue[] {
  const checks: Array<[label: string, getter: () => string]> = [
    ["QR code do boletim (WEB_APP_ID)", () => getScriptProp("WEB_APP_ID")],
    [
      "Link do boletim (REPORT_LINK_SECRET)",
      () => getScriptProp("REPORT_LINK_SECRET"),
    ],
  ];

  const issues: Issue[] = [];

  for (const [label, getter] of checks) {
    try {
      getter();
    } catch (e) {
      issues.push(toIssue(label, e));
    }
  }

  return issues;
}
