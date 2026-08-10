// client/dialogs/class-report-result.ts
import { parseInitData } from "../utils/parse-init-data.ts";
import { runServerAction } from "../utils/run-server-action.ts";

import type { ClassReportResultInitData } from "#server/report/types.ts";

type ClassReportState = ClassReportResultInitData & {
  isLoading: boolean;
  error: string;
  continueGeneration(): void;
  cancelGeneration(): void;
};

function initDialog(el: HTMLElement): ClassReportState {
  const initialState = parseInitData<ClassReportResultInitData>(el);

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
  Alpine.data(initDialog.name, initDialog);
});
