// server/system-check/validate-roster.ts
import { DEFAULT_LOCALE, ENROLLMENT_SHEET_NAMES } from "../config.ts";
import { STUDENT_COLUMNS } from "../report/constants.ts";

import type { ClassStudent } from "../report/types.ts";
import type { Issue, StudentData } from "../types.ts";

/**
 * Compara os alunos da aba "Resumo" de uma turma com o Cadastro Escolar.
 * Retorna objetos detalhados de diagnóstico.
 */
export function validateClassStudents(
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  registeredStudentsMap: Map<string, StudentData>,
  students: ClassStudent[],
  schoolYearLabel: string,
  className: string,
): Issue[] {
  const issues: Issue[] = [];
  const ssUrl = classSpreadsheet.getUrl();

  if (students.length === 0) {
    issues.push({
      type: "error",
      text: `[${schoolYearLabel} / ${className}] Turma sem alunos cadastrados na aba "${ENROLLMENT_SHEET_NAMES.SUMMARY}".`,
      url: ssUrl,
    });
    return issues;
  }

  const dupes = findDuplicateResumoIds(students, schoolYearLabel, className);
  issues.push(
    ...dupes.map((msg) => ({ type: "error" as const, text: msg, url: ssUrl })),
  );

  for (const { studentId, name, row } of students) {
    const registeredStudent = registeredStudentsMap.get(studentId);

    if (registeredStudent === undefined) {
      issues.push({
        type: "warning",
        text: `[${schoolYearLabel} / ${className} / Resumo, linha ${row}] Matrícula ${studentId} não consta no Cadastro Escolar.`,
        url: ssUrl,
      });
      continue;
    }

    const namesDiffer =
      registeredStudent.name.localeCompare(name, DEFAULT_LOCALE, {
        sensitivity: "base",
      }) !== 0;

    if (namesDiffer) {
      issues.push({
        type: "warning",
        text: `[${schoolYearLabel} / ${className} / Resumo, linha ${row}] Nome "${name}" diverge do Cadastro ("${registeredStudent.name}") para a matrícula ${studentId}.`,
        url: ssUrl,
      });
    }
  }

  return issues;
}

/** Verifica se há matrículas duplicadas na aba "Resumo". */
export function findDuplicateResumoIds(
  students: Array<{ studentId: string; row: number }>,
  schoolYearLabel: string,
  className: string,
): string[] {
  const rowsByStudentId = new Map<string, number[]>();

  for (const { studentId, row } of students) {
    const existingRows = rowsByStudentId.get(studentId) ?? [];
    existingRows.push(row);
    rowsByStudentId.set(studentId, existingRows);
  }

  return [...rowsByStudentId.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(
      ([studentId, rows]) =>
        `[${schoolYearLabel} / ${className} / Resumo] Matrícula ${studentId} duplicada nas linhas ${rows.join(", ")}.`,
    );
}

/** Verifica se há matrículas duplicadas na aba "Alunos". */
export function findDuplicateStudentIds(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
): string[] {
  const studentsSheet = registrationSheet.getSheetByName(
    ENROLLMENT_SHEET_NAMES.STUDENTS,
  );
  if (!studentsSheet) return [];

  const rows = studentsSheet.getDataRange().getValues().slice(1);
  const rowsByStudentId = new Map<string, number[]>();

  rows.forEach((row, index) => {
    const studentId = String(row[STUDENT_COLUMNS.id] ?? "").trim();
    if (!studentId) return;

    const dataRow = index + 2;
    const existingRows = rowsByStudentId.get(studentId) ?? [];
    existingRows.push(dataRow);
    rowsByStudentId.set(studentId, existingRows);
  });

  return [...rowsByStudentId.entries()]
    .filter(([, dataRows]) => dataRows.length > 1)
    .map(
      ([studentId, dataRows]) =>
        `Cadastro Escolar: matrícula ${studentId} duplicada nas linhas ${dataRows.join(", ")}.`,
    );
}
