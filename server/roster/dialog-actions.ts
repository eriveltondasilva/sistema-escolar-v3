// server/roster/dialog-actions.ts
import { loadConfig } from "#server/config.ts";
import { formatGuardianNames } from "#server/utils/formatters.ts";
import { withScriptLock } from "#server/utils/script-lock.ts";
import {
  createStudentRecord,
  getStudentForEdit,
  searchStudents,
  updateStudentRecord,
} from "./data-access.ts";
import { findStudentPdfHistory } from "./pdf-history.ts";

import type {
  CreateStudentPayload,
  StudentFormPayload,
  StudentSearchResult,
} from "./types.ts";

export function getStudentSearchResults(query: string): StudentSearchResult[] {
  const config = loadConfig();
  const registrationSheet = SpreadsheetApp.openById(
    config.enrollmentSpreadsheetId,
  );
  return searchStudents(registrationSheet, query);
}

export interface StudentSearchDetails {
  student: StudentFormPayload;
  guardianNamesFormatted: string;
  pdfHistory: ReturnType<typeof findStudentPdfHistory>;
}

export function getStudentDetailsForSearch(
  studentId: string,
): StudentSearchDetails {
  const trimmedId = String(studentId ?? "").trim();
  if (!trimmedId) throw new Error("Matrícula não pode ser vazia.");

  const config = loadConfig();
  const registrationSheet = SpreadsheetApp.openById(
    config.enrollmentSpreadsheetId,
  );

  const student = getStudentForEdit(registrationSheet, trimmedId);
  if (!student) {
    throw new Error(`Matrícula ${trimmedId} não encontrada.`);
  }

  return {
    student,
    guardianNamesFormatted: formatGuardianNames(student.guardianNames),
    pdfHistory: findStudentPdfHistory(config, trimmedId),
  };
}

export function getStudentForEditForm(studentId: string): StudentFormPayload {
  const trimmedId = String(studentId ?? "").trim();
  if (!trimmedId) throw new Error("Matrícula não pode ser vazia.");

  const config = loadConfig();
  const registrationSheet = SpreadsheetApp.openById(
    config.enrollmentSpreadsheetId,
  );

  const student = getStudentForEdit(registrationSheet, trimmedId);
  if (!student) {
    throw new Error(`Matrícula ${trimmedId} não encontrada.`);
  }

  return student;
}

function validateStudentPayload(payload: {
  name: string;
  guardianNames: string[];
}): void {
  if (!payload.name?.trim()) {
    throw new Error("Nome é obrigatório.");
  }
  if (
    !Array.isArray(payload.guardianNames) ||
    payload.guardianNames.length === 0
  ) {
    throw new Error("Informe ao menos um responsável.");
  }
}

/** @returns A matrícula gerada para o novo aluno. */
export function submitStudentRegistration(
  payload: CreateStudentPayload,
): string {
  validateStudentPayload(payload);

  let newStudentId = "";

  withScriptLock(() => {
    const config = loadConfig();
    const registrationSheet = SpreadsheetApp.openById(
      config.enrollmentSpreadsheetId,
    );
    newStudentId = createStudentRecord(registrationSheet, payload);
  }, "Já existe um cadastro em andamento. Tente novamente em alguns instantes.");

  if (!newStudentId) {
    throw new Error("Não foi possível concluir o cadastro. Tente novamente.");
  }

  return newStudentId;
}

export function submitStudentEdit(
  studentId: string,
  payload: Omit<StudentFormPayload, "studentId" | "enrollment_date">,
): void {
  const trimmedId = String(studentId ?? "").trim();
  if (!trimmedId) throw new Error("Matrícula não pode ser vazia.");
  validateStudentPayload(payload);

  withScriptLock(() => {
    const config = loadConfig();
    const registrationSheet = SpreadsheetApp.openById(
      config.enrollmentSpreadsheetId,
    );
    updateStudentRecord(registrationSheet, trimmedId, payload);
  }, "Já existe uma edição em andamento. Tente novamente em alguns instantes.");
}
