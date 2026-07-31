// server/school-year/creation.ts
import { insertMatriculationsIntoResumo } from "./matriculation.ts";
import { createSubjectSheets } from "./subject-sheets.ts";
import { getClassTemplateFile } from "../drive/drive-lookup.ts";
import { VALID_CLASSES } from "../report/constants.ts";
import { getErrorMsg } from "../utils/error.ts";

import type { AppConfig, StudentData } from "../types.ts";
import type { ClassMatriculationInput, CreateSchoolYearData } from "./types.ts";

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

      // A ordem importa: as abas de disciplina são cópias da "_Base", então
      // preencher {{school_class}}/{{school_year}} antes de duplicar já
      // resolve o placeholder em todas as cópias de uma vez. Só
      // {{subject_name}}/{{subject_code}} precisam ser tratados por cópia,
      // já que variam entre elas.
      fillClassHeaderPlaceholders(classSpreadsheet, className, yearInput);
      createSubjectSheets(classSpreadsheet, assessmentType);

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
    } catch (error) {
      const errorMassage = getErrorMsg(error);
      creationErrors.push(`${className}: ${errorMassage}`);
    }
  }

  if (creationErrors.length > 0) {
    yearFolder.setTrashed(true);
    throw new Error(
      `Não foi possível criar o ano letivo "${schoolYearLabel}".` +
        `Nenhuma alteração foi feita.\n\n${creationErrors.join("\n")}`,
    );
  }

  return {
    schoolYearLabel,
    createdClasses,
    folderUrl: yearFolder.getUrl(),
  };
}
