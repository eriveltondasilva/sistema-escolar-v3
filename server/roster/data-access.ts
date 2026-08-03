// server/roster/data-access.ts
import { DEFAULT_LOCALE, ENROLLMENT_SHEET_NAMES } from "../config.ts";
import { diffStudentFields, logStudentChanges } from "./change-log.ts";
import { GUARDIAN_COLUMNS, STUDENT_COLUMNS } from "../report/constants.ts";
import { formatDate } from "../utils/formatters.ts";

import type { GuardianData } from "../types.ts";
import type {
  CreateStudentPayload,
  StudentFormPayload,
  StudentSearchResult,
} from "./types.ts";

const STUDENT_ID_PADDING = 4;

/** Status padrão atribuído a todo aluno recém-cadastrado. */
const DEFAULT_STUDENT_STATUS = "Ativo";

export function generateNextStudentId(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
): string {
  const studentsSheet = registrationSheet.getSheetByName(
    ENROLLMENT_SHEET_NAMES.STUDENTS,
  );
  if (!studentsSheet) {
    throw new Error(
      `Cadastro Escolar: a aba "${ENROLLMENT_SHEET_NAMES.STUDENTS}" não existe.`,
    );
  }

  const rows = studentsSheet.getDataRange().getValues().slice(1);

  const maxId = rows.reduce((max, row) => {
    const raw = String(row[STUDENT_COLUMNS.id] ?? "").trim();
    const numeric = Number(raw);
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 0);

  return String(maxId + 1).padStart(STUDENT_ID_PADDING, "0");
}

/** Formata uma data para "yyyy-MM-dd", o formato que <input type="date"> espera. */
function toIsoDateString(date: unknown): string {
  if (!date || !(date instanceof Date)) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function searchStudents(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  query: string,
): StudentSearchResult[] {
  const studentsSheet = registrationSheet.getSheetByName(
    ENROLLMENT_SHEET_NAMES.STUDENTS,
  );
  if (!studentsSheet) return [];

  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const normalizedQuery = trimmedQuery.toLocaleLowerCase(DEFAULT_LOCALE);
  const rows = studentsSheet.getDataRange().getValues().slice(1);

  return rows
    .map((row) => ({
      studentId: String(row[STUDENT_COLUMNS.id] ?? "").trim(),
      name: String(row[STUDENT_COLUMNS.name] ?? "").trim(),
    }))
    .filter(({ studentId, name }) => {
      if (!studentId) return false;
      if (studentId === trimmedQuery) return true;
      return name.toLocaleLowerCase(DEFAULT_LOCALE).includes(normalizedQuery);
    });
}

/** Monta um GuardianData completo a partir de uma linha da aba "Responsáveis". */
function mapGuardianRow(row: ReadonlyArray<unknown>): GuardianData {
  return {
    name: String(row[GUARDIAN_COLUMNS.name] ?? "").trim(),
    address: String(row[GUARDIAN_COLUMNS.address] ?? ""),
    relationship: String(row[GUARDIAN_COLUMNS.relationship] ?? ""),
    isPrimary:
      String(row[GUARDIAN_COLUMNS.isPrimary] ?? "não").toLowerCase() === "Sim",
    phone: String(row[GUARDIAN_COLUMNS.phone] ?? ""),
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
  const guardiansSheet = registrationSheet.getSheetByName(
    ENROLLMENT_SHEET_NAMES.GUARDIANS,
  );
  if (!guardiansSheet) return [];

  const lastRow = guardiansSheet.getLastRow();
  if (lastRow < 2) return [];

  const matches = guardiansSheet
    .getRange(2, GUARDIAN_COLUMNS.studentId + 1, lastRow - 1, 1)
    .createTextFinder(studentId)
    .matchEntireCell(true)
    .findAll();

  return matches
    .map(
      (cell) =>
        guardiansSheet
          .getRange(cell.getRow(), 1, 1, guardiansSheet.getLastColumn())
          .getValues()[0],
    )
    .filter((row): row is any[] => row !== undefined)
    .map(mapGuardianRow)
    .filter((guardian) => guardian.name.length > 0);
}

export function getStudentForEdit(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  studentId: string,
): StudentFormPayload | null {
  const studentsSheet = registrationSheet.getSheetByName(
    ENROLLMENT_SHEET_NAMES.STUDENTS,
  );
  if (!studentsSheet) {
    throw new Error(
      `Cadastro Escolar: a aba "${ENROLLMENT_SHEET_NAMES.STUDENTS}" não existe.`,
    );
  }

  const lastRow = studentsSheet.getLastRow();
  if (lastRow < 2) return null;

  const match = studentsSheet
    .getRange(2, STUDENT_COLUMNS.id + 1, lastRow - 1, 1)
    .createTextFinder(studentId)
    .matchEntireCell(true)
    .findNext();

  if (!match) return null;

  const row = studentsSheet
    .getRange(match.getRow(), 1, 1, studentsSheet.getLastColumn())
    .getValues()[0];

  if (!row) return null;

  return {
    studentId,
    name: String(row[STUDENT_COLUMNS.name] ?? "").trim(),
    address: String(row[STUDENT_COLUMNS.address] ?? ""),
    nationality: String(row[STUDENT_COLUMNS.nationality] ?? ""),
    birthDate: toIsoDateString(row[STUDENT_COLUMNS.birthDate]),
    enrollmentDate: formatDate(row[STUDENT_COLUMNS.enrollmentDate]),
    sex: String(row[STUDENT_COLUMNS.sex] ?? ""),
    status: String(row[STUDENT_COLUMNS.status] ?? ""),
    guardians: loadStudentGuardians(registrationSheet, studentId),
  };
}

export function createStudentRecord(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  input: CreateStudentPayload,
): string {
  const studentsSheet = registrationSheet.getSheetByName(
    ENROLLMENT_SHEET_NAMES.STUDENTS,
  );
  if (!studentsSheet) {
    throw new Error(
      `Cadastro Escolar: a aba "${ENROLLMENT_SHEET_NAMES.STUDENTS}" não existe.`,
    );
  }

  const studentId = generateNextStudentId(registrationSheet);
  const birthDate = input.birthDate ? new Date(input.birthDate) : "";

  studentsSheet.appendRow([
    studentId,
    input.name,
    input.address,
    input.nationality,
    birthDate,
    new Date(), // enrollmentDate: sempre a data de criação, gerada aqui.
    input.sex,
    DEFAULT_STUDENT_STATUS,
  ]);

  replaceGuardians(registrationSheet, studentId, input.guardians);

  return studentId;
}

export function updateStudentRecord(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  studentId: string,
  input: Omit<StudentFormPayload, "studentId" | "enrollmentDate">,
): void {
  const studentsSheet = registrationSheet.getSheetByName(
    ENROLLMENT_SHEET_NAMES.STUDENTS,
  );
  if (!studentsSheet) {
    throw new Error(
      `Cadastro Escolar: a aba "${ENROLLMENT_SHEET_NAMES.STUDENTS}" não existe.`,
    );
  }

  const lastRow = studentsSheet.getLastRow();
  const match =
    lastRow >= 2 ?
      studentsSheet
        .getRange(2, STUDENT_COLUMNS.id + 1, lastRow - 1, 1)
        .createTextFinder(studentId)
        .matchEntireCell(true)
        .findNext()
    : null;

  if (!match) {
    throw new Error(`Matrícula ${studentId} não encontrada.`);
  }

  // Lê o estado atual ANTES de sobrescrever, para o diff do log.
  const currentRow = studentsSheet
    .getRange(match.getRow(), 1, 1, studentsSheet.getLastColumn())
    .getValues()[0]!;

  const oldData = {
    name: String(currentRow[STUDENT_COLUMNS.name] ?? "").trim(),
    address: String(currentRow[STUDENT_COLUMNS.address] ?? ""),
    nationality: String(currentRow[STUDENT_COLUMNS.nationality] ?? ""),
    birthDate: toIsoDateString(currentRow[STUDENT_COLUMNS.birthDate]),
    sex: String(currentRow[STUDENT_COLUMNS.sex] ?? ""),
    status: String(currentRow[STUDENT_COLUMNS.status] ?? ""),
  };

  const birthDate = input.birthDate ? new Date(input.birthDate) : "";

  studentsSheet
    .getRange(match.getRow(), STUDENT_COLUMNS.name + 1, 1, 4)
    .setValues([[input.name, input.address, input.nationality, birthDate]]);
  studentsSheet
    .getRange(match.getRow(), STUDENT_COLUMNS.sex + 1)
    .setValue(input.sex);
  studentsSheet
    .getRange(match.getRow(), STUDENT_COLUMNS.status + 1)
    .setValue(input.status);

  replaceGuardians(registrationSheet, studentId, input.guardians);

  const changes = diffStudentFields(oldData, {
    name: input.name,
    address: input.address,
    nationality: input.nationality,
    birthDate: input.birthDate,
    sex: input.sex,
    status: input.status,
  });
  logStudentChanges(registrationSheet, studentId, changes);
}

/**
 * Substitui todos os responsáveis de um aluno pelos informados, gravando
 * nome, endereço, parentesco, telefone e o marcador de responsável
 * principal — todas as colunas de GUARDIAN_COLUMNS.
 */
export function replaceGuardians(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  studentId: string,
  guardians: GuardianData[],
): void {
  const guardiansSheet = registrationSheet.getSheetByName(
    ENROLLMENT_SHEET_NAMES.GUARDIANS,
  );
  if (!guardiansSheet) {
    throw new Error(
      `Cadastro Escolar: a aba "${ENROLLMENT_SHEET_NAMES.GUARDIANS}" não existe.`,
    );
  }

  const validGuardians = guardians.filter(
    (guardian) => guardian.name.trim().length > 0,
  );

  const lastRow = guardiansSheet.getLastRow();
  const existingRows: number[] = [];

  if (lastRow >= 2) {
    const existingIds = guardiansSheet
      .getRange(2, GUARDIAN_COLUMNS.studentId + 1, lastRow - 1, 1)
      .getValues();

    existingIds.forEach((row, i) => {
      const rowId = String(row[0] ?? "").trim();
      if (rowId === studentId) existingRows.push(2 + i);
    });
  }

  // 1. Insere os novos responsáveis primeiro (no final da aba). Se isso
  // falhar (quota, timeout), as linhas antigas abaixo continuam intactas
  // e o aluno não fica sem nenhum responsável cadastrado.
  if (validGuardians.length > 0) {
    const newRows = validGuardians.map((guardian) => [
      studentId,
      guardian.name.trim(),
      guardian.address,
      guardian.relationship,
      guardian.isPrimary,
      guardian.phone,
    ]);
    guardiansSheet
      .getRange(guardiansSheet.getLastRow() + 1, 1, newRows.length, 6)
      .setValues(newRows);
  }

  // 2. Só depois do sucesso acima, remove as linhas antigas.
  // De baixo para cima, para não bagunçar os índices ao apagar.
  for (let i = existingRows.length - 1; i >= 0; i--) {
    guardiansSheet.deleteRow(existingRows[i]!);
  }
}
