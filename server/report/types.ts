// server/report/types.ts
import type {
  AppConfig,
  AssessmentType,
  StudentData,
  Subject,
} from "../types.ts";

export interface ReportContext {
  year: string;
  assessmentType: AssessmentType;
  templateFile: GoogleAppsScript.Drive.File;
  tempFolder: GoogleAppsScript.Drive.Folder;
  pdfFolder: GoogleAppsScript.Drive.Folder;
  studentsMap: Map<string, StudentData>;
  guardiansMap: Map<string, string[]>;
  gradesBySubject: Map<string, Map<string, GradeRow>>;
}

/** Uma linha crua de notas (valores como vêm da planilha). */
export type GradeRow = ReadonlyArray<unknown>;

/** Notas de uma disciplina já mapeadas por campo (ver GRADE_COLUMNS). */
export type SubjectGrades = Record<string, unknown>;

export type SelectYearClassActionType = "single" | "class";

export interface PlaceholderField {
  suffix: Lowercase<string>;
  field: string;
  format: (value: unknown) => string;
}

export interface ClassStudent {
  studentId: string;
  name: string;
  row: number;
}

export interface PersonalData extends StudentData {
  guardianNames: string;
}

export interface BuildReportContextParams {
  config: AppConfig;
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  schoolYearLabel: string;
  className: string;
  foundSubjects: Subject[];
}

export interface BuildSingleStudentReportContextParams extends BuildReportContextParams {
  studentId: string;
}

export interface GenerateReportForStudentParams {
  studentId: string;
  className: string;
  foundSubjects: Subject[];
  context: ReportContext;
}

/** Payload de GenerateReportFormDialog.html — abertura do form de seleção. */
export interface GenerateReportFormInitData {
  actionType: SelectYearClassActionType;
  years: string[];
  classes: string[];
}

/** Payload de ClassReportResultDialog.html — resultado da geração em lote. */
export interface ClassReportResultInitData {
  successCount: number;
  processedCount: number;
  totalStudents: number;
  className: string;
  schoolYearLabel: string;
  interrupted: boolean;
  interruptedMessage: string;
  errors: string[];
  truncatedCount: number;
  pdfFolderUrl: string;
}

/** Estado persistido de uma geração de boletins em lote que pode ser retomada. */
export interface ClassReportJob {
  schoolYearLabel: string;
  className: string;
  students: Array<Pick<ClassStudent, "studentId" | "row">>;
  nextStudentIndex: number;
  successCount: number;
  errorCount: number;
  errors: string[];
}

/** Payload de ReportSuccessDialog.html — resultado da geração individual. */
export interface ReportSuccessInitData {
  studentId: string;
  className: string;
  schoolYearLabel: string;
  pdfUrl: string;
  pdfFolderUrl: string;
}
