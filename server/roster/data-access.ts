// server/roster/data-access.ts
import { DEFAULT_LOCALE } from "#config/constants.ts";
import { GUARDIANS_SHEET, STUDENTS_SHEET } from "#report/constants.ts";
import { formatDate } from "#utils/formatters.ts";
import { diffStudentFields, logStudentChanges } from "./change-log.ts";

import type { GuardianData, StudentSummary } from "../types.ts";
import type { CreateStudentPayload, StudentFormPayload } from "./types.ts";

const STUDENT_ID_PADDING = 4;

/** Status padrão atribuído a todo aluno recém-cadastrado. */
const DEFAULT_STUDENT_STATUS = "ativo";

/** Número de colunas da aba "Alunos" (ver STUDENTS_SHEET.columns). */
const STUDENT_COL_COUNT = Object.keys(STUDENTS_SHEET.columns).length;

/** Número de colunas da aba "Responsáveis" (ver GUARDIANS_SHEET.columns). */
const GUARDIAN_COL_COUNT = Object.keys(GUARDIANS_SHEET.columns).length;

function generateNextStudentId(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
): string {
  const studentsSheet = registrationSheet.getSheetByName(STUDENTS_SHEET.name);

  if (!studentsSheet) {
    throw new Error(
      `Cadastro Escolar: a aba "${STUDENTS_SHEET.name}" não existe.`,
    );
  }

  const lastRow = studentsSheet.getLastRow();
  if (lastRow < STUDENTS_SHEET.startRow) {
    return "1";
  }

  const rows = studentsSheet
    .getRange(
      STUDENTS_SHEET.startRow,
      STUDENTS_SHEET.columns.id + 1,
      lastRow - STUDENTS_SHEET.startRow + 1,
      1,
    )
    .getValues();

  const maxId = rows.reduce((max, row) => {
    const numeric = Number(String(row[0]).trim());
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 0);

  return String(maxId + 1);
}

/** Formata uma data para "yyyy-MM-dd", o formato que <input type="date"> espera. */
function toIsoDateString(date: unknown): string {
  if (!date || !(date instanceof Date)) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/** Monta um GuardianData completo a partir de uma linha da aba "Responsáveis". */
function mapGuardianRow(row: ReadonlyArray<unknown>): GuardianData {
  const col = GUARDIANS_SHEET.columns;
  return {
    name: String(row[col.name] ?? "").trim(),
    address: String(row[col.address] ?? ""),
    relationship: String(row[col.relationship] ?? ""),
    // A célula armazena "sim"/"não" — comparação case-insensitive para robustez.
    isPrimary:
      String(row[col.isPrimary] ?? "")
        .trim()
        .toLowerCase() === "sim",
    phone: String(row[col.phone] ?? ""),
  };
}

/**
 * Busca os responsáveis de um único aluno na aba "Responsáveis" pela
 * matrícula, já com todos os campos (endereço, parentesco, telefone,
 * principal) — usado pelo formulário de edição.
 */
function loadStudentGuardians(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  studentId: string,
): GuardianData[] {
  const guardiansSheet = registrationSheet.getSheetByName(GUARDIANS_SHEET.name);
  if (!guardiansSheet) return [];

  const lastRow = guardiansSheet.getLastRow();
  if (lastRow < GUARDIANS_SHEET.startRow) return [];

  const matches = guardiansSheet
    .getRange(
      GUARDIANS_SHEET.startRow,
      GUARDIANS_SHEET.columns.studentId + 1,
      lastRow - GUARDIANS_SHEET.startRow + 1,
      1,
    )
    .createTextFinder(studentId)
    .matchEntireCell(true)
    .findAll();

  return matches
    .map(
      (cell) =>
        guardiansSheet
          .getRange(cell.getRow(), 1, 1, GUARDIAN_COL_COUNT)
          .getValues()[0],
    )
    .filter((row): row is unknown[] => row !== undefined)
    .map(mapGuardianRow)
    .filter((guardian) => guardian.name.length > 0);
}

/**
 * Substitui todos os responsáveis de um aluno pelos informados, gravando
 * nome, endereço, parentesco, telefone e o marcador de responsável
 * principal — todas as colunas de GUARDIANS_SHEET.
 */
function replaceGuardians(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  studentId: string,
  guardians: GuardianData[],
): void {
  const guardiansSheet = registrationSheet.getSheetByName(GUARDIANS_SHEET.name);
  if (!guardiansSheet) {
    throw new Error(
      `Cadastro Escolar: a aba "${GUARDIANS_SHEET.name}" não existe.`,
    );
  }

  const validGuardians = guardians.filter(
    (guardian) => guardian.name.trim().length > 0,
  );

  const lastRow = guardiansSheet.getLastRow();
  const existingRows: number[] = [];

  if (lastRow >= GUARDIANS_SHEET.startRow) {
    const col = GUARDIANS_SHEET.columns;
    const existingIds = guardiansSheet
      .getRange(
        GUARDIANS_SHEET.startRow,
        col.studentId + 1,
        lastRow - GUARDIANS_SHEET.startRow + 1,
        1,
      )
      .getValues();

    existingIds.forEach((row, i) => {
      if (String(row[0] ?? "").trim() === studentId) {
        existingRows.push(GUARDIANS_SHEET.startRow + i);
      }
    });
  }

  // 1. Insere os novos responsáveis primeiro (no final da aba). Se isso
  // falhar (quota, timeout), as linhas antigas continuam intactas e o
  // aluno não fica sem nenhum responsável cadastrado.
  if (validGuardians.length > 0) {
    const newRows = validGuardians.map((guardian) => [
      studentId,
      guardian.name.trim(),
      guardian.address.trim(),
      guardian.relationship.trim(),
      guardian.isPrimary ? "sim" : "não",
      guardian.phone.trim(),
    ]);
    guardiansSheet
      .getRange(
        guardiansSheet.getLastRow() + 1,
        1,
        newRows.length,
        GUARDIAN_COL_COUNT,
      )
      .setValues(newRows);
  }

  // 2. Só depois do sucesso acima, remove as linhas antigas.
  // De baixo para cima, para não bagunçar os índices ao apagar.
  for (let i = existingRows.length - 1; i >= 0; i--) {
    guardiansSheet.deleteRow(existingRows[i]!);
  }
}

// -------------------------------------

export function searchStudents(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  query: string,
): StudentSummary[] {
  const studentsSheet = registrationSheet.getSheetByName(STUDENTS_SHEET.name);
  if (!studentsSheet) return [];

  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const normalizedQuery = trimmedQuery.toLocaleLowerCase(DEFAULT_LOCALE);

  const lastRow = studentsSheet.getLastRow();
  if (lastRow < STUDENTS_SHEET.startRow) return [];

  const rows = studentsSheet
    .getRange(
      STUDENTS_SHEET.startRow,
      1,
      lastRow - STUDENTS_SHEET.startRow + 1,
      STUDENT_COL_COUNT,
    )
    .getValues();

  return rows
    .map((row) => ({
      studentId: String(row[STUDENTS_SHEET.columns.id] ?? "").trim(),
      name: String(row[STUDENTS_SHEET.columns.name] ?? "").trim(),
    }))
    .filter(({ studentId, name }) => {
      if (!studentId) return false;
      if (studentId === trimmedQuery) return true;
      return name.toLocaleLowerCase(DEFAULT_LOCALE).includes(normalizedQuery);
    });
}

export function getStudentForEdit(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  studentId: string,
): StudentFormPayload | null {
  const studentsSheet = registrationSheet.getSheetByName(STUDENTS_SHEET.name);
  if (!studentsSheet) {
    throw new Error(
      `Cadastro Escolar: a aba "${STUDENTS_SHEET.name}" não existe.`,
    );
  }

  const lastRow = studentsSheet.getLastRow();
  if (lastRow < STUDENTS_SHEET.startRow) return null;

  const col = STUDENTS_SHEET.columns;

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

  if (!match) return null;

  const row = studentsSheet
    .getRange(match.getRow(), 1, 1, STUDENT_COL_COUNT)
    .getValues()[0];

  if (!row) return null;

  return {
    studentId,
    name: String(row[col.name] ?? "").trim(),
    address: String(row[col.address] ?? ""),
    nationality: String(row[col.nationality] ?? ""),
    birthDate: toIsoDateString(row[col.birthDate]),
    enrollmentDate: formatDate(row[col.enrollmentDate]),
    sex: String(row[col.sex] ?? ""),
    status: String(row[col.status] ?? ""),
    guardians: loadStudentGuardians(registrationSheet, studentId),
  };
}

export function createStudentRecord(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  input: CreateStudentPayload,
): string {
  const studentsSheet = registrationSheet.getSheetByName(STUDENTS_SHEET.name);

  if (!studentsSheet) {
    throw new Error(
      `Cadastro Escolar: a aba "${STUDENTS_SHEET.name}" não existe.`,
    );
  }

  const studentId = generateNextStudentId(registrationSheet);
  const birthDate =
    input.birthDate.trim() ? formatDate(input.birthDate.trim()) : "";

  const col = STUDENTS_SHEET.columns;
  const row: Record<number, unknown> = {
    [col.id]: studentId,
    [col.name]: input.name.trim(),
    [col.address]: input.address.trim(),
    [col.nationality]: input.nationality.trim(),
    [col.birthDate]: birthDate,
    [col.enrollmentDate]: new Date(),
    [col.sex]: input.sex.trim(),
    [col.status]: DEFAULT_STUDENT_STATUS,
  };

  studentsSheet.appendRow(Object.entries(row).map((entry) => entry[1]));

  replaceGuardians(registrationSheet, studentId, input.guardians);

  return studentId;
}

export function updateStudentRecord(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  studentId: string,
  input: Omit<StudentFormPayload, "studentId" | "enrollmentDate">,
): void {
  const studentsSheet = registrationSheet.getSheetByName(STUDENTS_SHEET.name);
  if (!studentsSheet) {
    throw new Error(
      `Cadastro Escolar: a aba "${STUDENTS_SHEET.name}" não existe.`,
    );
  }

  const col = STUDENTS_SHEET.columns;
  const lastRow = studentsSheet.getLastRow();

  const match =
    lastRow >= STUDENTS_SHEET.startRow ?
      studentsSheet
        .getRange(
          STUDENTS_SHEET.startRow,
          col.id + 1,
          lastRow - STUDENTS_SHEET.startRow + 1,
          1,
        )
        .createTextFinder(studentId)
        .matchEntireCell(true)
        .findNext()
    : null;

  if (!match) {
    throw new Error(`Matrícula ${studentId} não encontrada.`);
  }

  // Lê o estado atual ANTES de sobrescrever, para o diff do log.
  const currentRow = studentsSheet
    .getRange(match.getRow(), 1, 1, STUDENT_COL_COUNT)
    .getValues()[0]!;

  const oldData = {
    name: String(currentRow[col.name] ?? "").trim(),
    address: String(currentRow[col.address] ?? ""),
    nationality: String(currentRow[col.nationality] ?? ""),
    birthDate: toIsoDateString(currentRow[col.birthDate]),
    sex: String(currentRow[col.sex] ?? ""),
    status: String(currentRow[col.status] ?? ""),
  };

  const birthDate = input.birthDate ? new Date(input.birthDate) : "";

  studentsSheet
    .getRange(match.getRow(), col.name + 1, 1, 4)
    .setValues([[input.name, input.address, input.nationality, birthDate]]);
  studentsSheet.getRange(match.getRow(), col.sex + 1).setValue(input.sex);
  studentsSheet.getRange(match.getRow(), col.status + 1).setValue(input.status);

  replaceGuardians(registrationSheet, studentId, input.guardians);

  const changes = diffStudentFields(oldData, {
    name: input.name,
    address: input.address,
    nationality: input.nationality,
    birthDate: input.birthDate,
    sex: input.sex,
    status: input.status,
  });
  logStudentChanges({ registrationSheet, studentId, changes });
}
