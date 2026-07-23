export type IssueType = "warning" | "error";
export type AssessmentType = "grade" | "concept";

export interface AppConfig {
  schoolYearsFolderId: string;
  pdfsFolderId: string;
  tempFolderId: string;
  //
  gradeReportId: string;
  conceptReportId: string;
  //
  gradeSpreadsheetId: string;
  conceptSpreadsheetId: string;
  //
  enrollmentSpreadsheetId: string;
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
  enrollment_date: string;
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
