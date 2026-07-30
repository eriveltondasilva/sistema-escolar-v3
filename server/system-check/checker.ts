// server/system-check/checker.ts
import { DIALOG_NAMES } from "../dialog-names.ts";
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
import { renderView } from "../utils/render-view.ts";

import type { Issue } from "../types.ts";
import type { ValidationResultInitData } from "./types.ts";

/** Renderiza o dialog HTML com os resultados. */
function showValidationDialog(issues: Issue[]): void {
  const ui = SpreadsheetApp.getUi();
  const htmlOutput = renderView<ValidationResultInitData>(
    DIALOG_NAMES.validationResult,
    {
      issues,
    },
  );
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

  const reportTemplatesIssues = checkReportTemplates(config);
  issues.push(...reportTemplatesIssues);

  const classTemplatesIssues = checkClassTemplates(config);
  issues.push(...classTemplatesIssues);

  const pdfsIssues = checkPdfsFolder(config);
  issues.push(...pdfsIssues);

  const tempFolderIssues = checkTempFolder(config);
  issues.push(...tempFolderIssues);

  const scriptPropertiesIssues = checkScriptProperties();
  issues.push(...scriptPropertiesIssues);

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
