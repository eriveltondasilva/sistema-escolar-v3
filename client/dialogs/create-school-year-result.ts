// client/dialogs/create-school-year-result.ts
import { parseInitData } from "../utils/parse-init-data.ts";

import type { CreateSchoolYearResultInitData } from "#server/school-year/types.ts";

function initDialog(el: HTMLElement): CreateSchoolYearResultInitData {
  return parseInitData<CreateSchoolYearResultInitData>(el);
}

document.addEventListener("alpine:init", () => {
  Alpine.data("initDialog", initDialog);
});
