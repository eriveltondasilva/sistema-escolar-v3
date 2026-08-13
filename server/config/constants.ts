// server/constants.ts

export const DEFAULT_LOCALE = "pt-BR";
export const SCHOOL_YEAR_LABEL_PREFIX = "Ano Letivo - ";

export const MAX_ERRORS_SHOWN = 15;

export const DIALOG_NAMES = {
  classReportResult: "class-report-result",
  createSchoolYearForm: "create-school-year-form",
  createSchoolYearResult: "create-school-year-result",
  errorDialog: "error-dialog",
  generateReportForm: "generate-report-form",
  reportSuccess: "report-success",
  studentCreate: "student-create",
  studentEdit: "student-edit",
  studentSearch: "student-search",
  validationResult: "validation-result",
} as const;

export const GoogleMimeType = {
  SHEETS: "application/vnd.google-apps.spreadsheet",
  DOCS: "application/vnd.google-apps.document",
  FOLDER: "application/vnd.google-apps.folder",
  PDF: "application/pdf",
} as const;
