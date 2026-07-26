// server/school-year/creation.ts
import { insertMatriculationsIntoResumo } from "./matriculation.ts";
import { getClassTemplateFile } from "../drive/drive-lookup.ts";
import { VALID_CLASSES } from "../report/constants.ts";

import type { AppConfig, StudentData } from "../types.ts";
import type { ClassMatriculationInput, CreateSchoolYearData } from "./types.ts";

/**
 * Criação física da estrutura de um ano letivo (pasta + planilhas de
 * turma a partir do modelo, já matriculadas). Isolado de
 * `dialog-actions.ts` de propósito: aquele arquivo lida com o contrato
 * google.script.run (throw/return), este lida com Drive/Sheets — não
 * deveriam ficar misturados no mesmo handler.
 */

/** Substitui os placeholders de cabeçalho ({{school_class}}, {{school_year}}) de uma planilha de turma recém-copiada. */
export function fillClassHeaderPlaceholders(
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  className: string,
  yearLabel: string,
): void {
  for (const sheet of classSpreadsheet.getSheets()) {
    sheet
      .createTextFinder("{{school_class}}")
      .matchEntireCell(false)
      .replaceAllWith(className);
    sheet
      .createTextFinder("{{school_year}}")
      .matchEntireCell(false)
      .replaceAllWith(yearLabel);
  }
}

interface CreateSchoolYearStructureParams {
  config: AppConfig;
  rootFolder: GoogleAppsScript.Drive.Folder;
  schoolYearLabel: string;
  yearInput: string;
  matriculationsByClass: ClassMatriculationInput[];
  registeredStudentsMap: Map<string, StudentData>;
}

/**
 * Cria a pasta do ano letivo, copia a planilha-modelo de cada turma (o
 * modelo varia por assessmentType — nota ou conceito, ver
 * getClassTemplateFile), preenche o cabeçalho e insere as matrículas já
 * validadas em "Resumo". Em caso de falha em qualquer turma, desfaz tudo
 * (trash da pasta) — "tudo ou nada", consistente com o restante do fluxo.
 *
 * Pressupõe que `matriculationsByClass` já foi validado (ver
 * `validateClassMatriculations` em matriculation.ts) — esta função não
 * valida, só escreve.
 *
 * @throws {Error} Se qualquer turma falhar ao ser criada.
 */
export function createSchoolYearStructure({
  config,
  rootFolder,
  schoolYearLabel,
  yearInput,
  matriculationsByClass,
  registeredStudentsMap,
}: CreateSchoolYearStructureParams): CreateSchoolYearData {
  const yearFolder = rootFolder.createFolder(schoolYearLabel);
  const createdClasses: string[] = [];
  const creationErrors: string[] = [];

  for (const { className, assessmentType } of VALID_CLASSES) {
    try {
      const classTemplateFile = getClassTemplateFile(config, assessmentType);
      const classFile = classTemplateFile.makeCopy(className, yearFolder);
      const classSpreadsheet = SpreadsheetApp.openById(classFile.getId());
      fillClassHeaderPlaceholders(classSpreadsheet, className, yearInput);

      const matriculation = matriculationsByClass.find(
        (m) => m.className === className,
      );
      if (matriculation) {
        insertMatriculationsIntoResumo(
          classSpreadsheet,
          matriculation.studentIds,
          registeredStudentsMap,
        );
      }

      createdClasses.push(className);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      creationErrors.push(`${className}: ${message}`);
    }
  }

  if (creationErrors.length > 0) {
    yearFolder.setTrashed(true);
    throw new Error(
      `Não foi possível criar o ano letivo "${schoolYearLabel}". Nenhuma alteração foi feita.\n\n${creationErrors.join("\n")}`,
    );
  }

  return {
    schoolYearLabel,
    createdClasses,
    folderUrl: yearFolder.getUrl(),
  };
}
