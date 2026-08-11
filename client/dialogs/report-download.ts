// client/dialogs/report-download.ts
import { parseInitData } from "../utils/parse-init-data.ts";

import type { ReportDownloadInitData } from "#server/web-app/types.ts";

type ReportDownloadState = ReportDownloadInitData & {
  init(): void;
};

function initDialog(el: HTMLElement): ReportDownloadState {
  const initData = parseInitData<ReportDownloadInitData>(el);

  return {
    ...initData,

    init() {
      setTimeout(() => {
        window.location.replace(this.downloadUrl);
      }, 1000);
    },
  };
}

document.addEventListener("alpine:init", () => {
  Alpine.data(initDialog.name, initDialog);
});
