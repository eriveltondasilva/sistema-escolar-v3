// server/report/data-access.ts
import { ENROLLMENT_SHEET_NAMES } from "../config.ts";
import {
  FIRST_DATA_ROW,
  GRADE_COLUMNS,
  GRADE_COLUMNS_COUNT,
  GUARDIAN_COLUMNS,
  STUDENT_COLUMNS,
  SUMMARY_FIRST_DATA_ROW,
  VALID_SUBJECTS,
} from "./constants.ts";
import { formatDate, formatGuardianNames } from "../utils/formatters.ts";

import type { StudentData, Subject } from "../types.ts";
import type {
  ClassStudent,
  GradeRow,
  PersonalData,
  ReportContext,
  SubjectGrades,
} from "./types.ts";

/** Encontra a aba de uma disciplina na planilha de turma. */
export function findSubjectSheet(
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  subject: Subject,
): GoogleAppsScript.Spreadsheet.Sheet | null {
  return classSpreadsheet.getSheetByName(subject.code);
}

/** Confere quais disciplinas esperadas existem como aba na planilha de turma. */
export function checkClassSubjects(
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
): { found: Subject[]; missing: string[] } {
  return VALID_SUBJECTS.reduce(
    (acc, subject) => {
      if (findSubjectSheet(classSpreadsheet, subject)) {
        acc.found.push(subject);
      } else {
        acc.missing.push(subject.name);
      }
      return acc;
    },
    { found: [] as Subject[], missing: [] as string[] },
  );
}

export function getClassStudentsFromResumo(
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
): ClassStudent[] {
  const resumoSheet = classSpreadsheet.getSheetByName(
    ENROLLMENT_SHEET_NAMES.SUMMARY,
  );
  if (!resumoSheet) return [];

  const lastRow = resumoSheet.getLastRow();
  if (lastRow < SUMMARY_FIRST_DATA_ROW) return [];
  const values = resumoSheet
    .getRange(
      SUMMARY_FIRST_DATA_ROW,
      1,
      lastRow - SUMMARY_FIRST_DATA_ROW + 1,
      2,
    )
    .getValues();

  return values
    .map(([studentId, name], index) => ({
      studentId: String(studentId ?? "").trim(),
      name: String(name ?? "").trim(),
      row: SUMMARY_FIRST_DATA_ROW + index,
    }))
    .filter(({ studentId }) => studentId.length > 0);
}

/**
 * Verifica se um aluno pertence à turma, usando "Resumo" como lista
 * oficial de matrículas — a mesma fonte usada por `validateClassStudents`.
 */
export function isStudentInClass(
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  studentId: string,
): boolean {
  return getClassStudentsFromResumo(classSpreadsheet).some(
    (student) => student.studentId === studentId,
  );
}

/** Monta um StudentData completo (7 campos) a partir de uma linha da aba "Alunos". */
function mapStudentRow(row: ReadonlyArray<unknown>): StudentData {
  return {
    name: String(row[STUDENT_COLUMNS.name] ?? "").trim(),
    address: String(row[STUDENT_COLUMNS.address] ?? ""),
    nationality: String(row[STUDENT_COLUMNS.nationality] ?? ""),
    birthDate: formatDate(row[STUDENT_COLUMNS.birthDate]),
    enrollmentDate: formatDate(row[STUDENT_COLUMNS.enrollmentDate]),
    sex: String(row[STUDENT_COLUMNS.sex] ?? ""),
    status: String(row[STUDENT_COLUMNS.status] ?? ""),
  };
}

/** Lê a aba "Alunos" do Cadastro e devolve um mapa por matrícula. */
export function loadStudentsMap(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
): Map<string, StudentData> {
  const studentsSheet = registrationSheet.getSheetByName(
    ENROLLMENT_SHEET_NAMES.STUDENTS,
  );
  if (!studentsSheet) {
    throw new Error(
      `Cadastro de Alunos: a aba "${ENROLLMENT_SHEET_NAMES.STUDENTS}" não existe.`,
    );
  }

  const rows = studentsSheet.getDataRange().getValues().slice(1);
  const map = new Map<string, StudentData>();

  for (const row of rows) {
    const studentId = String(row[STUDENT_COLUMNS.id] ?? "").trim();
    if (!studentId) continue;
    map.set(studentId, mapStudentRow(row));
  }

  return map;
}

/**
 * Busca um único aluno na aba "Alunos" pela matrícula, sem ler a planilha
 * inteira do Cadastro. Devolve a mesma estrutura de `loadStudentsMap`
 * (com no máximo uma entrada), para ser usado por `getPersonalData`.
 */
export function loadSingleStudentMap(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  studentId: string,
): Map<string, StudentData> {
  const studentsSheet = registrationSheet.getSheetByName(
    ENROLLMENT_SHEET_NAMES.STUDENTS,
  );

  if (!studentsSheet) {
    throw new Error(
      `Cadastro de Alunos: a aba "${ENROLLMENT_SHEET_NAMES.STUDENTS}" não existe.`,
    );
  }

  const map = new Map<string, StudentData>();
  const lastRow = studentsSheet.getLastRow();
  if (lastRow < 2) return map;

  const match = studentsSheet
    .getRange(2, STUDENT_COLUMNS.id + 1, lastRow - 1, 1)
    .createTextFinder(studentId)
    .matchEntireCell(true)
    .findNext();

  if (!match) return map;

  const row = studentsSheet
    .getRange(match.getRow(), 1, 1, studentsSheet.getLastColumn())
    .getValues()[0];

  if (!row) return map;

  map.set(studentId, mapStudentRow(row));

  return map;
}

