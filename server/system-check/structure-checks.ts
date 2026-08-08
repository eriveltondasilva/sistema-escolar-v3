// server/system-check/structure-checks.ts
import {
  getClassSpreadsheetFile,
  getSchoolYearFolder,
  listSchoolYears,
} from "#drive/drive-lookup.ts";
import {
  GUARDIANS_SHEET,
  STUDENTS_SHEET,
  VALID_CLASSES,
} from "#report/constants.ts";
import {
  checkClassSubjects,
  getClassStudentsFromSummary,
  loadStudentsMap,
} from "#report/data-access.ts";
import { toIssue } from "./issue-helper.ts";
import {
  findDuplicateStudentIds,
  validateClassStudents,
} from "./validate-roster.ts";

import type { AppConfig, Issue, StudentData } from "#types.ts";

interface RegistrationCheckResult {
  registeredStudentsMap: Map<string, StudentData> | null;
  issues: Issue[];
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
  } catch (error) {
    return [
      toIssue({
        label: `[${schoolYearLabel}]`,
        error,
        url: yearFolder.getUrl(),
      }),
    ];
  }

  let classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  try {
    classSpreadsheet = SpreadsheetApp.openById(classFile.getId());
  } catch (error) {
    return [
      toIssue({
        label: `[${schoolYearLabel} / ${className}] Erro ao abrir a planilha`,
        error,
        url: classFile.getUrl(),
      }),
    ];
  }

  const issues: Issue[] = [];
  const ssUrl = classSpreadsheet.getUrl();
  const { missingSubjectNames } = checkClassSubjects(classSpreadsheet);

  if (missingSubjectNames.length > 0) {
    issues.push({
      type: "warning",
      text: `[${schoolYearLabel} / ${className}] Disciplinas faltando (serão ignoradas): ${missingSubjectNames.join(", ")}`,
      url: ssUrl,
    });
  }

  if (registeredStudentsMap) {
    const students = getClassStudentsFromSummary(classSpreadsheet);
    issues.push(
      ...validateClassStudents({
        classSpreadsheet,
        registeredStudentsMap,
        students,
        schoolYearLabel,
        className,
      }),
    );
  }

  return issues;
}

// -------------------------------------

/** Abre o Cadastro Escolar, confere abas obrigatórias e matrículas duplicadas. */
export function checkRegistration(config: AppConfig): RegistrationCheckResult {
  const issues: Issue[] = [];

  let registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  try {
    registrationSheet = SpreadsheetApp.openById(config.enrollmentSpreadsheetId);
  } catch (error) {
    return {
      registeredStudentsMap: null,
      issues: [toIssue({ label: "Cadastro Escolar", error })],
    };
  }

  const regUrl = registrationSheet.getUrl();

  for (const sheetName of [STUDENTS_SHEET.name, GUARDIANS_SHEET.name]) {
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
  } catch (error) {
    issues.push(toIssue({ label: "Cadastro Escolar", error, url: regUrl }));
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
    schoolYearLabels = listSchoolYears(config.schoolYearsFolderId);
  } catch (error) {
    return {
      schoolYearLabels: [],
      issues: [toIssue({ label: "Anos Letivos", error })],
    };
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
    yearFolder = getSchoolYearFolder(
      config.schoolYearsFolderId,
      schoolYearLabel,
    );
  } catch (error) {
    return [toIssue({ label: "Anos Letivos", error })];
  }

  return VALID_CLASSES.flatMap(({ name: className }) =>
    checkClass(yearFolder, schoolYearLabel, className, registeredStudentsMap),
  );
}
