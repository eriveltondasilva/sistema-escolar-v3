// server/report/batch.ts
import { MAX_RUNTIME_MS } from "../config.ts";
import { getErrorMsg } from "../utils/error.ts";
import { buildReportContext } from "./context-builder.ts";
import {
  checkClassSubjects,
  getClassStudentsFromResumo,
} from "./data-access.ts";
import { generateReportForStudent } from "./generator.ts";

import type { AppConfig } from "../types.ts";

export interface ClassReportsGenerationResult {
  successCount: number;
  errors: string[];
  interrupted: boolean;
  interruptedMessage: string;
  pdfFolderUrl: string;
}

export function generateReportsForClass(
  config: AppConfig,
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  schoolYearLabel: string,
  className: string,
): ClassReportsGenerationResult {
  const { found: foundSubjects } = checkClassSubjects(classSpreadsheet);
  if (foundSubjects.length === 0) {
    throw new Error("Nenhuma disciplina reconhecida nessa turma.");
  }

  const students = getClassStudentsFromResumo(classSpreadsheet);
  if (students.length === 0) {
    throw new Error('Turma sem alunos cadastrados na aba "Resumo".');
  }

  const context = buildReportContext({
    config,
    classSpreadsheet,
    schoolYearLabel,
    className,
    foundSubjects,
  });

  let successCount = 0;
  const errors: string[] = [];
  let interrupted = false;
  let interruptedMessage = "";
  const startTime = Date.now();

  for (const { studentId, row } of students) {
    if (Date.now() - startTime > MAX_RUNTIME_MS) {
      interrupted = true;
      interruptedMessage = `Processo interrompido após ${MAX_RUNTIME_MS / 60000} min. Gere novamente a partir da linha ${row} (matrícula ${studentId}).`;
      break;
    }

    try {
      generateReportForStudent({
        studentId,
        className,
        foundSubjects,
        context,
      });
      successCount++;
    } catch (error) {
      const errorMessage = getErrorMsg(error);
      errors.push(`Linha ${row} (matrícula ${studentId}): ${errorMessage}`);
    }
  }

  return {
    successCount,
    errors,
    interrupted,
    interruptedMessage,
    pdfFolderUrl: context.pdfFolder.getUrl(),
  };
}
