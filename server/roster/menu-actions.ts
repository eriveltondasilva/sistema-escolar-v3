// server/roster/menu-actions.ts
import { DIALOG_NAMES } from "#config/constants.ts";
import { renderView } from "#utils/render-view.ts";

import type { StudentEditInitData } from "./types.ts";

export function openStudentSearchDialog(): void {
  const ui = SpreadsheetApp.getUi();

  const htmlOutput = renderView(DIALOG_NAMES.studentSearch);
  htmlOutput.setWidth(480).setHeight(560);

  ui.showModalDialog(htmlOutput, "Buscar Aluno");
}

export function openStudentCreationDialog(): void {
  const ui = SpreadsheetApp.getUi();

  const htmlOutput = renderView(DIALOG_NAMES.studentCreate);
  htmlOutput.setWidth(480).setHeight(620);

  ui.showModalDialog(htmlOutput, "Cadastrar Aluno");
}

export function openStudentEditDialog(studentId: string): void {
  const trimmedId = String(studentId ?? "").trim();
  if (!trimmedId) throw new Error("Matrícula não pode ser vazia.");

  const ui = SpreadsheetApp.getUi();

  const initData: StudentEditInitData = { studentId: trimmedId };
  const htmlOutput = renderView(DIALOG_NAMES.studentEdit, initData);
  htmlOutput.setWidth(480).setHeight(620);

  ui.showModalDialog(htmlOutput, "Editar Aluno");
}
