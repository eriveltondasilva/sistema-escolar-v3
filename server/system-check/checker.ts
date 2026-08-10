// server/system-check/checker.ts
import { DIALOG_NAMES } from "#config/constants.ts";
import { renderView } from "#utils/render-view.ts";
import {
  checkClassTemplates,
  checkConfig,
  checkPdfsFolder,
  checkReportTemplates,
  checkScriptProperties,
  checkTempFolder,
} from "./environment-checks.ts";
import {
  checkRegistration,
  checkSchoolYears,
  checkYear,
} from "./structure-checks.ts";

import type { Issue } from "../types.ts";
import type { ValidationResultInitData } from "./types.ts";

/** Renderiza o dialog HTML com os resultados. */
function showValidationDialog(issues: Issue[]): void {
  const ui = SpreadsheetApp.getUi();

  const initData: ValidationResultInitData = {
    issues,
  };
  const htmlOutput = renderView(DIALOG_NAMES.validationResult, initData);
  htmlOutput.setWidth(560).setHeight(530);

  ui.showModalDialog(htmlOutput, "Diagnóstico do Sistema");
}

/** Verifica todas as configurações, estrutura de pastas e dados. */
export function checkSystem(): void {
  const issues: Issue[] = [];

  const { config, issues: configIssues } = checkConfig();
  issues.push(...configIssues);

  if (!config) {
    showValidationDialog(issues);
    return;
  }

  issues.push(...checkReportTemplates(config));
  issues.push(...checkClassTemplates(config));
  issues.push(...checkPdfsFolder(config));
  issues.push(...checkTempFolder(config));
  issues.push(...checkScriptProperties());

  const { registeredStudentsMap, issues: registrationIssues } =
    checkRegistration(config);
  issues.push(...registrationIssues);

  const { schoolYearLabels, issues: yearsIssues } = checkSchoolYears(config);
  issues.push(...yearsIssues);

  for (const schoolYearLabel of schoolYearLabels) {
    issues.push(...checkYear(config, schoolYearLabel, registeredStudentsMap));
  }

  showValidationDialog(issues);
}
