// server/roster/menu-actions.ts
import { DIALOG_NAMES } from "#config/constants.ts";
import { formatStr } from "#server/utils/formatters.ts";
import { renderView } from "#utils/render-view.ts";

import type { StudentEditInitData } from "./types.ts";

export function openStudentSearchDialog(): void {
  const ui = SpreadsheetApp.getUi();

  const htmlOutput = renderView(DIALOG_NAMES.studentSearch);
  htmlOutput.setWidth(600).setHeight(500);

  ui.showModalDialog(htmlOutput, "Buscar Aluno");
}

export function openStudentCreationDialog(): void {
  const ui = SpreadsheetApp.getUi();

  const htmlOutput = renderView(DIALOG_NAMES.studentCreate);
  htmlOutput.setWidth(520).setHeight(700);

  ui.showModalDialog(htmlOutput, "Cadastrar Aluno");
}

export function openStudentEditDialog(studentId: string): void {
  const trimmedId = formatStr(studentId);
  if (!trimmedId) throw new Error("Matrícula não pode ser vazia.");

  const ui = SpreadsheetApp.getUi();

  const initData: StudentEditInitData = { studentId: trimmedId };
  const htmlOutput = renderView(DIALOG_NAMES.studentEdit, initData);
  htmlOutput.setWidth(500).setHeight(700);

  ui.showModalDialog(htmlOutput, "Editar Aluno");
}
