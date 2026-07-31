// server/school-year/subject-sheets.ts
import {
  FIRST_DATA_ROW,
  getManualSuffixes,
  getPlaceholderFields,
  VALID_SUBJECTS,
} from "../report/constants.ts";

import type { AssessmentType } from "../types.ts";

export const TEMPLATE_SHEET_NAME = "_Base";

// A = Matrícula, B = Nome (fórmula, sempre bloqueadas); os campos de
// PLACEHOLDER_FIELDS começam na coluna C, na mesma ordem do array.
const FIRST_FIELD_COLUMN = 3;

/**
 * Desbloqueia, dentro da proteção da aba, só as colunas de entrada manual
 * (o resto — Matrícula/Nome e os campos calculados — permanece protegido).
 */
function unprotectManualColumns(
  protection: GoogleAppsScript.Spreadsheet.Protection,
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  assessmentType: AssessmentType,
): void {
  const manualSuffixes = getManualSuffixes(assessmentType);
  const lastRow = sheet.getMaxRows();
  const rowCount = lastRow - FIRST_DATA_ROW + 1;

  const unprotectedRanges = getPlaceholderFields(assessmentType)
    .map((field, index) => ({ field, column: FIRST_FIELD_COLUMN + index }))
    .filter(({ field }) => manualSuffixes.has(field.suffix))
    .map(({ column }) => sheet.getRange(FIRST_DATA_ROW, column, rowCount, 1));

  protection.setUnprotectedRanges(unprotectedRanges);
}

function protectSubjectSheet(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  assessmentType: AssessmentType,
): void {
  const protection = sheet
    .protect()
    .setDescription(`Proteção automática: ${sheet.getName()}`);

  unprotectManualColumns(protection, sheet, assessmentType);
}

/**
 * Duplica a aba "_Base" uma vez para cada disciplina cadastrada, renomeando
 * cada cópia para o código da disciplina, preenchendo {{subject_name}} e
 * {{subject_code}}, e reaplicando a proteção (o `copyTo` não copia
 * proteções de range). Ao final, remove a aba "_Base" original.
 */
export function createSubjectSheets(
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  assessmentType: AssessmentType,
): void {
  const templateSheet = classSpreadsheet.getSheetByName(TEMPLATE_SHEET_NAME);

  if (!templateSheet) {
    throw new Error(
      `A aba "${TEMPLATE_SHEET_NAME}" não existe no modelo de planilha de turma.`,
    );
  }

  for (const subject of VALID_SUBJECTS) {
    const subjectSheet = templateSheet
      .copyTo(classSpreadsheet)
      .setName(subject.code);

    subjectSheet
      .createTextFinder("{{subject_name}}")
      .matchEntireCell(false)
      .replaceAllWith(subject.name);

    subjectSheet
      .createTextFinder("{{subject_code}}")
      .matchEntireCell(false)
      .replaceAllWith(subject.code);

    protectSubjectSheet(subjectSheet, assessmentType);
  }

  classSpreadsheet.deleteSheet(templateSheet);
}
