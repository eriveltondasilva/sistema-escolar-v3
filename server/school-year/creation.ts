// server/school-year/creation.ts
import { getClassTemplateFile } from "#drive/drive-lookup.ts";
import { VALID_CLASSES } from "#report/constants.ts";
import { getErrorMsg } from "#utils/error.ts";
import { insertMatriculationsIntoSummary } from "./matriculation.ts";
import { createSubjectSheets } from "./subject-sheets.ts";

import type { AppConfig, StudentData } from "../types.ts";
import type { ClassMatriculationInput, CreateSchoolYearData } from "./types.ts";

interface FillClassHeaderPlaceholders {
  classSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  className: string;
  yearInput: string;
}

function fillClassHeaderPlaceholders({
  classSpreadsheet,
  className,
  yearInput,
}: FillClassHeaderPlaceholders): void {
  for (const sheet of classSpreadsheet.getSheets()) {
    //
    sheet
      .createTextFinder("{{school_class}}")
      .matchEntireCell(false)
      .replaceAllWith(className);

    //
    sheet
      .createTextFinder("{{school_year}}")
      .matchEntireCell(false)
      .replaceAllWith(yearInput);
  }
}

// -------------------------------------

interface CreateSchoolYearStructure {
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
}: CreateSchoolYearStructure): CreateSchoolYearData {
  const { conceptSpreadsheetId, gradeSpreadsheetId } = config;
  const yearFolder = rootFolder.createFolder(schoolYearLabel);
  const createdClasses: string[] = [];
  const creationErrors: string[] = [];

  const matriculationByClass = new Map(
    matriculationsByClass.map((m) => [m.className, m]),
  );

  for (const { name: className, assessmentType } of VALID_CLASSES) {
    try {
      const classTemplateFile = getClassTemplateFile({
        conceptSpreadsheetId,
        gradeSpreadsheetId,
        assessmentType,
      });
      const classFile = classTemplateFile.makeCopy(className, yearFolder);
      const classSpreadsheet = SpreadsheetApp.openById(classFile.getId());

      fillClassHeaderPlaceholders({ classSpreadsheet, className, yearInput });
      createSubjectSheets(classSpreadsheet, assessmentType);

      const matriculation = matriculationByClass.get(className);
      if (matriculation) {
        insertMatriculationsIntoSummary({
          classSpreadsheet,
          registeredStudentsMap,
          studentIds: matriculation.studentIds,
        });
      }

      createdClasses.push(className);
    } catch (error) {
      creationErrors.push(`${className}: ${getErrorMsg(error)}`);
    }
  }

  if (creationErrors.length > 0) {
    yearFolder.setTrashed(true);
    throw new Error(
      `Não foi possível criar o ano letivo "${schoolYearLabel}". ` +
        `As alterações foram revertidas.\n\n${creationErrors.join("\n")}`,
    );
  }

  return {
    schoolYearLabel,
    createdClasses,
    folderUrl: yearFolder.getUrl(),
  };
}
