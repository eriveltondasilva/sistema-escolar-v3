import { parseInitData } from "../utils/parse-init-data";

import type { ReportSuccessInitData } from "#server/report/types.ts";

document.addEventListener("alpine:init", () => {
  Alpine.data("initDialog", (el: HTMLElement) => {
    return parseInitData<ReportSuccessInitData>(el);
  });
});
