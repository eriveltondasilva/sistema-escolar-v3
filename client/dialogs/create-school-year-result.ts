// client/dialogs/create-school-year-result.ts
import { parseInitData } from "../utils/parse-init-data";

import type { CreateSchoolYearResultInitData } from "#server/school-year/types.ts";

document.addEventListener("alpine:init", () => {
  Alpine.data("initDialog", (el: HTMLElement) => {
    return parseInitData<CreateSchoolYearResultInitData>(el);
  });
});
