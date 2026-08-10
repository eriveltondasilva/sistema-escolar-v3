// server/types.ts
export type IssueType = "warning" | "error";
export type AssessmentType = "numeric" | "concept";

export interface AppConfig {
  readonly schoolYearsFolderId: string;
  readonly pdfsFolderId: string;
  readonly tempFolderId: string;
  readonly gradeReportId: string;
  readonly conceptReportId: string;
  readonly gradeSpreadsheetId: string;
  readonly conceptSpreadsheetId: string;
  readonly enrollmentSpreadsheetId: string;
}

export interface ReportLinkParams {
  studentId: string;
  className: string;
  year: string;
}

export interface Issue {
  type: IssueType;
  text: string;
  url?: string;
}

export interface ValidClass {
  name: string;
  stage: `Ensino Fundamental ${"I" | "II"}`;
  shift: "Matutino" | "Vespertino";
  assessmentType: AssessmentType;
}

export interface Subject {
  name: string;
  code: Uppercase<string>;
}

export interface StudentData {
  name: string;
  address: string;
  nationality: string;
  birthDate: string;
  enrollmentDate: string;
  sex: string;
  status: string;
}

/**
 * Forma mínima de identificação de um aluno ({studentId, name}), usada em
 * listas/autocomplete — resultado de busca (roster) ou de alunos de uma
 * turma (report). Fonte única para evitar redefinir o mesmo par de campos
 * em cada domínio.
 */
export interface StudentSummary {
  studentId: string;
  name: string;
}

/**
 * Dados completos de um responsável, usados pelo formulário de
 * cadastro/edição de aluno (ver roster/types.ts::StudentFormPayload).
 * Mapeia 1:1 para as colunas de GUARDIAN_COLUMNS (report/constants.ts).
 */
export interface GuardianData {
  name: string;
  address: string;
  relationship: string;
  isPrimary: boolean;
  phone: string;
}

export interface StudentFormPayload extends StudentData {
  guardians: GuardianData[];
}
