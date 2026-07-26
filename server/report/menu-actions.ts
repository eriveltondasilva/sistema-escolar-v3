// server/report/menu-actions.ts
import { loadConfig } from "../config.ts";
import { VALID_CLASSES } from "./constants.ts";
import { listSchoolYears } from "../drive/drive-lookup.ts";

type SelectYearClassActionType = "single" | "class";

/**
 * Abre o diálogo unificado de seleção de Ano Letivo e Turma.
 * @param actionType 'single' para aluno individual, 'class' para a turma toda.
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

    const template = HtmlService.createTemplateFromFile(
      "SelectYearClassDialog",
    );
    template.years = years;
    template.classes = VALID_CLASSES.map((c) => c.className);
    template.actionType = actionType;

    const height = actionType === "single" ? 320 : 240;
    const htmlOutput = template.evaluate().setWidth(400).setHeight(height);

    ui.showModalDialog(
      htmlOutput,
      actionType === "single" ?
        "Gerar Boletim do Aluno"
      : "Gerar Boletins da Turma",
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    ui.alert(`Erro ao abrir seleção: ${message}`);
  }
}

export function generateStudentReport(): void {
  openSelectYearClassDialog("single");
}

export function generateClassReports(): void {
  openSelectYearClassDialog("class");
}
