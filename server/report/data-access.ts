// server/report/data-access.ts
import { formatDate, formatGuardianNames } from "#utils/formatters.ts";
import {
  getGradeColumns,
  GUARDIANS_SHEET,
  STUDENTS_SHEET,
  SUMMARY_SHEET,
  VALID_SUBJECTS,
} from "./constants.ts";

import type {
  AssessmentType,
  StudentData,
  StudentStatus,
  Subject,
} from "../types.ts";
import type {
  ClassStudent,
  GradeRow,
  PersonalData,
  ReportContext,
  SubjectGrades,
} from "./types.ts";

/** Encontra a aba de uma disciplina na planilha de turma. */
function findSubjectSheet(
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  subject: Subject,
): GoogleAppsScript.Spreadsheet.Sheet | null {
  return classSpreadsheet.getSheetByName(subject.code);
}

// -------------------------------------

/** Confere quais disciplinas esperadas existem como aba na planilha de turma. */
export function checkClassSubjects(
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
): { foundSubjects: Subject[]; missingSubjectNames: string[] } {
  return VALID_SUBJECTS.reduce(
    (acc, subject) => {
      if (findSubjectSheet(classSpreadsheet, subject)) {
        acc.foundSubjects.push(subject);
      } else {
        acc.missingSubjectNames.push(subject.name);
      }
      return acc;
    },
    { foundSubjects: [] as Subject[], missingSubjectNames: [] as string[] },
  );
}

export function getClassStudentsFromSummary(
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
): ClassStudent[] {
  const summarySheet = classSpreadsheet.getSheetByName(SUMMARY_SHEET.name);
  if (!summarySheet) return [];

  const lastRow = summarySheet.getLastRow();
  if (lastRow < SUMMARY_SHEET.startRow) return [];

  const colCount = Object.keys(SUMMARY_SHEET.columns).length;
  const values = summarySheet
    .getRange(
      SUMMARY_SHEET.startRow,
      1,
      lastRow - SUMMARY_SHEET.startRow + 1,
      colCount,
    )
    .getValues();

  return values
    .map(([studentId, name], index) => ({
      studentId: String(studentId).trim(),
      name: String(name).trim(),
      row: SUMMARY_SHEET.startRow + index,
    }))
    .filter((s) => s.studentId.length > 0);
}

/**
 * Verifica se um aluno pertence à turma, usando "Resumo" como lista
 * oficial de matrículas — a mesma fonte usada por `validateClassStudents`.
 */
export function isStudentInClass(
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  studentId: string,
): boolean {
  const students = getClassStudentsFromSummary(classSpreadsheet);
  return students.some((s) => s.studentId === studentId);
}

/** Monta um StudentData completo a partir de uma linha da aba "Alunos". */
function mapStudentRow(row: ReadonlyArray<unknown>): StudentData {
  const col = STUDENTS_SHEET.columns;

  return {
    name: String(row[col.name] ?? "").trim(),
    address: String(row[col.address] ?? "").trim(),
    nationality: String(row[col.nationality] ?? "").trim(),
    birthDate: formatDate(String(row[col.birthDate] ?? "").trim()),
    enrollmentDate: formatDate(String(row[col.enrollmentDate] ?? "").trim()),
    sex: String(row[col.sex] ?? "").trim(),
    status: String(row[col.status] ?? "").trim() as StudentStatus,
  };
}

