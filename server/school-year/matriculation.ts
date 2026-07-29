// server/school-year/matriculation.ts
import { DEFAULT_LOCALE, ENROLLMENT_SHEET_NAMES } from "../config.ts";
import { SUMMARY_FIRST_DATA_ROW, VALID_CLASSES } from "../report/constants.ts";

import type { Issue, StudentData } from "../types.ts";
import type { ClassMatriculationInput } from "./types.ts";

export function validateClassMatriculations(
  matriculations: ClassMatriculationInput[],
  registeredStudentsMap: Map<string, StudentData>,
): Issue[] {
  const issues: Issue[] = [];
  const validClassNames = new Set(
    VALID_CLASSES.map((validClass) => validClass.className),
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
      const studentId = String(rawStudentId ?? "").trim();
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
          text: `[${matriculation.className}] Matrícula ${studentId} não encontrada no Cadastro de Alunos.`,
        });
      }
    }
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
