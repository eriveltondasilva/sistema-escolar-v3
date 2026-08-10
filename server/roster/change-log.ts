// server/roster/change-log.ts
import { getErrorMsg } from "#utils/error.ts";

import type { StudentData } from "../types.ts";

interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

const LOG_SHEET = {
  name: "Log",
  columns: {
    timestamp: 1,
    studentId: 2,
    field: 3,
    oldValue: 4,
    newValue: 5,
  },
} as const;

const TRACKED_FIELDS = [
  "name",
  "address",
  "nationality",
  "birthDate",
  "sex",
  "status",
] as const;

type TrackedStudentData = Pick<StudentData, (typeof TRACKED_FIELDS)[number]>;

interface LogStudentChanges {
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  studentId: string;
  changes: FieldChange[];
}

/**
 * Registra alterações de campos de um aluno na aba "Log". Silenciosa em
 * caso de falha — nunca deve impedir a edição em si por causa de log.
 */
export function logStudentChanges({
  registrationSheet,
  studentId,
  changes,
}: LogStudentChanges): void {
  if (changes.length === 0) return;

  try {
    const logSheet = registrationSheet.getSheetByName(LOG_SHEET.name);
    if (!logSheet) return; // aba opcional: se não existe, não loga e não quebra o fluxo.

    const timestamp = new Date();
    const rows = changes.map(({ field, oldValue, newValue }) => [
      timestamp,
      studentId,
      field,
      String(oldValue).trim(),
      String(newValue).trim(),
    ]);

    const startRow = logSheet.getLastRow() + 1;
    const colCount = Object.keys(LOG_SHEET.columns).length;
    logSheet.getRange(startRow, 1, rows.length, colCount).setValues(rows);
  } catch (error) {
    console.warn(
      `logStudentChanges: falha ao registrar log para ${studentId} — ${getErrorMsg(error)}`,
    );
  }
}

/** Compara o registro antigo com o novo payload e monta a lista de campos alterados. */
export function diffStudentFields(
  oldData: TrackedStudentData,
  newData: TrackedStudentData,
): FieldChange[] {
  const changes: FieldChange[] = [];

  for (const field of TRACKED_FIELDS) {
    if (oldData[field] !== newData[field]) {
      changes.push({
        field,
        oldValue: oldData[field],
        newValue: newData[field],
      });
    }
  }

  return changes;
}
