// client/dialogs/class-report-result.ts
import { parseInitData, runServerAction } from "../utils.ts";

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
  const initialState = parseInitData<ClassReportInitData>(el);

  return {
    ...initialState,
    isLoading: false,
    error: "",

    continueGeneration() {
      this.error = "";
      this.isLoading = true;

      runServerAction((server) => server.continueClassReportsGeneration())
        .then(() => google.script.host.close())
        .catch((err: Error) => {
          this.error = err.message;
          this.isLoading = false;
        });
    },

    cancelGeneration() {
      this.error = "";
      this.isLoading = true;

      runServerAction((server) => server.cancelClassReportsGeneration())
        .then(() => google.script.host.close())
        .catch((err: Error) => {
          this.error = err.message;
          this.isLoading = false;
        });
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("classReportDialog", classReportDialog);
});
