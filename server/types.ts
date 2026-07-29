// server/types.ts
export type IssueType = "warning" | "error";
export type AssessmentType = "grade" | "concept";

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
  className: string;
  stage: string;
  shift: string;
  assessmentType: AssessmentType;
}

export interface Subject {
  name: string;
  code: string;
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

export interface GuardianData {
  name: string;
  address: string;
  relationship: string;
  isPrimary: boolean;
  phone: string;
}

/**
 * Payload enviado pelo formulário de cadastro/edição de aluno.
 * Reaproveita os campos de StudentData que o form realmente edita
 * (sem enrollmentDate/status, que não fazem parte do form) e a lista
 * de responsáveis.
 */
export interface StudentFormPayload extends Pick<
  StudentData,
  "name" | "address" | "nationality" | "sex" | "birthDate"
> {
  guardians: GuardianData[];
}
