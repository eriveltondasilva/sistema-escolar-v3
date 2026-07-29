// client/dialogs/class-report-result.ts

/** Dados injetados pelo server via `data-init` (renderView). */
type ClassReportInitData = {
  successCount: number;
  className: string;
  schoolYearLabel: string;
  interrupted: boolean;
  interruptedMessage: string;
  processedCount: number;
  totalStudents: number;
  errors: string[];
  truncatedCount: number;
  pdfFolderUrl: string;
};

type ClassReportState = ClassReportInitData & {
  isLoading: boolean;
  error: string;
  continueGeneration(): void;
  cancelGeneration(): void;
};

function classReportDialog(el: HTMLElement): ClassReportState {
  const initialState: ClassReportInitData = JSON.parse(el.dataset.init || "{}");

  return {
    ...initialState,
    isLoading: false,
    error: "",

    continueGeneration() {
      this.error = "";
      this.isLoading = true;

      // continueClassReportsGeneration(): void
      // — ver server/report/dialog-actions.ts
      google.script.run
        .withSuccessHandler(() => google.script.host.close())
        .withFailureHandler((err: Error) => {
          this.error = err.message;
          this.isLoading = false;
        })
        .continueClassReportsGeneration();
    },

    cancelGeneration() {
      this.error = "";
      this.isLoading = true;

      // cancelClassReportsGeneration(): void
      // — ver server/report/dialog-actions.ts
      google.script.run
        .withSuccessHandler(() => google.script.host.close())
        .withFailureHandler((err: Error) => {
          this.error = err.message;
          this.isLoading = false;
        })
        .cancelClassReportsGeneration();
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("classReportDialog", classReportDialog);
});
