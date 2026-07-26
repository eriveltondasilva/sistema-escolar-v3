// server/school-year/menu-actions.ts
import { DIALOG_NAMES } from "../dialog-names.ts";
import { VALID_CLASSES } from "../report/constants.ts";
import { renderView } from "../utils/render-view.ts";

/**
 * Handlers de menu (categoria A) do domínio "Ano Letivo" — abrem dialog,
 * não fazem escrita nenhuma.
 */

export function openCreateSchoolYearFormDialog(): void {
  const ui = SpreadsheetApp.getUi();

  const htmlOutput = renderView(DIALOG_NAMES.createSchoolYearForm, {
    classNames: VALID_CLASSES.map((c) => c.className),
  })
    .setWidth(560)
    .setHeight(640);

  ui.showModalDialog(htmlOutput, "Criar Ano Letivo");
}
