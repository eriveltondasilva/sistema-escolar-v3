// server/school-year/dialog-actions.ts
import { loadConfig } from "#config/app-config.ts";
import { DIALOG_NAMES } from "#config/constants.ts";
import { loadStudentsMap } from "#report/data-access.ts";
import { renderView } from "#utils/render-view.ts";
import { withScriptLock } from "#utils/script-lock.ts";
import { createSchoolYearStructure } from "./creation.ts";
import { validateClassMatriculations } from "./matriculation.ts";

import type {
  ClassMatriculationInput,
  CreateSchoolYearResultInitData,
} from "./types.ts";

const SCHOOL_YEAR_LABEL_PREFIX = "Ano Letivo - ";

export function submitSchoolYearCreation(
  yearInput: string,
  matriculationsByClass: ClassMatriculationInput[],
): void {
  if (!/^\d{4}$/.test(yearInput)) {
    throw new Error(
      `"${yearInput}" não é um ano válido. Digite 4 dígitos, ex: 2026.`,
    );
  }

  withScriptLock((ui) => {
    const config = loadConfig();
    const schoolYearLabel = SCHOOL_YEAR_LABEL_PREFIX + yearInput;

    const rootFolder = DriveApp.getFolderById(config.schoolYearsFolderId);
    if (rootFolder.getFoldersByName(schoolYearLabel).hasNext()) {
      throw new Error(
        `O ano letivo "${schoolYearLabel}" já existe. Nenhuma alteração foi feita.`,
      );
    }

    const registrationSheet = SpreadsheetApp.openById(
      config.enrollmentSpreadsheetId,
    );
    const registeredStudentsMap = loadStudentsMap(registrationSheet);

    const validationIssues = validateClassMatriculations(
      matriculationsByClass,
      registeredStudentsMap,
    );
    const errorMessages = validationIssues
      .filter((issue) => issue.type === "error")
      .map((issue) => issue.text);

    if (errorMessages.length > 0) {
      throw new Error(
        "Corrija os erros abaixo antes de criar o ano letivo. " +
          `Nenhuma alteração foi feita.\n\n${errorMessages.join("\n")}`,
      );
    }

    const initData: CreateSchoolYearResultInitData = createSchoolYearStructure({
      config,
      rootFolder,
      schoolYearLabel,
      yearInput,
      matriculationsByClass,
      registeredStudentsMap,
    });
    const htmlOutput = renderView(
      DIALOG_NAMES.createSchoolYearResult,
      initData,
    );
    htmlOutput.setWidth(400).setHeight(340);

    ui.showModalDialog(htmlOutput, "Ano Letivo Criado");
  }, "Já existe uma criação de ano letivo em andamento. Tente novamente em alguns instantes.");
}
