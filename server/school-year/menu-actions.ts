// server/school-year/menu-actions.ts
import { DIALOG_NAMES } from "#config/constants.ts";
import { VALID_CLASSES } from "#report/constants.ts";
import { renderView } from "#utils/render-view.ts";

import type { CreateSchoolYearFormInitData } from "./types.ts";

export function openCreateSchoolYearFormDialog(): void {
  const ui = SpreadsheetApp.getUi();

  const initData: CreateSchoolYearFormInitData = {
    classNames: VALID_CLASSES.map((validClass) => validClass.name),
  };
  const htmlOutput = renderView(DIALOG_NAMES.createSchoolYearForm, initData);
  htmlOutput.setWidth(500).setHeight(400);

  ui.showModalDialog(htmlOutput, "Criar Ano Letivo");
}
