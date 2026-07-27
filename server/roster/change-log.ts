// server/roster/change-log.ts (novo arquivo)
import { ENROLLMENT_SHEET_NAMES } from "../config.ts";
import { getErrorMsg } from "../utils/error.ts";

export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Registra alterações de campos de um aluno na aba "Log". Silenciosa em
 * caso de falha — nunca deve impedir a edição em si por causa de log.
 */
export function logStudentChanges(
  registrationSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  studentId: string,
  changes: FieldChange[],
): void {
  if (changes.length === 0) return;

  try {
    const logSheet = registrationSheet.getSheetByName(
      ENROLLMENT_SHEET_NAMES.LOG,
    );
    if (!logSheet) return; // aba opcional: se não existe, não loga e não quebra o fluxo.

    const timestamp = new Date();
    const rows = changes.map(({ field, oldValue, newValue }) => [
      timestamp,
      studentId,
      field,
      String(oldValue ?? ""),
      String(newValue ?? ""),
    ]);

    logSheet
      .getRange(logSheet.getLastRow() + 1, 1, rows.length, 5)
      .setValues(rows);
  } catch (e) {
    const errorMessage = getErrorMsg(e);
    console.warn(
      `logStudentChanges: falha ao registrar log para ${studentId} — ${errorMessage}`,
    );
  }
}

/** Compara o registro antigo com o novo payload e monta a lista de campos alterados. */
export function diffStudentFields(
  oldData: {
    name: string;
    address: string;
    nationality: string;
    birthDate: string;
    sex: string;
    status: string;
  },
  newData: {
    name: string;
    address: string;
    nationality: string;
    birthDate: string;
    sex: string;
    status: string;
  },
): FieldChange[] {
  const fieldsToTrack: (keyof typeof oldData)[] = [
    "name",
    "address",
    "nationality",
    "birthDate",
    "sex",
    "status",
  ];

  return fieldsToTrack
    .filter((field) => oldData[field] !== newData[field])
    .map((field) => ({
      field,
      oldValue: oldData[field],
      newValue: newData[field],
    }));
}
