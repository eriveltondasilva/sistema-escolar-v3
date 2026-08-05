// server/report/menu-actions.ts
import { loadConfig } from "#config/app-config.ts";
import { DIALOG_NAMES } from "#config/dialog-names.ts";
import { listSchoolYears } from "#drive/drive-lookup.ts";
import { getErrorMsg } from "#utils/error.ts";
import { renderView } from "#utils/render-view.ts";
import { VALID_CLASSES } from "./constants.ts";

import type {
  GenerateReportFormInitData,
  YearClassSelectionType,
} from "./types.ts";

/**
 * Abre o diálogo unificado de seleção de Ano Letivo e Turma.
 */
function openSelectYearClassDialog(actionType: YearClassSelectionType): void {
  const ui = SpreadsheetApp.getUi();

  try {
    const { schoolYearsFolderId } = loadConfig();
    const schoolYearLabels = listSchoolYears(schoolYearsFolderId);

    if (schoolYearLabels.length === 0) {
      ui.alert('Nenhum ano letivo encontrado dentro da pasta "Anos Letivos".');
      return;
    }

    const classes = VALID_CLASSES.map((validClass) => validClass.name);
    const initData: GenerateReportFormInitData = {
      actionType,
      schoolYearLabels,
      classes,
    };
    const htmlOutput = renderView(DIALOG_NAMES.generateReportForm, initData);
    htmlOutput.setWidth(400).setHeight(actionType === "single" ? 320 : 240);

    const dialogTitle =
      actionType === "single" ?
        "Gerar Boletim do Aluno"
      : "Gerar Boletins da Turma";

    ui.showModalDialog(htmlOutput, dialogTitle);
  } catch (error) {
    ui.alert(`Erro ao abrir seleção: ${getErrorMsg(error)}`);
  }
}

// -------------------------------------

export function generateStudentReport(): void {
  openSelectYearClassDialog("single");
}

export function generateClassReports(): void {
  openSelectYearClassDialog("class");
}
