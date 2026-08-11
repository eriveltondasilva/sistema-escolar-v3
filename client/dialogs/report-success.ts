// client/dialogs/report-success.ts
import { parseInitData } from "../utils/parse-init-data.ts";

import type { ReportSuccessInitData } from "#server/report/types.ts";

function initDialog(el: HTMLElement): ReportSuccessInitData {
  return parseInitData<ReportSuccessInitData>(el);
}

document.addEventListener("alpine:init", () => {
  Alpine.data(initDialog.name, initDialog);
});
