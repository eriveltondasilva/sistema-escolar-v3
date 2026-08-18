// client/dialogs/class-report-result.ts
import { getErrorMsg } from "#server/utils/error.ts";
import { parseInitData } from "../utils/parse-init-data.ts";
import { runServerAction } from "../utils/run-server-action.ts";

import type { ClassReportResultInitData } from "#server/report/types.ts";
import type { AlpineComponent } from "alpinejs";

interface InitDialog extends ClassReportResultInitData {
  isLoading: boolean;
  error: string;
  // Funções
  continueGeneration(): Promise<void>;
  cancelGeneration(): Promise<void>;
}

function initDialog(el: HTMLElement): AlpineComponent<InitDialog> {
  const initData = parseInitData<ClassReportResultInitData>(el);

  return {
    ...initData,
    isLoading: false,
    error: "",

    async continueGeneration() {
      this.error = "";
      this.isLoading = true;

      try {
        await runServerAction((server) =>
          server.continueClassReportsGeneration(),
        );

        google.script.host.close();
      } catch (error: unknown) {
        this.error = getErrorMsg(error);
        this.isLoading = false;
      }
    },

    async cancelGeneration() {
      this.error = "";
      this.isLoading = true;

      try {
        await runServerAction((server) =>
          server.cancelClassReportsGeneration(),
        );
        google.script.host.close();
      } catch (error: unknown) {
        this.error = getErrorMsg(error);
        this.isLoading = false;
      }
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data("initDialog", initDialog);
});