/** Lê a aba "Alunos" do Cadastro e devolve um mapa por matrícula. */
export function loadStudentsMap(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
): Map<string, StudentData> {
  const studentsSheet = registrationSheet.getSheetByName(STUDENTS_SHEET.name);
  if (!studentsSheet) {
    throw new Error(
      `Cadastro Escolar: a aba "${STUDENTS_SHEET.name}" não existe.`,
    );
  }

  const lastRow = studentsSheet.getLastRow();
  if (lastRow < STUDENTS_SHEET.startRow) return new Map();

  const colCount = Object.keys(STUDENTS_SHEET.columns).length;
  const rows = studentsSheet
    .getRange(
      STUDENTS_SHEET.startRow,
      1,
      lastRow - STUDENTS_SHEET.startRow + 1,
      colCount,
    )
    .getValues();

  const map = new Map<string, StudentData>();
  for (const row of rows) {
    const studentId = String(row[STUDENTS_SHEET.columns.id]).trim();
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
  const studentsSheet = registrationSheet.getSheetByName(STUDENTS_SHEET.name);

  if (!studentsSheet) {
    throw new Error(
      `Cadastro Escolar: a aba "${STUDENTS_SHEET.name}" não existe.`,
    );
  }

  const map = new Map<string, StudentData>();
  const lastRow = studentsSheet.getLastRow();
  if (lastRow < STUDENTS_SHEET.startRow) return map;

  const col = STUDENTS_SHEET.columns;
  const colCount = Object.keys(col).length;

  const match = studentsSheet
    .getRange(
      STUDENTS_SHEET.startRow,
      col.id + 1,
      lastRow - STUDENTS_SHEET.startRow + 1,
      1,
    )
    .createTextFinder(studentId)
    .matchEntireCell(true)
    .findNext();

  if (!match) return map;

  const row = studentsSheet
    .getRange(match.getRow(), 1, 1, colCount)
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
  const guardiansSheet = registrationSheet.getSheetByName(GUARDIANS_SHEET.name);
  if (!guardiansSheet) return new Map();

  const lastRow = guardiansSheet.getLastRow();
  if (lastRow < GUARDIANS_SHEET.startRow) return new Map();

  const col = GUARDIANS_SHEET.columns;
  const colCount = Object.keys(col).length;
  const rows = guardiansSheet
    .getRange(
      GUARDIANS_SHEET.startRow,
      1,
      lastRow - GUARDIANS_SHEET.startRow + 1,
      colCount,
    )
    .getValues();

  const map = new Map<string, string[]>();

  for (const row of rows) {
    const studentId = String(row[col.studentId]).trim();
    const name = String(row[col.name]).trim();

    if (!studentId || !name) continue;

    const names = map.get(studentId);
    if (names) {
      names.push(name);
    } else {
      map.set(studentId, [name]);
    }
  }

  return map;
}

/**
 * Busca os responsáveis de um único aluno na aba "Responsáveis" pela matrícula, sem ler a planilha inteira do Cadastro.
 */
export function loadSingleStudentGuardiansMap(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  studentId: string,
): Map<string, string[]> {
  const guardiansSheet = registrationSheet.getSheetByName(GUARDIANS_SHEET.name);
  const map = new Map<string, string[]>();
  if (!guardiansSheet) return map;

  const lastRow = guardiansSheet.getLastRow();
  if (lastRow < GUARDIANS_SHEET.startRow) return map;

  const col = GUARDIANS_SHEET.columns;
  const rowCount = lastRow - GUARDIANS_SHEET.startRow + 1;

  // Uma única chamada para as duas colunas relevantes (studentId + name)
  const rows = guardiansSheet
    .getRange(
      GUARDIANS_SHEET.startRow,
      col.studentId + 1,
      rowCount,
      col.name + 1,
    )
    .getValues();

  const names: string[] = [];

  for (const row of rows) {
    if (String(row[0]).trim() !== studentId) continue;
    const name = String(row[1]).trim();
    if (name) names.push(name);
  }

  if (names.length > 0) map.set(studentId, names);
  return map;
}

interface LoadGradesBySubject {
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  foundSubjects: Subject[];
  assessmentType: AssessmentType;
}

export function loadGradesBySubject({
  classSpreadsheet,
  foundSubjects,
  assessmentType,
}: LoadGradesBySubject): Map<string, Map<string, GradeRow>> {
  const gradeSheet = getGradeColumns(assessmentType);
  const colCount = Object.keys(gradeSheet.columns).length;
  const map = new Map<string, Map<string, GradeRow>>();

  for (const subject of foundSubjects) {
    const sheet = findSubjectSheet(classSpreadsheet, subject);
    if (!sheet) continue;

    const lastRow = sheet.getLastRow();
    const rows =
      lastRow >= gradeSheet.startRow ?
        sheet
          .getRange(
            gradeSheet.startRow,
            1,
            lastRow - gradeSheet.startRow + 1,
            colCount,
          )
          .getValues()
      : [];

    const byStudentId = new Map<string, GradeRow>(
      rows
        .map((row): [string, GradeRow] => [String(row[0]).trim(), row])
        .filter(([studentId]) => studentId.length > 0),
    );

    map.set(subject.name, byStudentId);
  }

  return map;
}

interface LoadGradesForSingleStudent {
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  foundSubjects: Subject[];
  studentId: string;
  assessmentType: AssessmentType;
}

export function loadGradesForSingleStudent({
  classSpreadsheet,
  foundSubjects,
  studentId,
  assessmentType,
}: LoadGradesForSingleStudent): Map<string, Map<string, GradeRow>> {
  const gradeSheet = getGradeColumns(assessmentType);
  const colCount = Object.keys(gradeSheet.columns).length;
  const map = new Map<string, Map<string, GradeRow>>();

  for (const subject of foundSubjects) {
    const sheet = findSubjectSheet(classSpreadsheet, subject);
    const byStudentId = new Map<string, GradeRow>();

    const lastRow = sheet?.getLastRow() ?? 0;
    if (sheet && lastRow >= gradeSheet.startRow) {
      const match = sheet
        .getRange(gradeSheet.startRow, 1, lastRow - gradeSheet.startRow + 1, 1)
        .createTextFinder(studentId)
        .matchEntireCell(true)
        .findNext();

      if (match) {
        const rowValues = sheet
          .getRange(match.getRow(), 1, 1, colCount)
          .getValues()[0];
        if (rowValues) byStudentId.set(studentId, rowValues);
      }
    }

    map.set(subject.name, byStudentId);
  }

  return map;
}

interface GetGradesForStudent {
  studentId: string;
  foundSubjects: Subject[];
  context: ReportContext;
}

export function getGradesForStudent({
  studentId,
  foundSubjects,
  context,
}: GetGradesForStudent): Record<string, SubjectGrades | null> {
  const result: Record<string, SubjectGrades | null> = {};
  const gradeColumns = getGradeColumns(context.assessmentType).columns;
  const gradeEntries = Object.entries(gradeColumns); // calculado uma vez

  for (const subject of foundSubjects) {
    const rowValues = context.gradesBySubject.get(subject.name)?.get(studentId);

    result[subject.name] =
      rowValues ?
        Object.fromEntries(
          gradeEntries.map(([field, index]) => [field, rowValues[index]]),
        )
      : null;
  }

  return result;
}

export function getPersonalData(
  context: ReportContext,
  studentId: string,
): PersonalData {
  const student = context.studentsMap.get(studentId);

  if (!student) {
    throw new Error(
      `Aluno com matrícula ${studentId} não encontrado no Cadastro Escolar.`,
    );
  }

  const guardianNames = context.guardiansMap.get(studentId) ?? [];

  return { ...student, guardianNames: formatGuardianNames(guardianNames) };
}
