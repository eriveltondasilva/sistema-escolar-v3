// server/report/menu-actions.ts
import { loadConfig } from "../config.ts";
import { DIALOG_NAMES } from "../dialog-names.ts";
import { VALID_CLASSES } from "./constants.ts";
import { listSchoolYears } from "../drive/drive-lookup.ts";
import { getErrorMsg } from "../utils/error.ts";
import { renderView } from "../utils/render-view.ts";

import type { GenerateReportFormInitData } from "./types.ts";

type SelectYearClassActionType = "single" | "class";

/**
 * Abre o diálogo unificado de seleção de Ano Letivo e Turma.
 */
export function openSelectYearClassDialog(
  actionType: SelectYearClassActionType,
): void {
  const ui = SpreadsheetApp.getUi();

  try {
    const config = loadConfig();
    const years = listSchoolYears(config);

    if (years.length === 0) {
      ui.alert('Nenhum ano letivo encontrado dentro da pasta "Anos Letivos".');
      return;
    }

    const height = actionType === "single" ? 320 : 240;
    const htmlOutput = renderView<GenerateReportFormInitData>(
      DIALOG_NAMES.generateReportForm,
      {
        actionType,
        years,
        classes: VALID_CLASSES.map((validClass) => validClass.className),
      },
    );
    htmlOutput.setWidth(400).setHeight(height);

    const dialogTitle =
      actionType === "single" ?
        "Gerar Boletim do Aluno"
      : "Gerar Boletins da Turma";

    ui.showModalDialog(htmlOutput, dialogTitle);
  } catch (error) {
    const errorMessage = getErrorMsg(error);
    ui.alert(`Erro ao abrir seleção: ${errorMessage}`);
  }
}

export function generateStudentReport(): void {
  openSelectYearClassDialog("single");
}

export function generateClassReports(): void {
  openSelectYearClassDialog("class");
}
