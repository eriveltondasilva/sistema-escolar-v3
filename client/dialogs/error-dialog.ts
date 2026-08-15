// client/dialogs/error-dialog.ts
import { parseInitData } from "../utils/parse-init-data.ts";

import type { ErrorDialogInitData } from "#server/types.ts";

function initDialog(el: HTMLElement): ErrorDialogInitData {
  return parseInitData<ErrorDialogInitData>(el);
}

document.addEventListener("alpine:init", () => {
  Alpine.data("initDialog", initDialog);
});
