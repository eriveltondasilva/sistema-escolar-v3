// server/roster/dialog-actions.ts
import { loadConfig } from "#config/app-config.ts";
import { formatGuardianNames } from "#utils/formatters.ts";
import { withScriptLock } from "#utils/script-lock.ts";
import {
  createStudentRecord,
  getStudentForEdit,
  searchStudents,
  updateStudentRecord,
} from "./data-access.ts";
import { findStudentPdfHistory } from "./pdf-history.ts";

import type { GuardianData, StudentStatus, StudentSummary } from "../types.ts";
import type { CreateStudentPayload, StudentFormPayload } from "./types.ts";

function validateStudentPayload(payload: {
  name: string;
  guardians: GuardianData[];
}): void {
  if (!payload.name?.trim()) {
    throw new Error("Nome é obrigatório.");
  }

  const validGuardiansCount =
    Array.isArray(payload.guardians) ?
      payload.guardians.filter((guardian) => guardian.name?.trim()).length
    : 0;

  if (validGuardiansCount === 0) {
    throw new Error("Informe ao menos um responsável.");
  }
}

// -------------------------------------

export function getStudentSearchResults(
  query: string,
  status?: StudentStatus,
): StudentSummary[] {
  const { enrollmentSpreadsheetId } = loadConfig();
  const registrationSheet = SpreadsheetApp.openById(enrollmentSpreadsheetId);

  return searchStudents(registrationSheet, query, status);
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

  const { enrollmentSpreadsheetId, pdfsFolderId } = loadConfig();
  const registrationSheet = SpreadsheetApp.openById(enrollmentSpreadsheetId);

  const student = getStudentForEdit(registrationSheet, trimmedId);
  if (!student) {
    throw new Error(`Matrícula ${trimmedId} não encontrada.`);
  }

  return {
    student,
    guardianNamesFormatted: formatGuardianNames(
      student.guardians.map((guardian) => guardian.name),
    ),
    pdfHistory: findStudentPdfHistory(pdfsFolderId, trimmedId),
  };
}

export function getStudentForEditForm(studentId: string): StudentFormPayload {
  const trimmedId = String(studentId ?? "").trim();
  if (!trimmedId) throw new Error("Matrícula não pode ser vazia.");

  const { enrollmentSpreadsheetId } = loadConfig();
  const registrationSheet = SpreadsheetApp.openById(enrollmentSpreadsheetId);

  const student = getStudentForEdit(registrationSheet, trimmedId);
  if (!student) {
    throw new Error(`Matrícula ${trimmedId} não encontrada.`);
  }

  return student;
}

// -------------------------------------

/** @returns A matrícula gerada para o novo aluno. */
export function submitStudentRegistration(
  payload: CreateStudentPayload,
): string {
  validateStudentPayload(payload);

  let newStudentId = "";

  withScriptLock(() => {
    const { enrollmentSpreadsheetId } = loadConfig();
    const registrationSheet = SpreadsheetApp.openById(enrollmentSpreadsheetId);

    newStudentId = createStudentRecord(registrationSheet, payload);
  }, "Já existe um cadastro em andamento. Tente novamente em alguns instantes.");

  if (!newStudentId) {
    throw new Error("Não foi possível concluir o cadastro. Tente novamente.");
  }

  return newStudentId;
}

export function submitStudentEdit(
  studentId: string,
  payload: Omit<StudentFormPayload, "studentId" | "enrollmentDate">,
): void {
  const trimmedId = String(studentId ?? "").trim();
  if (!trimmedId) throw new Error("Matrícula não pode ser vazia.");

  validateStudentPayload(payload);

  withScriptLock(() => {
    const { enrollmentSpreadsheetId } = loadConfig();
    const registrationSheet = SpreadsheetApp.openById(enrollmentSpreadsheetId);

    updateStudentRecord(registrationSheet, trimmedId, payload);
  }, "Já existe uma edição em andamento. Tente novamente em alguns instantes.");
}
