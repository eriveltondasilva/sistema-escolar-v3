// server/roster/data-access.ts
import { DEFAULT_LOCALE } from "#config/constants.ts";
import { GUARDIANS_SHEET, STUDENTS_SHEET } from "#report/constants.ts";
import { formatDate, formatStr, parseDate } from "#utils/formatters.ts";
import { diffStudentFields, logStudentChanges } from "./change-log.ts";

import type { GuardianData, StudentStatus, StudentSummary } from "../types.ts";
import type { CreateStudentPayload, StudentFormPayload } from "./types.ts";

const STUDENT_COL_COUNT = Object.keys(STUDENTS_SHEET.columns).length;
const GUARDIAN_COL_COUNT = Object.keys(GUARDIANS_SHEET.columns).length;

const SEARCH_MAX_RESULTS = 20;

export interface StudentSearchResult {
  students: StudentSummary[];
  truncated: boolean;
}

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
    const numeric = Number(formatStr(row[0]));
    return Number.isFinite(numeric) && numeric > max ? numeric : max;
  }, 0);

  return String(maxId + 1);
}

/** Monta um GuardianData completo a partir de uma linha da aba "Responsáveis". */
function mapGuardianRow(row: ReadonlyArray<unknown>): GuardianData {
  const col = GUARDIANS_SHEET.columns;

  return {
    name: formatStr(row[col.name]),
    address: formatStr(row[col.address]),
    relationship: formatStr(row[col.relationship]),
    isPrimary: formatStr(row[col.isPrimary]).toLowerCase() === "sim",
    phone: formatStr(row[col.phone]),
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

  const col = GUARDIANS_SHEET.columns;
  const rowCount = lastRow - GUARDIANS_SHEET.startRow + 1;

  const rows = guardiansSheet
    .getRange(GUARDIANS_SHEET.startRow, 1, rowCount, GUARDIAN_COL_COUNT)
    .getValues();

  const guardians: GuardianData[] = [];

  for (const row of rows) {
    if (formatStr(row[col.studentId]) !== studentId) continue;
    if (!formatStr(row[col.name])) continue;
    guardians.push(mapGuardianRow(row));
  }

  return guardians;
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
      if (formatStr(row[0]) === studentId) {
        existingRows.push(GUARDIANS_SHEET.startRow + i);
      }
    });
  }

  // 1. Insere os novos responsáveis primeiro (no final da aba). Se isso
  // falhar (quota, timeout), as linhas antigas continuam intactas e o
  // aluno não fica sem nenhum responsável cadastrado.
  if (validGuardians.length > 0) {
    const newRows = validGuardians.map((guardian) => [
      studentId.trim(),
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

/**
 * Busca alunos por nome ou matrícula.
 *
 * @param status - Quando informado, filtra apenas alunos com esse status
 *   (comparação case-insensitive). String vazia ou omitido = sem filtro.
 */
export function searchStudents(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  query: string,
  status?: StudentStatus,
): StudentSearchResult {
  const studentsSheet = registrationSheet.getSheetByName(STUDENTS_SHEET.name);
  if (!studentsSheet) return { students: [], truncated: false };

  const trimmedQuery = query.trim();
  if (!trimmedQuery) return { students: [], truncated: false };

  const normalizedQuery = trimmedQuery.toLocaleLowerCase(DEFAULT_LOCALE);
  const normalizedStatus = status?.trim().toLowerCase() ?? "";

  const lastRow = studentsSheet.getLastRow();
  if (lastRow < STUDENTS_SHEET.startRow)
    return { students: [], truncated: false };

  const rows = studentsSheet
    .getRange(
      STUDENTS_SHEET.startRow,
      1,
      lastRow - STUDENTS_SHEET.startRow + 1,
      STUDENT_COL_COUNT,
    )
    .getValues();

  const students: StudentSummary[] = [];
  let truncated = false;

  for (const row of rows) {
    const studentId = formatStr(row[STUDENTS_SHEET.columns.id]);
    if (!studentId) continue;

    const statusRow = formatStr(
      row[STUDENTS_SHEET.columns.status],
    ).toLowerCase();
    if (normalizedStatus && statusRow !== normalizedStatus) continue;

    const name = formatStr(row[STUDENTS_SHEET.columns.name]);

    // Busca por matrícula exata: retorna imediatamente, sem limite.
    if (studentId === trimmedQuery) {
      return { students: [{ studentId, name }], truncated: false };
    }

    if (name.toLocaleLowerCase(DEFAULT_LOCALE).includes(normalizedQuery)) {
      if (students.length >= SEARCH_MAX_RESULTS) {
        truncated = true;
        break;
      }
      students.push({ studentId, name });
    }
  }

  return { students, truncated };
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
    name: formatStr(row[col.name]),
    address: formatStr(row[col.address]),
    nationality: formatStr(row[col.nationality]),
    birthDate: formatDate(row[col.birthDate]),
    enrollmentDate: formatDate(row[col.enrollmentDate]),
    sex: formatStr(row[col.sex]),
    status: formatStr(row[col.status]) as StudentStatus,
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

  const col = STUDENTS_SHEET.columns;
  const row: Record<number, unknown> = {
    [col.id]: studentId.trim(),
    [col.name]: input.name.trim(),
    [col.address]: input.address.trim(),
    [col.nationality]: input.nationality.trim(),
    [col.birthDate]:
      input.birthDate.trim() ? parseDate(input.birthDate.trim()) : "",
    [col.enrollmentDate]: new Date(),
    [col.sex]: input.sex.trim(),
    [col.status]: "ativo",
  };

  studentsSheet.appendRow(Object.values(row));
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
    name: formatStr(currentRow[col.name]),
    address: formatStr(currentRow[col.address]),
    nationality: formatStr(currentRow[col.nationality]),
    birthDate: formatDate(currentRow[col.birthDate]),
    sex: formatStr(currentRow[col.sex]),
    status: formatStr(currentRow[col.status]) as StudentStatus,
  };

  const birthDate =
    input.birthDate.trim() ? parseDate(input.birthDate.trim()) : "";

  studentsSheet
    .getRange(match.getRow(), col.name + 1, 1, 4)
    .setValues([[input.name, input.address, input.nationality, birthDate]]);
  studentsSheet
    .getRange(match.getRow(), col.sex + 1, 1, 2)
    .setValues([[input.sex, input.status]]);

  replaceGuardians(registrationSheet, studentId, input.guardians);

  const changes = diffStudentFields(oldData, {
    name: input.name,
    address: input.address,
    nationality: input.nationality,
    birthDate: formatDate(birthDate),
    sex: input.sex,
    status: input.status,
  });

  logStudentChanges({ registrationSheet, studentId, changes });
}
