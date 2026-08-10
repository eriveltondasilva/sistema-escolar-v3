import { parseInitData } from "../utils/parse-init-data";

import type { ReportDownloadInitData } from "#server/web-app/types.ts";

document.addEventListener("alpine:init", () => {
  Alpine.data("initDialog", (el: HTMLElement) => {
    const initData = parseInitData<ReportDownloadInitData>(el);

    return {
      ...initData,

      init() {
        setTimeout(() => {
          window.location.replace(this.downloadUrl);
        }, 1_000);
      },
    };
  });
});
