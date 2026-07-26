// server/school-year/matriculation.ts
import { DEFAULT_LOCALE, ENROLLMENT_SHEET_NAMES } from "../config.ts";
import { SUMMARY_FIRST_DATA_ROW } from "../report/constants.ts";

import type { Issue, StudentData } from "../types.ts";
import type { ClassMatriculationInput } from "./types.ts";

export function validateClassMatriculations(
  matriculations: ClassMatriculationInput[],
  registeredStudentsMap: Map<string, StudentData>,
): Issue[] {
  const issues: Issue[] = [];

  for (const { className, studentIds } of matriculations) {
    const firstSeenAt = new Map<string, number>();

    studentIds.forEach((studentId, index) => {
      const trimmedId = studentId.trim();
      if (!trimmedId) return;

      if (firstSeenAt.has(trimmedId)) {
        issues.push({
          type: "error",
          text: `[${className}] Matrícula ${trimmedId} duplicada na lista colada (posições ${firstSeenAt.get(trimmedId)! + 1} e ${index + 1}).`,
        });
      } else {
        firstSeenAt.set(trimmedId, index);
      }

      if (!registeredStudentsMap.has(trimmedId)) {
        issues.push({
          type: "error",
          text: `[${className}] Matrícula ${trimmedId} não encontrada no Cadastro de Alunos.`,
        });
      }
    });
  }

  return issues;
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
export function insertMatriculationsIntoResumo(
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  studentIds: string[],
  registeredStudentsMap: Map<string, StudentData>,
): void {
  const resumoSheet = classSpreadsheet.getSheetByName(
    ENROLLMENT_SHEET_NAMES.SUMMARY,
  );
  if (!resumoSheet) {
    throw new Error(
      `A aba "${ENROLLMENT_SHEET_NAMES.SUMMARY}" não existe nesta turma.`,
    );
  }

  const rows = studentIds
    .map((studentId) => {
      const trimmedId = studentId.trim();
      const student = registeredStudentsMap.get(trimmedId);
      return student ? ([trimmedId, student.name] as const) : null;
    })
    .filter((row): row is readonly [string, string] => row !== null)
    .slice()
    .sort((a, b) => a[1].localeCompare(b[1], DEFAULT_LOCALE));

  if (rows.length === 0) return;

  resumoSheet
    .getRange(SUMMARY_FIRST_DATA_ROW, 1, rows.length, 2)
    .setValues(rows.map((row) => [...row]));
}
