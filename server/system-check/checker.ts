// server/system-check/checker.ts
import { ENROLLMENT_SHEET_NAMES, loadConfig } from "../config.ts";
import {
  getClassSpreadsheetFile,
  getReportTemplateFile,
  getSchoolYearFolder,
  listSchoolYears,
} from "../drive/drive-lookup.ts";
import { VALID_CLASSES } from "../report/constants.ts";
import {
  checkClassSubjects,
  getClassStudentsFromResumo,
  loadStudentsMap,
} from "../report/data-access.ts";
import {
  findDuplicateStudentIds,
  validateClassStudents,
} from "../system-check/validate-roster.ts";

import type { Issue, StudentData } from "../types.ts";

/** Verifica todas as configurações, estrutura de pastas e dados. */
export function checkSystem(): void {
  const issues: Issue[] = [];

  const config = collectOrIssue(
    issues,
    "Configuração",
    loadConfig,
    SpreadsheetApp.getActiveSpreadsheet().getUrl(),
  );
  if (!config) {
    showValidationDialog(issues);
    return;
  }

  // Um template por assessmentType único usado nas turmas (evita validar
  // "grade" duas vezes se todas as turmas forem do mesmo tipo).
  const assessmentTypes = new Set(VALID_CLASSES.map((c) => c.assessmentType));
  for (const assessmentType of assessmentTypes) {
    collectOrIssue(
      issues,
      assessmentType === "grade" ?
        "Modelo de boletim (nota)"
      : "Modelo de boletim (conceito)",
      () => getReportTemplateFile(config, assessmentType),
    );
  }

  collectOrIssue(issues, "PDFs", () =>
    DriveApp.getFolderById(config.pdfsFolderId),
  );

  const registrationSheet = collectOrIssue(issues, "Cadastro de Alunos", () =>
    SpreadsheetApp.openById(config.enrollmentSpreadsheetId),
  );

  let registeredStudentsMap: Map<string, StudentData> | null = null;

  if (registrationSheet) {
    const regUrl = registrationSheet.getUrl();

    if (!registrationSheet.getSheetByName(ENROLLMENT_SHEET_NAMES.STUDENTS)) {
      issues.push({
        type: "error",
        text: `Cadastro de Alunos: a aba "${ENROLLMENT_SHEET_NAMES.STUDENTS}" não existe.`,
        url: regUrl,
      });
    }
    if (!registrationSheet.getSheetByName(ENROLLMENT_SHEET_NAMES.GUARDIANS)) {
      issues.push({
        type: "error",
        text: `Cadastro de Alunos: a aba "${ENROLLMENT_SHEET_NAMES.GUARDIANS}" não existe.`,
        url: regUrl,
      });
    }

    registeredStudentsMap = collectOrIssue(
      issues,
      "Cadastro de Alunos",
      () => loadStudentsMap(registrationSheet),
      regUrl,
    );

    if (registeredStudentsMap) {
      const dupes = findDuplicateStudentIds(registrationSheet);
      issues.push(
        ...dupes.map((msg) => ({
          type: "error" as const,
          text: msg,
          url: regUrl,
        })),
      );
    }
  }

  const years =
    collectOrIssue(issues, null, () => listSchoolYears(config)) ?? [];

  if (years.length === 0) {
    let rootUrl: string | undefined;
    try {
      rootUrl = DriveApp.getFolderById(config.schoolYearsFolderId).getUrl();
    } catch {
      // pasta raiz também inválida — omite o link, o issue abaixo já basta
    }
    issues.push({
      type: "error",
      text: 'Nenhuma pasta de ano letivo encontrada dentro de "Anos Letivos".',
      ...(rootUrl && { url: rootUrl }),
    });
  }

  for (const year of years) {
    const yearFolder = collectOrIssue(issues, null, () =>
      getSchoolYearFolder(config, year),
    );
    if (!yearFolder) continue;

    for (const { className } of VALID_CLASSES) {
      const classFile = collectOrIssue(
        issues,
        `[${year}]`,
        () => getClassSpreadsheetFile(yearFolder, year, className),
        yearFolder.getUrl(),
      );
      if (!classFile) continue;

      const classSpreadsheet = collectOrIssue(
        issues,
        `[${year} / ${className}] Erro ao abrir a planilha`,
        () => SpreadsheetApp.openById(classFile.getId()),
        classFile.getUrl(),
      );
      if (!classSpreadsheet) continue;

      const ssUrl = classSpreadsheet.getUrl();
      const { missing } = checkClassSubjects(classSpreadsheet);
      if (missing.length > 0) {
        issues.push({
          type: "warning",
          text: `[${year} / ${className}] Disciplinas faltando (serão ignoradas): ${missing.join(", ")}`,
          url: ssUrl,
        });
      }

      if (registeredStudentsMap) {
        const students = getClassStudentsFromResumo(classSpreadsheet);
        issues.push(
          ...validateClassStudents(
            classSpreadsheet,
            registeredStudentsMap,
            students,
            year,
            className,
          ),
        );
      }
    }
  }

  showValidationDialog(issues);
}

/**
 * Executa `fn` e, em caso de erro, empurra um Issue ao array e retorna null.
 * O retorno null permite que o caller decida se deve interromper o fluxo
 * (ex: `if (!result) continue` dentro de loops de validação).
 *
 * @param issues Array de issues a ser populado em caso de erro.
 * @param label Prefixo para a mensagem (ex: "Cadastro de Alunos"). null omite o prefixo.
 * @param fn Função a ser executada com segurança.
 * @param url URL opcional para incluir no Issue em caso de erro.
 */
export function collectOrIssue<T>(
  issues: Issue[],
  label: string | null,
  fn: () => T,
  url?: string,
): T | null {
  try {
    return fn();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const issue: Issue = {
      type: "error",
      text: label ? `${label}: ${message}` : message,
    };
    if (url) issue.url = url;
    issues.push(issue);
    return null;
  }
}

/** Renderiza o dialog HTML com os resultados. */
export function showValidationDialog(issues: Issue[]): void {
  const ui = SpreadsheetApp.getUi();
  const template = HtmlService.createTemplateFromFile("ValidationResultDialog");

  template.issues = issues;

  const htmlOutput = template.evaluate().setWidth(560).setHeight(530);
  ui.showModalDialog(htmlOutput, "Diagnóstico do Sistema");
}
