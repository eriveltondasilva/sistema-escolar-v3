// server/school-year/menu-actions.ts
import { DIALOG_NAMES } from "../dialog-names.ts";
import { VALID_CLASSES } from "../report/constants.ts";
import { renderView } from "../utils/render-view.ts";

import type { CreateSchoolYearFormInitData } from "./types.ts";

export function openCreateSchoolYearFormDialog(): void {
  const ui = SpreadsheetApp.getUi();
  const htmlOutput = renderView<CreateSchoolYearFormInitData>(
    DIALOG_NAMES.createSchoolYearForm,
    {
      classNames: VALID_CLASSES.map((validClass) => validClass.name),
    },
  );
  htmlOutput.setWidth(560).setHeight(640);

  ui.showModalDialog(htmlOutput, "Criar Ano Letivo");
}
