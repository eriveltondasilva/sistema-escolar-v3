// server/system-check/structure-checks.ts
import { ENROLLMENT_SHEET_NAMES } from "../config.ts";
import { VALID_CLASSES } from "../report/constants.ts";
import {
  checkClassSubjects,
  getClassStudentsFromResumo,
  loadStudentsMap,
} from "../report/data-access.ts";
import {
  getClassSpreadsheetFile,
  getSchoolYearFolder,
  listSchoolYears,
} from "../shared/drive-lookup.ts";
import { toIssue } from "./issue-helper.ts";
import {
  findDuplicateStudentIds,
  validateClassStudents,
} from "./validate-roster.ts";

import type { AppConfig, Issue, StudentData } from "../types.ts";

export interface RegistrationCheckResult {
  registeredStudentsMap: Map<string, StudentData> | null;
  issues: Issue[];
}

/** Abre o Cadastro Escolar, confere abas obrigatórias e matrículas duplicadas. */
export function checkRegistration(config: AppConfig): RegistrationCheckResult {
  const issues: Issue[] = [];

  let registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  try {
    registrationSheet = SpreadsheetApp.openById(config.enrollmentSpreadsheetId);
  } catch (e) {
    return {
      registeredStudentsMap: null,
      issues: [toIssue("Cadastro Escolar", e)],
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
        text: `Cadastro Escolar: a aba "${sheetName}" não existe.`,
        url: regUrl,
      });
    }
  }

  let registeredStudentsMap: Map<string, StudentData> | null = null;
  try {
    registeredStudentsMap = loadStudentsMap(registrationSheet);
  } catch (e) {
    issues.push(toIssue("Cadastro Escolar", e, regUrl));
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

export interface SchoolYearsCheckResult {
  schoolYearLabels: string[];
  issues: Issue[];
}

/** Lista as pastas de ano letivo; reporta erro se nenhuma for encontrada. */
export function checkSchoolYears(config: AppConfig): SchoolYearsCheckResult {
  let schoolYearLabels: string[];
  try {
    schoolYearLabels = listSchoolYears(config);
  } catch (error) {
    return { schoolYearLabels: [], issues: [toIssue("Anos Letivos", error)] };
  }

  if (schoolYearLabels.length > 0) return { schoolYearLabels, issues: [] };

  let rootUrl: string | undefined;
  try {
    rootUrl = DriveApp.getFolderById(config.schoolYearsFolderId).getUrl();
  } catch {
    console.warn(
      `Nenhuma pasta de ano letivo encontrada dentro de "Anos Letivos".`,
    );
  }

  return {
    schoolYearLabels: [],
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
export function checkYear(
  config: AppConfig,
  schoolYearLabel: string,
  registeredStudentsMap: Map<string, StudentData> | null,
): Issue[] {
  let yearFolder: GoogleAppsScript.Drive.Folder;
  try {
    yearFolder = getSchoolYearFolder(config, schoolYearLabel);
  } catch (error) {
    return [toIssue("Anos Letivos", error)];
  }

  return VALID_CLASSES.flatMap(({ name: className }) =>
    checkClass(yearFolder, schoolYearLabel, className, registeredStudentsMap),
  );
}

/** Verifica uma turma: planilha, disciplinas presentes e consistência de alunos. */
function checkClass(
  yearFolder: GoogleAppsScript.Drive.Folder,
  schoolYearLabel: string,
  className: string,
  registeredStudentsMap: Map<string, StudentData> | null,
): Issue[] {
  let classFile: GoogleAppsScript.Drive.File;
  try {
    classFile = getClassSpreadsheetFile(yearFolder, schoolYearLabel, className);
  } catch (e) {
    return [toIssue(`[${schoolYearLabel}]`, e, yearFolder.getUrl())];
  }

  let classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  try {
    classSpreadsheet = SpreadsheetApp.openById(classFile.getId());
  } catch (e) {
    return [
      toIssue(
        `[${schoolYearLabel} / ${className}] Erro ao abrir a planilha`,
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
      text: `[${schoolYearLabel} / ${className}] Disciplinas faltando (serão ignoradas): ${missing.join(", ")}`,
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
        schoolYearLabel,
        className,
      ),
    );
  }

  return issues;
}