/**
 * Lê a aba "Responsáveis" do Cadastro e agrupa por matrícula.
 *
 * Linhas com matrícula preenchida mas nome de responsável vazio são
 * descartadas — um nome vazio no array quebraria a concatenação feita por
 * `formatGuardianNames` (ex: "Maria e " em vez de só "Maria").
 */
export function loadGuardiansMap(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
): Map<string, string[]> {
  const guardiansSheet = registrationSheet.getSheetByName(
    ENROLLMENT_SHEET_NAMES.GUARDIANS,
  );

  if (!guardiansSheet) return new Map();

  const rows = guardiansSheet.getDataRange().getValues().slice(1);
  const validRows = rows
    .map((row) => ({
      studentId: String(row[GUARDIAN_COLUMNS.studentId] ?? "").trim(),
      name: String(row[GUARDIAN_COLUMNS.name] ?? "").trim(),
    }))
    .filter(({ studentId, name }) => studentId.length > 0 && name.length > 0);

  return validRows.reduce((map, { studentId, name }) => {
    const names = map.get(studentId) ?? [];
    names.push(name);
    map.set(studentId, names);
    return map;
  }, new Map<string, string[]>());
}

/**
 * Busca os responsáveis de um único aluno na aba "Responsáveis" pela
 * matrícula, sem ler a planilha inteira do Cadastro.
 */
export function loadSingleStudentGuardiansMap(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  studentId: string,
): Map<string, string[]> {
  const guardiansSheet = registrationSheet.getSheetByName(
    ENROLLMENT_SHEET_NAMES.GUARDIANS,
  );
  const map = new Map<string, string[]>();
  if (!guardiansSheet) return map;

  const lastRow = guardiansSheet.getLastRow();
  if (lastRow < 2) return map;

  const matches = guardiansSheet
    .getRange(2, GUARDIAN_COLUMNS.studentId + 1, lastRow - 1, 1)
    .createTextFinder(studentId)
    .matchEntireCell(true)
    .findAll();

  const names = matches
    .map((cell) =>
      String(
        guardiansSheet
          .getRange(cell.getRow(), GUARDIAN_COLUMNS.name + 1)
          .getValue() ?? "",
      ).trim(),
    )
    .filter((name) => name.length > 0);

  if (names.length > 0) map.set(studentId, names);

  return map;
}

export function loadGradesBySubject(
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  foundSubjects: Subject[],
): Map<string, Map<string, GradeRow>> {
  const map = new Map<string, Map<string, GradeRow>>();

  for (const subject of foundSubjects) {
    const sheet = findSubjectSheet(classSpreadsheet, subject);
    if (!sheet) continue;

    const lastRow = sheet.getLastRow();
    const rows =
      lastRow >= FIRST_DATA_ROW ?
        sheet
          .getRange(
            FIRST_DATA_ROW,
            1,
            lastRow - FIRST_DATA_ROW + 1,
            GRADE_COLUMNS_COUNT,
          )
          .getValues()
      : [];

    const byStudentId = new Map<string, GradeRow>(
      rows
        .map((row): [string, GradeRow] => [String(row[0] ?? "").trim(), row])
        .filter(([studentId]) => studentId.length > 0),
    );

    map.set(subject.name, byStudentId);
  }

  return map;
}

export function loadGradesForSingleStudent(
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  foundSubjects: Subject[],
  studentId: string,
): Map<string, Map<string, GradeRow>> {
  const map = new Map<string, Map<string, GradeRow>>();

  for (const subject of foundSubjects) {
    const sheet = findSubjectSheet(classSpreadsheet, subject);
    const byStudentId = new Map<string, GradeRow>();

    const lastRow = sheet?.getLastRow() ?? 0;
    if (sheet && lastRow >= FIRST_DATA_ROW) {
      const match = sheet
        .getRange(FIRST_DATA_ROW, 1, lastRow - FIRST_DATA_ROW + 1, 1)
        .createTextFinder(studentId)
        .matchEntireCell(true)
        .findNext();

      if (match) {
        const rowValues = sheet
          .getRange(match.getRow(), 1, 1, GRADE_COLUMNS_COUNT)
          .getValues()[0];
        if (rowValues) byStudentId.set(studentId, rowValues);
      }
    }

    map.set(subject.name, byStudentId);
  }

  return map;
}

export function getGradesForStudent(
  studentId: string,
  foundSubjects: Subject[],
  context: ReportContext,
): Record<string, SubjectGrades | null> {
  const result: Record<string, SubjectGrades | null> = {};

  for (const subject of foundSubjects) {
    const rowValues = context.gradesBySubject.get(subject.name)?.get(studentId);

    result[subject.name] =
      rowValues ?
        Object.fromEntries(
          Object.entries(GRADE_COLUMNS).map(([field, index]) => [
            field,
            rowValues[index],
          ]),
        )
      : null;
  }

  return result;
}

export function getPersonalData(
  studentId: string,
  context: ReportContext,
): PersonalData {
  const student = context.studentsMap.get(studentId);

  if (!student) {
    throw new Error(
      `Aluno com matrícula ${studentId} não encontrado no Cadastro de Alunos.`,
    );
  }

  const guardianNames = context.guardiansMap.get(studentId) ?? [];

  return { ...student, guardianNames: formatGuardianNames(guardianNames) };
}
