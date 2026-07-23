// server/dialog-names.ts
export const DIALOG_NAMES = {
  classReportResult: "class-report-result",
  createSchoolYearForm: "create-school-year-form",
  createSchoolYearResult: "create-school-year-result",
  error: "error",
  generateReportForm: "generate-report-form",
  reportDownload: "report-download",
  reportSuccess: "report-success",
  studentCreate: "student-create",
  studentEdit: "student-edit",
  studentSearch: "student-search",
  validationResult: "validation-result",
} as const;

export type DialogName = (typeof DIALOG_NAMES)[keyof typeof DIALOG_NAMES];
