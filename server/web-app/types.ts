// server/web-app/types.ts

/** Payload de error.html. */
export interface ErrorDialogInitData {
  errorMessage: string;
}

/** Payload de report-download.html. */
export interface ReportDownloadInitData {
  downloadUrl: string;
}
