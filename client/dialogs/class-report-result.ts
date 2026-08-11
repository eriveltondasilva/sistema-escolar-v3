// client/dialogs/class-report-result.ts
import { getErrorMsg } from "#server/utils/error.ts";
import { parseInitData } from "../utils/parse-init-data.ts";
import { runServerAction } from "../utils/run-server-action.ts";

import type { ClassReportResultInitData } from "#server/report/types.ts";
import type { GasServerFunctions } from "../utils/run-server-action.ts";

type ClassReportState = ClassReportResultInitData & {
  isLoading: boolean;
  error: string;
  continueGeneration(): void;
  cancelGeneration(): void;
};

function handleGenerationAction(
  this: ClassReportState,
  action: (server: GasServerFunctions) => void,
): void {
  this.error = "";
  this.isLoading = true;

  runServerAction(action)
    .then(() => google.script.host.close())
    .catch((error: unknown) => {
      this.error = getErrorMsg(error);
      this.isLoading = false;
    });
}

function initDialog(el: HTMLElement): ClassReportState {
  const initData = parseInitData<ClassReportResultInitData>(el);

  return {
    ...initData,
    isLoading: false,
    error: "",

    continueGeneration() {
      handleGenerationAction.call(this, (server) =>
        server.continueClassReportsGeneration(),
      );
    },

    cancelGeneration() {
      handleGenerationAction.call(this, (server) =>
        server.cancelClassReportsGeneration(),
      );
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data(initDialog.name, initDialog);
});
