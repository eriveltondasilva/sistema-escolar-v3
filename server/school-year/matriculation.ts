// server/school-year/matriculation.ts
import { SUMMARY_SHEET, VALID_CLASSES } from "#report/constants.ts";
import { compareStrings, formatStr } from "#server/utils/formatters.ts";

import type { Issue, StudentData } from "../types.ts";
import type { ClassMatriculationInput } from "./types.ts";

export function validateClassMatriculations(
  matriculations: ClassMatriculationInput[],
  registeredStudentsMap: Map<string, StudentData>,
): Issue[] {
  const issues: Issue[] = [];
  const validClassNames = new Set(
    VALID_CLASSES.map((validClass) => validClass.name),
  );
  const receivedClasses = new Set<string>();
  const studentClassById = new Map<string, string>();

  for (const matriculation of matriculations) {
    if (!validClassNames.has(matriculation.className)) {
      issues.push({
        type: "error",
        text: `Turma inválida: "${matriculation.className || "(vazia)"}".`,
      });
      continue;
    }

    if (receivedClasses.has(matriculation.className)) {
      issues.push({
        type: "error",
        text: `A turma "${matriculation.className}" foi enviada mais de uma vez.`,
      });
      continue;
    }
    receivedClasses.add(matriculation.className);

    const idsInThisClass = new Set<string>();

    for (const rawStudentId of matriculation.studentIds) {
      const studentId = formatStr(rawStudentId);
      if (!studentId) continue;

      if (idsInThisClass.has(studentId)) {
        issues.push({
          type: "error",
          text: `[${matriculation.className}] Matrícula ${studentId} duplicada na mesma turma.`,
        });
        continue;
      }
      idsInThisClass.add(studentId);

      const previousClass = studentClassById.get(studentId);
      if (previousClass) {
        issues.push({
          type: "error",
          text:
            `Matrícula ${studentId} foi informada em mais de uma turma: ` +
            `"${previousClass}" e "${matriculation.className}".`,
        });
        continue;
      }
      studentClassById.set(studentId, matriculation.className);

      if (!registeredStudentsMap.has(studentId)) {
        issues.push({
          type: "error",
          text: `[${matriculation.className}] Matrícula ${studentId} não encontrada no Cadastro Escolar.`,
        });
      }
    }
  }

  return issues;
}

interface MatriculationData {
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  studentIds: string[];
  registeredStudentsMap: Map<string, StudentData>;
}

/**
 * Preenche a aba "Resumo" de uma turma recém-criada com os alunos
 * matriculados, em ordem alfabética por nome. Só deve ser chamada com a
 * turma ainda vazia (turma nova, criação de ano letivo) — reordenar uma
 * turma que já tem gente matriculada desloca a linha de quem já estava
 * lá, confundindo quem acompanha a planilha manualmente. Matrículas
 * adicionadas depois deste momento devem sempre ir para o final, nunca
 * reordenar (fora do escopo desta função).
 */
export function insertMatriculationsIntoSummary({
  classSpreadsheet,
  registeredStudentsMap,
  studentIds,
}: MatriculationData): void {
  if (studentIds.length === 0) return;

  const rows: [string, string][] = [];

  for (const studentId of studentIds) {
    const trimmedId = studentId.trim();
    const student = registeredStudentsMap.get(trimmedId);
    if (student) rows.push([trimmedId, student.name]);
  }

  if (rows.length === 0) return;

  rows.sort((a, b) => compareStrings(a[1], b[1]));

  const summarySheet = classSpreadsheet.getSheetByName(SUMMARY_SHEET.name);
  if (!summarySheet) {
    throw new Error(`A aba "${SUMMARY_SHEET.name}" não existe nesta turma.`);
  }

  summarySheet
    .getRange(SUMMARY_SHEET.startRow, 1, rows.length, 2)
    .setValues(rows);
}
