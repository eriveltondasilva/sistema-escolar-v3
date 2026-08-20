// server/report/batch.ts
import { MAX_ERRORS_SHOWN } from "#config/constants.ts";
import { getErrorMsg } from "#utils/error.ts";
import {
  clearClassReportJob,
  saveClassReportJob,
} from "#utils/script-properties.ts";
import { buildReportContext } from "./context-builder.ts";
import {
  checkClassSubjects,
  getClassStudentsFromSummary,
} from "./data-access.ts";
import { generateReportForStudent } from "./generator.ts";

import type { AppConfig } from "../types.ts";
import type { ClassReportJob } from "./types.ts";

const MAX_RUNTIME_MS = 1000 * 60 * 5; // 5 min

export interface ClassReportsGenerationResult {
  successCount: number;
  processedCount: number;
  totalStudents: number;
  errors: string[];
  errorCount: number;
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
  const { foundSubjects } = checkClassSubjects(classSpreadsheet);
  if (foundSubjects.length === 0) {
    throw new Error("Nenhuma disciplina reconhecida nessa turma.");
  }

  const students = getClassStudentsFromSummary(classSpreadsheet);
  if (students.length === 0) {
    throw new Error('Turma sem alunos cadastrados na aba "Resumo".');
  }

  const job: ClassReportJob = {
    schoolYearLabel,
    className,
    students: students.map(({ studentId, row }) => ({ studentId, row })),
    nextStudentIndex: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
  };

  saveClassReportJob(job);

  return processClassReportJob(config, classSpreadsheet, foundSubjects, job);
}

export function continueReportsForClass(
  config: AppConfig,
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  job: ClassReportJob,
): ClassReportsGenerationResult {
  const { foundSubjects } = checkClassSubjects(classSpreadsheet);
  if (foundSubjects.length === 0) {
    throw new Error("Nenhuma disciplina reconhecida nessa turma.");
  }

  return processClassReportJob(config, classSpreadsheet, foundSubjects, job);
}

function processClassReportJob(
  config: AppConfig,
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  foundSubjects: ReturnType<typeof checkClassSubjects>["foundSubjects"],
  job: ClassReportJob,
): ClassReportsGenerationResult {
  const context = buildReportContext({
    config,
    classSpreadsheet,
    schoolYearLabel: job.schoolYearLabel,
    className: job.className,
    foundSubjects,
  });
  const startTime = Date.now();

  for (let index = job.nextStudentIndex; index < job.students.length; index++) {
    if (Date.now() - startTime >= MAX_RUNTIME_MS) {
      return makeGenerationResult(job, context.pdfFolder.getUrl(), true);
    }

    const { studentId, row } = job.students[index]!;

    try {
      generateReportForStudent({
        studentId,
        className: job.className,
        foundSubjects,
        context,
      });
      job.successCount++;
    } catch (error) {
      job.errorCount++;

      if (job.errors.length < MAX_ERRORS_SHOWN) {
        const errorMessage = getErrorMsg(error);
        job.errors.push(
          `Linha ${row} (matrícula ${studentId}): ${errorMessage}`,
        );
      }
    }

    // Salva após cada aluno para que a retomada não recomece do início.
    job.nextStudentIndex = index + 1;
    saveClassReportJob(job);
  }

  clearClassReportJob();
  return makeGenerationResult(job, context.pdfFolder.getUrl(), false);
}

function makeGenerationResult(
  job: ClassReportJob,
  pdfFolderUrl: string,
  interrupted: boolean,
): ClassReportsGenerationResult {
  const processedCount = job.nextStudentIndex;
  const totalStudents = job.students.length;

  return {
    successCount: job.successCount,
    processedCount,
    totalStudents,
    errors: job.errors,
    errorCount: job.errorCount,
    interrupted,
    interruptedMessage:
      interrupted ?
        `Processamento pausado em ${processedCount} de ${totalStudents} aluno(s). Clique em "Continuar geração" para retomar.`
      : "",
    pdfFolderUrl,
  };
}
