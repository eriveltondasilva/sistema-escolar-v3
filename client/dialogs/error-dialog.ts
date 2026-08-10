import { parseInitData } from "../utils/parse-init-data";

import type { ErrorDialogInitData } from "#server/web-app/types.ts";

document.addEventListener("alpine:init", () => {
  Alpine.data("initDialog", (el: HTMLElement) => {
    return parseInitData<ErrorDialogInitData>(el);
  });
});
