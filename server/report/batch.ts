// server/report/batch.ts
/**
 * Orquestração de geração de boletins para uma turma inteira: laço com
 * limite de tempo (`MAX_RUNTIME_MS`) e agregação de sucessos/erros.
 *
 * Fica separado de `report-generation.ts` de propósito: aquele módulo
 * responde "como gerar o boletim de UM aluno" (contexto, template, QR,
 * PDF); este responde "como rodar isso para MUITOS alunos com controle de
 * tempo de execução e coleta de erros" — um nível de abstração acima, que
 * não deveria inflar ainda mais o módulo de geração unitária.
 *
 * Não lança para erros individuais de aluno: cada falha vira uma entrada
 * em `errors`, e o processamento continua com o próximo aluno. Lança
 * apenas para condições que inviabilizam a turma inteira (nenhuma
 * disciplina reconhecida, nenhum aluno na aba "Resumo").
 */
import { MAX_RUNTIME_MS } from "../config.ts";
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

  // Usa "Resumo" como fonte oficial de matrículas — a mesma usada por
  // isStudentInClass e validateClassStudents — em vez de qualquer aba de
  // disciplina, evitando divergência entre os fluxos de geração individual
  // e em lote quando "Resumo" e as abas de disciplina estão dessincronizadas.
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
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push(`Linha ${row} (matrícula ${studentId}): ${message}`);
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
