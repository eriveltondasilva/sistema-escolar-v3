// server/system-check/checker.ts
import { ENROLLMENT_SHEET_NAMES, loadConfig } from "../config.ts";
import { DIALOG_NAMES } from "../dialog-names.ts";
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
import { getErrorMsg } from "../utils/error.ts";
import { renderView } from "../utils/render-view.ts";

import type { AppConfig, Issue, StudentData } from "../types.ts";
import type { ValidationResultInitData } from "./types.ts";

function toIssue(label: string, error: unknown, url?: string): Issue {
  console.error(label, error);
  const message = getErrorMsg(error);
  const issue: Issue = {
    type: "error",
    text: label ? `${label}: ${message}` : message,
  };

  if (url) issue.url = url;

  return issue;
}

interface ConfigCheckResult {
  config: AppConfig | null;
  issues: Issue[];
}

/** Carrega a configuração da aba "Configuração". */
function checkConfig(): ConfigCheckResult {
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
function checkReportTemplates(config: AppConfig): Issue[] {
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

/** Só valida que a pasta existe e é acessível; não precisa do resultado. */
function checkPdfsFolder(config: AppConfig): Issue[] {
  try {
    DriveApp.getFolderById(config.pdfsFolderId);
    return [];
  } catch (e) {
    return [toIssue("PDFs", e)];
  }
}

interface RegistrationCheckResult {
  registeredStudentsMap: Map<string, StudentData> | null;
  issues: Issue[];
}

/** Abre o Cadastro de Alunos, confere abas obrigatórias e matrículas duplicadas. */
function checkRegistration(config: AppConfig): RegistrationCheckResult {
  const issues: Issue[] = [];

  let registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  try {
    registrationSheet = SpreadsheetApp.openById(config.enrollmentSpreadsheetId);
  } catch (e) {
    return {
      registeredStudentsMap: null,
      issues: [toIssue("Cadastro de Alunos", e)],
    };
  }

  const regUrl = registrationSheet.getUrl();

  for (const sheetName of [
    ENROLLMENT_SHEET_NAMES.STUDENTS,
    ENROLLMENT_SHEET_NAMES.GUARDIANS,
  ]) {
    if (!registrationSheet.getSheetByName(sheetName)) {
      issues.push({
        type: "error",
        text: `Cadastro de Alunos: a aba "${sheetName}" não existe.`,
        url: regUrl,
      });
    }
  }

  let registeredStudentsMap: Map<string, StudentData> | null = null;
  try {
    registeredStudentsMap = loadStudentsMap(registrationSheet);
  } catch (e) {
    issues.push(toIssue("Cadastro de Alunos", e, regUrl));
  }

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

  return { registeredStudentsMap, issues };
}

interface SchoolYearsCheckResult {
  years: string[];
  issues: Issue[];
}

/** Lista as pastas de ano letivo; reporta erro se nenhuma for encontrada. */
function checkSchoolYears(config: AppConfig): SchoolYearsCheckResult {
  let years: string[] = [];
  try {
    years = listSchoolYears(config);
  } catch (error) {
    return { years: [], issues: [toIssue("Anos Letivos", error)] };
  }

  if (years.length > 0) return { years, issues: [] };

  let rootUrl: string | undefined;
  try {
    rootUrl = DriveApp.getFolderById(config.schoolYearsFolderId).getUrl();
  } catch {
    console.warn(
      `Nenhuma pasta de ano letivo encontrada dentro de "Anos Letivos".`,
    );
  }

  return {
    years: [],
    issues: [
      {
        type: "error",
        text: 'Nenhuma pasta de ano letivo encontrada dentro de "Anos Letivos".',
        url: rootUrl,
      },
    ],
  };
}

/** Verifica todas as turmas válidas dentro da pasta de um ano letivo. */
function checkYear(
  config: AppConfig,
  year: string,
  registeredStudentsMap: Map<string, StudentData> | null,
): Issue[] {
  let yearFolder: GoogleAppsScript.Drive.Folder;
  try {
    yearFolder = getSchoolYearFolder(config, year);
  } catch (error) {
    return [toIssue("Anos Letivos", error)];
  }

  return VALID_CLASSES.flatMap(({ className }) =>
    checkClass(yearFolder, year, className, registeredStudentsMap),
  );
}

/** Verifica uma turma: planilha, disciplinas presentes e consistência de alunos. */
function checkClass(
  yearFolder: GoogleAppsScript.Drive.Folder,
  year: string,
  className: string,
  registeredStudentsMap: Map<string, StudentData> | null,
): Issue[] {
  let classFile: GoogleAppsScript.Drive.File;
  try {
    classFile = getClassSpreadsheetFile(yearFolder, year, className);
  } catch (e) {
    return [toIssue(`[${year}]`, e, yearFolder.getUrl())];
  }

  let classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  try {
    classSpreadsheet = SpreadsheetApp.openById(classFile.getId());
  } catch (e) {
    return [
      toIssue(
        `[${year} / ${className}] Erro ao abrir a planilha`,
        e,
        classFile.getUrl(),
      ),
    ];
  }

  const issues: Issue[] = [];
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

  return issues;
}

/** Renderiza o dialog HTML com os resultados. */
function showValidationDialog(issues: Issue[]): void {
  const ui = SpreadsheetApp.getUi();
  const htmlOutput = renderView<ValidationResultInitData>(
    DIALOG_NAMES.validationResult,
    {
      issues,
    },
  );
  htmlOutput.setWidth(560).setHeight(530);

  ui.showModalDialog(htmlOutput, "Diagnóstico do Sistema");
}

// -------------------------------------

/** Verifica todas as configurações, estrutura de pastas e dados. */
export function checkSystem(): void {
  const issues: Issue[] = [];

  const { config, issues: configIssues } = checkConfig();
  issues.push(...configIssues);

  if (!config) {
    showValidationDialog(issues);
    return;
  }

  const reportTemplatesIssues = checkReportTemplates(config);
  issues.push(...reportTemplatesIssues);

  const pdfsIssues = checkPdfsFolder(config);
  issues.push(...pdfsIssues);

  const { registeredStudentsMap, issues: registrationIssues } =
    checkRegistration(config);
  issues.push(...registrationIssues);

  const { years, issues: yearsIssues } = checkSchoolYears(config);
  issues.push(...yearsIssues);

  for (const year of years) {
    issues.push(...checkYear(config, year, registeredStudentsMap));
  }

  showValidationDialog(issues);
}
